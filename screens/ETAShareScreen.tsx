import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Alert,
  Vibration,
  Platform,
  Pressable,
} from 'react-native';
import {
  DropProvider,
  Draggable,
  Droppable,
} from 'react-native-reanimated-dnd';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

// Friend type definition
type Friend = { id: string; name: string };

export default function ETAShareScreen() {
  const { remainingTime } = useRoute<any>().params || {};
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

  // Add friend to initial drop zone
  const handleCollectDrop = (friend?: Friend) => {
    if (!friend) return;
    if (selectedFriends.find((f) => f.id === friend.id)) return;
    setSelectedFriends((prev) => [...prev, friend]);
  };

  // Remove friend if pressed
  const handleRemoveFriend = (id: string) => {
    setSelectedFriends((prev) => prev.filter((f) => f.id !== id));
  };

  // Final share confirmation
  const handleConfirmShare = () => {
    if (selectedFriends.length === 0) {
      Alert.alert('No friends selected', 'Drag friends into the box first.');
      return;
    }
    // Haptic + vibration
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Vibration.vibrate(50);
    }
    const names = selectedFriends.map((f) => f.name).join(', ');
    Alert.alert('✅ ETA Shared', `Your ETA (${remainingTime} mins) sent to: ${names}`);
    // Navigate back to TimerScreen
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.padContainer}>
        <DropProvider>
          <Text style={styles.title}>📡 Share ETA with Friends</Text>
          <Text style={styles.subtitle}>Time Left: {remainingTime} mins</Text>

          {/* Friend selection zone */}
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

          {/* Friend draggables */}
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

          {/* Confirm share zone */}
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

          {/* Share icon draggable */}
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
  container: { flex: 1, backgroundColor: '#121212', justifyContent:'center',},
  title: { fontSize: 22, fontWeight: '600', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#ccc', textAlign: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 18, color: '#fff', marginTop: 20, marginBottom: 10 },
  padContainer: {paddingInline: 25},
  collectZone: {
    minHeight: 80,
    backgroundColor: '#1e1e1e',
    borderWidth: 2,
    borderColor: '#444',
    borderRadius: 12,
    padding: 10,
    justifyContent: 'center',
  },
  collectText: { color: '#777', fontSize: 16 },
  badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  friendBadge: {
    backgroundColor: '#2c2c2e',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    margin: 4,
  },
  friendBadgeText: { color: '#fff', fontSize: 14 },
  friendsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 20,
  },
  draggable: {
    padding: 10,
    backgroundColor: '#333',
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
    margin: 4,
  },
  draggableText: { color: '#fff' },
  confirmZone: {
    height: 100,
    backgroundColor: '#1e1e1e',
    borderWidth: 2,
    borderColor: '#0088ff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  confirmText: { color: '#0088ff', fontSize: 16 },
  shareIcon: {
    backgroundColor: '#0088ff',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end'
  },
  shareIconText: { fontSize: 28, color: '#fff' },
});
