import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logoutUser } from 'services/authService';
import { useNavigation } from '@react-navigation/native';
import { useTrip } from 'context/TripContext';
import { auth, db } from 'firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function DashboardScreen() {
  const { user } = useTrip();
  const navigation = useNavigation<any>();
  const [name, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const { width } = Dimensions.get('window');

  const chartConfig = {
    backgroundColor: '#232625',
    backgroundGradientFrom: '#393031',
    backgroundGradientTo: '#232625',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(248, 193, 225, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(203, 188, 159, ${opacity})`,
  };

  // Fetch trip data for charts
useEffect(() => {
  let unsubscribeTrips: (() => void) | undefined;

  const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
    if (!currentUser) {
      // No user is logged in
      if (unsubscribeTrips) unsubscribeTrips(); // Clean up trips listener
      setTrips([]);
      setLoading(false);
      return;
    }
// setting up the trips Data collection
    const tripsRef = collection(db, 'trips');
    const q = query(tripsRef, where('uid', '==', currentUser.uid));

    unsubscribeTrips = onSnapshot(q, snapshot => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      setTrips(list);
      setLoading(false);
    }, err => {
      console.error('Error loading trips:', err);
      setLoading(false);
    });
  });

  return () => {
    unsubscribeAuth();
    if (unsubscribeTrips) unsubscribeTrips(); // Clean up on component unmount
  };
}, []);


  const handleNavigate = () => navigation.replace('FriendsScreen');
  const handleLogout = async () => {
    try {
      await logoutUser();
      navigation.replace('LoginScreen');
    } catch (err: any) {
      Alert.alert('Logout Error', err.message);
    }
  };
// Preloader
  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#F8C1E1"/></View>;

  // Prepare data for "Trips This Week" line chart
  const weekDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today = new Date();
  const last7 = Array.from({length:7}).map((_,i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });
  const tripsPerDay = last7.map(d =>
    trips.filter(t => {
      const st = (t.startTime as Timestamp).toDate();
      return st.toDateString() === d.toDateString();
    }).length
  );

  // Prepare data for "Avg. Duration (mins)"
  const avgDuration = last7.map(d => {
    const dayTrips = trips.filter(t => {
      const st = (t.startTime as Timestamp).toDate();
      return st.toDateString() === d.toDateString() && t.duration;
    });
    if (!dayTrips.length) return 0;
    const sum = dayTrips.reduce((sum, t) => sum + (t.duration || 0)/60, 0);
    return Math.round(sum / dayTrips.length);
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.welcomeText}>Welcome {user?.fullName || 'User'}! 👋</Text>
          <TouchableOpacity onPress={handleLogout}><Text style={styles.logoutText}>Logout</Text></TouchableOpacity>
        </View>

        <Text style={styles.header}>Your Dashboard</Text>
        <TouchableOpacity onPress={handleNavigate}><Text style={styles.link}>Manage Friends</Text></TouchableOpacity>

        <Text style={styles.chartTitle}>Trips This Week</Text>
        <LineChart
          data={{ labels: last7.map(d => weekDays[d.getDay()]), datasets:[{ data: tripsPerDay }] }}
          width={width-40} height={220} chartConfig={chartConfig} bezier style={styles.chart}
        />

        <Text style={styles.chartTitle}>Avg. Duration (mins)</Text>
        <BarChart
          data={{ labels: last7.map(d => weekDays[d.getDay()]), datasets:[{ data: avgDuration }] }}
          width={width-40} height={220} chartConfig={chartConfig} fromZero style={styles.chart}
        />
      </ScrollView>
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
