import { useState } from 'react';
import { View, Text, StyleSheet, Vibration } from 'react-native';
import { Draggable, Droppable, DropProvider } from 'react-native-reanimated-dnd';
import { useNavigation, useRoute } from '@react-navigation/native';
import { completeTrip } from '../services/tripService'; // Function to mark a trip as complete in the backend

export default function PuzzleScreen() {
  const [solved, setSolved] = useState(false);   // State to track if puzzle is solved
  const [slot1, setSlot1] = useState<string | null>(null);   // State for the first droppable slot
  const [slot2, setSlot2] = useState<string | null>(null);   // State for the second droppable slot
  const [isOver1, setIsOver1] = useState(false);   // State to track hover/drag-over for slot1
  const [isOver2, setIsOver2] = useState(false);   // State to track hover/drag-over for slot2
  const [errorMsg, setErrorMsg] = useState<string | null>(null);   // State to display error messages for wrong combinations

  const navigation = useNavigation<any>(); // Navigation hook
  const route = useRoute<any>(); // Route hook to access parameters

  const { tripId } = route.params || {}; // Get tripId from route parameters

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
    <DropProvider>
      <View style={styles.container}>
        {/* Screen title */}
        <Text style={styles.title}>Complete The Puzzle</Text>
        <Text style={styles.subtitle}>Paper Planes are cool</Text>
        <Text style={styles.instructions}>Drag the correct icons to complete the key word</Text>

        {/* Row containing two droppable slots */}
        <View style={styles.dropRow}>
          {/* First droppable slot */}
          <Droppable
            id="slot1"
            style={[styles.dropZone, isOver1 && styles.dropZoneActive]} // Highlight when dragging over
            onDrop={(data:any) => {
              // Set slot1 value when an item is dropped
              if (data && typeof data === 'object' && 'id' in data) {
                setSlot1(data.id);
                checkSolution(data.id, slot2); // Check puzzle solution
              }
              setIsOver1(false); // Remove hover effect
            }}
            onEnter={() => setIsOver1(true)} // Drag entering slot1
            onLeave={() => setIsOver1(false)} // Drag leaving slot1
          >
            {/* Display the emoji if filled, placeholder otherwise */}
            <Text style={styles.dropText}>{slot1 ? (slot1 === 'paper' ? '📄' : '❓') : '⬜'}</Text>
          </Droppable>

          {/* Second droppable slot */}
          <Droppable
            id="slot2"
            style={[styles.dropZone, isOver2 && styles.dropZoneActive]} // Highlight when dragging over
            onDrop={(data:any) => {
              // Set slot2 value when an item is dropped
              if (data && typeof data === 'object' && 'id' in data) {
                setSlot2(data.id);
                checkSolution(slot1, data.id); // Check puzzle solution
              }
              setIsOver2(false); // Remove hover effect
            }}
            onEnter={() => setIsOver2(true)} // Drag entering slot2
            onLeave={() => setIsOver2(false)} // Drag leaving slot2
          >
            {/* Display the emoji if filled, placeholder otherwise */}
            <Text style={styles.dropText}>{slot2 ? (slot2 === 'plane' ? '✈️' : '❓') : '⬜'}</Text>
          </Droppable>
        </View>

        {/* Draggable items (tokens) */}
        <View style={styles.draggables}>
          <Draggable id="paper" data={{ id: 'paper' }}>
            <View style={styles.token}><Text style={styles.tokenText}>📄</Text></View>
          </Draggable>
          <Draggable id="plane" data={{ id: 'plane' }}>
            <View style={styles.token}><Text style={styles.tokenText}>✈️</Text></View>
          </Draggable>
          <Draggable id="pizza" data={{ id: 'pizza' }}>
            <View style={styles.token}><Text style={styles.tokenText}>🍕</Text></View>
          </Draggable>
        </View>

        {/* Success message */}
        {solved && <Text style={styles.successText}>✅ Puzzle Solved!</Text>}
        {/* Error message for wrong combination */}
        {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
      </View>
    </DropProvider>
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
