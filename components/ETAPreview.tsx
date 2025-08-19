import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { auth, db } from "../firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, limit } from "firebase/firestore";

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
];

type ETAItem = {
  id: string;
  fromDisplayName?: string;
  etaIso?: string;
  etaFriendly?: string;
  currentLocation?: string;
  destinationLocation?: string;
  message?: string;
  createdAt?: any;
  read?: boolean;
  tripId?: string;
  tripStatus?: string;
  // injected from trip doc:
  startTime?: string; // ISO string
  eta?: number; // seconds
  expired?: boolean;
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
    return iso;
  }
};

const ETAPreview: React.FC<{ onOpen?: (item: ETAItem) => void }> = ({ onOpen }) => {
  const [items, setItems] = useState<ETAItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  // store trip unsub functions so we can clean them up when shares change/unmount
  const tripUnsubsRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUid(u ? u.uid : null);
    });
    return () => unsub();
  }, []);

  // subscribe to eta_shares and manage per-trip listeners
  useEffect(() => {
    if (!uid) {
      setItems(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const q = query(collection(db, "eta_shares"), where("toUid", "==", uid), limit(20));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const baseDocs: ETAItem[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .sort((a, b) => {
            const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
            const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
            return tb - ta;
          })
          .slice(0, 5);

        // Replace items with base shares (trip metadata will be merged in by trip listeners)
        // setItems(baseDocs);
        // Merge incoming baseDocs with any previously-injected trip metadata so we don't lose tripStatus/startTime/eta/expired
        setItems((prev) => {
        const prevMap = new Map((prev ?? []).map(p => [p.id, p]));
        return baseDocs.map(b => {
            const existing = prevMap.get(b.id) || {};
            // preserve trip metadata if present
            const { tripStatus, startTime, eta, expired } = existing as any;
            return {
            ...b,
            // add these as they exist on the previous item
            ...(tripStatus !== undefined ? { tripStatus } : {}),
            ...(startTime !== undefined ? { startTime } : {}),
            ...(eta !== undefined ? { eta } : {}),
            ...(expired !== undefined ? { expired } : {}),
            } as ETAItem;
        });
        });


        // figure out which trip listeners we need
        const wantedTripIds = new Set(baseDocs.map((s) => s.tripId).filter(Boolean) as string[]);

        // remove subscriptions that are no longer needed
        tripUnsubsRef.current.forEach((unsubFn, tripId) => {
          if (!wantedTripIds.has(tripId)) {
            try {
              unsubFn();
            } catch (e) {
              /* ignore */
            }
            tripUnsubsRef.current.delete(tripId);
          }
        });

        // add listeners for new tripIds
        baseDocs.forEach((share) => {
          const tripId = share.tripId;
          if (!tripId) return;
          if (tripUnsubsRef.current.has(tripId)) return; // already subscribed

          const tripRef = doc(db, "trips", tripId);
          const tripUnsub = onSnapshot(
            tripRef,
            (tripSnap) => {
              if (!tripSnap.exists()) return;
              const tripData = tripSnap.data();
              const status = tripData.status;
              const startTimeIso = tripData.startTime?.toDate ? tripData.startTime.toDate().toISOString() : undefined;
              const etaSeconds = tripData.eta; // expected seconds (per your schema)

              // update the matching share item with tripStatus, startTime and eta
              setItems((prev) =>
                (prev ?? []).map((p) =>
                  p.tripId === tripId
                    ? { ...p, tripStatus: status, startTime: startTimeIso, eta: etaSeconds }
                    : p
                )
              );
            },
            (err) => {
              console.warn("trip onSnapshot error:", err);
            }
          );

          // store unsub fn for cleanup
          tripUnsubsRef.current.set(tripId, tripUnsub);
        });

        setLoading(false);
      },
      (err) => {
        console.warn("ETAPreview listen error:", err);
        setErrorMsg(err?.message || "Unknown error");
        setItems(null);
        setLoading(false);
      }
    );

    // cleanup: unsubscribe main query and all trip listeners
    return () => {
      try {
        unsub();
      } catch (e) {
        /* ignore */
      }
      tripUnsubsRef.current.forEach((fn) => {
        try {
          fn();
        } catch (e) {
          /* ignore */
        }
      });
      tripUnsubsRef.current.clear();
    };
  }, [uid]);

  // interval to recalculate expired state every second (so expiry is instant)
  useEffect(() => {
    if (!items || items.length === 0) return;

    const interval = setInterval(() => {
      setItems((prev) =>
        (prev ?? []).map((p) => {
          // if no trip meta or already completed, keep as is
          if (!p.tripId || !p.startTime || !p.eta || p.tripStatus === "completed") return p;

          const startMs = new Date(p.startTime).getTime();
          const expired = Date.now() > startMs + p.eta * 1000;
          // only update if changed (avoid unnecessary re-renders in dev)
          if (p.expired === expired) return p;
          return { ...p, expired };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [items]);

  const markRead = async (id: string) => {
    try {
      const ref = doc(db, "eta_shares", id);
      await updateDoc(ref, { read: true });
      setItems((prev) => (prev ? prev.filter((p) => p.id !== id) : null));
    } catch (err) {
      console.warn("markRead err", err);
      Alert.alert("Error", "Could not mark preview read.");
    }
  };

  const createTestShare = async () => {
    if (!uid) return Alert.alert("Not signed in", "Sign in to create test share.");
    try {
      // convenience: create a trip that starts now and eta=10s so you can test expiry quickly
      const tripDoc = await addDoc(collection(db, "trips"), {
        uid,
        currentLocation: "Office",
        destinationLocation: "Home",
        eta: 10, // 10 seconds for a quick test
        sharedFriends: [uid],
        startTime: serverTimestamp(),
        status: "ongoing",
      });

      await addDoc(collection(db, "eta_shares"), {
        fromUid: uid,
        fromDisplayName: auth.currentUser?.displayName || "You",
        toUid: uid,
        tripId: tripDoc.id,
        currentLocation: "Office",
        destinationLocation: "Home",
        etaIso: new Date(Date.now() + 10 * 1000).toISOString(),
        etaFriendly: "Arrives in 10s",
        message: "This is a test ETA share.",
        createdAt: serverTimestamp(),
        read: false,
      });

      Alert.alert("Test share created", "Trip + ETA share created (10s ETA).");
    } catch (err: any) {
      console.warn("createTestShare err", err);
      Alert.alert("Error creating test share", err?.message || String(err));
    }
  };

  // UX: states
  if (loading) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.previewHeader}>Shared ETAs</Text>
        <View style={styles.emptyBox}>
          <ActivityIndicator />
          <Text style={styles.hintText}>Loading ETA previews…</Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <Text style={styles.previewHeader}>Shared ETAs</Text>
      <FlatList
        horizontal
        data={items || []}
        keyExtractor={(i) => i.id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          const isCompleted = item.tripStatus === "completed";
          const isExpired = !!item.expired && !isCompleted;

          return (
            <TouchableOpacity
              activeOpacity={0.9}
              style={[
                styles.card,
                isCompleted && styles.cardCompleted,
                isExpired && styles.cardExpired,
              ]}
              onPress={() => (onOpen ? onOpen(item) : null)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.from}>{item.fromDisplayName || "Friend"}</Text>

                {isCompleted ? (
                  <Text style={styles.completedText}>Trip completed ✅</Text>
                ) : isExpired ? (
                  <Text style={styles.expiredText}>Expired ⏰</Text>
                ) : (
                  <Text style={styles.time}>{timeUntil(item.etaIso) || item.etaFriendly}</Text>
                )}
              </View>

              <Text style={styles.route}>
                {item.currentLocation || "Now"} → {item.destinationLocation || "Destination"}
              </Text>

              {item.message ? <Text style={styles.msg} numberOfLines={2}>{item.message}</Text> : null}

              {!isCompleted && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity onPress={() => (onOpen ? onOpen(item) : null)} style={styles.actionChip}>
                    <Text style={styles.actionText}>Open</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => markRead(item.id)} style={[styles.actionChip, { backgroundColor: "#731702" }]}>
                    <Text style={styles.actionText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingHorizontal: 6 }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  previewHeader: {
    color: "#F2A007",
    fontWeight: "700",
    marginBottom: 8,
    fontSize: 14,
  },
  emptyBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#203033",
    alignItems: "center",
  },
  hintText: { color: "#F1EFE5", marginTop: 8 },
  devBtn: { marginTop: 10, padding: 8, backgroundColor: "#025E73", borderRadius: 8 },
  devBtnText: { color: "#fff", fontWeight: "700" },

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
  cardCompleted: {
    backgroundColor: brandColors[4],
    opacity: 0.8,
  },
  completedText: {
    color: "#AB9E87",
    fontWeight: "700",
    fontSize: 13,
  },
  cardExpired: {
    backgroundColor: brandColors[9], // red
    opacity: 0.9,
  },
  expiredText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
});

export default ETAPreview;
