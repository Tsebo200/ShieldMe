import { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Vibration, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { completeTrip } from '../services/tripService'; // Function to mark a trip as complete in the backend
import { Draggable, Droppable } from 'react-native-reanimated-dnd';
import { useAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PuzzleScreen() {
  const [solved, setSolved] = useState(false);   // State to track if puzzle is solved
  const [slot1, setSlot1] = useState<string | null>(null);   // State for the first droppable slot
  const [slot2, setSlot2] = useState<string | null>(null);   // State for the second droppable slot
  // activeStyle on Droppable will handle hover visuals
  const [errorMsg, setErrorMsg] = useState<string | null>(null);   // State to display error messages for wrong combinations

  const navigation = useNavigation<any>(); // Navigation hook
  const route = useRoute<any>(); // Route hook to access parameters

  const { tripId } = route.params || {}; // Get tripId from route parameters
  const wrongPlayer = useAudioPlayer(require('../assets/WrongSound.mp3'));
  const successPlayer = useAudioPlayer(require('../assets/friendSound.mp3'));

  // Boost wrong sound volume
  useEffect(() => {
    try {
      // Some versions provide setVolume, others expose a volume prop
      // @ts-ignore
      if (typeof wrongPlayer?.setVolume === 'function') wrongPlayer.setVolume(1.0);
      // @ts-ignore
      if ('volume' in (wrongPlayer || {})) wrongPlayer.volume = 1.0;
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Define multiple puzzles and pick one at random
  const puzzles = useMemo(() => ([
    {
      id: 'paper-plane',
      title: 'Complete The Puzzle',
      subtitle: 'Paper Planes are cool',
      solution: ['paper', 'plane'] as const,
      tokens: [
        { id: 'paper', emoji: '📄' },
        { id: 'plane', emoji: '✈️' },
        { id: 'pizza', emoji: '🍕' },
      ],
    },
    {
      id: 'sun-flower',
      title: 'Complete The Puzzle',
      subtitle: 'A bright combination',
      solution: ['sun', 'flower'] as const,
      tokens: [
        { id: 'sun', emoji: '🌞' },
        { id: 'flower', emoji: '🌸' },
        { id: 'book', emoji: '📘' },
      ],
    },
    {
      id: 'foot-ball',
      title: 'Complete The Puzzle',
      subtitle: 'Bafana Bafana',
      solution: ['foot', 'ball'] as const,
      tokens: [
        { id: 'foot', emoji: '🦶' },
        { id: 'ball', emoji: '⚽' },
        { id: 'car', emoji: '🚗' },
      ],
    },
    {
      id: 'sand-witch',
      title: 'Complete The Puzzle',
      subtitle: 'I could use a sandwich right now',
      solution: ['sand', 'witch'] as const,
      tokens: [
        { id: 'witch', emoji: '🧙‍♀️' },
        { id: 'sand', emoji: '🏖️' },
        { id: 'basketball', emoji: '🏀' },
      ],
    },
    {
      id: 'nelson-mandela',
      title: 'Complete The Puzzle',
      subtitle: 'Nelson Mandela promotes education',
      solution: ['brain', 'peace'] as const,
      tokens: [
        { id: 'brain', emoji: '🧠' },
        { id: 'hug', emoji: '🫂' },
        { id: 'peace', emoji: '☮️' },
      ],
    },
    {
      id: 'desmond-tutu',
      title: 'Complete The Puzzle',
      subtitle: 'What does Desmond Tutu promote?',
      solution: ['christ', 'peace'] as const,
      tokens: [
        { id: 'christ', emoji: '✝️' },
        { id: 'lightning', emoji: '⚡️' },
        { id: 'peace', emoji: '☮️' },
      ],
    },
    {
      id: 'mc-flurry',
      title: 'Complete The Puzzle',
      subtitle: 'What is a McFlurry?',
      solution: ['chocolate', 'iceCream'] as const,
      tokens: [
        { id: 'iceCream', emoji: '🍦' },
        { id: 'fire', emoji: '🔥' },
        { id: 'chocolate', emoji: '🍫' },
      ],
    },
    {
      id: 'spider-man-2',
      title: 'Complete The Puzzle',
      subtitle: 'Spider-Man 2 is fun',
      solution: ['spider','hero'] as const,
      tokens: [
        { id: 'mask', emoji: '🫥' },
        { id: 'spider', emoji: '🕷️' },
        { id: 'hero', emoji: '🦸' },
      ],
    },
    {
      id: 'sand-witch',
      title: 'Complete The Puzzle',
      subtitle: 'I could use a sandwich right now',
      solution: ['sand', 'witch'] as const,
      tokens: [
        { id: 'witch', emoji: '🧙‍♀️' },
        { id: 'sand', emoji: '🏖️' },
        { id: 'basketball', emoji: '🏀' },
      ],
    },
    {
      id: 'Nelson-Mandela',
      title: 'Complete The Puzzle',
      subtitle: 'Nelson Mandela Promtes Education',
      solution: ['brain', 'peace'] as const,
      tokens: [
        { id: 'brain', emoji: '🧠' },
        { id: 'hug', emoji: '🫂' },
        { id: 'peace', emoji: '☮️' },
      ],
    },
    {
      id: 'Desmon-TuTu',
      title: 'Complete The Puzzle',
      subtitle: 'What does Desmon-TuTu Promtes',
      solution: ['christ', 'peace'] as const,
      tokens: [
        { id: 'christ', emoji: '✝️' },
        { id: 'hug', emoji: '⚡️' },
        { id: 'peace', emoji: '☮️' },
      ],
    },
    {
      id: 'Mc-Flurry',
      title: 'Complete The Puzzle',
      subtitle: 'What is a Mc Flurry',
      solution: ['Chocolate', 'IceCream'] as const,
      tokens: [
        { id: 'iceCream', emoji: '🍦' },
        { id: 'fire', emoji: '🔥' },
        { id: 'chocolate', emoji: '🍫' },
      ],
    },
    {
      id: 'Spider-Man2',
      title: 'Complete The Puzzle',
      subtitle: 'Spiderman 2 is fun',
      solution: ['Spider', 'Hero'] as const,
      tokens: [
        { id: 'iceCream', emoji: '🫥' },
        { id: 'fire', emoji: '🕷️' },
        { id: 'chocolate', emoji: '🦸' },
      ],
    },
  ]), []);

  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState<number | null>(null);

  const currentPuzzle = useMemo(
    () => (currentPuzzleIndex !== null ? puzzles[currentPuzzleIndex] : puzzles[0]),
    [puzzles, currentPuzzleIndex]
  );

  // Shuffle tokens for display each time a puzzle is chosen
  const [shuffledTokens, setShuffledTokens] = useState(currentPuzzle.tokens);
  useEffect(() => {
    const arr = [...currentPuzzle.tokens];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setShuffledTokens(arr);
    setSlot1(null);
    setSlot2(null);
    setSolved(false);
    setErrorMsg(null);
  }, [currentPuzzleIndex, currentPuzzle.tokens]);

  // Initialise a rotating, randomised order that avoids immediate repeats across mounts
  useEffect(() => {
    const KEY_ORDER = 'puzzleOrderV1';
    const KEY_PTR = 'puzzlePtrV1';
    const init = async () => {
      try {
        const orderJson = await AsyncStorage.getItem(KEY_ORDER);
        const ptrJson = await AsyncStorage.getItem(KEY_PTR);
        let order: number[] | null = null;
        let ptr = 0;
        if (orderJson) {
          try {
            const parsed = JSON.parse(orderJson) as number[];
            // Validate order contents and length
            if (Array.isArray(parsed) && parsed.length === puzzles.length && parsed.every((i) => typeof i === 'number')) {
              order = parsed;
            }
          } catch {
            order = null;
          }
        }
        if (ptrJson) {
          const n = Number(ptrJson);
          if (!Number.isNaN(n) && n >= 0) ptr = n;
        }
        // Build new order if missing or out of date
        if (!order) {
          order = Array.from({ length: puzzles.length }, (_, i) => i);
          for (let i = order.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
          }
          ptr = 0;
          await AsyncStorage.setItem(KEY_ORDER, JSON.stringify(order));
        }
        // Select current index and advance pointer
        const idx = order[Math.max(0, ptr % order.length)];
        setCurrentPuzzleIndex(idx);
        const nextPtr = (ptr + 1) % order.length;
        await AsyncStorage.setItem(KEY_PTR, String(nextPtr));
      } catch {
        // Fallback: simple random
        setCurrentPuzzleIndex(Math.floor(Math.random() * Math.max(1, puzzles.length)));
      }
    };
    init();
  }, [puzzles.length]);

  // Boost volumes for feedback sounds
  useEffect(() => {
    try {
      // @ts-ignore
      if (typeof wrongPlayer?.setVolume === 'function') wrongPlayer.setVolume(1.0);
      // @ts-ignore
      if ('volume' in (wrongPlayer || {})) wrongPlayer.volume = 1.0;
      // @ts-ignore
      if (typeof successPlayer?.setVolume === 'function') successPlayer.setVolume(1.0);
      // @ts-ignore
      if ('volume' in (successPlayer || {})) successPlayer.volume = 1.0;
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleClearSlot1 = useCallback(() => {
    setSlot1(null);
    setSolved(false);
    setErrorMsg(null);
  }, []);

  const handleClearSlot2 = useCallback(() => {
    setSlot2(null);
    setSolved(false);
    setErrorMsg(null);
  }, []);

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
    if (updatedSlot1 === currentPuzzle.solution[0] && updatedSlot2 === currentPuzzle.solution[1]) {
      // Correct combination
      Vibration.vibrate(100); // Short vibration for success
      setSolved(true); // Mark puzzle as solved
      try {
        await successPlayer.seekTo(0);
        successPlayer.play();
      } catch {}

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
      try {
        await wrongPlayer.seekTo(0);
        wrongPlayer.play();
      } catch (e) {
        // noop
      }
      setTimeout(() => setErrorMsg(null), 2000); // Clear error message after 2 seconds
    }
  };

  if (currentPuzzleIndex === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.instructions}>Loading puzzle…</Text>
      </View>
    );
  }

  return (
      <View style={styles.container}>
        {/* Screen title */}
        <Text style={styles.title}>{currentPuzzle.title}</Text>
        <Text style={styles.subtitle}>{currentPuzzle.subtitle}</Text>
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
            <Pressable onPress={handleClearSlot1} hitSlop={10}>
              <Text style={styles.dropText}>
                {slot1
                  ? (shuffledTokens.find(t => t.id === slot1)?.emoji ?? '❓')
                  : '⬜'}
              </Text>
            </Pressable>
          </Droppable>

          {/* Second droppable slot */}
          <Droppable
            onDrop={handleDropSlot2}
            style={styles.dropZone}
            activeStyle={{ opacity: 0.7 }}
          >
            {/* Display the emoji if filled, placeholder otherwise */}
            <Pressable onPress={handleClearSlot2} hitSlop={10}>
              <Text style={styles.dropText}>
                {slot2
                  ? (shuffledTokens.find(t => t.id === slot2)?.emoji ?? '❓')
                  : '⬜'}
              </Text>
            </Pressable>
          </Droppable>
        </View>

        {/* Draggable and tappable items (tokens) */}
        <View style={styles.draggables}>
          {shuffledTokens.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => handlePieceTap(t.id)}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <Draggable data={{ id: t.id }}>
                <View style={styles.token}><Text style={styles.tokenText}>{t.emoji}</Text></View>
              </Draggable>
            </Pressable>
          ))}
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
