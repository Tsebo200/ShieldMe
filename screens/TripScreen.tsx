import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, Alert } from 'react-native';
import { Draggable, Droppable, DropProvider } from 'react-native-reanimated-dnd';
import { useTrip } from '../context/TripContext.tsx';
import { useNavigation } from '@react-navigation/native';
import ETAPicker from '../components/ETAPicker';

export default function TripScreen() {
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const { setTripData } = useTrip();
  const navigation = useNavigation<any>();
  const [etaSeconds, setEtaSeconds] = useState(0);

  const handleDrop = () => {
    if (start && destination && etaSeconds > 0) {
      setTripData({ start, destination, eta: etaSeconds });
      navigation.navigate('TimerScreen', { etaSeconds });
    } else {
      Alert.alert('Missing Info', 'Please complete Start, Destination, and ETA before starting the trip.');
    }
  };

  return (
    <DropProvider>
      <View style={styles.container}>
        <Text style={styles.title}>Plan Your Safe Trip</Text>

        <TextInput
          style={styles.input}
          placeholder="Start Location"
          value={start}
          onChangeText={setStart}
        />

        <TextInput
          style={styles.input}
          placeholder="Destination"
          value={destination}
          onChangeText={setDestination}
        />

        <ETAPicker onDurationChange={(totalSeconds) => setEtaSeconds(totalSeconds)} />

        <Droppable
          id="drop-zone"
          style={styles.dropZone}
          onDrop={handleDrop}
        >
          <Text style={styles.dropText}>🟡 Drop Shield Here to Start Trip</Text>
        </Droppable>

        <View style={styles.dragContainer}>
          <Draggable id="start-token">
            <View style={styles.token}>
              <Text style={styles.tokenText}>🛡 Start Trip</Text>
            </View>
          </Draggable>
        </View>
      </View>
    </DropProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24, alignSelf: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  dropZone: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: 'gray',
    borderWidth: 2,
    borderStyle: 'dashed',
    marginVertical: 24,
    backgroundColor: '#f7f7f7',
  },
  dropText: {
    color: 'gray',
    fontSize: 16,
  },
  dragContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  token: {
    paddingHorizontal: 50,
    paddingVertical: 18,
    backgroundColor: '#6b5b95',
    borderRadius: 40,
    alignItems: 'center',
  },
  tokenText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
