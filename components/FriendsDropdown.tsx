import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView, TextInput, ScrollView } from 'react-native';
import { collection, getDocs, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigation } from '@react-navigation/native';

export default function FriendsDropDown() {
  const [users, setUsers] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  // 1️⃣ Fetch all users except current
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnap = await getDocs(collection(db, 'users'));
        const currentUid = auth.currentUser?.uid;
        const list = querySnap.docs
          .map(d => {
            const data = d.data() as any;
            return { id: d.id, uid: data.uid || d.id, ...data };
          })
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

  // 2️⃣ Filter users as you type
  useEffect(() => {
    if (!query.trim()) {
      setFilteredUsers([]);
      return;
    }
    const matches = users.filter(user =>
      user.fullName.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredUsers(matches);
  }, [query, users]);

  // 3️⃣ Add friend to current user's friends list
  const handleAddFriend = async (friendUid: string) => {
    try {
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) return;

      const userRef = doc(db, 'users', currentUid);
      await updateDoc(userRef, {
        friends: arrayUnion(friendUid) // Add UID to friends array
      });

      Alert.alert('Friend Added', 'They are now in your friend list');
      setQuery('');
      setFilteredUsers([]);
    } catch (err) {
      console.error('Error adding friend:', err);
      Alert.alert('Error', 'Could not add friend');
    }
  };

  if (loading) return <Text style={{ color: '#fff' }}>Loading users...</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search for a friend..."
        placeholderTextColor="#CBBC9F"
        value={query}
        onChangeText={setQuery}
      />

      {filteredUsers.length > 0 && (
        <ScrollView style={styles.dropdown}>
          {filteredUsers.map(user => (
            <TouchableOpacity
              key={user.uid}
              style={styles.dropdownItem}
              onPress={() => handleAddFriend(user.uid)}
            >
              <Text style={{ color: '#fff' }}>{user.fullName}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  input: {
    backgroundColor: '#393031',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  dropdown: {
    marginTop: 6,
    backgroundColor: '#393031',
    borderRadius: 8,
    maxHeight: 150,
  },
  dropdownItem: {
    padding: 12,
    borderBottomColor: '#232625',
    borderBottomWidth: 1,
  },
});
