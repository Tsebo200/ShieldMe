import React, { useEffect, useState, useMemo } from "react";
import { Image, View, Text, TextInput, FlatList, StyleSheet, Alert, SafeAreaView, Platform, TouchableOpacity } from "react-native";
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useNavigation } from "@react-navigation/native";
import Swipeable from "react-native-gesture-handler/Swipeable";
import * as Haptics from "expo-haptics";
import { DropProvider, Draggable, Droppable } from "react-native-reanimated-dnd";
import { Audio } from "expo-av";
import Mascot from "../assets/CrawlDark.svg";
import { SvgUri } from "react-native-svg";

// Define type for friend object
type Friend = {
  uid: string;
  fullName?: string;
  displayName?: string;
  username?: string;
  email?: string;
  avatar?: {
    uri?: string;
    seed?: string;
    style?: string;
  };
};

export default function FriendsScreen() {
  // State variables
  const [allUsers, setAllUsers] = useState<Friend[]>([]); // All users in Firestore
  const [friendUids, setFriendUids] = useState<string[]>([]); // Current user's friends
  const [search, setSearch] = useState(""); // Search input
  const [loading, setLoading] = useState(true); // Loading indicator

  const DICEBEAR_BASE = "https://api.dicebear.com/9.x"; // Base URL for default avatars
  const navigation = useNavigation(); // React Navigation hook
  const currentUid = auth.currentUser?.uid; // Current logged-in user ID

  // Derived list of friends
  const friends = useMemo(
    () => allUsers.filter((u) => friendUids.includes(u.uid)),
    [allUsers, friendUids]
  );

  // Derived list of non-friends
  const nonFriends = useMemo(
    () => allUsers.filter((u) => u.uid !== currentUid && !friendUids.includes(u.uid)),
    [allUsers, friendUids, currentUid]
  );

  // Filtered list based on search query
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return nonFriends.filter((u) => (u.fullName || "").toLowerCase().includes(q));
  }, [search, nonFriends]);

  // Subscribe to Firestore users and current user friends
  useEffect(() => {
    if (!currentUid) {
      setAllUsers([]);
      setFriendUids([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Listen to all users
    const usersCol = collection(db, "users");
    const unsubAll = onSnapshot(
      usersCol,
      (snapshot) => {
        const users = snapshot.docs.map((d) => {
          const data = d.data() as any;
          const uid = (data.uid as string) || d.id;
          return {
            uid,
            fullName: data.fullName || data.displayName || data.name || "",
            email: data.email || "",
            avatar: data.avatar || undefined,
            ...data,
          } as Friend;
        });
        setAllUsers(users);
        setLoading(false);
      },
      (err) => {
        if (err.code === "permission-denied" && !auth.currentUser) {
          console.debug("FriendsScreen: ignoring snapshot error (signed-out)");
          setLoading(false);
          return;
        }
        console.error("users onSnapshot error:", err);
        setLoading(false);
      }
    );

    // Listen to current user's friends
    const currentUserRef = doc(db, "users", currentUid);
    const unsubCurrent = onSnapshot(
      currentUserRef,
      (snap) => {
        if (!snap.exists()) {
          setFriendUids([]);
          return;
        }
        const data = snap.data() as any;
        setFriendUids(Array.isArray(data.friends) ? data.friends : []);
      },
      (err) => {
        if (err.code === "permission-denied" && !auth.currentUser) {
          console.debug("FriendsScreen: ignoring snapshot error (signed-out)");
          return;
        }
        console.error("current user snapshot error:", err);
      }
    );

    // Cleanup subscriptions
    return () => {
      unsubAll();
      unsubCurrent();
    };
  }, [currentUid]);

  // Sound effects
  const playAddFriendSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(require("../assets/friendSound.mp3"));
      await sound.playAsync();
    } catch {}
  };

  const playRemoveFriendSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(require("../assets/RemoveSound.mp3"));
      await sound.playAsync();
    } catch {}
  };

  // Add friend handler
  const handleAddFriend = async (targetUid: string) => {
    if (!currentUid) return Alert.alert("Not signed in");
    const meRef = doc(db, "users", currentUid);
    await updateDoc(meRef, { friends: arrayUnion(targetUid) });
    await playAddFriendSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSearch(""); // Clear search after adding
  };

  // Remove friend handler
  const handleDelete = async (targetUid: string) => {
    if (!currentUid) return Alert.alert("Not signed in");
    const meRef = doc(db, "users", currentUid);
    await updateDoc(meRef, { friends: arrayRemove(targetUid) });
    await playRemoveFriendSound();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Navigation functions
  const goHome = () => navigation.navigate("HomeScreen" as never);
  const goTrip = () => navigation.navigate("TripScreen" as never);

  // Render avatar for user
  const renderAvatar = (user: Friend, size: number = 48) => {
    const avatarFromDoc = user.avatar;
    let avatarUri: string | undefined;

    if (avatarFromDoc?.uri) {
      avatarUri = avatarFromDoc.uri; // Use custom avatar URI
    } else if (avatarFromDoc?.seed && avatarFromDoc?.style) {
      // Generate Dicebear avatar using seed and style
      avatarUri = `${DICEBEAR_BASE}/${avatarFromDoc.style}/svg?seed=${encodeURIComponent(
        avatarFromDoc.seed.trim().replace(/\s+/g, "_")
      )}`;
    } else {
      // Default Dicebear avatar
      const seed = (user.fullName || user.username || "anonymous").trim().replace(/\s+/g, "_");
      avatarUri = `${DICEBEAR_BASE}/adventurer/svg?seed=${encodeURIComponent(seed)}`;
    }

    const isPng = avatarUri?.includes("/png") || avatarUri?.toLowerCase().endsWith(".png");
    return isPng ? (
      <Image source={{ uri: avatarUri }} style={{ width: size, height: size, borderRadius: size / 2, marginRight: 12 }} />
    ) : (
      <SvgUri width={size} height={size} uri={avatarUri} />
    );
  };

  // Render when no friends exist
  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>You have no friends added yet.</Text>
      <Text style={styles.emptySubText}>Add some friends to get started!</Text>
    </View>
  );

  // Main JSX
  return (
    <SafeAreaView style={styles.container}>
      <DropProvider>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.header}>My Friends</Text>
        </View>

        {/* Search bar */}
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Search for a user..."
            placeholderTextColor="#CBBC9F"
            value={search}
            onChangeText={setSearch}
          />
          {/* Dropdown search results */}
          {search.length > 0 && (
            <View style={styles.dropdown}>
              {filteredUsers.length === 0 ? (
                <Text style={styles.dropdownItem}>No users found</Text>
              ) : (
                filteredUsers.map((u) => (
                  <TouchableOpacity key={u.uid} onPress={() => handleAddFriend(u.uid)}>
                    <View style={styles.row}>
                      {renderAvatar(u, 40)}
                      <Text style={styles.dropdownItem}>{u.fullName || u.email}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </View>

        {/* Friends list */}
        <View style={[styles.card, { flex: 1, marginTop: 20 }]}>
          <FlatList
            data={friends}
            keyExtractor={(item) => item.uid}
            ListEmptyComponent={renderEmpty} // Show empty state if no friends
            contentContainerStyle={friends.length === 0 ? { flexGrow: 1, justifyContent: "center" } : {}}
            renderItem={({ item }) => (
              <Swipeable
                overshootRight={false}
                onSwipeableRightOpen={() => handleDelete(item.uid)} // Swipe to delete friend
                renderRightActions={() => (
                  <View style={styles.swipeBackground}>
                    <Text style={styles.swipeText}>🗑️ Remove</Text>
                  </View>
                )}
              >
                <View style={styles.item}>
                  <View style={styles.row}>
                    {renderAvatar(item, 48)}
                    <Text style={styles.name}>{item.fullName || item.email}</Text>
                  </View>
                </View>
              </Swipeable>
            )}
          />
        </View>

        {/* Drag & drop navigation */}
        <View style={styles.navZones}>
          <Droppable id="go-home" style={styles.navDropZone} onDrop={goHome} activeStyle={styles.dropZoneActive}>
            <Text style={styles.navDropText}>🏠 Go Home</Text>
          </Droppable>
          <Droppable id="go-trip" style={styles.navDropZone} onDrop={goTrip} activeStyle={styles.dropZoneActive}>
            <Text style={styles.navDropText}>🚗 Go Trip</Text>
          </Droppable>
        </View>

        {/* Draggable mascot */}
        <View style={styles.navIcons}>
          <Draggable id="home-icon" data={undefined} style={styles.navDraggable}>
            <Mascot style={styles.mascotIcon} />
          </Draggable>
        </View>
      </DropProvider>
    </SafeAreaView>
  );
}
// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#232625",
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  headerContainer: { paddingVertical: 12, marginHorizontal: 20 },
  header: {
    fontSize: 28,
    fontWeight: "700",
    color: "#CBBC9F",
    textAlign: "center",
  },
  card: {
    backgroundColor: "#393031",
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
  },
  input: {
    backgroundColor: "#232625",
    color: "#F1EFE5",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  dropdown: {
    backgroundColor: "#232625",
    borderRadius: 8,
    marginTop: 8,
    padding: 8,
  },
  dropdownItem: { paddingVertical: 8, color: "#F0E4CB" },
  name: { fontSize: 16, color: "#F0E4CB" },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: "#232625",
  },
  swipeBackground: {
    backgroundColor: "#ED1C25",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    marginBottom: 12,
    borderRadius: 10,
  },
  swipeText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  emptyState: { alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 18, color: "#CBBC9F", marginBottom: 6 },
  emptySubText: { fontSize: 14, color: "#755540" },
  navZones: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  navDropZone: {
    width: 120,
    height: 80,
    backgroundColor: "#393031",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#755540",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  navDropText: { color: "#F1EFE5", fontSize: 16 },
  navIcons: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
  },
  navDraggable: {
    backgroundColor: "#755540",
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  mascotIcon: {
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  dropZoneActive: {
    transform: [{ scale: 1.04 }],
    borderStyle: "solid",
    backgroundColor: "#755540",
    borderColor: "#F1EFE5",
  },
  row: { flexDirection: "row", alignItems: "center" },
});
