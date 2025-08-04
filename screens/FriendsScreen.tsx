// screens/FriendsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import {
  onAuthChange,
  subscribeToFriends,
  addFriend,
  updateFriend,
  deleteFriend,
} from '../services/authService';
import { useNavigation } from '@react-navigation/native';

export default function FriendsScreen() {
  const [friends, setFriends] = useState<{ id: string; name: string }[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const navigation = useNavigation();

  // Wait for auth and then subscribe
  useEffect(() => {
    let unsubscribeFriends: () => void;
    const unsubscribeAuth = onAuthChange((user) => {
      if (user) {
        unsubscribeFriends = subscribeToFriends((list) => {
          setFriends(list as any);
        });
      } else {
        setFriends([]);
      }
    });
    return () => {
      unsubscribeAuth();
      unsubscribeFriends && unsubscribeFriends();
    };
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name cannot be empty');
      return;
    }
    try {
      if (editingId) {
        await updateFriend(editingId, name);
        setEditingId(null);
      } else {
        await addFriend(name);
      }
      setName('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleEdit = (id: string, currentName: string) => {
    setName(currentName);
    setEditingId(id);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Friend',
      'Are you sure you want to remove this friend?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteFriend(id),
        },
      ]
    );
  };

  const handleNavigate = () => {
          navigation.replace('TripScreen');
  }

  return (
    <SafeAreaView style={styles.container}>
    <View style={styles.padContainer}>
      <Text style={styles.header}>My Friends</Text>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Enter friend name"
          value={name}
          onChangeText={setName}
        />
        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>{editingId ? 'Update' : 'Add'}</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => handleEdit(item.id, item.name)}>
                <Text style={styles.actionText}>✏️</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)}>
                <Text style={[styles.actionText, styles.delete]}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <TouchableOpacity onPress={handleNavigate}><Text>Navigate To Trip</Text></TouchableOpacity>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  padContainer: {padding: 30},
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  form: { flexDirection: 'row', marginBottom: 20 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  button: {
    marginLeft: 10,
    backgroundColor: '#4caf50',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  name: { fontSize: 16 },
  actions: { flexDirection: 'row', width: 60, justifyContent: 'space-between' },
  actionText: { fontSize: 18 },
  delete: { color: 'red' },
});
