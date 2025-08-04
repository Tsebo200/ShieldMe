import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
// const chartConfig = {
//   backgroundGradientFrom: '#ffffff',
//   backgroundGradientTo: '#ffffff',
//   decimalPlaces: 0,
//   color: (opacity = 1) => `rgba(34, 128, 176, ${opacity})`,
//   labelColor: (opacity = 1) => `rgba(10, 0, 0, ${opacity})`,
//   propsForDots: { r: '4', strokeWidth: '2', stroke: '#2280B0' },
// };

const chartConfig={
      backgroundColor: "#e26a00",
      backgroundGradientFrom: "#fb8c00",
      backgroundGradientTo: "#ffa726",
      decimalPlaces: 2, // optional, defaults to 2dp
      color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
}

// Mock data
const tripsPerDay = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [{ data: [2, 3, 1, 4, 5, 2, 3] }],
};

const avgDuration = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  datasets: [{ data: [15, 20, 30, 25, 10, 12, 18] }],
};

export default function DashboardScreen() {
  return (
    <SafeAreaView style={[styles.container, styles.content]}>
      <Text style={styles.header}>Trip History</Text>

      <Text style={styles.chartTitle}>Trips This Week</Text>
      <LineChart
        data={tripsPerDay}
        width={width - 40}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
      />

      <Text style={styles.chartTitle}>Avg. Duration (mins)</Text>
      <BarChart
        data={avgDuration}
        width={width - 40}
        height={220}
        chartConfig={chartConfig}
        fromZero
        style={styles.chart}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center', paddingVertical: 20 ,},
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, },
  chartTitle: { fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 10, },
  chart: { borderRadius: 16, color: 'red', backgroundColor: 'red' },
});