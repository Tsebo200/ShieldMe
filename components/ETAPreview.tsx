import React, { useEffect, useRef, useState } from "react";
import { Image, View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Pressable, ScrollView } from "react-native";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, limit, getDoc } from "firebase/firestore";
import { RectButton, Swipeable } from "react-native-gesture-handler";
import { SvgUri } from "react-native-svg";
import LocalSvg from "./LocalSvg";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

const brandColors = [
  "#232625",
  "#393031",
  "#545456",
  "#282827",
  "#563F2F",
  "#46372D",
  "#635749",
  "#AB9E87",
  "#F8C1E1",
  "#ED1C25",
  "#F1EFE5",
  "#F0E4CB",
  "#731702",
  "#CBBC9F",
];


// Base URL for Dicebear avatars
const DICEBEAR_BASE = "https://api.dicebear.com/9.x";

type ExpiredLocation = { latitude: number; longitude: number } | undefined;

type ETAItem = {
  id: string;
  fromUid?: string;
  fromDisplayName?: string;
  etaIso?: string;
  etaFriendly?: string;
  currentLocation?: string | { name?: string } | null;
  destinationLocation?: string | { name?: string } | null;
  message?: string;
  createdAt?: any;
  read?: boolean;
  tripId?: string;
  tripStatus?: string;
  // injected from trip doc:
  startTime?: string; // ISO string
  eta?: number; // seconds
  expired?: boolean;
  // persisted location captured at expiry
  expiredLocation?: ExpiredLocation;
  // location coordinates from trip
  currentLocationCoords?: ExpiredLocation;
  destinationLocationCoords?: ExpiredLocation;
  // last known location from periodic updates
  lastKnownLocation?: ExpiredLocation;
  // timestamps
  completionTime?: string; // HH:MM format
  expirationTime?: string; // HH:MM format
  startTimeFormatted?: string; // HH:MM format
};

const timeUntil = (iso?: string) => {
  if (!iso) return "";
  try {
    const target = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((target - now) / 1000));
    if (diff === 0) return "Arriving now";
    const minutes = Math.floor(diff / 60);
    if (minutes < 1) return "Arriving in <1m";
    if (minutes < 60) return `Arriving in ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `Arriving in ${hours}h ${minutes % 60}m`;
  } catch {
    return iso ?? "";
  }
};

const formatLoc = (loc?: ExpiredLocation) =>
  loc ? `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}` : "unknown";

const ETAPreview: React.FC<{ onOpen?: (item: ETAItem) => void }> = ({ onOpen }) => {
  const [items, setItems] = useState<ETAItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const swipeRef = useRef<Swipeable | null>(null);
  const navigation = useNavigation<any>();
  
  // ------------------------
  // Avatar Resolver
  // ------------------------
const renderAvatar = (uid?: string, name?: string, avatarUri?: string, size = 40) => {
  let uri = avatarUri;

  if (!uri && name) {
    const seed = name.trim().replace(/\s+/g, "_");
    uri = `${DICEBEAR_BASE}/adventurer/svg?seed=${encodeURIComponent(seed)}`;
  }

  if (!uri && uid) {
    const seed = `friend_${uid}`;
    uri = `${DICEBEAR_BASE}/adventurer/svg?seed=${encodeURIComponent(seed)}`;
  }

  if (!uri) return null;

  const isPng = uri.includes("/png") || uri.toLowerCase().endsWith(".png");

  return isPng ? (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2, marginRight: 8 }}
    />
  ) : (
    <SvgUri width={size} height={size} uri={uri} style={{ marginRight: 4 }} />
  );
};

  // authoritative map of id -> ETAItem
  const itemsRef = useRef<Map<string, ETAItem>>(new Map());
  const tripUnsubsRef = useRef<Map<string, () => void>>(new Map());

  const flushItemsToState = (limitCount = 50) => {
    const arr = Array.from(itemsRef.current.values()).sort((a, b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt?.toDate ? b.createdAt?.toDate().getTime() : b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    setItems(arr.slice(0, limitCount));
  };

  const fetchMissingSenderNames = async () => {
    const missing = Array.from(itemsRef.current.values()).filter((s) => !s.fromDisplayName && s.fromUid);
    if (missing.length === 0) return;
    const uids = Array.from(new Set(missing.map((m) => m.fromUid).filter(Boolean))) as string[];
    const results: Record<string, string> = {};
    await Promise.all(
      uids.map(async (u: string) => {
        try {
          const uSnap = await getDoc(doc(db, "users", u));
          if (uSnap.exists()) {
            const ud = uSnap.data() as any;
            results[u] = ud.fullName || ud.full_name || ud.displayName || ud.email || "Friend";
          } else results[u] = "Friend";
        } catch {
          results[u] = "Friend";
        }
      })
    );
    let changed = false;
    missing.forEach((m) => {
      const name = results[m.fromUid || ""] || "Friend";
      const existing = itemsRef.current.get(m.id);
      if (existing && !existing.fromDisplayName) {
        itemsRef.current.set(m.id, { ...existing, fromDisplayName: name });
        changed = true;
      }
    });
    if (changed) flushItemsToState();
  };

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUid(u ? u.uid : null));
    return () => unsub();
  }, []);

  // (LocalSvg handles resolving the asset)

  useEffect(() => {
    if (!uid) {
      itemsRef.current.clear();
      setItems(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    const q = query(collection(db, "eta_shares"), where("toUid", "==", uid), limit(50));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const incoming = new Map<string, ETAItem>();
        snap.docs.forEach((d) => {
          const id = d.id;
          const data = d.data() as any;
          incoming.set(id, { id, ...data } as ETAItem);
        });

        // merge incoming into itemsRef preserving trip metadata that was injected earlier
        const newMap = new Map<string, ETAItem>();
        incoming.forEach((b, id) => {
          const existing = itemsRef.current.get(id) as ETAItem | undefined;
          const merged = {
            ...b,
            ...(existing?.tripStatus !== undefined ? { tripStatus: existing.tripStatus } : {}),
            ...(existing?.startTime !== undefined ? { startTime: existing.startTime } : {}),
            ...(existing?.eta !== undefined ? { eta: existing.eta } : {}),
            ...(existing?.expired !== undefined ? { expired: existing.expired } : {}),
            ...(existing?.expiredLocation !== undefined ? { expiredLocation: existing.expiredLocation } : {}),
            ...(existing?.fromDisplayName !== undefined ? { fromDisplayName: existing.fromDisplayName } : {}),
          } as ETAItem;
          newMap.set(id, merged);
        });

        itemsRef.current = newMap;
        flushItemsToState();
        fetchMissingSenderNames().catch((e) => console.warn(e));

        // manage trip listeners
        const wantedTripIds = new Set(Array.from(newMap.values()).map((s) => s.tripId).filter(Boolean) as string[]);

        // remove unsubbed trips
        tripUnsubsRef.current.forEach((unsubFn, tripId) => {
          if (!wantedTripIds.has(tripId)) {
            try { unsubFn(); } catch (e) {}
            tripUnsubsRef.current.delete(tripId);
          }
        });

        // add listeners for new tripIds
        newMap.forEach((share) => {
          const tripId = share.tripId;
          if (!tripId) return;
          if (tripUnsubsRef.current.has(tripId)) return;

          const tripRef = doc(db, "trips", tripId);
          const tripUnsub = onSnapshot(
            tripRef,
            (tripSnap) => {
              if (!tripSnap.exists()) return;
              const t = tripSnap.data();
              const status = t.status;
              const startTimeIso = t.startTime?.toDate ? t.startTime.toDate().toISOString() : undefined;
              const etaSeconds = t.eta;
              const expiredLocation = t.expiredLocation as ExpiredLocation | undefined;
              const currentLocationCoords = t.currentLocationCoords as ExpiredLocation | undefined;
              const destinationLocationCoords = t.destinationLocationCoords as ExpiredLocation | undefined;
              const lastKnownLocation = t.lastKnownLocation as ExpiredLocation | undefined;
              const completionTime = t.completionTime as string | undefined;
              const expirationTime = t.expirationTime as string | undefined;
              const startTimeFormatted = t.startTimeFormatted as string | undefined;

              let updated = false;
              itemsRef.current.forEach((val, key) => {
                if (val.tripId === tripId) {
                  itemsRef.current.set(key, {
                    ...val,
                    tripStatus: status,
                    startTime: startTimeIso,
                    eta: etaSeconds,
                    ...(expiredLocation ? { expiredLocation } : {}),
                    ...(currentLocationCoords ? { currentLocationCoords } : {}),
                    ...(destinationLocationCoords ? { destinationLocationCoords } : {}),
                    ...(lastKnownLocation ? { lastKnownLocation } : {}),
                    ...(completionTime ? { completionTime } : {}),
                    ...(expirationTime ? { expirationTime } : {}),
                    ...(startTimeFormatted ? { startTimeFormatted } : {}),
                  });
                  updated = true;
                }
              });
              if (updated) flushItemsToState();
            },
            (err) => {
              console.warn("trip onSnapshot error:", err);
            }
          );

          tripUnsubsRef.current.set(tripId, tripUnsub);
        });

        setLoading(false);
      },
      (err) => {
        console.warn("ETAPreview listen error:", err);
        setItems(null);
        setLoading(false);
      }
    );

    return () => {
      try { unsub(); } catch {}
      tripUnsubsRef.current.forEach((fn) => {
        try { fn(); } catch {}
      });
      tripUnsubsRef.current.clear();
    };
  }, [uid]);

  // local expiry interval (instant UI update)
  useEffect(() => {
    if (!itemsRef.current || itemsRef.current.size === 0) return;
    const iv = setInterval(() => {
      let changed = false;
      itemsRef.current.forEach((val, key) => {
        if (!val.tripId || !val.startTime || !val.eta || val.tripStatus === "completed") return;
        const startMs = new Date(val.startTime).getTime();
        const expired = Date.now() > startMs + val.eta * 1000;
        if (val.expired !== expired) {
          itemsRef.current.set(key, { ...val, expired });
          changed = true;
        }
      });
      if (changed) flushItemsToState();
    }, 1000);
    return () => clearInterval(iv);
  }, [items]);

  // const markRead = async (id: string) => {
  //   try {
  //     await updateDoc(doc(db, "eta_shares", id), { read: true });
  //     itemsRef.current.delete(id);
  //     flushItemsToState();
  //   } catch (err) {
  //     console.warn("markRead err", err);
  //     Alert.alert("Error", "Could not mark preview read.");
  //   }
  // };

  // split active vs completed
  const activeList = (items ?? []).filter((it) => it.tripStatus !== "completed");
  const completedList = (items ?? []).filter((it) => it.tripStatus === "completed");

  // if (loading) {
  //   return (
  //     <View style={styles.wrapper}>
  //       <Text style={styles.previewHeader}>Shared ETAs</Text>
  //       <View style={styles.emptyBox}>
  //         <ActivityIndicator />
  //         <Text style={styles.hintText}>Loading ETA previews…</Text>
  //       </View>
  //     </View>
  //   );
  // }

  const handleCardPress = (item: ETAItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('MapScreen', {
      tripId: item.tripId,
      item: item,
    });
  };

  const renderCard = (item: ETAItem) => {
    const isCompleted = item.tripStatus === "completed";
    const isExpired = item.tripStatus === "expired" || (!!item.expired && !isCompleted);

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => handleCardPress(item)}
        activeOpacity={0.7}
        style={[styles.card, isCompleted && styles.cardCompleted, isExpired && styles.cardExpired]}
      >
        <View style={styles.cardTop}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Add profile icon */}
          {renderAvatar(item.fromUid, item.fromDisplayName)}
          <Text style={styles.from}>{item.fromDisplayName ?? (item.fromUid ? "Friend" : "Unknown")}</Text>
          </View>
          {isCompleted ? (
            <View>
              <Text style={styles.completedText}>Trip Completed ✅</Text>
              {item.completionTime && (
                <Text style={styles.timeStamp}>at {item.completionTime}</Text>
              )}
            </View>
          ) : isExpired ? (
            <View>
              <Text style={styles.expiredText}>ETA Expired ⏰</Text>
              {item.expirationTime && (
                <Text style={styles.timeStamp}>at {item.expirationTime}</Text>
              )}
            </View>
          ) : (
            <Text style={styles.time}>{timeUntil(item.etaIso) || item.etaFriendly}</Text>
          )}
        </View>

        <Text style={styles.route}>
          {typeof item.currentLocation === "string" ? item.currentLocation : item.currentLocation?.name ?? "Now"}
          {item.startTimeFormatted && ` (Started: ${item.startTimeFormatted})`}
          {" → "}
          {typeof item.destinationLocation === "string" ? item.destinationLocation : item.destinationLocation?.name ?? "Destination"}
        </Text>

        {/* Display location coordinates (excluding from/to as they're shown on map) */}
        {(item.expiredLocation || item.lastKnownLocation || item.completionTime || item.expirationTime) && (
          <View style={styles.coordsContainer}>
            {item.lastKnownLocation && (
              <Text style={styles.coordsText}>
                Last seen: {formatLoc(item.lastKnownLocation)}
              </Text>
            )}
            {item.expiredLocation && (
              <Text style={styles.coordsText}>
                Expired at: {formatLoc(item.expiredLocation)}
                {item.expirationTime && ` (${item.expirationTime})`}
              </Text>
            )}
            {item.completionTime && (
              <Text style={styles.coordsText}>
                Completed at: {item.completionTime}
              </Text>
            )}
          </View>
        )}

        {item.message ? <Text style={styles.msg} numberOfLines={2}>{item.message}</Text> : null}

        {!isCompleted && (
          <></>
        )}
      </TouchableOpacity>
    );
  };



const renderCompletedRightActions = () => (
    <RectButton
      style={styles.rightAction}
      onPress={() => {
        setCompletedExpanded((s) => !s);
        swipeRef.current?.close();
      }}
    >
      <Text style={styles.rightActionText}>
        {completedExpanded ? "Hide" : "Show"}
      </Text>
    </RectButton>
  );


  return (
    <>
      <Text style={styles.sectionHeader}>Active ETAs</Text>

      {activeList.length === 0 ? (
        <View style={styles.emptyBoxSmall}>
          <Text style={styles.hintText}>No active ETAs right now.</Text>
        </View>
      ) : (
        <FlatList
          horizontal
          data={activeList}
          keyExtractor={(i) => i.id}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => renderCard(item)}
          contentContainerStyle={{ paddingHorizontal: 6 }}
        />
      )}
          <Text style={styles.sectionHeader}>Completed Trips</Text>
      {/* Completed header - swipeable */}
      <Swipeable
        overshootFriction={8}
        friction={2}
        onSwipeableOpen={() => setCompletedExpanded((s) => !s)}
        renderLeftActions={() => (
          <View style={styles.swipeHintBox}>
            <Text style={styles.swipeHintText}>⇠ Swipe</Text>
          </View>
        )}
        renderRightActions={() => (
          <View style={styles.swipeHintBox}>
            <Text style={styles.swipeHintText}>Swipe ⇢</Text>
          </View>
        )}
      >
        <View style={styles.completedHeader}>
          <View style={styles.flexyBoy2}>
        <LocalSvg style={styles.positionMe} source={require("../assets/CrawlLight.svg")} width={24} height={24} />
          <Text style={styles.completedCount}>
           Total {completedList.length}  • {completedExpanded ? "Hide" : "Show"}
          </Text>
          </View>
          <Text style={styles.completedSectionHeader}>Checkout All Shared Trips</Text> 
          <Text style={styles.completedSectionDescription}>Swipe me horizontally to show/hide</Text> 
          {/* <Text style={styles.completedSectionHeader}>Swipe to Show & Hide</Text> 
          <Text style={styles.completedSectionHeader}>All Shared ETAs</Text>  */}

        </View>
      </Swipeable>

      {completedExpanded ? (
        // vertical scroll area for completed items
        <View style={styles.flexyBoy}>
        <View style={styles.completedContainer}>
          {completedList.length === 0 ? (
            <View style={styles.emptyBoxSmall}>
              <Text style={styles.hintText}>No completed trips yet.</Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 300 }}>
              {completedList.map((it) => (
                <View key={it.id} style={{ marginBottom: 10 }}>
                  {renderCard(it)}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
        </View>
      ) : null}
    </>
  );
};
const styles = StyleSheet.create({
  // wrapper: { marginTop: 12, marginBottom: 8, paddingHorizontal: 8 },
  // previewHeader: { color: "#F2A007", fontWeight: "700", marginBottom: 8, fontSize: 14 },
  // emptyBox: { padding: 12, borderRadius: 10, backgroundColor: "#203033", alignItems: "center" },
  emptyBoxSmall: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#232625", alignItems: "center", marginBottom: 8 },

  completedHeader: {
    // flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: brandColors[1], // deep teal
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 10,
    gap: 10,
  },
  completedSectionHeader:{
    fontSize: 20,
    fontWeight: "600",
    color: "#F2F2F2",
    // paddingBlock: 20,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F2F2F2",
    paddingBlock: 15,
  },
  completedCount: {
    fontSize: 14,
    fontWeight: "500",
    color: brandColors[8], // accent orange
  },
  completedContainer: {
    // backgroundColor: "#025E73", // slightly lighter teal
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    marginLeft: 10,
    alignSelf: 'center',
    justifyContent: 'center'
  },
  swipeHintBox: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    // backgroundColor: "#731702", // dark red accent
    borderRadius: 12,
    marginVertical: 6,
  },
  swipeHintText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  hintText: {
    color: "#ccc",
    fontSize: 13,
    fontStyle: "italic",
  },

  card: {
    width: 260,
    marginRight: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: brandColors[1],
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  from: { color: brandColors[8], fontWeight: "700", fontSize: 15 },
  time: { color: brandColors[11], fontWeight: "700", fontSize: 13 },
  route: { color: "#fff", marginTop: 8, opacity: 0.95 },
  msg: { color: "#fff", marginTop: 8, opacity: 0.9 },
  actionsRow: { flexDirection: "row", marginTop: 10 },
  actionChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: brandColors[3],
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70,
  },
  actionText: { color: "#fff", fontWeight: "700" },
  cardCompleted: { backgroundColor: brandColors[4], opacity: 0.8 },
  completedText: { color: "#f5e6c9", fontWeight: "700", fontSize: 13 },
  cardExpired: { backgroundColor: brandColors[9], opacity: 0.95 },
  expiredText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  expiredLocation: { marginTop: 8, color: "#F1EFE5", fontSize: 12, backgroundColor: "rgba(0,0,0,0.12)", padding: 6, borderRadius: 8, overflow: "hidden" },
  coordsContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 8,
    gap: 4,
  },
  coordsText: {
    color: "#CBBC9F",
    fontSize: 11,
    fontFamily: "monospace",
  },
  timeStamp: {
    color: "#CBBC9F",
    fontSize: 11,
    marginTop: 2,
    fontStyle: "italic",
  },
  // completedContainer: { marginTop: 8, paddingHorizontal: 4 },
  rightAction: {
  backgroundColor: "#CBBC9F",
  justifyContent: "center",
  alignItems: "center",
  width: 90,
  borderRadius: 8,
  marginVertical: 4,
  marginRight: 6,
},
rightActionText: {
  color: "#393031",
  fontWeight: "700",
},
flexyBoy: {
  justifyContent: 'center',
  alignItems: 'center',
  alignSelf: 'center',
},
positionMe:{
  alignSelf: 'flex-start',
  marginRight: 35,
  marginLeft: 10,
},
flexyBoy2:{
  flexDirection: 'row',
  alignItems: 'center',
  alignSelf: 'flex-start',
},
completedSectionDescription: {
    color: brandColors[10],
    fontSize: 13,
    textAlign: "center",
}
});

export default ETAPreview;
