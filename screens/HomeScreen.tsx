import React, { useEffect, useState } from "react";
import { Image, View, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator, Platform, Vibration, } from "react-native";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { SafeAreaView } from "react-native-safe-area-context";
import { logoutUser } from "services/authService";
import { useNavigation } from "@react-navigation/native";
import { useTrip } from "context/TripContext";
import { auth, db } from "firebase";
import { collection, query, where, onSnapshot, Timestamp, getDocs, doc, } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import MascotLight from "../assets/CrawlLight.svg";
import MascotDark from "../assets/CrawlDark.svg";
import ETAPreview from "../components/ETAPreview";
import { DropProvider, Draggable, Droppable } from "react-native-reanimated-dnd";
import { SvgUri } from "react-native-svg";

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


export default function DashboardScreen() {
  const { user } = useTrip(); // optional source of truth in context
  const navigation = useNavigation<any>();

  // basic states
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [friendNames, setFriendNames] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState<any | null>(null); // <--- new: current user's Firestore profile
  const { width } = Dimensions.get("window");

  // swipe-to-friends
  const translateXTrips = useSharedValue(0);
  const hasTriggeredTrips = useSharedValue(false);
  const thresholdTrips = 100;

  const animatedStyleTrips = useAnimatedStyle(() => ({
    transform: [{ translateX: translateXTrips.value }],
  }));

  const handleNavigateTrip = () => {
    navigation.navigate("TripScreen");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

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

  // chart config
  const chartConfig = {
    backgroundColor: "#232625",
    backgroundGradientFrom: "#393031",
    backgroundGradientTo: "#232625",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(248, 193, 225, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(203, 188, 159, ${opacity})`,
  };

  // swipe-down logout animation
  const translateY = useSharedValue(0);
  const threshold = 60;
  const hasTriggered = useSharedValue(false);

  const triggerFeedback = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Vibration.vibrate(50);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(translateY.value) }],
  }));

  const handleNavProfile = async () => {
    navigation.navigate("ProfileScreen");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // --- subscribe to trips for current user (keeps existing logic) ---
  useEffect(() => {
    let unsubscribeTrips: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        if (unsubscribeTrips) unsubscribeTrips();
        setTrips([]);
        setLoading(false);
        return;
      }

      const tripsRef = collection(db, "trips");
      const q = query(tripsRef, where("uid", "==", currentUser.uid));

      unsubscribeTrips = onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));
          setTrips(list);
          setLoading(false);
        },
        (err) => {
          console.error("Error loading trips:", err);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeTrips) unsubscribeTrips();
    };
  }, []);

  // --- subscribe to current user's Firestore profile so the dashboard always has fresh name info ---
  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    const current = auth.currentUser;

    // If auth.currentUser is not available yet, listen for auth change
    if (!current) {
      const unsubAuth = onAuthStateChanged(auth, (u) => {
        if (u) {
          const userDoc = doc(db, "users", u.uid);
          unsubProfile = onSnapshot(
            userDoc,
            (snap) => {
              if (snap.exists()) {
                setProfile(snap.data());
                // debug
                // console.log("profile snapshot:", snap.data());
              } else {
                setProfile(null);
              }
            },
            (err) => {
              console.error("profile snapshot error:", err);
            }
          );
        } else {
          setProfile(null);
        }
      });
      return () => {
        unsubAuth();
        if (unsubProfile) unsubProfile();
      };
    }

    // If we have current user now, subscribe to their doc
    const userDocRef = doc(db, "users", current.uid);
    unsubProfile = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data());
          // console.log("profile snapshot:", snap.data());
        } else {
          setProfile(null);
        }
      },
      (err) => {
        console.error("profile snapshot error:", err);
      }
    );

    return () => {
      if (unsubProfile) unsubProfile();
    };
  }, []);

  // --- Prepare derived data (safe to compute at top-level) ---
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });

  const tripsPerDay = last7.map(
    (d) =>
      trips.filter((t) => {
        if (!t.startTime) return false;
        const st = (t.startTime as Timestamp).toDate();
        return st.toDateString() === d.toDateString();
      }).length
  );

  const avgDuration = last7.map((d) => {
    const dayTrips = trips.filter((t) => {
      if (!t.startTime) return false;
      const st = (t.startTime as Timestamp).toDate();
      return st.toDateString() === d.toDateString() && t.duration;
    });
    if (!dayTrips.length) return 0;
    const sum = dayTrips.reduce((sum, t) => sum + (t.duration || 0) / 60, 0);
    return Math.round(sum / dayTrips.length);
  });

  // --- count friends (uids) across trips ---
  const friendCount: Record<string, number> = {};
  trips.forEach((trip) => {
    if (Array.isArray(trip.sharedFriends)) {
      trip.sharedFriends.forEach((friendId: string) => {
        friendCount[friendId] = (friendCount[friendId] || 0) + 1;
      });
    }
  });

  const topFriends = Object.entries(friendCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const brandCols = [
    "#282827",
    "#635749",
    "#46372D",
    "#563F2F",
    "#AB9E87",
    "#F8C1E1",
  ];
  const sliceOpacity = 0.6;

  // helper to convert hex -> rgba with opacity
  const hexToRgba = (hex: string, alpha = 1) => {
    const normalized = hex.replace("#", "");
    const bigint = parseInt(
      normalized.length === 3
        ? normalized
            .split("")
            .map((c) => c + c)
            .join("")
        : normalized,
      16
    );
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // --- Fetch friend display names (firestore) for the topFriends ---
  useEffect(() => {
    const friendIds = topFriends.map(([id]) => id);
    if (friendIds.length === 0) {
      setFriendNames({});
      return;
    }

    let cancelled = false;

    const fetchNames = async () => {
      try {
        //  friendIds must match the document IDs in the users collection
        // If users collection docs are keyed by UID, this will work:
        const q = query(collection(db, "users"), where("__name__", "in", friendIds));
        const snaps = await getDocs(q);
        const map: Record<string, string> = {};

        snaps.forEach((d) => {
          const data = d.data() as any;
          map[d.id] = data.fullName || data.displayName || "Unknown";
        });

        friendIds.forEach((id) => {
          if (!map[id]) map[id] = id;
        });

        if (!cancelled) setFriendNames(map);
      } catch (err) {
        console.error("Error fetching friend names:", err);
        const fallback: Record<string, string> = {};
        friendIds.forEach((id) => (fallback[id] = id));
        if (!cancelled) setFriendNames(fallback);
      }
    };

    fetchNames();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(topFriends.map(([id]) => id))]);

  // --- Build pie data using names (if available) ---
  const pieData = topFriends.map(([friendId, count], index) => ({
    name: friendNames[friendId] || friendId,
    population: count,
    color: hexToRgba(brandCols[index % brandCols.length], sliceOpacity),
    legendFontColor: "#F1EFE5",
    legendFontSize: 12,
  }));

  // Preloader
  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F8C1E1" />
      </View>
    );

  // --- Compute a friendly display name for welcome text ---
  const currentAuthUser = auth.currentUser;
  // prefer profile.fullName -> profile.displayName -> context user -> auth.displayName -> fallback 'User'
  const friendlyName =
    (profile && (profile.fullName || profile.displayName || profile.name)) ||
    (user && (user.fullName || user.displayName || user.name)) ||
    currentAuthUser?.displayName ||
    (currentAuthUser?.email ? currentAuthUser.email.split("@")[0] : "User");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* <View style={styles.headerRow}> */}
        <View style={styles.headerRow}>
          <View style={styles.flexyBoy2}>
            {/* Current user's profile avatar */}
            <View style={styles.profIcon}>
            {/* <View style={{ backgroundColor: 'red'}}> */}
            {renderAvatar(currentAuthUser?.uid, friendlyName, profile?.avatar?.uri || // ✅ first try Firestore avatar
              profile?.avatarUri, 50)}
            </View>
            <Text style={styles.welcomeText}>{friendlyName}</Text>
          </View>


          {/* Profile Swipeable */}
          <PanGestureHandler
            onGestureEvent={(event) => {
              translateY.value = Math.max(event.nativeEvent.translationY, 0);
              if (translateY.value > threshold && !hasTriggered.value) {
                runOnJS(triggerFeedback)();
                hasTriggered.value = true;
              }
            }}
            onEnded={(event) => {
              if (event.nativeEvent.translationY > threshold) {
                runOnJS(handleNavProfile)();
              }
              translateY.value = 0;
              hasTriggered.value = false;
            }}
          >
            <Animated.View style={[styles.profileSwipe, animatedStyle]}>
              <MascotLight width={24} height={24} />
              <Text style={styles.profileText}>Profile</Text>
            </Animated.View>
          </PanGestureHandler>
        </View>

        <Text style={styles.header}>Your Dashboard</Text>

        {/* ETA preview */}
        <ETAPreview
          onOpen={(item) => {
            console.log("Open ETA item:", item);
          }}
        />
{/* Just a Spacer */}
<View style={styles.Breaker}></View>

    {/* Drag & Drop Navigator */}
    <DropProvider>
      <View style={styles.dragAndDropContainer}>
        <Droppable id="go-trip-insights" style={styles.navDropZone} onDrop={() => navigation.navigate("TripsInsightScreen")} activeStyle={styles.dropZoneActive}>
          <Text style={{ color: "#F1EFE5", textAlign: "center" }}>View My Insights</Text>
        </Droppable>

        <Droppable id="start-trip" style={styles.navDropZone} onDrop={() => navigation.navigate("TripScreen")} activeStyle={styles.dropZoneActive}>
          <Text style={{ color: "#F1EFE5", textAlign: "center" }}>Let's Start a Trip</Text>
        </Droppable>
      </View>

      <Draggable id="navigator-icon" style={styles.navDraggable}>
        <MascotDark width={60} height={60} />
      </Draggable>
    </DropProvider>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#232625" },
  scroll: { alignItems: "center", paddingVertical: 20 },
  headerRow: {
    width: "90%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    alignItems: "center",
  },
  welcomeText: { fontSize: 22, fontWeight: "600", color: "#F8C1E1", marginLeft: 7 },
  Breaker: {
    height: 20,
  },
  flexyBoy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  profileSwipe: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: brandColors[13],
    gap: 10,
    borderRadius: 8,
  },
  profileText: { fontSize: 16, color: brandColors[1], fontWeight: "700" },
  header: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#CBBC9F",
    marginBottom: 10,
  },
  link: {
    alignSelf: "center",
    fontSize: 16,
    fontWeight: "800",
    color: "#232625",
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "500",
    color: "#F1EFE5",
    marginTop: 30,
    marginBottom: 10,
  },
  chart: { borderRadius: 16, marginBottom: 20 },
  centered: {
    flex: 1,
    backgroundColor: "#232625",
    justifyContent: "center",
    alignItems: "center",
  },
  swipeLink: {
    paddingVertical: 15,
    paddingHorizontal: 14,
    backgroundColor: "#CBBC9F",
    borderRadius: 8,
    marginTop: 10,
  },
  swipeText: {
    color: "#563F2F",
    marginTop: 5,
    fontSize: 14,
    textAlign: "center",
  },
    dragAndDropContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginVertical: 20,
    marginTop: 20,
    gap: 80
  },
    navDropZone: {
    width: 85,
    height: 85,
    backgroundColor: brandColors[0],
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#755540",
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  dropZoneActive: {
    transform: [{ scale: 1.07 }],
    backgroundColor: "#755540",
    borderColor: brandColors[10],
    borderStyle: "solid",
  },
    navDraggable: {
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 20,
  },
  profIcon: {
    borderStyle: 'solid',
    borderWidth: 2,
    borderColor: brandColors[8],
    borderRadius: '100%',
    // backgroundColor: 'red',
    // alignItems: 'center',
    // justifyContent: 'center',
    // alignSelf: 'center'
  }, 
  flexyBoy2:{
    flexDirection: "row", 
    alignItems: "center",
    gap: 1
  }
});
