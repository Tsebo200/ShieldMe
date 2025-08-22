import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TripScreen from '../screens/TripScreen';
import TimerScreen from '../screens/TimerScreen';
import PuzzleScreen from '../screens/PuzzleScreen'; 
import SuccessScreen from '../screens/SuccessScreen'; 
import ETAShareScreen from '../screens/ETAShareScreen';
import HomeScreen from '../screens/HomeScreen';
import FriendsScreen from '../screens/FriendsScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OnboardingScreen from 'screens/OnboardingScreen';
import ProfileScreen from 'screens/ProfileScreen';
import TripsInsightScreen from 'screens/TripsInsightScreen';



const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="HomeScreen" screenOptions={{ headerShown: false, animation:  'slide_from_bottom'}}>
      <Stack.Screen name="TripScreen" component={TripScreen} />
      <Stack.Screen name="TimerScreen" component={TimerScreen} />
      <Stack.Screen name="ETAShareScreen" component={ETAShareScreen} />
      <Stack.Screen name="PuzzleScreen" component={PuzzleScreen} />
      <Stack.Screen name="SuccessScreen" component={SuccessScreen} />
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="FriendsScreen" component={FriendsScreen} />
      {/* <Stack.Screen name="LoginScreen" component={LoginScreen} /> */}
      {/* <Stack.Screen name="RegisterScreen" component={RegisterScreen} /> */}
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      <Stack.Screen name="OnboardingScreen" component={OnboardingScreen} />
      <Stack.Screen name="TripsInsightScreen" component={TripsInsightScreen} />
    </Stack.Navigator>
  );
}
