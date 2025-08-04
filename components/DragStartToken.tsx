import React from 'react';
import { View, Text, StyleSheet, PanResponder, Animated } from 'react-native';

export default function DragStartToken({ onDrop }: { onDrop: () => void }) {
  const pan = React.useRef(new Animated.ValueXY()).current;

  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gesture) => {
        if (gesture.moveY > 500) { // Example drop zone Y
          onDrop();
        }
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[styles.token, pan.getLayout()]}
      {...panResponder.panHandlers}
    >
      <Text style={styles.text}>🛡 Start Trip</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  token: {
    padding: 16,
    backgroundColor: '#6b5b95',
    borderRadius: 40,
    alignItems: 'center',
  },
  text: {
    color: 'white',
    fontWeight: 'bold',
  },
});
