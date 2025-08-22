import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Alert, SafeAreaView } from 'react-native';
import { Draggable, Droppable, DropProvider } from 'react-native-reanimated-dnd';
import { useTrip } from '../context/TripContext';
import { useNavigation } from '@react-navigation/native';
import ETAPicker from '../components/ETAPicker';
import { startTrip } from 'services/tripService';
import Mascot  from '../assets/CrawlDark.svg'


export default function TripScreen() {
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const { setTripData } = useTrip();
  const navigation = useNavigation<any>();
  const [etaSeconds, setEtaSeconds] = useState(0);
  
const handleDrop = async () => {
  if (start && destination && etaSeconds > 0) {
    try {
      // Save trip to Firestore
      const tripId = await startTrip(start, destination, etaSeconds, []);
      // Store tripData in context
      setTripData({ tripId, currentLocation: start, destinationLocation: destination, eta: etaSeconds });
      // Navigate to TimerScreen
      navigation.navigate('TimerScreen', { etaSeconds, tripId });
    } catch (error) {
      console.error('Error starting trip:', error);
      Alert.alert('Error', 'Could not start trip. Please try again.');
    }
  } else {
    Alert.alert('Missing Info', 'Please complete Current, Destination, and ETA before starting the trip.');
  }
};

  return (
    <DropProvider>
      <SafeAreaView style={styles. Safety}>
      <View style={styles.container}>
        <Text style={styles.title}>Plan Your Safe Trip</Text>

        <TextInput
          style={styles.input}
          placeholder="Start Location"
          placeholderTextColor="#aaa"
          value={start}
          onChangeText={setStart}
        />

        <TextInput
          style={styles.input}
          placeholder="Destination"
          placeholderTextColor="#aaa"
          value={destination}
          onChangeText={setDestination}
        />

        <ETAPicker onDurationChange={(totalSeconds) => setEtaSeconds(totalSeconds)} />
        <Text style={styles.dropText}>Drop Armo Below to Start Trip</Text>
        <Droppable
          id="drop-zone"
          style={styles.dropZone}
          onDrop={handleDrop}
          activeStyle={styles.dropZoneActive} // ✅ Hover effect here
        >
        </Droppable>

        <View style={styles.dragContainer}>
          <Draggable id="start-token">
            <Mascot width={60} height={60} style={styles.token}/>
          </Draggable>
        </View>
      </View>
      </SafeAreaView>
    </DropProvider>
  );
}

const styles = StyleSheet.create({
  Safety:{
  flex: 1,
    backgroundColor: '#393031', // Same rich dark brown/gray background
  },
  container: {
    flex: 1,
    backgroundColor: '#393031', // Rich dark brown/gray
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#CBBC9F', // Elegant cream
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#232625', // Deep charcoal
    color: '#F1EFE5',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  dropZone: {
    height: 80,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderColor: '#755540', // Styled border
    borderWidth: 2,
    borderStyle: 'dashed',
    marginVertical: 24,
    backgroundColor: '#232625', // Same as input
    borderRadius: 100,
  },
  dropText: {
    color: '#F1EFE5', // Light cream
    fontSize: 16,
    alignSelf: 'center',
  },
  dragContainer: {
    alignItems: 'center',
  },
  token: {
    padding: 0,
    borderRadius: 40,
    alignItems: 'center',
  },
  tokenText: {
    color: '#F1EFE5', // Light cream
  },
  dropZoneActive: {
    transform: [{ scale: 1.07 }], //slightly enlarge hover state use transform property for smoothness
    backgroundColor: '#755540', // Warm brown for hover effect
    borderColor: '#F1EFE5', // Light cream border on hover
    borderStyle: 'solid',
  },
});