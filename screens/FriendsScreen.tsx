import { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Alert, SafeAreaView, Platform, Vibration } from 'react-native';
import { collection, getDocs, doc, updateDoc, arrayUnion, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from 'firebase';
import { useNavigation } from '@react-navigation/native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import { DropProvider, Draggable, Droppable } from 'react-native-reanimated-dnd';
import { Audio } from 'expo-av'; // ⬅️ add this import at the top

export default function FriendsScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const navigation = useNavigation();
  
// ✅ Efficient real-time updates
  useEffect(() => {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    const userRef = doc(db, 'users', currentUid);

    // Listen to ONLY current user's friends list
    const unsub = onSnapshot(userRef, async (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();
      const friendUids: string[] = data.friends || [];

      // Fetch all users when friends list changes
      const allUsersSnap = await getDocs(collection(db, 'users'));
      const allUsers = allUsersSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // Update friends
      const friendsList = allUsers.filter((u: any) => friendUids.includes(u.uid));
      setFriends(friendsList);

      // Update non-friends list
      const nonFriends = allUsers.filter(
        (u: any) => u.uid !== currentUid && !friendUids.includes(u.uid)
      );
      setUsers(nonFriends);

      // Apply search filter
      setFilteredUsers(
        nonFriends.filter(user =>
          user.fullName.toLowerCase().includes(search.toLowerCase())
        )
      );
    });

    return () => unsub();
  }, [search]);
  // Play sound helper
const playAddFriendSound = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/friendSound.mp3') // ⬅️ your custom sound file
    );
    await sound.playAsync();
  } catch (error) {
    console.error('Error playing sound:', error);
  }
};

 // Add friend
const handleAddFriend = async (friendUid: string) => {
  try {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) return;

    const userRef = doc(db, 'users', currentUid);
    await updateDoc(userRef, {
      friends: arrayUnion(friendUid)
    });

    // 🔊 Play sound after adding friend
    await playAddFriendSound();

    Alert.alert('Friend Added', 'They are now in your friend list');
    setSearch('');
  } catch (err) {
    console.error('Error adding friend:', err);
    Alert.alert('Error', 'Could not add friend');
  }
};

  // Delete friend
  const handleDelete = async (friendUid: string) => {
    try {
      // Vibration.vibrate(50);
      triggerFeedback();
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) return;

      const userRef = doc(db, 'users', currentUid);
      await updateDoc(userRef, {
        friends: friends.filter(f => f.uid !== friendUid).map(f => f.uid)
      });

      Alert.alert('Friend Removed');
    } catch (err) {
      console.error('Error removing friend:', err);
      Alert.alert('Error', 'Could not remove friend');
    }
  };

  // Drop navigation
  const goHome = () => {
    triggerFeedback();
    navigation.navigate('HomeScreen');
  };

  const goTrip = () => {
    triggerFeedback();
    navigation.navigate('TripScreen');
  };

  const triggerFeedback = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Vibration.vibrate(1000);
    }
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>You have no friends added yet.</Text>
      <Text style={styles.emptySubText}>Add some friends to get started!</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <DropProvider>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.header}>My Friends</Text>
        </View>

        {/* Search */}
        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="Search for a user..."
            placeholderTextColor="#CBBC9F"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <View style={styles.dropdown}>
              {filteredUsers.map(user => (
                <Text
                  key={user.uid}
                  style={styles.dropdownItem}
                  onPress={() => handleAddFriend(user.uid)}
                >
                  {user.fullName}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Friends List */}
        <View style={[styles.card, { flex: 1, marginTop: 20 }]}>
          <FlatList
            data={friends}
            keyExtractor={(item) => item.uid}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={friends.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : {}}
            renderItem={({ item }) => (
              <Swipeable
                overshootRight={false}
                onSwipeableRightOpen={() => handleDelete(item.uid)}
                renderRightActions={() => (
                  <View style={styles.swipeBackground}>
                    <Text style={styles.swipeText}>🗑️ Remove</Text>
                  </View>
                )}
              >
                <View style={styles.item}>
                  <Text style={styles.name}>{item.fullName}</Text>
                </View>
              </Swipeable>
            )}
          />
        </View>

        {/* Drag & Drop Navigation */}
        <View style={styles.navZones}>
          <Droppable<void> id="go-home" style={styles.navDropZone} onDrop={goHome}>
            <Text style={styles.navDropText}>🏠 Go Home</Text>
          </Droppable>
          <Droppable<void> id="go-trip" style={styles.navDropZone} onDrop={goTrip}>
            <Text style={styles.navDropText}>🚗 Go Trip</Text>
          </Droppable>
        </View>

        <View style={styles.navIcons}>
          <Draggable<void> id="home-icon" data={undefined} style={styles.navDraggable}>
            <Text style={styles.navDraggableText}>🏠</Text>
          </Draggable>
          <Draggable<void> id="trip-icon" data={undefined} style={styles.navDraggable}>
            <Text style={styles.navDraggableText}>🚗</Text>
          </Draggable>
        </View>
      </DropProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#232625",
    paddingTop: Platform.OS === "android" ? 25 : 0,
  },
  headerContainer: {
    borderBottomColor: "#393031",
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginHorizontal: 20,
  },
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
  navDraggableText: { fontSize: 28, color: "#F1EFE5" },
});
