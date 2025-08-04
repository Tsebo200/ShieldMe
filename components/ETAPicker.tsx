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
    padding: 20,
    alignItems: 'center',
  },
  label: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pickerWrapper: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  picker: {
    width: 100,
    height: 150,
  },
  pickerLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  itemStyle: {
    fontSize: 20,
  },
  result: {
    marginTop: 50,
    fontSize: 18,
    fontWeight: '500',
  },
});
