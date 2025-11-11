import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DropProvider } from "react-native-reanimated-dnd";
import AppNavigator from "./navigation/AppNavigator";
import { AuthStackParamList } from "./types/navigation";
import { TripProvider } from "./context/TripContext";
import * as SplashScreen from "expo-splash-screen";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import * as Notifications from "expo-notifications";
import { doc, updateDoc, setDoc, getDoc } from "firebase/firestore";

import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
// import AnimatedSplash from "./components/AnimatedSplash";

// Prevent the native splash from auto-hiding.
// Recommended to call in module scope (not inside a component) so it's not too late.
SplashScreen.preventAutoHideAsync().catch(() => { /* ignore */ });

const Stack = createNativeStackNavigator<AuthStackParamList>();

function AuthStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_bottom',
        gestureEnabled: true,
        gestureDirection: 'horizontal'
      }}
    >
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
    </Stack.Navigator>
  );
}


export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any | null>(null);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(false);

  // Register for push notifications and save token on user doc
  const registerAndSavePushToken = async (uid: string) => {
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (!settings.granted) {
        await Notifications.requestPermissionsAsync();
      }
      const tokenResponse = await Notifications.getExpoPushTokenAsync();
      const pushToken = tokenResponse.data;
      if (!pushToken) return;
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, { pushToken }, { merge: true } as any);
      } else {
        await updateDoc(userRef, { pushToken });
      }
    } catch (e) {
      // ignore registration errors
    }
  };

  useEffect(() => {
    // subscribe to auth status
    const unsub = onAuthStateChanged(auth, (u) => {
      console.log('Auth state changed:', u ? 'logged in' : 'logged out');
      setUser(u);
      if (u?.uid) {
        registerAndSavePushToken(u.uid).catch(() => {});
      }
      if (initializing) {
        console.log('Setting initializing to false');
        setInitializing(false);
      }
    });
    return () => unsub();
  }, [initializing]);

  // // when initial loading finishes, show the animated splash overlay
  // useEffect(() => {
  //   if (!initializing) {
  //     // show the animated splash which will call SplashScreen.hideAsync()
  //     setShowAnimatedSplash(true);
  //   }
  // }, [initializing]);

  useEffect(() => {
  if (!initializing) {
    SplashScreen.hideAsync().catch(() => {});
  }
}, [initializing]);


  // callback when AnimatedSplash finishes its animation
  const handleSplashFinish = () => {
    setShowAnimatedSplash(false);
  };

  // Note: while initializing is true, native splash remains visible (we prevented auto-hide).
  // Returning a loader here is optional — native splash covers it until hideAsync is called.
  if (initializing) {
    console.log('App is initializing, showing loader');
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#232625" }}>
          <ActivityIndicator size="large" color="#F8C1E1" />
          <Text style={{ color: '#F1EFE5', marginTop: 10 }}>Loading...</Text>
        </View>
      </GestureHandlerRootView>
    );
  }

  console.log('App rendering, user:', user ? 'logged in' : 'not logged in');

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <TripProvider>
          <BottomSheetModalProvider>
            <ErrorBoundary>
              <DropProvider>
                <NavigationContainer
                  onReady={() => {
                    console.log('NavigationContainer ready');
                  }}
                  onStateChange={() => {
                    console.log('Navigation state changed');
                  }}
                >
                  {user ? <AppNavigator /> : <AuthStack />}
                </NavigationContainer>
              </DropProvider>
            </ErrorBoundary>
          </BottomSheetModalProvider>
        </TripProvider>

        {/* AnimatedSplash sits above everything until it finishes */}
        {/* {showAnimatedSplash && <AnimatedSplash title="ShieldMe" onFinish={handleSplashFinish} />} */}
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
