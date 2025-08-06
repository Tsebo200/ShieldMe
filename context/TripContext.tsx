import { auth, db } from 'firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { createContext, useState, useContext, useEffect } from 'react';
import { Alert } from 'react-native';

const TripContext = createContext<any>(null);

export const TripProvider = ({ children }: any) => {
  const [tripData, setTripData] = useState(null);
  const [user, setUser] = useState<any>(null); // 👈 store logged-in user


useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            ...userData,
          });
        } else {
          console.warn('User document not found');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        Alert.alert('Error', 'Could not fetch user profile');
      }
    });

    return unsubscribe;
  }, []);


  return (
    <TripContext.Provider value={{ tripData, setTripData, user, setUser }}>
      {children}
    </TripContext.Provider>
  );
};

export const useTrip = () => useContext(TripContext);
