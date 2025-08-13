import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, Alert, ActivityIndicator, Platform, Vibration } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { logoutUser } from 'services/authService';
import { useNavigation } from '@react-navigation/native';
import { useTrip } from 'context/TripContext';
import { auth, db } from 'firebase';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export default function DashboardScreen() {
  const { user } = useTrip();
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const { width } = Dimensions.get('window');

const translateXFriends = useSharedValue(0);
const hasTriggeredFriends = useSharedValue(false);
const thresholdFriends = 100; // distance to trigger navigation

const animatedStyleFriends = useAnimatedStyle(() => ({
  transform: [{ translateX: translateXFriends.value }],
}));

const handleNavigateFriends = () => {
  navigation.navigate('FriendsScreen');
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
};

  const chartConfig = {
    backgroundColor: '#232625',
    backgroundGradientFrom: '#393031',
    backgroundGradientTo: '#232625',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(248, 193, 225, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(203, 188, 159, ${opacity})`,
  };

  // Swipe-down logout animation setup
  const translateY = useSharedValue(0);
  const threshold = 60;
  const hasTriggered = useSharedValue(false);

  const triggerFeedback = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Vibration.vibrate(50);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(translateY.value) }],
  }));

  const handleLogout = async () => {
    try {
      await logoutUser();
      navigation.replace('LoginScreen');
    } catch (err: any) {
      Alert.alert('Logout Error', err.message);
    }
  };

  // Fetch trip data for charts
  useEffect(() => {
    let unsubscribeTrips: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        if (unsubscribeTrips) unsubscribeTrips();
        setTrips([]);
        setLoading(false);
        return;
      }

      const tripsRef = collection(db, 'trips');
      const q = query(tripsRef, where('uid', '==', currentUser.uid));

      unsubscribeTrips = onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }));
          setTrips(list);
          setLoading(false);
        },
        (err) => {
          console.error('Error loading trips:', err);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeTrips) unsubscribeTrips();
    };
  }, []);

  // Preloader
  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F8C1E1" />
      </View>
    );

  // Prepare data for charts
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return d;
  });

  const tripsPerDay = last7.map((d) =>
    trips.filter((t) => {
      const st = (t.startTime as Timestamp).toDate();
      return st.toDateString() === d.toDateString();
    }).length
  );

  const avgDuration = last7.map((d) => {
    const dayTrips = trips.filter((t) => {
      const st = (t.startTime as Timestamp).toDate();
      return st.toDateString() === d.toDateString() && t.duration;
    });
    if (!dayTrips.length) return 0;
    const sum = dayTrips.reduce((sum, t) => sum + (t.duration || 0) / 60, 0);
    return Math.round(sum / dayTrips.length);
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.welcomeText}>Welcome {user?.fullName || 'User'}! 👋</Text>

          <PanGestureHandler
            onGestureEvent={(event) => {
              translateY.value = Math.max(event.nativeEvent.translationY, 0);
              if (translateY.value > threshold && !hasTriggered.value) {
                runOnJS(triggerFeedback)();
                hasTriggered.value = true;
              }
            }}
            onEnded={(event) => {
              if (event.nativeEvent.translationY > threshold) {
                runOnJS(handleLogout)();
              }
              translateY.value = 0;
              hasTriggered.value = false;
            }}
          >
            <Animated.View style={[styles.logoutSwipe, animatedStyle]}>
              <Text style={styles.logoutText}>⬇️ Logout</Text>
            </Animated.View>
          </PanGestureHandler>
        </View>
        <Text style={styles.header}>Your Dashboard</Text>



        <PanGestureHandler
        onGestureEvent={(event) => {
          // track left swipe (negative X)
          translateXFriends.value = Math.min(0, event.nativeEvent.translationX);
          if (translateXFriends.value < -thresholdFriends && !hasTriggeredFriends.value) {
            runOnJS(handleNavigateFriends)();
            hasTriggeredFriends.value = true;
          }
        }}
        onEnded={() => {
          translateXFriends.value = withSpring(0);
          hasTriggeredFriends.value = false;
        }}
      >
        <Animated.View style={[styles.swipeLink, animatedStyleFriends]}>
          <Text style={styles.link}>Manage Friends</Text>
          <Text style={styles.swipeText}>Swipe me left to view friends</Text>
        </Animated.View>
      </PanGestureHandler>

        {/* <Text style={styles.link} onPress={() => navigation.replace('FriendsScreen')}>
          Manage Friends
        </Text> */}

        <Text style={styles.chartTitle}>Trips This Week</Text>
        <LineChart
          data={{ labels: last7.map((d) => weekDays[d.getDay()]), datasets: [{ data: tripsPerDay }] }}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />

        <Text style={styles.chartTitle}>Avg. Duration (mins)</Text>
        <BarChart
          data={{ labels: last7.map((d) => weekDays[d.getDay()]), datasets: [{ data: avgDuration }] }}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          fromZero
          style={styles.chart}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#232625' },
  scroll: { alignItems: 'center', paddingVertical: 20 },
  headerRow: { width: '90%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
  welcomeText: { fontSize: 22, fontWeight: '600', color: '#F8C1E1' },
  logoutSwipe: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#ED1C25', borderRadius: 8 },
  logoutText: { fontSize: 16, color: '#fff', fontWeight: '700' },
  header: { fontSize: 26, fontWeight: 'bold', color: '#CBBC9F', marginBottom: 10 },
  link: { alignSelf: 'center', fontSize: 16, fontWeight: '800', color: '#232625',},
  chartTitle: { fontSize: 18, fontWeight: '500', color: '#F1EFE5', marginTop: 30, marginBottom: 10 },
  chart: { borderRadius: 16, marginBottom: 20 },
  centered: { flex: 1, backgroundColor: '#232625', justifyContent: 'center', alignItems: 'center' },
  swipeLink: { paddingVertical: 15, paddingHorizontal: 14, backgroundColor: '#CBBC9F', borderRadius: 8, marginTop: 10,},
  swipeText: { color: '#563F2F', marginTop: 5, fontSize: 14, textAlign: 'center' },
});
