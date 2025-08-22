import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Draggable, Droppable, DropProvider } from 'react-native-reanimated-dnd';
import { useTrip } from '../context/TripContext';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';

export default function TimerScreen({ route, navigation }:any) {
  const { etaSeconds } = route.params;
  const [remaining, setRemaining] = useState(etaSeconds);
  const { tripData } = useTrip();
  const intervalRef = useRef<NodeJS.Timer | null>(null);
  
useEffect(() => {
  intervalRef.current = setInterval(() => {
    setRemaining((prev) => {
      if (prev <= 1) {
        clearInterval(intervalRef.current!);
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(intervalRef.current!);
}, []);

// ✅ Separate useEffect to handle navigation when remaining hits 0
useEffect(() => {
  if (remaining === 0) {
    navigation.navigate('PuzzleScreen');
  }
}, [remaining]);


  const formatTime = (total: number) => {
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const correctTimeString = formatTime(etaSeconds);

  const handleDrop = (data:any) => {
    if (data?.label === correctTimeString) {
      navigation.navigate('PuzzleScreen');
    } else {
      Alert.alert('Incorrect Time', 'Wrong time match. Try again.');
    }
  };

const handleExpire = async (tripId: string) => {
  try {
    // Ask for permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('Permission denied for location');
      return;
    }

    // Get current location
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;

    // Save to Firestore
    await updateDoc(doc(db, 'trips', tripId), {
      status: 'expired',
      expiredLocation: { latitude, longitude },
    });
  } catch (err) {
    console.error('Error saving expired location:', err);
  }
};


  // Countdown timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, []);

// Navigate to Puzzle logic has been changed to listen for trip updates
useEffect(() => {
  const tripRef = doc(db, 'trips', tripId);
  const unsub = onSnapshot(tripRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      setPuzzleCompleted(data.puzzleCompleted || false);
      setTripStatus(data.status || 'ongoing');
    }
  });
  return unsub;
}, [tripId]);

// Navigate to Puzzle when time is up and puzzle not already completed
useEffect(() => {
  if (remaining === 0 && !puzzleCompleted && tripStatus === 'ongoing') {
     // 1. Mark expired + save location
    handleExpire(tripId);
    navigation.navigate('PuzzleScreen', { tripId });
  }
}, [remaining, puzzleCompleted, tripStatus]);


        <Droppable onDrop={handleDrop}>
          <View style={styles.dropZone}>
            <Text style={styles.dropText}>Drop if already arrived</Text>
          </View>
        </Droppable>

        <Draggable data={{ label: correctTimeString }}>
          <View style={styles.draggable}>
            <Text style={styles.draggableText}>End The Trip</Text>
            {/* <Text style={styles.draggableText}>{correctTimeString}</Text> */}
          </View>
        </Draggable>

        {/* <TouchableOpacity
  style={{ marginTop: 30, backgroundColor: '#2196f3', padding: 16, borderRadius: 10 }}
  onPress={() =>
    navigation.navigate('ETAShareScreen', { remainingTime: Math.ceil(remaining / 60) })
  }
>
  <Text style={{ color: '#fff', textAlign: 'center' }}>📨 Share ETA with Friends</Text>
</TouchableOpacity> */}

      </View>
    </DropProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#393031',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: { fontSize: 24, fontWeight: 'bold', color: '#CBBC9F', marginBottom: 12 },
  info: { fontSize: 16, color: '#F1EFE5', marginBottom: 4 },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#232625',
    borderRadius: 10,
    width: 300,
  },
  timer: { fontSize: 40, fontWeight: 'bold', color: '#F1EFE5', paddingHorizontal: 60 },
  subtext: { fontSize: 16, color: '#CBBC9F', paddingTop: 7 },
  swipeBackground: {
    backgroundColor: '#CBBC9F',
    justifyContent: 'center',
    alignItems: 'center',
    width: '90%',
    height: '100%',
    borderRadius: 10,
  },
  swipeText: { color: '#393031', fontSize: 18 },
  dropZone: {
    width: 250,
    height: 100,
    backgroundColor: '#755540',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  dropText: { fontSize: 16, color: '#F1EFE5' },
  draggable: {
    backgroundColor: '#F8C1E1',
    padding: 12,
    borderRadius: 10,
  },
  draggableText: { fontSize: 18, color: '#393031', fontWeight: 'bold' },
});
