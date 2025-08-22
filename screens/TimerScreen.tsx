import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DropProvider, Draggable, Droppable } from 'react-native-reanimated-dnd';
import { useTrip } from '../context/TripContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import * as Haptics from 'expo-haptics';
import Mascot  from '../assets/CrawlDark.svg'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import MascotLight  from '../assets/CrawlLight.svg'
import * as Location from 'expo-location';


export default function TimerScreen({ }: any) {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { etaSeconds, tripId } = route.params || {};
  const [remaining, setRemaining] = useState(etaSeconds);
  const { tripData } = useTrip();
  const intervalRef = useRef<NodeJS.Timer | null>(null);
  const [puzzleCompleted, setPuzzleCompleted] = useState(false);
  const [tripStatus, setTripStatus] = useState('ongoing');



  const formatTime = (total: number) => {
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

    // Handler for ending trip via drag-and-drop
  const handleDrop = (data: any) => {
    // When user drags the "End The Trip" token here, navigate to Puzzle
    navigation.navigate('PuzzleScreen', { tripId });
  };

  // Swipe to share ETA
  const handleShare = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate('ETAShareScreen', {
      remainingTime: Math.ceil(remaining / 60),
      tripId,
    });
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


  return (
    <DropProvider>
      <View style={styles.container}>
        <Text style={styles.title}>Trip in Progress</Text>
        <Text style={styles.infoCurrent}>From: {tripData?.currentLocation}</Text>
        <Text style={styles.infoDestination}>To: {tripData?.destinationLocation}</Text>

        <Swipeable
          overshootRight={false}
          onSwipeableRightOpen={handleShare}
          renderRightActions={() => (
            <View style={styles.swipeBackground}>
              <Text style={styles.swipeText}>📡 Share ETA</Text>
            </View>
          )}
        >

        {/* <Text style={styles.draggableText}>End The Trip</Text> */}
          <View style={styles.timerContainer}>
            <View style={styles.flexyBoy}>
                <MascotLight width={30} height={30} style={styles.iconDrag}/>
                <Text style={styles.timer}>{formatTime(remaining)}</Text>
            </View>
              <Text style={styles.subtext}>Time left to arrival</Text>
              <Text style={styles.subtext}>(Swipe right to share ETA)</Text>
          </View>
         
        </Swipeable>
        
          <Text style={styles.dropText}>Drop Armo Below if you already arrived</Text>
          <View style={styles.flexyBoy2}>
        <Droppable onDrop={handleDrop}  style={styles.dropZone}  activeStyle={styles.dropZoneActive}>
        </Droppable>

        <Draggable data={{ label: formatTime(etaSeconds) }}>
          <Mascot width={80} height={80} style={styles.draggable}>
            {/* <Text style={styles.draggableText}>End The Trip</Text> */}
          </Mascot>
        </Draggable>
        </View>
      </View>
    </DropProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#393031",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#CBBC9F",
    marginBottom: 20,
  },
  infoCurrent: { fontSize: 20, color: "#F1EFE5", marginBottom: 10 },
  infoDestination: {
    fontSize: 20,
    color: "#F1EFE5",
    marginBottom: 10,
    paddingBottom: 20,
  },
  iconDrag: {
    alignSelf: "center",
  },
  flexyBoy: {
    flexDirection: "row",
    gap: 20,
  },
  timerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    backgroundColor: "#232625",
    borderRadius: 10,
    width: 300,
  },
  timer: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#F1EFE5",
    paddingLeft: 0,
    paddingRight: 50,
  },
  subtext: { fontSize: 16, color: "#CBBC9F", paddingTop: 7 },
  swipeBackground: {
    backgroundColor: "#CBBC9F",
    justifyContent: "center",
    alignItems: "center",
    width: "90%",
    height: "100%",
    borderRadius: 10,
  },
  swipeText: { color: "#393031", fontSize: 18 },
  dropText: {
    fontSize: 18,
    color: "#F1EFE5",
    marginTop: 50,
    marginBottom: 35,
    fontWeight: "500",
  },
  dropZone: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: "#755540",
    borderStyle: "dashed",
    backgroundColor: "#232625",
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  draggable: {
    alignSelf: "center",
  },
  draggableText: {
    fontSize: 18,
    color: "#393031",
    fontWeight: "bold",
    marginTop: 10,
  },
  dropZoneActive: {
    transform: [{ scale: 1.07 }],
    backgroundColor: "#755540",
    borderColor: "#F1EFE5",
    borderStyle: "solid",
  },
  flexyBoy2: {
    gap: 50,
  },
});
