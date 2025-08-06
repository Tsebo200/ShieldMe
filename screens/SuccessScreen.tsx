import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, SafeAreaView, Image } from 'react-native';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Swipeable from 'react-native-gesture-handler/Swipeable';

// import HomeIcon from '../assets/home-icon.png';
import SuccessSound from '../assets/fireworks.mp3';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = 64;
const SLIDER_WIDTH = width - 150;

export default function SuccessScreen() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const confettiRef = useRef(null);
  const navigation = useNavigation<any>();

  useEffect(() => {
    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(SuccessSound);
        soundRef.current = sound;
        await sound.setPositionAsync(1000); // Skip intro
        await sound.playAsync();
      } catch (e) {
        console.warn('Audio play error', e);
      }
    })();
    return () => {
      soundRef.current?.stopAsync().catch(console.warn);
      soundRef.current?.unloadAsync().catch(console.warn);
    };
  }, []);

  // // Fired when user fully swipes right
  // const handleSwipeHome = () => {
  //   navigation.navigate('HomeScreen');
  // };

  // Handle swipe: stop audio then navigate
  const handleSwipeHome = async () => {
    try {
      await soundRef.current?.stopAsync();
    } catch (e) {
      console.warn('Error stopping audio', e);
    }
    navigation.navigate('HomeScreen');
  };

  // Render the track behind the circle
  const renderLeftActions = () => (
    <View style={[styles.track, { width: SLIDER_WIDTH }]} />
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.success}>🎉 You’ve arrived safely!</Text>
      <Text style={styles.text}>Slide to go Home</Text>

      <ConfettiCannon
        count={200}
        origin={{ x: width / 2, y: -200 }}
        fadeOut
        autoStart
        ref={confettiRef}
      />

      <Swipeable
        overshootRight={false}
        onSwipeableRightOpen={handleSwipeHome}
        renderRightActions={renderLeftActions}
        friction={1.2}
        rightThreshold={SLIDER_WIDTH - CIRCLE_SIZE}
      >
        <View style={styles.circleContainer}>
          <View style={styles.circle}>
            {/* <Image source={HomeIcon} style={styles.icon} /> */}
            <Text style={styles.icon}>🏠</Text>
          </View>
        </View>
      </Swipeable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#393031',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  success: {
    fontSize: 28,
    fontWeight: '700',
    color: '#CBBC9F',
    marginBottom: 40,
    textAlign: 'center',
  },
  track: {
    height: CIRCLE_SIZE,
    backgroundColor: '#755540',
    borderRadius: CIRCLE_SIZE / 2,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  circleContainer: {
    width: SLIDER_WIDTH,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#CBBC9F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 32,
    color: '#393031',
  },
  text: {
    fontSize: 16,
    color: '#F1EFE5',
    marginTop: 24,
    textAlign: 'center',
  },
});
