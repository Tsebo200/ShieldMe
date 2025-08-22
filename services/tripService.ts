import { db } from '../firebase';
import { addDoc, collection, doc, updateDoc, serverTimestamp, Timestamp, getDoc } from 'firebase/firestore';
import { auth } from '../firebase';

// Start a trip and save to Firestore
export const startTrip = async (
  currentLocation: string,
  destinationLocation: string,
  eta: number,
  sharedFriends: string[]
): Promise<string> => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  // Trip document structure
  const tripData = {
    uid: user.uid,                     // ID of current user
    currentLocation,                   // Start point
    destinationLocation,               // End point
    eta,                               // Estimated time in seconds
    sharedFriends,                     // Array of friend UIDs
    startTime: serverTimestamp(),      // Timestamp when trip starts
    status: 'ongoing' as const         // Initial status
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

  // Update the trip document
  await updateDoc(tripRef, {
    status: 'completed',
    endTime,
    duration
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
