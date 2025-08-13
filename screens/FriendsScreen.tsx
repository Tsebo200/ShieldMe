import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from 'firebase';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av'; // ⬅️ add this import at the top

export default function FriendsScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(true);
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


  // Navigation handlers
  const handleNavigate = () => {
    navigation.replace('TripScreen');
  };

  return (
    <SafeAreaView style={styles.container}>
    <View style={styles.padContainer}>
      <Text style={styles.header}>Add a Friend</Text>

      <Picker
        selectedValue={selectedUser}
        onValueChange={(itemValue) => setSelectedUser(itemValue)}
        style={styles.picker}
      >
        <Picker.Item label="Select a friend..." value="" />
        {users.map(user => (
          <Picker.Item key={user.uid} label={user.fullName} value={user.uid} />
        ))}
      </Picker>

      <TouchableOpacity style={styles.addButton} onPress={handleAddFriend}>
        <Text style={styles.addButtonText}>Add Friend</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.addButton} onPress={handleNavigate}>
        <Text style={styles.addButtonText}>Start Trip</Text>
      </TouchableOpacity>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#232625', padding: 20 },
  header: { fontSize: 22, color: '#F8C1E1', marginBottom: 20 },
  picker: { backgroundColor: '#393031', color: '#fff', marginBottom: 20 },
  addButton: { backgroundColor: '#F8C1E1', padding: 12, borderRadius: 8 },
  addButtonText: { color: '#232625', textAlign: 'center', fontWeight: '600' },
});
