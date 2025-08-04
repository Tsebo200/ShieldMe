// firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ✅ Your Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyA96JQEQC9WImMEb3fElf8qJyQ5YOWK8gw',
  authDomain: 'fir-e5ab8.firebaseapp.com',
  projectId: 'fir-e5ab8',
  storageBucket: 'fir-e5ab8.appspot.com',
  messagingSenderId: '642880163457',
  appId: '1:642880163457:web:8598457c453d989d974780'
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Initialize auth with AsyncStorage persistence (correct RN way)
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// ✅ Firestore
const db = getFirestore(app);

export { auth, db };
