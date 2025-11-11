import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, SafeAreaView } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { useNavigation } from '@react-navigation/native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import SuccessSound from '../assets/fireworks.mp3';

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = 64;
const SLIDER_WIDTH = width - 80;

export default function SuccessScreen() {
  const player = useAudioPlayer(SuccessSound);
  const confettiRef = useRef(null);
  const navigation = useNavigation<any>();

  useEffect(() => {
    (async () => {
      try {
        await player.seekTo(1); // 1s offset like previous setPositionAsync(1000)
        player.play();
      } catch (e) {
        console.warn('Audio play error', e);
      }
    })();
    return () => {
      try {
        player.pause();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const handleSwipeHome = async () => {
    try {
      player.pause();
    } catch (e) {
      console.warn('Error stopping audio', e);
    }
    navigation.navigate('HomeScreen');
  };

  const renderLeftActions = () => (
    <View style={[styles.track, { width: SLIDER_WIDTH }]} />
  );

const confetti1 = useRef<any>(null);
  const confetti2 = useRef<any>(null);

  useEffect(() => {
    // Automatically fire both bursts
    setTimeout(() => confetti1.current?.start(), 200);
    setTimeout(() => confetti2.current?.start(), 600); // Second burst after ~0.6s
  }, []);


  return (
    <SafeAreaView style={styles.container}>
      {/* Re-centered confetti burst */}
      <ConfettiCannon
        // ref={confetti1}
        count={200}
        origin={{ x: -10, y: 0 }}
        fadeOut
        autoStart
        ref={confettiRef}
         colors={['#F2A007', '#025E73', '#731702', '#CBBC9F']}
      />

      <ConfettiCannon
        ref={confetti1}
        count={35}
        origin={{ x: -400, y: -200 }}
        fallSpeed={2500}
        fadeOut
        explosionSpeed={800}
         colors={['#F2A007', '#025E73', '#731702', '#CBBC9F']}
      />

        {/* Second confetti burst */}
        <ConfettiCannon
          ref={confetti2}
          count={35}
          origin={{ x: 400, y: 0 }}
          fallSpeed={2500}
          fadeOut
          explosionSpeed={400}
          colors={['#F2A007', '#025E73', '#731702', '#CBBC9F']}
        />

      {/* Success message */}
      <Text style={styles.success}>🎉 You’ve arrived safely!</Text>

      {/* Swipe slider */}
      <Swipeable
        overshootRight={false}
        onSwipeableRightOpen={handleSwipeHome}
        renderRightActions={renderLeftActions}
        friction={1.2}
        rightThreshold={SLIDER_WIDTH - CIRCLE_SIZE}
      >
        <View style={styles.circleContainer}>
          <View style={styles.circle}>
            <Text style={styles.icon}>🏠</Text>
          </View>
        </View>
      </Swipeable>

      {/* Instruction text below slider */}
      <Text style={styles.text}>Slide to go Home</Text>
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
