import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AppNavigator from "./navigation/AppNavigator";
import { TripProvider } from "./context/TripContext";
import * as SplashScreen from "expo-splash-screen";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

import LoginScreen from "./screens/LoginScreen";
import RegisterScreen from "./screens/RegisterScreen";
import AnimatedSplash from "./components/AnimatedSplash";

// Prevent the native splash from auto-hiding.
// Recommended to call in module scope (not inside a component) so it's not too late.
SplashScreen.preventAutoHideAsync().catch(() => { /* ignore */ });

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
  const [user, setUser] = useState<any | null>(null);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(false);

  useEffect(() => {
    // subscribe to auth status
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (initializing) setInitializing(false);
    });
    return () => unsub();
  }, [initializing]);

  // when initial loading finishes, show the animated splash overlay
  useEffect(() => {
    if (!initializing) {
      // show the animated splash which will call SplashScreen.hideAsync()
      setShowAnimatedSplash(true);
    }
  }, [initializing]);

  // callback when AnimatedSplash finishes its animation
  const handleSplashFinish = () => {
    setShowAnimatedSplash(false);
  };

  // Note: while initializing is true, native splash remains visible (we prevented auto-hide).
  // Returning a loader here is optional — native splash covers it until hideAsync is called.
  if (initializing) {
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
      <TripProvider>
        <BottomSheetModalProvider>
          <NavigationContainer>
            {user ? <AppNavigator /> : <AuthStack />}
          </NavigationContainer>
        </BottomSheetModalProvider>
      </TripProvider>

      {/* AnimatedSplash sits above everything until it finishes */}
      {showAnimatedSplash && <AnimatedSplash title="ShieldMe" onFinish={handleSplashFinish} />}
    </GestureHandlerRootView>
  );
}
