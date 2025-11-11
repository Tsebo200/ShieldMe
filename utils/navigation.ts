import { NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

// Navigation helper functions for consistent navigation calls
export const navigationHelpers = {
  // Navigate to a screen with optional parameters
  navigate: <T extends keyof RootStackParamList>(
    navigation: NavigationProp<RootStackParamList>,
    screen: T,
    params?: RootStackParamList[T]
  ) => {
    navigation.navigate(screen, params);
  },

  // Navigate and replace current screen
  replace: <T extends keyof RootStackParamList>(
    navigation: NavigationProp<RootStackParamList>,
    screen: T,
    params?: RootStackParamList[T]
  ) => {
    navigation.replace(screen, params);
  },

  // Go back to previous screen
  goBack: (navigation: NavigationProp<RootStackParamList>) => {
    navigation.goBack();
  },

  // Reset navigation stack to a specific screen
  reset: <T extends keyof RootStackParamList>(
    navigation: NavigationProp<RootStackParamList>,
    screen: T,
    params?: RootStackParamList[T]
  ) => {
    navigation.reset({
      index: 0,
      routes: [{ name: screen, params }],
    });
  },
};

// Common navigation patterns
export const navigationPatterns = {
  // Navigate to home screen
  goHome: (navigation: NavigationProp<RootStackParamList>) => {
    navigationHelpers.navigate(navigation, 'HomeScreen');
  },

  // Navigate to trip screen
  startTrip: (navigation: NavigationProp<RootStackParamList>) => {
    navigationHelpers.navigate(navigation, 'TripScreen');
  },

  // Navigate to profile screen
  goToProfile: (navigation: NavigationProp<RootStackParamList>) => {
    navigationHelpers.navigate(navigation, 'ProfileScreen');
  },

  // Navigate to friends screen
  goToFriends: (navigation: NavigationProp<RootStackParamList>) => {
    navigationHelpers.navigate(navigation, 'FriendsScreen');
  },

  // Navigate to login screen
  goToLogin: (navigation: NavigationProp<RootStackParamList>) => {
    navigationHelpers.navigate(navigation, 'LoginScreen');
  },

  // Navigate to register screen
  goToRegister: (navigation: NavigationProp<RootStackParamList>) => {
    navigationHelpers.navigate(navigation, 'RegisterScreen');
  },

  // Navigate to timer screen with trip data
  startTimer: (
    navigation: NavigationProp<RootStackParamList>,
    etaSeconds: number,
    tripId: string
  ) => {
    navigationHelpers.navigate(navigation, 'TimerScreen', { etaSeconds, tripId });
  },
};


