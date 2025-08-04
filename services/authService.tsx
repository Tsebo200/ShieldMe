import { Alert } from 'react-native';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  UserCredential,
} from 'firebase/auth';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase'; // Make sure these are persistent-aware from firebase.ts

// --- Login user ---
export const loginUser = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log(userCredential.user.email, 'Logged In');
  } catch (error: any) {
    console.log('Login Error:', error.message);
    Alert.alert('Login Error', error.message);
  }
};

// --- Logout current user ---
export const logoutUser = async () => {
  try {
    await firebaseSignOut(auth);
    console.log('User Logged Out');
  } catch (error: any) {
    console.log('Sign Out Error:', error.message);
    Alert.alert('Sign Out Error', error.message);
  }
};

// --- Get current user info ---
export const getUserInfo = () => {
  return auth.currentUser || null;
};

// --- Register new user and store profile in Firestore ---
export const registerUser = async (
  fullName: string,
  email: string,
  password: string
): Promise<UserCredential> => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid,
    fullName,
    email,
    createdAt: serverTimestamp(),
  });
  return cred;
};

// --- Sub-collection: friends under users/{uid}/friends ---
const getFriendsRef = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User not authenticated');
  return collection(db, 'users', uid, 'friends');
};

// --- Subscribe to real-time updates on friends list ---
export const subscribeToFriends = (onUpdate: (friends: any[]) => void) =>
  onSnapshot(
    getFriendsRef(),
    snapshot => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      onUpdate(list);
    },
    error => {
      console.error(error);
      Alert.alert('Data Error', 'Could not fetch friends');
    }
  );

// --- Add a friend ---
export const addFriend = async (name: string) => {
  if (!name.trim()) throw new Error('Name required');
  await addDoc(getFriendsRef(), { name, createdAt: serverTimestamp() });
};

// --- Update a friend ---
export const updateFriend = async (id: string, name: string) => {
  if (!name.trim()) throw new Error('Name required');
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User not authenticated');
  await updateDoc(doc(db, 'users', uid, 'friends', id), { name });
};

// --- Delete a friend ---
export const deleteFriend = async (id: string) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User not authenticated');
  await deleteDoc(doc(db, 'users', uid, 'friends', id));
};

// --- Listen for auth state changes ---
export const onAuthChange = (callback: (user: any) => void) =>
  onAuthStateChanged(auth, callback);
