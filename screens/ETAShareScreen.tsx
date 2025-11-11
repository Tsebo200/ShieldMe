import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, Vibration, Platform, Pressable, Image, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { SvgUri } from 'react-native-svg';
import { useAudioPlayer } from 'expo-audio';
import { Draggable, Droppable } from 'react-native-reanimated-dnd';
import { autoUpdateEmergencyContacts } from '../services/emergencyContactService';

type Friend = { id: string; name: string; avatar?: any };

// Base URL for Dicebear avatars
const DICEBEAR_BASE = "https://api.dicebear.com/9.x";

export default function ETAShareScreen() {
  // Extract parameters passed to this screen (remainingTime in mins, tripId)
  const { remainingTime, tripId } = useRoute<any>().params || {};
  const navigation = useNavigation<any>();

  // Local state
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]); // Friends chosen to share ETA with
  const [friends, setFriends] = useState<Friend[]>([]); // All friends of current user
  const [currentUserName, setCurrentUserName] = useState<string>('Friend'); // Current user's display name
  
  // Audio players (expo-audio)
  const addFriendPlayer = useAudioPlayer(require('../assets/friendSound.mp3'));

  // ------------------------
  // Avatar Resolver
  // ------------------------
  const renderAvatar = (user: Friend, size: number = 48) => {
    const avatarFromDoc = user.avatar;
    let avatarUri: string | undefined;

    // Check if user has a custom avatar in Firebase
    if (avatarFromDoc?.uri) {
      avatarUri = avatarFromDoc.uri;
    } 
    // Otherwise, use Dicebear avatar based on seed + style
    else if (avatarFromDoc?.seed && avatarFromDoc?.style) {
      avatarUri = `${DICEBEAR_BASE}/${avatarFromDoc.style}/svg?seed=${encodeURIComponent(
        avatarFromDoc.seed.trim().replace(/\s+/g, "_")
      )}`;
    } 
    // Fallback to a default Dicebear adventurer avatar using the user's name
    else {
      const seed = (user.name || "anonymous").trim().replace(/\s+/g, "_");
      avatarUri = `${DICEBEAR_BASE}/adventurer/svg?seed=${encodeURIComponent(seed)}`;
    }

  return <SvgUri width={size} height={size} uri={avatarUri ?? null} />;
  };

  // ------------------------
  // Fetch current user & friends
  // ------------------------
  useEffect(() => {
    const fetchFriends = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        // Get current user data from Firestore
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;

        const userData = userSnap.data() as any;

        // Set current user's display name
        setCurrentUserName(userData.fullName || userData.displayName || user.email || 'Friend');

        // Fetch friends from Firestore
        const friendUids: string[] = userData.friends || [];
        if (!friendUids.length) return setFriends([]);

        const friendDocs = await Promise.all(
          friendUids.map(async (fid) => {
            try {
              const fRef = doc(db, 'users', fid);
              const fSnap = await getDoc(fRef);
              if (!fSnap.exists()) return null;

              const fData = fSnap.data() as any;
              return {
                id: fid,
                name: fData.fullName || fData.displayName || fData.email || "Friend",
                avatar: fData.avatar,
              };
            } catch (err) {
              console.warn(`Could not fetch friend ${fid}:`, err);
              return null;
            }
          })
        );

        setFriends(friendDocs.filter(Boolean) as Friend[]);
      } catch (err) {
        console.error('Error fetching friends:', err);
      }
    };

    fetchFriends();
  }, []);

  // ------------------------
  // Drag & Drop handlers
  // ------------------------

  // When a friend is dropped into the "collect" zone
  const handleCollectDrop = (friend?: Friend) => {
    if (!friend) return;
    if (selectedFriends.find(f => f.id === friend.id)) return; // Avoid duplicates
    setSelectedFriends(prev => [...prev, friend]);
    // Play sound when a friend is added
    playAddFriendSound();
  };

  // Handle tap on friend to add them
  const handleFriendTap = (friend: Friend) => {
    handleCollectDrop(friend);
  };

  // Remove a friend from the selected list
  const handleRemoveFriend = (id: string) => {
    setSelectedFriends(prev => prev.filter(f => f.id !== id));
  };

  // Play sound when a friend is added
  const playAddFriendSound = async () => {
    try {
      // Reset to start and play
      await addFriendPlayer.seekTo(0);
      addFriendPlayer.play();
    } catch (err) {
      console.error('Error playing sound:', err);
    }
  };

  // ------------------------
  // Confirm Share Handler
  // ------------------------
  const handleConfirmShare = async (data?: any) => {
    // Basic validation
    if (!tripId) return Alert.alert('Missing trip ID', 'Trip ID not provided.');
    if (!selectedFriends.length) return Alert.alert('No friends selected', '⚠️ Please share ETA with friends first.');

    // Haptic / vibration feedback
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Vibration.vibrate(50);
    }

    try {
      const user = auth.currentUser;
      if (!user) return Alert.alert('Not signed in', 'Please sign in and try again.');

      // Fetch the trip document
      const tripRef = doc(db, 'trips', tripId);
      const tripSnap = await getDoc(tripRef);
      if (!tripSnap.exists()) return Alert.alert('Trip not found', 'Cannot locate trip.');

      const tripData = tripSnap.data() || {};

      // Update trip's sharedFriends list
      const friendIDs = selectedFriends.map(f => f.id);
      await updateDoc(tripRef, { sharedFriends: friendIDs });

      // Generate ETA timestamps
      const etaIso = typeof remainingTime === 'number'
        ? new Date(Date.now() + remainingTime * 60_000).toISOString()
        : new Date().toISOString();

      const etaFriendly = typeof remainingTime === 'number'
        ? `Arrives in ${remainingTime}m`
        : 'ETA available';

      // Create Firestore docs for each selected friend
      const promises = selectedFriends.map(f => {
        const payload = {
          fromUid: user.uid,
          fromDisplayName: currentUserName,
          toUid: f.id,
          tripId,
          currentLocation: tripData.currentLocation || { name: tripData.startName || 'Now' },
          destinationLocation: tripData.destinationLocation || { name: tripData.destinationName || 'Destination' },
          etaIso,
          etaFriendly,
          message: `${currentUserName} shared their ETA with you.`,
          createdAt: serverTimestamp(),
          read: false,
        };
        return addDoc(collection(db, 'eta_shares'), payload);
      });

      await Promise.all(promises);
      await playAddFriendSound();

      // Auto-update emergency contacts with top 2 most shared friends
      autoUpdateEmergencyContacts().catch(err => {
        console.warn('Error auto-updating emergency contacts:', err);
      });

      Alert.alert('✅ ETA Shared', `Your ETA sent to: ${selectedFriends.map(f => f.name).join(', ')}`);
      // Defer navigation to avoid conflicts with drag operation
      requestAnimationFrame(() => {
        navigation.goBack();
      });
    } catch (err) {
      console.error('Error sharing ETA:', err);
      Alert.alert('Error', 'Failed to share ETA.');
    }
  };

  // ------------------------
  // Render
  // ------------------------
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.padContainer}>
          <Text style={styles.title}>📡 Share ETA with Friends</Text>
          <Text style={styles.subtitle}>Time Left: {remainingTime} mins</Text>

          {/* Collection Zone: where friends are dragged to */}
          <Text style={styles.sectionTitle}>Drag & Drop friends here:</Text>
          <Droppable
           
            onDrop={handleCollectDrop}
            style={styles.collectZone}
            activeStyle={{ opacity: 0.7 }}
          >
            {selectedFriends.length ? (
              <View style={styles.badgesContainer}>
                {selectedFriends.map(f => (
                  <Pressable key={f.id} style={styles.friendBadge} onPress={() => handleRemoveFriend(f.id)}>
                    {renderAvatar(f, 28)}
                    <Text style={styles.friendBadgeText}>{f.name} ✕</Text>
                  </Pressable>
                ))}
              </View>
            ) : <Text style={styles.collectText}>No selected friends yet</Text>}
          </Droppable>

          {/* Friends List: draggable and tappable friends */}
          <View style={styles.friendsList}>
            {friends.map(friend => (
              <Pressable
                key={friend.id}
                onPress={() => handleFriendTap(friend)}
                style={({ pressed }) => [
                  styles.draggable,
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Draggable data={friend} style={styles.draggable}>
                  {renderAvatar(friend, 36)}
                  <Text style={styles.draggableText}>{friend.name}</Text>
                </Draggable>
              </Pressable>
            ))}
          </View>

          {/* Confirm Button: Tap Armo to share ETA */}
          <Text style={styles.sectionTitle}>Tap Armo to confirm and send ETA:</Text>
          <TouchableOpacity
            onPress={handleConfirmShare}
            style={styles.confirmZone}
            activeOpacity={0.7}
          >
            <Image 
              source={require('../assets/CrawlDark.png')} 
              style={{ width: 60, height: 60 }} 
              resizeMode="contain"
            />
          </TouchableOpacity>
          <Text style={styles.confirmText}>Tap to send ETA</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#393031",
    padding: 24,
    justifyContent: "center",
  },
  padContainer: { paddingHorizontal: 24 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#CBBC9F",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#F1EFE5",
    textAlign: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#CBBC9F",
    marginTop: 20,
    marginBottom: 10,
  },
  collectZone: {
    minHeight: 80,
    backgroundColor: "#232625",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#755540",
    borderRadius: 10,
    padding: 10,
    justifyContent: "center",
    paddingLeft: 25,
  },
  collectText: { color: "#F1EFE5", fontSize: 16 },
  badgesContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  friendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#755540",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  friendBadgeText: { color: "#F1EFE5", fontSize: 14, marginLeft: 4 },
  friendsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginVertical: 20,
  },
  draggable: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 12,
    backgroundColor: "#755540",
    borderRadius: 12,
    minWidth: 80,
    alignItems: "center",
    margin: 2,
  },
  draggableText: { color: "#F1EFE5", textAlign: "center", marginTop: 4 },
  confirmZone: {
    height: 80,
    width: 80,
    backgroundColor: "#232625",
    borderWidth: 2,
    borderColor: "#755540",
    borderStyle: "dashed",
    borderRadius: 100,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginVertical: 16,
  },
  confirmText: { color: "#F1EFE5", fontSize: 16, alignSelf: "center" },
  shareIcon: {
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: "center",
    marginTop: 30,
    alignItems: "center",
    alignSelf: "flex-end",
  },
  shareIconText: { fontSize: 28, color: "#F1EFE5" },
  dropZoneActive: {
    transform: [{ scale: 1.02 }],
    backgroundColor: "#755540",
    borderColor: "#F1EFE5",
    borderStyle: "solid",
  },
});
