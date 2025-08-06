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
  container:{flex:1,backgroundColor:'#232625'},
  scroll:{alignItems:'center',paddingVertical:20},
  headerRow:{width:'90%',flexDirection:'row',justifyContent:'space-between',marginBottom:20},
  welcomeText:{fontSize:22,fontWeight:'600',color:'#F8C1E1'},
  logoutText:{fontSize:16,color:'#ED1C25'},
  header:{fontSize:26,fontWeight:'bold',color:'#CBBC9F',marginBottom:10},
  link:{color:'#F8C1E1',textDecorationLine:'underline',marginBottom:20},
  chartTitle:{fontSize:18,fontWeight:'500',color:'#F1EFE5',marginTop:30,marginBottom:10},
  chart:{borderRadius:16,marginBottom:20},
  centered:{flex:1,backgroundColor:'#232625',justifyContent:'center',alignItems:'center'},
});
