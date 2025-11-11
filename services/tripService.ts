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

  // Try to geocode the location name if coordinates not provided
  let startCoords = currentLocationCoords;
  if (!startCoords && currentLocation) {
    try {
      // Geocode the location name to get coordinates
      const geocodeResults = await Location.geocodeAsync(currentLocation);
      if (geocodeResults && geocodeResults.length > 0) {
        startCoords = {
          latitude: geocodeResults[0].latitude,
          longitude: geocodeResults[0].longitude,
        };
        console.log('Geocoded start location:', currentLocation, 'to:', startCoords);
      }
    } catch (err) {
      console.warn('Could not geocode start location, trying device location:', err);
      // Fallback to device location if geocoding fails
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          startCoords = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
        }
      } catch (fallbackErr) {
        console.warn('Could not get current location coordinates:', fallbackErr);
      }
    }
  }

  // Try to geocode destination location if coordinates not provided
  let destCoords = destinationLocationCoords;
  if (!destCoords && destinationLocation) {
    try {
      // Geocode the destination location name to get coordinates
      const geocodeResults = await Location.geocodeAsync(destinationLocation);
      if (geocodeResults && geocodeResults.length > 0) {
        destCoords = {
          latitude: geocodeResults[0].latitude,
          longitude: geocodeResults[0].longitude,
        };
        console.log('Geocoded destination location:', destinationLocation, 'to:', destCoords);
      }
    } catch (err) {
      console.warn('Could not geocode destination location:', err);
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
    ...(destCoords && { destinationLocationCoords: destCoords }), // Add destination coordinates if available
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
