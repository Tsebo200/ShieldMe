import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Vibration, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { completeTrip } from '../services/tripService'; // Function to mark a trip as complete in the backend
import { Draggable, Droppable } from 'react-native-reanimated-dnd';

export default function PuzzleScreen() {
  const [solved, setSolved] = useState(false);   // State to track if puzzle is solved
  const [slot1, setSlot1] = useState<string | null>(null);   // State for the first droppable slot
  const [slot2, setSlot2] = useState<string | null>(null);   // State for the second droppable slot
  // activeStyle on Droppable will handle hover visuals
  const [errorMsg, setErrorMsg] = useState<string | null>(null);   // State to display error messages for wrong combinations

  const navigation = useNavigation<any>(); // Navigation hook
  const route = useRoute<any>(); // Route hook to access parameters

  const { tripId } = route.params || {}; // Get tripId from route parameters

  // Handle drops on puzzle slots
  const handleDropSlot1 = (data: any) => {
    const itemId = data?.id;
    if (itemId) {
      setSlot1(itemId);
      checkSolution(itemId, slot2);
    }
  };

  const handleDropSlot2 = (data: any) => {
    const itemId = data?.id;
    if (itemId) {
      setSlot2(itemId);
      checkSolution(slot1, itemId);
    }
  };

  // Handle tap on puzzle piece - add to next available slot
  const handlePieceTap = useCallback((itemId: string) => {
    // If slot1 is empty, fill it
    if (!slot1) {
      setSlot1(itemId);
      checkSolution(itemId, slot2);
    }
    // If slot1 is filled but slot2 is empty, fill slot2
    else if (!slot2) {
      setSlot2(itemId);
      checkSolution(slot1, itemId);
    }
    // If both slots are filled, replace slot2
    else {
      setSlot2(itemId);
      checkSolution(slot1, itemId);
    }
  }, [slot1, slot2]);

  // Function to check if the puzzle slots have the correct items
  const checkSolution = async (updatedSlot1: string | null, updatedSlot2: string | null) => {
    if (updatedSlot1 === 'paper' && updatedSlot2 === 'plane') {
      // Correct combination
      Vibration.vibrate(100); // Short vibration for success
      setSolved(true); // Mark puzzle as solved

      // If tripId exists, mark trip as complete in backend
      if (tripId) {
        try {
          await completeTrip(tripId);
        } catch (err) {
          console.error('Error completing trip:', err);
        }
      }

      // Navigate to SuccessScreen after 1 second
      setTimeout(() => {
        navigation.navigate('SuccessScreen');
      }, 1000);
    } else if (updatedSlot1 && updatedSlot2) {
      // Wrong combination, provide feedback
      Vibration.vibrate([100, 200, 300]); // Longer vibration pattern
      setErrorMsg('❌ Wrong combo! Try again.');
      setTimeout(() => setErrorMsg(null), 2000); // Clear error message after 2 seconds
    }
  };

  return (
      <View style={styles.container}>
        {/* Screen title */}
        <Text style={styles.title}>Complete The Puzzle</Text>
        <Text style={styles.subtitle}>Paper Planes are cool</Text>
        <Text style={styles.instructions}>Drag the correct icons to complete the key word</Text>

        {/* Row containing two droppable slots */}
        <View style={styles.dropRow}>
          {/* First droppable slot */}
          <Droppable
           
            onDrop={handleDropSlot1}
            style={styles.dropZone}
            activeStyle={{ opacity: 0.7 }}
          >
            {/* Display the emoji if filled, placeholder otherwise */}
            <Text style={styles.dropText}>{slot1 ? (slot1 === 'paper' ? '📄' : '❓') : '⬜'}</Text>
          </Droppable>

          {/* Second droppable slot */}
          <Droppable
           
            onDrop={handleDropSlot2}
            style={styles.dropZone}
            activeStyle={{ opacity: 0.7 }}
          >
            {/* Display the emoji if filled, placeholder otherwise */}
            <Text style={styles.dropText}>{slot2 ? (slot2 === 'plane' ? '✈️' : '❓') : '⬜'}</Text>
          </Droppable>
        </View>

        {/* Draggable and tappable items (tokens) */}
        <View style={styles.draggables}>
          <Pressable
            onPress={() => handlePieceTap('paper')}
            style={({ pressed }) => [
              pressed && { opacity: 0.7 }
            ]}
          >
            <Draggable data={{ id: 'paper' }}>
              <View style={styles.token}><Text style={styles.tokenText}>📄</Text></View>
            </Draggable>
          </Pressable>
          <Pressable
            onPress={() => handlePieceTap('plane')}
            style={({ pressed }) => [
              pressed && { opacity: 0.7 }
            ]}
          >
            <Draggable data={{ id: 'plane' }}>
              <View style={styles.token}><Text style={styles.tokenText}>✈️</Text></View>
            </Draggable>
          </Pressable>
          <Pressable
            onPress={() => handlePieceTap('pizza')}
            style={({ pressed }) => [
              pressed && { opacity: 0.7 }
            ]}
          >
            <Draggable data={{ id: 'pizza' }}>
              <View style={styles.token}><Text style={styles.tokenText}>🍕</Text></View>
            </Draggable>
          </Pressable>
        </View>

        {/* Success message */}
        {solved && <Text style={styles.successText}>✅ Puzzle Solved!</Text>}
        {/* Error message for wrong combination */}
        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
      </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#393031',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#CBBC9F',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    marginBottom: 8,
    color: '#F8C1E1',
    fontWeight: '600',
  },
  instructions: {
    fontSize: 14,
    marginBottom: 24,
    color: '#F1EFE5',
  },
  dropRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 40,
  },
  dropZone: {
    height: 100,
    width: 100,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#755540',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#232625',
  },
  dropZoneActive: {
    backgroundColor: '#F8C1E1',
    borderColor: '#F8C1E1',
  },
  dropText: {
    fontSize: 40,
  },
  draggables: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 30,
  },
  token: {
    // backgroundColor: '#755540',
    borderRadius: 40,
    padding: 16,
    marginHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenText: {
    fontSize: 40,
    color: '#F1EFE5',
  },
  successText: {
    position: 'absolute',
    marginTop: 450,
    fontSize: 20,
    color: '#CBBC9F',
    fontWeight: '600',
  },
  errorText: {
    position: 'absolute',
    marginTop: 450,
    fontSize: 18,
    color: '#F8C1E1',
    fontWeight: '600',
  },
});
