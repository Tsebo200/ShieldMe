// App.jsx (or App.tsx)
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AppNavigator from "./navigation/AppNavigator"; // your existing signed-in navigator
import { TripProvider } from "./context/TripContext";
import * as SplashScreen from "expo-splash-screen";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

// Replace these with your actual auth screens (paths/names)
import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen"; // ✅ correct name

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Keep splash visible until we've determined the auth state
    // (optional — if using managed workflow you might already call preventAutoHideAsync elsewhere)
    let splashKept = false;
    const maybePrevent = async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
        splashKept = true;
      } catch {
        // ignore if already prevented
      }
    };
    maybePrevent();

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (initializing) setInitializing(false);

      // hide splash only once we've resolved auth
      if (splashKept) {
        try {
          SplashScreen.hideAsync();
        } catch {
          // ignore
        }
      }
    });

    return () => {
      try {
        unsub();
      } catch {}
    };
  }, [initializing]);

  if (initializing) {
    // While Firebase determines auth state show a centered loader (or a splash)
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#232625" }}>
          <ActivityIndicator size="large" color="#F8C1E1" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* TripProvider can live above NavigationContainer so context is available anywhere.
          TripProvider itself listens to auth and will update accordingly. */}
      <TripProvider>
        <BottomSheetModalProvider>
          <NavigationContainer>
            {/* Render AppNavigator when signed in, otherwise AuthStack */}
            {user ? <AppNavigator /> : <AuthStack />}
          </NavigationContainer>
        </BottomSheetModalProvider>
      </TripProvider>
    </GestureHandlerRootView>
  );
}



/*
immediate navigation reset on logout (clears history)

import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export const logoutUser = async (navigation) => {
  try {
    await signOut(auth);
    if (navigation && navigation.reset) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }], // adjust route name to match AuthStack screen name
      });
    }
  } catch (err) {
    console.error("logoutUser error", err);
    throw err;
  }
};
*/
