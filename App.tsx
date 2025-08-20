import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
import { TripProvider } from './context/TripContext';

import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Constants from 'expo-constants';

// ✅ Handle how notifications are displayed in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // show banner
    shouldPlaySound: true,   // play sound
    shouldSetBadge: false,   // don't set badge count
  }),
});

export default function App() {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        if (!Device.isDevice) {
          console.warn('⚠️ Push tokens require a physical device');
          return;
        }

        // Request permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        const finalStatus =
          existingStatus === 'granted'
            ? existingStatus
            : (await Notifications.requestPermissionsAsync()).status;

        if (finalStatus !== 'granted') {
          console.warn('⚠️ Push permission not granted');
          return;
        }

        // ✅ Get Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId, // needed if you build with EAS
        });
        const expoPushToken = tokenData.data;

        // ✅ Save token into Firestore
        await setDoc(doc(db, 'users', user.uid), { expoPushToken }, { merge: true });
        console.log('✅ Saved expo push token:', expoPushToken);
      } catch (err) {
        console.warn('Error saving push token:', err);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TripProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </TripProvider>
    </GestureHandlerRootView>
  );
}
