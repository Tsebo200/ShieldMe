import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

export default function ETAPicker({ onDurationChange }: { onDurationChange: (totalSeconds: number) => void }) {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const total = hours * 3600 + minutes * 60 + seconds;
    onDurationChange(total);
  }, [hours, minutes, seconds]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set ETA Duration</Text>

      <View style={styles.pickerContainer}>
        <View style={styles.pickerWrapper}>
          <Text style={styles.pickerLabel}>Hours</Text>
          <Picker
            selectedValue={hours}
            onValueChange={(value) => setHours(value)}
            style={styles.picker}
            itemStyle={styles.itemStyle}
          >
            {Array.from({ length: 24 }, (_, i) => (
              <Picker.Item key={i} label={`${i}`} value={i} />
            ))}
          </Picker>
        </View>

        <View style={styles.pickerWrapper}>
          <Text style={styles.pickerLabel}>Minutes</Text>
          <Picker
            selectedValue={minutes}
            onValueChange={(value) => setMinutes(value)}
            style={styles.picker}
            itemStyle={styles.itemStyle}
          >
            {Array.from({ length: 60 }, (_, i) => (
              <Picker.Item key={i} label={`${i}`} value={i} />
            ))}
          </Picker>
        </View>

        <View style={styles.pickerWrapper}>
          <Text style={styles.pickerLabel}>Seconds</Text>
          <Picker
            selectedValue={seconds}
            onValueChange={(value) => setSeconds(value)}
            style={styles.picker}
            itemStyle={styles.itemStyle}
          >
            {Array.from({ length: 60 }, (_, i) => (
              <Picker.Item key={i} label={`${i}`} value={i} />
            ))}
          </Picker>
        </View>
      </View>

      <Text style={styles.result}>
        Selected ETA: {hours}h {minutes}m {seconds}s
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#393031', // Dark background
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#CBBC9F', // Elegant cream
    marginBottom: 30,
  },
  pickerContainer: {
    flexDirection: 'row',
    // justifyContent: 'center',

  },
  pickerWrapper: {
    alignItems: 'center',
    marginHorizontal: 10,
    backgroundColor: '#232625', // Charcoal box
    borderRadius: 12,
    padding: 10,
  },
  picker: {
    justifyContent: 'center',
    width: 100,
    height: 160,
    color: '#F1EFE5', // Soft cream for picker items (on iOS)
  },
  pickerLabel: {
    fontSize: 16,
    color: '#F8C1E1', // Light pink
    // marginBottom: 8,
  },
  itemStyle: {
    fontSize: 20,
    color: '#F1EFE5', // Soft cream (for Android Picker)
  },
  result: {
    marginTop: 40,
    fontSize: 18,
    color: '#CBBC9F',
    fontWeight: '600',
  },
});
