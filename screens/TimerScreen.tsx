import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Platform, Vibration, SafeAreaView } from 'react-native';
import { useTrip } from '../context/TripContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { PanGestureHandler } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import LocalSvg from '../components/LocalSvg';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
// import MascotLight  from '../assets/CrawlLight.svg'
import * as Location from 'expo-location';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';


export default function TimerScreen({ }: any) {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { etaSeconds, tripId } = route.params || {};
  const [remaining, setRemaining] = useState(etaSeconds);
  const { tripData } = useTrip() as any;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [puzzleCompleted, setPuzzleCompleted] = useState(false);
  const [tripStatus, setTripStatus] = useState('ongoing');
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [startLocationCoords, setStartLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [startTimeFormatted, setStartTimeFormatted] = useState<string | null>(null);

  // Swipeable for "already arrived" option
  const translateY = useSharedValue(0);
  const threshold = 60;
  const hasTriggered = useSharedValue(false);

  const triggerFeedback = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Vibration.vibrate(50);
    }
  };

  const handleAlreadyArrived = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    navigation.navigate('PuzzleScreen', { tripId });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(translateY.value) }],
  }));



  const formatTime = (total: number) => {
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

    // Handler for ending trip via drag-and-drop
  const handleDrop = (_data: any) => {
    // Navigate on next frame to avoid reanimated timing issues
    requestAnimationFrame(() => navigation.navigate('PuzzleScreen', { tripId }));
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

    // Get current time in HH:MM format
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const expirationTime = `${hours}:${minutes}`;

    // Save to Firestore
    await updateDoc(doc(db, 'trips', tripId), {
      status: 'expired',
      expiredLocation: { latitude, longitude },
      expirationTime: expirationTime,
      expiredAt: now.toISOString(),
    });
  } catch (err) {
    console.error('Error saving expired location:', err);
  }
};


  // Get current location periodically
  const updateLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Location permission not granted');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setCurrentLocation(coords);

      // Save to Firestore as lastKnownLocation (update every 30 seconds)
      if (tripId) {
        try {
          await updateDoc(doc(db, 'trips', tripId), {
            lastKnownLocation: coords,
            lastLocationUpdate: new Date().toISOString(),
          });
        } catch (err) {
          console.warn('Error saving location update:', err);
        }
      }
    } catch (err) {
      console.error('Error getting location:', err);
    }
  }, [tripId]);

  // Initialize location tracking
  useEffect(() => {
    // Get initial location
    updateLocation();

    // Update location every 30 seconds
    locationIntervalRef.current = setInterval(() => {
      updateLocation();
    }, 30000); // 30 seconds

    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current);
    };
  }, [tripId, updateLocation]);

  // Fetch start location, destination coordinates and start time from trip document
  useEffect(() => {
    if (!tripId) return;
    const tripRef = doc(db, 'trips', tripId);
    const unsub = onSnapshot(tripRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('TimerScreen - Trip data:', {
          currentLocation: data.currentLocation,
          destinationLocation: data.destinationLocation,
          currentLocationCoords: data.currentLocationCoords,
          destinationLocationCoords: data.destinationLocationCoords,
        });
        // Get start location coordinates (picked from TripScreen)
        if (data.currentLocationCoords) {
          console.log('TimerScreen - Setting start location coords:', data.currentLocationCoords);
          setStartLocationCoords(data.currentLocationCoords);
        } else {
          console.warn('TimerScreen - No currentLocationCoords found in trip data');
        }
        // Get destination coordinates
        if (data.destinationLocationCoords) {
          console.log('TimerScreen - Setting destination coords:', data.destinationLocationCoords);
          setDestinationCoords(data.destinationLocationCoords);
        } else {
          console.warn('TimerScreen - No destinationLocationCoords found in trip data');
        }
        if (data.startTimeFormatted) {
          setStartTimeFormatted(data.startTimeFormatted);
        } else if (data.startTime) {
          // Fallback: format from timestamp if startTimeFormatted not available
          const startDate = data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime);
          const hours = String(startDate.getHours()).padStart(2, '0');
          const minutes = String(startDate.getMinutes()).padStart(2, '0');
          setStartTimeFormatted(`${hours}:${minutes}`);
        }
      }
    });
    return unsub;
  }, [tripId]);

  // Countdown timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
  setRemaining((prev: number) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
  return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
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
      <View style={styles.container}>
        <Text style={styles.title}>Trip in Progress</Text>
        {/* <Text style={styles.infoCurrent}> */}
          {/* From: {tripData?.currentLocation} */}
          {/* {startTimeFormatted && ` (Started: ${startTimeFormatted})`} */}
        {/* </Text> */}
        {/* <Text style={styles.infoDestination}>To: {tripData?.destinationLocation}</Text> */}

        {/* Start Location (from TripScreen) */}
        {startLocationCoords && (
          <View style={styles.locationContainer}>
            <Text style={styles.locationTitle}>📍 Start Location</Text>
            <Text style={styles.coordsText}>
              Lat: {startLocationCoords.latitude.toFixed(6)}
            </Text>
            <Text style={styles.coordsText}>
              Lng: {startLocationCoords.longitude.toFixed(6)}
            </Text>
          </View>
        )}

        {/* Destination Location */}
        {destinationCoords && (
          <View style={styles.locationContainer}>
            <Text style={styles.locationTitle}>🎯 Destination Location</Text>
            <Text style={styles.coordsText}>
              Lat: {destinationCoords.latitude.toFixed(6)}
            </Text>
            <Text style={styles.coordsText}>
              Lng: {destinationCoords.longitude.toFixed(6)}
            </Text>
          </View>
        )}

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
                <LocalSvg source={require('../assets/CrawlLight.svg')} width={30} height={30} style={styles.iconDrag}/>
                <Text style={styles.timer}>{formatTime(remaining)}</Text>
            </View>
              <Text style={styles.subtext}>Time left to arrival</Text>
              <Text style={styles.subtext}>(Swipe right to share ETA)</Text>
          </View>
         
        </Swipeable>
        
          <Text style={styles.dropText}>Swipe down if you already arrived</Text>
          <View style={styles.swipeContainer}>
            <PanGestureHandler
              onGestureEvent={(event: any) => {
                'worklet';
                const translationY = event.nativeEvent.translationY;
                translateY.value = Math.max(0, translationY);
                
                if (translationY > threshold && !hasTriggered.value) {
                  hasTriggered.value = true;
                  runOnJS(triggerFeedback)();
                }
              }}
              onEnded={(event: any) => {
                'worklet';
                if (event.nativeEvent.translationY > threshold) {
                  runOnJS(handleAlreadyArrived)();
                }
                translateY.value = 0;
                hasTriggered.value = false;
              }}
            >
            <Animated.View style={[styles.swipeable, animatedStyle]}>
              <LocalSvg source={require('../assets/CrawlLight.svg')} width={24} height={24} style={styles.swipeableIcon} />
              <Text style={styles.swipeableText}>Already Arrived</Text>
            </Animated.View>
            </PanGestureHandler>
          </View>
      </View>
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
  swipeContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  swipeable: {
    backgroundColor: '#755540',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  swipeableIcon: {
    alignSelf: 'center',
  },
  swipeableText: {
    color: '#F1EFE5',
    fontSize: 16,
    fontWeight: '600',
  },
  locationContainer: {
    backgroundColor: '#232625',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
    marginBottom: 10,
    width: '100%',
    maxWidth: 350,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8C1E1',
    marginBottom: 8,
    textAlign: 'center',
  },
  coordsText: {
    fontSize: 14,
    color: '#CBBC9F',
    fontFamily: 'monospace',
    textAlign: 'center',
    marginVertical: 2,
  },
});
