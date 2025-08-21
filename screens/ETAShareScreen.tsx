import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, Vibration, Platform, Pressable } from 'react-native';
import { DropProvider, Draggable, Droppable } from 'react-native-reanimated-dnd';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, getDocs, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { doc as docRef, } from "firebase/firestore"; // avoid name conflict with your doc import
import { Audio } from 'expo-av';
import Mascot  from '../assets/CrawlDark.svg';

type Friend = { id: string; name: string };

export default function ETAShareScreen() {
  const { remainingTime, tripId } = useRoute<any>().params || {};
  const navigation = useNavigation<any>();
  const [selectedFriends, setSelectedFriends] = useState<Friend[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);

  // Fetch friends from user doc

  useEffect(() => {
  const fetchFriends = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      // 1️⃣ Get current user doc to read `friends` array
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) return;
      const userData = userSnap.data();
      const friendUids: string[] = userData.friends || [];

      if (friendUids.length === 0) {
        setFriends([]);
        return;
      }

      // 2️⃣ Fetch each friend doc individually (not all users)
      const friendDocs = await Promise.all(
        friendUids.map(async (fid) => {
          try {
            const fRef = doc(db, "users", fid);
            const fSnap = await getDoc(fRef);
            if (fSnap.exists()) {
              const fData = fSnap.data() as any;
              return {
                id: fid,
                name: fData.fullName || fData.displayName || fData.email || "Friend"
              };
            }
          } catch (err) {
            console.warn(`Could not fetch friend ${fid}:`, err);
          }
          return null;
        })
      );

      // 3️⃣ Filter out nulls
      const friendList = friendDocs.filter(Boolean) as Friend[];
      setFriends(friendList);
    } catch (error) {
      console.error('Error fetching friends for ETA Share:', error);
    }
  };

  fetchFriends();
}, []);


  const handleCollectDrop = (friend?: Friend) => {
    if (!friend) return;
    if (selectedFriends.find((f) => f.id === friend.id)) return;
    setSelectedFriends((prev) => [...prev, friend]);
  };

  const handleRemoveFriend = (id: string) => {
    setSelectedFriends((prev) => prev.filter((f) => f.id !== id));
  };

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

  /**
   * Updated sharing logic:
   * - Fetch trip data to populate ETA share document
   * - Update trip.sharedFriends 
   * - Create one `eta_shares` doc per selected friend so recipients can listen & preview
   */
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
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Not signed in', 'Please sign in and try again.');
        return;
      }

      // 1) Read trip data (to include current/destination locations and any trip metadata)
      const tripRef = doc(db, 'trips', tripId);
      const tripSnap = await getDoc(tripRef);
      if (!tripSnap.exists()) {
        Alert.alert('Trip not found', 'Cannot locate trip information.');
        return;
      }
      const tripData = tripSnap.data() || {};

      // 2) Update trip.sharedFriends 
      const friendIDs = selectedFriends.map(f => f.id);
      await updateDoc(tripRef, { sharedFriends: friendIDs });

      // 3) Create eta_shares docs (one per friend) so recipients receive preview
      // compute an ETA ISO based on remainingTime (assumed minutes)
      const etaIso = typeof remainingTime === 'number'
        ? new Date(Date.now() + remainingTime * 60_000).toISOString()
        : new Date().toISOString();

      const etaFriendly = typeof remainingTime === 'number'
        ? `Arrives in ${remainingTime}m`
        : 'ETA available';


      const userRef = docRef(db, "users", user.uid);
      let senderName = user.displayName || user.email || "Friend";
      try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const ud = userSnap.data() as any;
          // prefer a fullName field stored in your users doc, fallback to displayName/email
          senderName = (ud.fullName || ud.full_name || ud.displayName || user.displayName || user.email || "Friend");
        }
      } catch (err) {
        console.warn("Could not read sender user doc for name fallback:", err);
      }


      const promises = selectedFriends.map((f) => {
        const payload = {
          fromUid: user.uid,
          // fromDisplayName: user.displayName || user.email || 'Friend',
          fromDisplayName: senderName,   // <-- guaranteed to be a readable name now
          toUid: f.id,
          tripId: tripId,
          currentLocation: tripData.currentLocation || { name: tripData.startName || 'Now' },
          destinationLocation: tripData.destinationLocation || { name: tripData.destinationName || 'Destination' },
          etaIso,
          etaFriendly,
          // message: `${user.displayName || 'A friend'} shared their ETA with you.`,
          message: `${senderName} shared their ETA with you.`,
          createdAt: serverTimestamp(),
          read: false,
        };
        return addDoc(collection(db, 'eta_shares'), payload);
      });

      await Promise.all(promises);

      const names = selectedFriends.map((f) => f.name).join(', ');
      await playAddFriendSound(); // play sound after sharing
      Alert.alert('✅ ETA Shared', `Your ETA (${remainingTime} mins) sent to: ${names}`);
      navigation.goBack();
    } catch (error) {
      console.error('Error sharing ETA:', error);
      Alert.alert('Error', 'Failed to share ETA.');
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.padContainer}>
        <DropProvider>
          <Text style={styles.title}>📡 Share ETA with Friends</Text>
          <Text style={styles.subtitle}>Time Left: {remainingTime} mins</Text>

          <Text style={styles.sectionTitle}>Drag & Drop friends here:</Text>
          <Droppable<Friend>
            id="collect-zone"
            style={styles.collectZone}
            onDrop={(data) => handleCollectDrop(data)}
            activeStyle={styles.dropZoneActive}
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
              <Text style={styles.collectText}>No selected friends yet</Text>
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

          <Text style={styles.sectionTitle}>Drag & Drop Armo's here to confirm:</Text>
          <Droppable<void>
            id="confirm-zone"
            style={styles.confirmZone}
            onDrop={handleConfirmShare}
            activeStyle={styles.dropZoneActive}
          >
            <Text style={styles.confirmText}>Drop Armo to send ETA</Text>
          </Droppable>

          <Draggable<void>
            id="share-icon"
            data={undefined}
            style={styles.shareIcon}
          >
            <Mascot style={styles.shareIconText} />
            {/* <Text style={styles.shareIconText}>📨</Text> */}
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
    borderStyle: 'dashed',
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
    borderStyle: 'dashed',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'flex-start',
    // marginVertical: 20,
  },
  confirmText: { color: '#F1EFE5', fontSize: 16, paddingLeft: 10},
  shareIcon: {
    // backgroundColor: '#755540',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    marginTop: 30,
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  shareIconText: { fontSize: 28, color: '#F1EFE5' },
  dropZoneActive:{
    transform: [{ scale: 1.02 }], // Slightly enlarge hover state
    backgroundColor: '#755540', // Warm brown for hover effect
    borderColor: '#F1EFE5', // Light cream border on hover
    borderStyle: 'solid',
  }
});
