import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TripScreen from '../screens/TripScreen';
import TimerScreen from '../screens/TimerScreen.tsx';
import PuzzleScreen from '../screens/PuzzleScreen'; 
import SuccessScreen from '../screens/SuccessScreen'; 
import ETAShareScreen from '../screens/ETAShareScreen';
import HomeScreen from '../screens/HomeScreen';
import FriendsScreen from '../screens/FriendsScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';


const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="LoginScreen" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TripScreen" component={TripScreen} />
      <Stack.Screen name="TimerScreen" component={TimerScreen} />
      <Stack.Screen name="ETAShareScreen" component={ETAShareScreen} />
      <Stack.Screen name="PuzzleScreen" component={PuzzleScreen} />
      <Stack.Screen name="SuccessScreen" component={SuccessScreen} />
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="FriendsScreen" component={FriendsScreen} />
      <Stack.Screen name="LoginScreen" component={LoginScreen} />
      <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
