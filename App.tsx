import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './navigation/AppNavigator';
import { TripProvider } from './context/TripContext';

export default function App() {
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





