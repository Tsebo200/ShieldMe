import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Define navigation parameter types for the main app stack
export type RootStackParamList = {
  HomeScreen: undefined;
  TripScreen: undefined;
  TimerScreen: { etaSeconds: number; tripId: string };
  ETAShareScreen: undefined;
  PuzzleScreen: undefined;
  SuccessScreen: undefined;
  FriendsScreen: undefined;
  LoginScreen: undefined;
  RegisterScreen: undefined;
  ProfileScreen: undefined;
  EditProfileScreen: undefined;
  OnboardingScreen: undefined;
  TripsInsightScreen: undefined;
  MapScreen: { tripId?: string; item?: any };
};

// Define navigation parameter types for the auth stack
export type AuthStackParamList = {
  LoginScreen: undefined;
  RegisterScreen: undefined;
};

// Screen prop types for type safety
export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'HomeScreen'>;
export type TripScreenProps = NativeStackScreenProps<RootStackParamList, 'TripScreen'>;
export type TimerScreenProps = NativeStackScreenProps<RootStackParamList, 'TimerScreen'>;
export type ETAShareScreenProps = NativeStackScreenProps<RootStackParamList, 'ETAShareScreen'>;
export type PuzzleScreenProps = NativeStackScreenProps<RootStackParamList, 'PuzzleScreen'>;
export type SuccessScreenProps = NativeStackScreenProps<RootStackParamList, 'SuccessScreen'>;
export type FriendsScreenProps = NativeStackScreenProps<RootStackParamList, 'FriendsScreen'>;
export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'LoginScreen'>;
export type RegisterScreenProps = NativeStackScreenProps<RootStackParamList, 'RegisterScreen'>;
export type ProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'ProfileScreen'>;
export type EditProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'EditProfileScreen'>;
export type OnboardingScreenProps = NativeStackScreenProps<RootStackParamList, 'OnboardingScreen'>;
export type TripsInsightScreenProps = NativeStackScreenProps<RootStackParamList, 'TripsInsightScreen'>;
export type MapScreenProps = NativeStackScreenProps<RootStackParamList, 'MapScreen'>;

// Navigation hook types
export type NavigationProp = NativeStackScreenProps<RootStackParamList>['navigation'];
export type RouteProp<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>['route'];


