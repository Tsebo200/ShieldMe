import { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Platform, Vibration, Alert, ActivityIndicator, Image, ScrollView, TouchableOpacity }from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS }from "react-native-reanimated";
import LocalSvg from "../components/LocalSvg";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { logoutUser } from "../services/authService";
import { SvgUri } from "react-native-svg";
import { auth, db } from "../firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import BackButton from "../components/BackButton";
import { ProfileScreenProps } from "../types/navigation";
import { autoUpdateEmergencyContacts, addEmergencyContact, removeEmergencyContact } from "../services/emergencyContactService";

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
// BaseURL For The Icons
const DICEBEAR_BASE = "https://api.dicebear.com/9.x";

type EmergencyContact = {
  uid: string;
  name: string;
  email: string;
  avatar?: AvatarPayload;
};

type Friend = {
  uid: string;
  name: string;
  email: string;
  avatar?: AvatarPayload;
};

const ProfileScreen = ({ navigation }: ProfileScreenProps) => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [availableFriends, setAvailableFriends] = useState<Friend[]>([]);
  const [showAddFriends, setShowAddFriends] = useState(false);

  // swipe values
  const translateXFriends = useSharedValue(0);
  const hasTriggeredFriends = useSharedValue(false);
  const thresholdFriends = 100;

  const translateY = useSharedValue(0);
  const hasTriggered = useSharedValue(false);
  const threshold = 60;

  const animatedStyleFriends = useAnimatedStyle(() => ({
    transform: [{ translateX: translateXFriends.value }],
  }));

  const animatedStyleLog = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(translateY.value) }],
  }));

  // Fetch emergency contact details
  const fetchEmergencyContactDetails = useCallback(async (uids: string[]) => {
    if (uids.length === 0) {
      setEmergencyContacts([]);
      return;
    }

    try {
      const contactPromises = uids.map(async (uid) => {
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data() as any;
          return {
            uid,
            name: data.fullName || data.displayName || data.name || data.email?.split('@')[0] || 'Unknown',
            email: data.email || '',
            avatar: data.avatar,
          } as EmergencyContact;
        }
        return null;
      });

      const contacts = (await Promise.all(contactPromises)).filter(Boolean) as EmergencyContact[];
      setEmergencyContacts(contacts);
    } catch (error) {
      console.error('Error fetching emergency contact details:', error);
    }
  }, []);

  // Fetch available friends (friends not in emergency contacts)
  const fetchAvailableFriends = useCallback(async (emergencyContactUids: string[]) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) return;

      const userData = userSnap.data() as any;
      const friendUids: string[] = userData.friends || [];
      
      // Filter out friends already in emergency contacts
      const availableUids = friendUids.filter(uid => !emergencyContactUids.includes(uid));

      if (availableUids.length === 0) {
        setAvailableFriends([]);
        return;
      }

      const friendPromises = availableUids.map(async (uid) => {
        const friendRef = doc(db, 'users', uid);
        const friendSnap = await getDoc(friendRef);
        if (friendSnap.exists()) {
          const data = friendSnap.data() as any;
          return {
            uid,
            name: data.fullName || data.displayName || data.name || data.email?.split('@')[0] || 'Unknown',
            email: data.email || '',
            avatar: data.avatar,
          } as Friend;
        }
        return null;
      });

      const friends = (await Promise.all(friendPromises)).filter(Boolean) as Friend[];
      setAvailableFriends(friends);
    } catch (error) {
      console.error('Error fetching available friends:', error);
    }
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("No user logged in");

        // Auto-update emergency contacts with top 2 most shared friends
        await autoUpdateEmergencyContacts();

        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);

        const fallbackName = currentUser.displayName || "Anonymous";

        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          const emergencyContactUids = (data.emergencyContacts as string[]) || [];
          
          setUserData({
            displayName:
              (data.displayName as string) ||
              (data.fullName as string) ||
              (data.name as string) ||
              fallbackName,
            username: (data.username as string) || "anonymous",
            email: (data.email as string) || currentUser.email || "N/A",
            phone: (data.phone as string) || "N/A",
            emergencyContacts: emergencyContactUids,
            avatar: (data.avatar as AvatarPayload) || undefined,
          });

          // Fetch emergency contact details
          await fetchEmergencyContactDetails(emergencyContactUids);
          // Fetch available friends
          await fetchAvailableFriends(emergencyContactUids);
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
  }, [fetchEmergencyContactDetails, fetchAvailableFriends]);

  // Listen for changes to user document (for emergency contacts and phone updates)
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);
    const unsub = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        const emergencyContactUids = (data.emergencyContacts as string[]) || [];
        const phoneNumber = (data.phone as string) || "N/A";
        const displayName = (data.displayName as string) || (data.fullName as string) || (data.name as string) || userData?.displayName || "Anonymous";
        const username = (data.username as string) || userData?.username || "anonymous";
        
        if (userData) {
          setUserData({
            ...userData,
            displayName,
            username,
            phone: phoneNumber,
            emergencyContacts: emergencyContactUids,
          });
        }

        await fetchEmergencyContactDetails(emergencyContactUids);
        await fetchAvailableFriends(emergencyContactUids);
      }
    });

    return () => unsub();
  }, [userData, fetchEmergencyContactDetails, fetchAvailableFriends]);

  const handleNavigateFriends = () => {
    requestAnimationFrame(() => {
      navigation.navigate('FriendsScreen');
    });
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
      // navigation.replace("LoginScreen");
    } catch (err: any) {
      Alert.alert("Logout Error", err.message);
    }
  };

  const handleEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('EditProfileScreen');
  };

  const handleAddEmergencyContact = async (friendUid: string) => {
    try {
      await addEmergencyContact(friendUid);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add emergency contact');
    }
  };

  const handleRemoveEmergencyContact = async (friendUid: string) => {
    try {
      await removeEmergencyContact(friendUid);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to remove emergency contact');
    }
  };

  const renderAvatar = (contact: EmergencyContact | Friend, size: number = 40) => {
    const avatarFromDoc = contact.avatar;
    let avatarUri: string | undefined;

    if (avatarFromDoc?.uri) {
      avatarUri = avatarFromDoc.uri;
    } else if (avatarFromDoc?.seed && avatarFromDoc?.style) {
      avatarUri = `${DICEBEAR_BASE}/${avatarFromDoc.style}/svg?seed=${encodeURIComponent(
        avatarFromDoc.seed.trim().replace(/\s+/g, "_")
      )}`;
    } else {
      const seed = (contact.name || "anonymous").trim().replace(/\s+/g, "_");
      avatarUri = `${DICEBEAR_BASE}/adventurer/svg?seed=${encodeURIComponent(seed)}`;
    }

    if (!avatarUri) return null;

    const isPng = avatarUri.includes("/png") || avatarUri.toLowerCase().endsWith(".png");

    return isPng ? (
      <Image
        source={{ uri: avatarUri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    ) : (
      <SvgUri width={size} height={size} uri={avatarUri} />
    );
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header with Back Button */}
      <View style={styles.topHeader}>
        <BackButton />
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.placeholder} />
      </View>

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

      {/* Edit Profile Card */}
      <TouchableOpacity onPress={handleEditProfile} activeOpacity={0.8}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Edit Profile</Text>
          <Text style={styles.cardSubtitle}>Tap to edit your profile</Text>
        </View>
      </TouchableOpacity>

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
          {emergencyContacts.length} Friends Linked
        </Text>

        {/* Emergency Contacts List */}
        {emergencyContacts.length > 0 && (
          <View style={styles.emergencyContactsContainer}>
            {emergencyContacts.map((contact) => (
              <View key={contact.uid} style={styles.emergencyContactItem}>
                {renderAvatar(contact, 36)}
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  {contact.email && (
                    <Text style={styles.contactEmail}>{contact.email}</Text>
                  )}
                </View>
                {/* <TouchableOpacity
                  onPress={() => handleRemoveEmergencyContact(contact.uid)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity> */}
              </View>
            ))}
          </View>
        )}

        {/* Add Friends Button */}
        {/* <TouchableOpacity
          onPress={() => setShowAddFriends(!showAddFriends)}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>
            {showAddFriends ? 'Hide' : 'Add'} Friends to Emergency Contacts
          </Text>
        </TouchableOpacity> */}

        {/* Available Friends List */}
        {showAddFriends && availableFriends.length > 0 && (
          <View style={styles.availableFriendsContainer}>
            <Text style={styles.availableFriendsTitle}>Available Friends</Text>
            {availableFriends.map((friend) => (
              <View key={friend.uid} style={styles.friendItem}>
                {renderAvatar(friend, 36)}
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{friend.name}</Text>
                  {friend.email && (
                    <Text style={styles.contactEmail}>{friend.email}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleAddEmergencyContact(friend.uid)}
                  style={styles.addContactButton}
                >
                  <Text style={styles.addContactButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {showAddFriends && availableFriends.length === 0 && (
          <Text style={styles.noFriendsText}>No friends available to add</Text>
        )}
      </View>

      <View style={styles.flexyBoy2}>
        {/* Navigate FriendsList */}
        <PanGestureHandler
          onGestureEvent={(event) => {
            'worklet';
            translateXFriends.value = Math.min(0, event.nativeEvent.translationX);
            if (translateXFriends.value < -thresholdFriends && !hasTriggeredFriends.value) {
              runOnJS(handleNavigateFriends)();
              hasTriggeredFriends.value = true;
            }
          }}
          onEnded={() => {
            'worklet';
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
            'worklet';
            translateY.value = Math.min(event.nativeEvent.translationY, 0);
            if (translateY.value < -threshold && !hasTriggered.value) {
              runOnJS(triggerFeedback)();
              hasTriggered.value = true;
            }
          }}
          onEnded={(event: any) => {
            'worklet';
            if (event.nativeEvent.translationY < -threshold) {
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
    </ScrollView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brandColors[0],
  },
  scrollContent: {
    padding: 20,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: brandColors[10],
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 40, // Same width as back button to center title
  },
  header: { alignItems: "center", marginVertical: 20 },
  avatarContainer: {
    borderRadius: 60,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: brandColors[7],
  },
  avatar: { width: 120, height: 120 },
  name: { fontSize: 22, fontWeight: "600", color: brandColors[10] },
  username: { fontSize: 16, color: brandColors[7], marginTop: 4 },
  card: {
    backgroundColor: brandColors[1],
    padding: 20,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  cardTitle: { fontSize: 20, fontWeight: "700", color: brandColors[10] },
  cardSubtitle: { fontSize: 14, marginTop: 5, color: brandColors[11] },
  infoSection: {
    backgroundColor: brandColors[1],
    padding: 20,
    borderRadius: 15,
    marginTop: -5,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: brandColors[10],
    marginTop: 10,
  },
  infoValue: { fontSize: 14, color: brandColors[13], marginBottom: 5 },
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
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
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
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },
  logoutText: { fontSize: 16, color: "#fff", fontWeight: "700" },
  emergencyContactsContainer: {
    marginTop: 15,
  },
  emergencyContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brandColors[1],
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: brandColors[10],
  },
  contactEmail: {
    fontSize: 12,
    color: brandColors[13],
    marginTop: 2,
  },
  removeButton: {
    backgroundColor: brandColors[9],
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: brandColors[8],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  addButtonText: {
    color: brandColors[0],
    fontSize: 16,
    fontWeight: '700',
  },
  availableFriendsContainer: {
    marginTop: 15,
    gap: 10,
  },
  availableFriendsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: brandColors[10],
    marginBottom: 10,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brandColors[1],
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  addContactButton: {
    backgroundColor: brandColors[7],
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  addContactButtonText: {
    color: brandColors[0],
    fontSize: 12,
    fontWeight: '600',
  },
  noFriendsText: {
    fontSize: 14,
    color: brandColors[13],
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
});