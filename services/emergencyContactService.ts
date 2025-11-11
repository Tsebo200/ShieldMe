import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

/**
 * Finds the top N most shared ETA friends for the current user
 * by counting eta_shares where fromUid == current user
 */
export async function getTopSharedFriends(limit: number = 2): Promise<string[]> {
  const user = auth.currentUser;
  if (!user) return [];

  try {
    // Query all eta_shares where current user is the sender
    const q = query(
      collection(db, 'eta_shares'),
      where('fromUid', '==', user.uid)
    );

    const snapshot = await getDocs(q);
    const friendCounts: Record<string, number> = {};

    // Count how many times each friend received an ETA
    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const toUid = data.toUid;
      if (toUid && toUid !== user.uid) {
        friendCounts[toUid] = (friendCounts[toUid] || 0) + 1;
      }
    });

    // Sort by count (descending) and get top N
    const topFriends = Object.entries(friendCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([uid]) => uid);

    return topFriends;
  } catch (error) {
    console.error('Error getting top shared friends:', error);
    return [];
  }
}

/**
 * Automatically adds top 2 most shared ETA friends to emergency contacts
 * if they're not already in the list
 */
export async function autoUpdateEmergencyContacts(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // Get current user document
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.warn('User document not found');
      return;
    }

    const userData = userSnap.data();
    const currentEmergencyContacts: string[] = userData.emergencyContacts || [];

    // Get top 2 most shared friends
    const topFriends = await getTopSharedFriends(2);

    // Add friends that aren't already in emergency contacts
    const newContacts = topFriends.filter(
      (friendUid) => !currentEmergencyContacts.includes(friendUid)
    );

    if (newContacts.length > 0) {
      // Update emergency contacts
      await updateDoc(userRef, {
        emergencyContacts: [...currentEmergencyContacts, ...newContacts],
      });
      console.log(`Auto-added ${newContacts.length} friend(s) to emergency contacts`);
    }
  } catch (error) {
    console.error('Error auto-updating emergency contacts:', error);
  }
}

/**
 * Add a friend to emergency contacts
 */
export async function addEmergencyContact(friendUid: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error('User document not found');
  }

  const userData = userSnap.data();
  const currentEmergencyContacts: string[] = userData.emergencyContacts || [];

  if (currentEmergencyContacts.includes(friendUid)) {
    return; // Already in list
  }

  await updateDoc(userRef, {
    emergencyContacts: [...currentEmergencyContacts, friendUid],
  });
}

/**
 * Remove a friend from emergency contacts
 */
export async function removeEmergencyContact(friendUid: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');

  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error('User document not found');
  }

  const userData = userSnap.data();
  const currentEmergencyContacts: string[] = userData.emergencyContacts || [];

  await updateDoc(userRef, {
    emergencyContacts: currentEmergencyContacts.filter((uid) => uid !== friendUid),
  });
}

