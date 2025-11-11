// @ts-nocheck
import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Platform, Vibration, Alert, ActivityIndicator, Image } from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import LocalSvg from "./components/LocalSvg";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { logoutUser } from "services/authService";
import { SvgUri } from "react-native-svg";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";

const brandColors = [
  "#232625", "#393031", "#545456", "#282827", "#563F2F",
  "#46372D", "#635749", "#AB9E87", "#F8C1E1", "#ED1C25",
  "#F1EFE5", "#F0E4CB", "#731702", "#CBBC9F",
];

type AvatarPayload = {
  seed?: string;
  style?: string;
  uri?: string;
};

interface UserData {
  displayName: string;
  username: string;
  email: string;
  phone: string;
  emergencyContacts: string[];
  avatar?: AvatarPayload;
}

const DICEBEAR_BASE = "https://api.dicebear.com/9.x";

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // swipe values
  const translateXFriends = useSharedValue(0);
  const hasTriggeredFriends = useSharedValue(false);
  const thresholdFriends = 100;

  const translateY = useSharedValue(0);
  const hasTriggered = useSharedValue(false);
  const threshold = 60;

  const translateX = useSharedValue(0);

  const animatedStyleFriends = useAnimatedStyle(() => ({
    transform: [{ translateX: translateXFriends.value }],
  }));

  const animatedStyleLog = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(translateY.value) }],
  }));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("No user logged in");

        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        const fallbackName = currentUser.displayName || "Anonymous";

        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          setUserData({
            displayName:
              (data.displayName as string) ||
              (data.fullName as string) ||
              (data.name as string) ||
              fallbackName,
            username: (data.username as string) || "anonymous",
            email: (data.email as string) || currentUser.email || "N/A",
            phone: (data.phone as string) || "N/A",
            emergencyContacts: (data.emergencyContacts as string[]) || [],
            avatar: (data.avatar as AvatarPayload) || undefined,
          });
        } else {
          setUserData({
            displayName: fallbackName,
            username: "anonymous",
            email: currentUser.email || "N/A",
            phone: "N/A",
            emergencyContacts: [],
            avatar: undefined,
          });
        }
      } catch (err: any) {
        Alert.alert("Error", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleNavigateFriends = () => {
    navigation.navigate("FriendsScreen");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const triggerFeedback = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Vibration.vibrate(50);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigation.replace("LoginScreen");
    } catch (err: any) {
      Alert.alert("Logout Error", err.message);
    }
  };

  const handleGesture = (event: any) => {
    translateX.value = withSpring(event.translationX);
  };

  const handleGestureEnd = () => {
    translateX.value = withSpring(0);
  };

  if (loading || !userData) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={brandColors[9]} />
      </View>
    );
  }

  // Build avatar URI (prefer saved avatar.uri)
  const avatarFromDoc = userData.avatar;
  let avatarUri: string | undefined;

  if (avatarFromDoc?.uri) {
    avatarUri = avatarFromDoc.uri;
  } else if (avatarFromDoc?.seed && avatarFromDoc?.style) {
    avatarUri = `${DICEBEAR_BASE}/${avatarFromDoc.style}/svg?seed=${encodeURIComponent(
      avatarFromDoc.seed.trim().replace(/\s+/g, "_")
    )}`;
  } else {
    // fallback to displayName-based seed (keeps old behavior)
    const seed = (userData.displayName || userData.username || "anonymous")
      .trim()
      .replace(/\s+/g, "_");
    avatarUri = `${DICEBEAR_BASE}/adventurer/svg?seed=${encodeURIComponent(seed)}`;
  }

  // detect png vs svg for rendering
  const isPng = avatarUri?.includes("/png") || avatarUri?.toLowerCase().endsWith(".png");

  return (
    <View style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {isPng ? (
            // RN <Image> for PNG
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            // SVG preview
            <SvgUri width={120} height={120} uri={avatarUri} />
          )}
        </View>

        <Text style={styles.name} accessibilityLabel={`Full name ${userData.displayName}`}>
          {userData.displayName}
        </Text>
        <Text style={styles.username}>@{userData.username}</Text>
      </View>

      {/* Drag Card */}
      <PanGestureHandler onGestureEvent={handleGesture} onEnded={handleGestureEnd}>
        <Animated.View style={[styles.card, animatedStyle]}>
          <Text style={styles.cardTitle}>Swipe Me</Text>
          <Text style={styles.cardSubtitle}>Drag left or right to interact</Text>
        </Animated.View>
      </PanGestureHandler>

      {/* Profile Info */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Full Name</Text>
        <Text style={styles.infoValue}>{userData.displayName}</Text>

        <Text style={styles.infoTitle}>Email</Text>
        <Text style={styles.infoValue}>{userData.email}</Text>

        <Text style={styles.infoTitle}>Phone</Text>
        <Text style={styles.infoValue}>{userData.phone}</Text>

        <Text style={styles.infoTitle}>Emergency Contacts</Text>
        <Text style={styles.infoValue}>
          {userData.emergencyContacts.length} Friends Linked
        </Text>
      </View>

      <View style={styles.flexyBoy2}>
        {/* Navigate FriendsList */}
        <PanGestureHandler
          onGestureEvent={(event) => {
            translateXFriends.value = Math.min(0, event.nativeEvent.translationX);
            if (translateXFriends.value < -thresholdFriends && !hasTriggeredFriends.value) {
              runOnJS(handleNavigateFriends)();
              hasTriggeredFriends.value = true;
            }
          }}
          onEnded={() => {
            translateXFriends.value = withSpring(0);
            hasTriggeredFriends.value = false;
          }}
        >
          <Animated.View style={[styles.swipeLink, animatedStyleFriends]}>
            <View style={styles.flexyBoy}>
              <LocalSvg source={require('../assets/CrawlLight.svg')} width={24} height={24} />
              <Text style={styles.link}>Manage Friends</Text>
            </View>
            <Text style={styles.swipeText}>Swipe me left to view friends</Text>
          </Animated.View>
        </PanGestureHandler>

        {/* Logout Swipe */}
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
              runOnJS(handleLogout)();
            }
            translateY.value = 0;
            hasTriggered.value = false;
          }}
        >
          <Animated.View style={[styles.logoutSwipe, animatedStyleLog]}>
            <LocalSvg source={require('../assets/CrawlLight.svg')} width={24} height={24} />
            <Text style={styles.logoutText}>Logout</Text>
          </Animated.View>
        </PanGestureHandler>
      </View>
    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors[0],
    padding: 20,
    justifyContent: "center",
  },
  header: { alignItems: "center", marginVertical: 20 },
  avatarContainer: {
    borderRadius: 60,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#ED1C25",
  },
  avatar: { width: 120, height: 120 },
  name: { fontSize: 22, fontWeight: "600", color: brandColors[10] },
  username: { fontSize: 16, color: brandColors[7], marginTop: 4 },
  card: {
    backgroundColor: brandColors[12],
    padding: 20,
    borderRadius: 20,
    marginVertical: 20,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  cardTitle: { fontSize: 20, fontWeight: "700", color: brandColors[10] },
  cardSubtitle: { fontSize: 14, marginTop: 5, color: brandColors[11] },
  infoSection: {
    backgroundColor: brandColors[4],
    padding: 20,
    borderRadius: 15,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: brandColors[10],
    marginTop: 10,
  },
  infoValue: { fontSize: 14, color: brandColors[13], marginBottom: 8 },
  flexyBoy: { flexDirection: "row", alignItems: "center", gap: 10 },
  link: {
    alignSelf: "center",
    fontSize: 16,
    fontWeight: "800",
    color: "#232625",
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
  flexyBoy2: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoutSwipe: {
    height: 77,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "#ED1C25",
    gap: 10,
    borderRadius: 8,
    marginTop: 10,
    marginLeft: 20,
  },
  logoutText: { fontSize: 16, color: "#fff", fontWeight: "700" },
});
