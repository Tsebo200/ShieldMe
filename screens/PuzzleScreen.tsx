import React, { useState } from 'react';
import { View, Text, StyleSheet, Vibration } from 'react-native';
import { Draggable, Droppable, DropProvider } from 'react-native-reanimated-dnd';
import { useNavigation } from '@react-navigation/native';

export default function PuzzleScreen() {
  const [solved, setSolved] = useState(false);
  const [isOver, setIsOver] = useState(false);
  const [errorMsg,setErrorMsg] = useState<string | null>(null);
  const navigation = useNavigation<any>();

  const handleDrop = (id: string) => {
    if (id === 'shield') {
      Vibration.vibrate(100);
      setSolved(true);
      setTimeout(() => {
        setSolved(false);
        navigation.navigate('SuccessScreen');
      }, 1200);
    } else {
        // Clear any existing success, show error
      setSolved(false);
      Vibration.vibrate([100, 200, 300]); // error vibration
      setErrorMsg('❌ Wrong piece! Try again.');
      // Clear error after 2 seconds
      setTimeout(() => setErrorMsg(null), 2100);
    }
  };

  return (
    <DropProvider>
      <View style={styles.container}>
        <Text style={styles.title}>Complete the Puzzle</Text>
        <Text style={styles.subtitle}>Drag the correct icon into the target</Text>

        <Droppable
          id="target"
          style={[styles.dropZone, isOver && styles.dropZoneActive]}
          onDrop={(data) => {
  console.log("DROP DATA:", data); // ✅ Debug log

  if (data && typeof data === 'object' && 'id' in data) {
    console.log('DROP DATA:', data);
    handleDrop(data.id);
  }
  setIsOver(false);
}}

          onEnter={() => setIsOver(true)}
          onLeave={() => setIsOver(false)}
        >
          <Text style={styles.dropText}>🎯 Drop Zone</Text>
        </Droppable>

        <View style={styles.draggables}>
          <Draggable id="shield" data={{ id: 'shield' }}>
            <View style={styles.token}><Text style={styles.tokenText}>🛡</Text></View>
          </Draggable>
          <Draggable id="star" data={{ id: 'star' }}>
            <View style={styles.token}><Text style={styles.tokenText}>⭐️</Text></View>
          </Draggable>
          <Draggable id="heart" data={{ id: 'heart' }}>
            <View style={styles.token}><Text style={styles.tokenText}>❤️</Text></View>
          </Draggable>
        </View>

        {solved && <Text style={styles.successText}>✅ Puzzle Solved!</Text>}
         {errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
      </View>
    </DropProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 24, color: '#666' },
  dropZone: {
    height: 120,
    width: 120,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#555',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: '#f9f9f9'
  },
  dropZoneActive: {
    backgroundColor: '#e0f7e9',
    borderColor: 'green',
  },
  dropText: { fontSize: 16, color: '#999' },
  draggables: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 30,
  },
  token: {
    backgroundColor: '#6b5b95',
    borderRadius: 40,
    padding: 16,
    marginHorizontal: 10,
  },
  tokenText: {
    fontSize: 24,
    color: 'white',
  },
  successText: {
    position: 'absolute',
    marginTop: 450,
    fontSize: 20,
    color: 'green',
    fontWeight: '600'
  },
  errorText: {
    position: 'absolute',
    marginTop: 450,
    fontSize: 18,
    color: 'red',
    fontWeight: '600',
  },
});
