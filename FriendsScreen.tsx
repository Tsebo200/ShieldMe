import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, SafeAreaView, Platform} from 'react-native';
import { onAuthChange, subscribeToFriends, addFriend, updateFriend, deleteFriend} from '../services/authService';
import { useNavigation } from '@react-navigation/native';

export default function FriendsScreen() {
  const [friends, setFriends] = useState<{ id: string; name: string }[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const navigation = useNavigation();

  // Handling authentication and friend list subscription
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

  // Handling the saving of friend after addition, update, and deletion
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
// Handling the edit of friends
  const handleEdit = (id: string, currentName: string) => {
    setName(currentName);
    setEditingId(id);
  };
// Handle the deletion of friends
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
// Navigation handlers
  const handleNavigate = () => {
    navigation.replace('TripScreen');
  };
  const handleNavigate2 = () => {
    navigation.replace('HomeScreen');
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>You have no friends added yet.</Text>
      <Text style={styles.emptySubText}>Add some friends to get started!</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>My Friends</Text>
      </View>

      {/* Input Form Card */}
      <View style={styles.card}>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Enter friend name"
            placeholderTextColor="#CBBC9F"
            value={name}
            onChangeText={setName}
            autoCorrect={false}
            autoCapitalize="words"
          />
          <TouchableOpacity style={styles.button} onPress={handleSave} activeOpacity={0.7}>
            <Text style={styles.buttonText}>{editingId ? 'Update' : 'Add'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Friends List Card */}
      <View style={[styles.card, { flex: 1, marginTop: 20 }]}>
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={friends.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : {}}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => handleEdit(item.id, item.name)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.actionText, styles.delete]}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>

      {/* Bottom Navigation Buttons */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={handleNavigate2} activeOpacity={0.7}>
          <Text style={styles.navButtonText}>Go to Home</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navButton} onPress={handleNavigate} activeOpacity={0.7}>
          <Text style={styles.navButtonText}>Go to Trip</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#232625',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  headerContainer: {
    borderBottomColor: '#393031',
    borderBottomWidth: 1,
    paddingVertical: 12,
    marginHorizontal: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#CBBC9F',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#393031',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  form: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    backgroundColor: '#232625',
    color: '#F1EFE5',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
  },
  button: {
    marginLeft: 12,
    backgroundColor: '#755540',
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonText: {
    color: '#F1EFE5',
    fontSize: 16,
    fontWeight: '600',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 10,
    backgroundColor: '#232625',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  name: {
    fontSize: 16,
    color: '#F0E4CB',
  },
  actions: {
    flexDirection: 'row',
    width: 60,
    justifyContent: 'space-between',
  },
  actionText: {
    fontSize: 22,
    color: '#CBBC9F',
  },
  delete: {
    color: '#ED1C25',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#CBBC9F',
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 14,
    color: '#755540',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    backgroundColor: '#393031',
    marginTop: 10,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 4,
  },
  navButton: {
    backgroundColor: '#755540',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
  },
  navButtonText: {
    color: '#F1EFE5',
    fontWeight: '700',
    fontSize: 16,
  },
});
