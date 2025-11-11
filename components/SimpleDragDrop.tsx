import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SimpleDragDropProps {
  onDrop?: (data: any) => void;
  children: React.ReactNode;
  dropZoneStyle?: any;
  dropZoneText?: string;
}

export default function SimpleDragDrop({ 
  onDrop, 
  children, 
  dropZoneStyle, 
  dropZoneText = "Drop Here" 
}: SimpleDragDropProps) {
  const [isPressed, setIsPressed] = useState(false);

  const handlePress = () => {
    if (onDrop) {
      onDrop({ id: 'dragged-item' });
    }
  };

  return (
    <View style={styles.container}>
      {/* Drop Zone */}
      <TouchableOpacity 
        style={[styles.dropZone, dropZoneStyle, isPressed && styles.dropZoneActive]}
        onPress={handlePress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
      >
        <Text style={styles.dropZoneText}>{dropZoneText}</Text>
      </TouchableOpacity>

      {/* Draggable Item */}
      <TouchableOpacity 
        style={[styles.draggableItem, isPressed && styles.draggablePressed]}
        onPress={handlePress}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
      >
        {children}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  dropZone: {
    position: 'absolute',
    top: 50,
    left: screenWidth / 2 - 100,
    width: 200,
    height: 100,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    borderStyle: 'dashed',
  },
  dropZoneActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#2E7D32',
    borderStyle: 'solid',
  },
  dropZoneText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 16,
  },
  draggableItem: {
    position: 'absolute',
    bottom: 100,
    left: screenWidth / 2 - 50,
    width: 100,
    height: 50,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  draggablePressed: {
    backgroundColor: '#1976D2',
    transform: [{ scale: 0.95 }],
  },
});