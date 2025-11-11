import { db } from '../firebase';
import { addDoc, collection, doc, updateDoc, serverTimestamp, Timestamp, getDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import * as Location from 'expo-location';

// Start a trip and save to Firestore
export const startTrip = async (
  currentLocation: string,
  destinationLocation: string,
  eta: number,
  sharedFriends: string[],
  currentLocationCoords?: { latitude: number; longitude: number },
  destinationLocationCoords?: { latitude: number; longitude: number }
): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Try to get current location coordinates if not provided
  let startCoords = currentLocationCoords;
  if (!startCoords) {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        startCoords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
      }
    } catch (err) {
      console.warn('Could not get current location coordinates:', err);
    }
  }

  // Get current time in HH:MM format
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const startTimeFormatted = `${hours}:${minutes}`;

  // Trip document structure
  const tripData = {
    uid: user.uid,                     // ID of current user
    currentLocation,                   // Start point (string)
    destinationLocation,               // End point (string)
    eta,                               // Estimated time in seconds
    sharedFriends,                     // Array of friend UIDs
    startTime: serverTimestamp(),      // Timestamp when trip starts
    startTimeFormatted: startTimeFormatted, // HH:MM format
    status: 'ongoing' as const,         // Initial status
    ...(startCoords && { currentLocationCoords: startCoords }), // Add coordinates if available
    ...(destinationLocationCoords && { destinationLocationCoords }), // Add destination coordinates if available
  };

  // Add trip to 'trips' collection
  const docRef = await addDoc(collection(db, 'trips'), tripData);
  return docRef.id; // Return generated trip ID
};

// Complete a trip: update status, endTime, and duration
export const completeTrip = async (tripId: string) => {
  const tripRef = doc(db, 'trips', tripId);
  const endTime = Timestamp.now();

  // Fetch the trip document to read startTime
  const tripSnap = await getDoc(tripRef);
  if (!tripSnap.exists()) throw new Error('Trip not found');

  const tripData = tripSnap.data();
  const startTime = tripData?.startTime?.toDate?.();

  let duration = null;
  if (startTime && endTime.toDate) {
    duration = Math.floor((endTime.toDate().getTime() - startTime.getTime()) / 1000); // in seconds
  }

  // Try to get destination location coordinates (user's current location when completing)
  let destinationLocationCoords: { latitude: number; longitude: number } | undefined;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      destinationLocationCoords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
    }
  } catch (err) {
    console.warn('Could not get destination location coordinates:', err);
  }

  // Get current time in HH:MM format
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const completionTime = `${hours}:${minutes}`;

  // Update the trip document
  await updateDoc(tripRef, {
    status: 'completed',
    endTime,
    duration,
    completionTime: completionTime,
    completedAt: now.toISOString(),
    ...(destinationLocationCoords && { destinationLocationCoords }), // Add coordinates if available
  });
};

// Cancel a trip
export const cancelTrip = async (tripId: string) => {
  const tripRef = doc(db, 'trips', tripId);

  // Update trip with cancelled status and endTime
  await updateDoc(tripRef, {
    status: 'cancelled',
    endTime: Timestamp.now()
  });
};
