import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, Vibration, Platform, Pressable } from 'react-native';
import { DropProvider, Draggable, Droppable } from 'react-native-reanimated-dnd';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';

type Friend = { id: string; name: string };

export default function ETAShareScreen() {
  const { remainingTime, tripId } = useRoute<any>().params || {};
  const navigation = useNavigation<any>();
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const friendsCollection = collection(db, 'users', user.uid, 'friends');
    const unsubscribe = onSnapshot(friendsCollection, snapshot => {
      const loadedFriends: Friend[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as { name: string })
      }));
      setFriends(loadedFriends);
    }, error => {
      console.error('Error fetching friends:', error);
    });

    return unsubscribe;
  }, []);

  const handleCollectDrop = (friend?: Friend) => {
    if (!friend) return;
    if (!Array.isArray(selectedFriends)) return;
    if (selectedFriends.find((f) => f.id === friend.id)) return;
    setSelectedFriends((prev) => [...prev, friend]);
  };

  const handleRemoveFriend = (id: string) => {
    setSelectedFriends((prev) => prev.filter((f) => f.id !== id));
  };

  const handleConfirmShare = async () => {
    if (!tripId) {
      Alert.alert('Missing trip ID', 'Trip ID not provided.');
      return;
    }

    if (selectedFriends.length === 0) {
      Alert.alert('No friends selected', '⚠️ Please share ETA with friends first.');
      return;
    }

    // Haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Vibration.vibrate(50);
    }

    try {
      const friendIDs = selectedFriends.map(f => f.id); // Defensive array mapping
      const tripRef = doc(db, 'trips', tripId);

      console.log('Sharing ETA with friends:', friendIDs);

      await updateDoc(tripRef, {
        sharedFriends: friendIDs,
      });

      const names = selectedFriends.map((f) => f.name).join(', ');
      Alert.alert('✅ ETA Shared', `Your ETA (${remainingTime} mins) sent to: ${names}`);
      navigation.goBack();
    } catch (error) {
      console.error('Error updating trip with friends:', error);
      Alert.alert('Error', 'Failed to share ETA.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.padContainer}>
        <DropProvider>
          <Text style={styles.title}>📡 Share ETA with Friends</Text>
          <Text style={styles.subtitle}>Time Left: {remainingTime} mins</Text>

          <Text style={styles.sectionTitle}>Drag friends here:</Text>
          <Droppable<Friend>
            id="collect-zone"
            style={styles.collectZone}
            onDrop={(data) => handleCollectDrop(data)}
          >
            {selectedFriends.length > 0 ? (
              <View style={styles.badgesContainer}>
                {selectedFriends.map((f) => (
                  <Pressable
                    key={f.id}
                    style={styles.friendBadge}
                    onPress={() => handleRemoveFriend(f.id)}
                  >
                    <Text style={styles.friendBadgeText}>{f.name} ✕</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.collectText}>No friends yet</Text>
            )}
          </Droppable>

          <View style={styles.friendsList}>
            {friends.map((friend) => (
              <Draggable<Friend>
                key={friend.id}
                id={friend.id}
                data={friend}
                style={styles.draggable}
              >
                <Text style={styles.draggableText}>{friend.name}</Text>
              </Draggable>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Drag share icon here to confirm:</Text>
          <Droppable<void>
            id="confirm-zone"
            style={styles.confirmZone}
            onDrop={handleConfirmShare}
          >
            <Text style={styles.confirmText}>
              Drop 📨 to send ETA
            </Text>
          </Droppable>

          <Draggable<void>
            id="share-icon"
            data={undefined}
            style={styles.shareIcon}
          >
            <Text style={styles.shareIconText}>📨</Text>
          </Draggable>
        </DropProvider>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#393031', padding: 24, justifyContent: 'center' },
  padContainer: { paddingHorizontal: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#CBBC9F', textAlign: 'center', marginBottom: 10 },
  subtitle: { fontSize: 16, color: '#F1EFE5', textAlign: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 18, color: '#CBBC9F', marginTop: 20, marginBottom: 10 },
  collectZone: {
    minHeight: 80,
    backgroundColor: '#232625',
    borderWidth: 2,
    borderColor: '#755540',
    borderRadius: 10,
    padding: 10,
    justifyContent: 'center',
  },
  collectText: { color: '#F1EFE5', fontSize: 16 },
  badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  friendBadge: {
    backgroundColor: '#755540',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  friendBadgeText: { color: '#F1EFE5', fontSize: 14 },
  friendsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 20,
  },
  draggable: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#755540',
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    margin: 4,
  },
  draggableText: { color: '#F1EFE5' },
  confirmZone: {
    height: 80,
    backgroundColor: '#232625',
    borderWidth: 2,
    borderColor: '#755540',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  confirmText: { color: '#F1EFE5', fontSize: 16 },
  shareIcon: {
    backgroundColor: '#755540',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  shareIconText: { fontSize: 28, color: '#F1EFE5' },
});
