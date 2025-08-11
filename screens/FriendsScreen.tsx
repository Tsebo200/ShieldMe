import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from 'firebase';
import { useNavigation } from '@react-navigation/native';

export default function FriendsScreen() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  // 1️⃣ Fetch all users except current
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnap = await getDocs(collection(db, 'users'));
        const currentUid = auth.currentUser?.uid;
        const list = querySnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.uid !== currentUid);
        setUsers(list);
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // 2️⃣ Add friend to current user's friends list
  const handleAddFriend = async () => {
    if (!selectedUser) {
      Alert.alert('Select a friend first');
      return;
    }
    try {
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) return;

      const userRef = doc(db, 'users', currentUid);
      await updateDoc(userRef, {
        friends: arrayUnion(selectedUser) // Add UID to friends array
      });

      Alert.alert('Friend Added', 'They are now in your friend list');
    } catch (err) {
      console.error('Error adding friend:', err);
      Alert.alert('Error', 'Could not add friend');
    }
  };

  if (loading) return <Text style={{ color: '#fff' }}>Loading users...</Text>;

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
