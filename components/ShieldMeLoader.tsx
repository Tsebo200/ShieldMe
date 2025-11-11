import { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing, Text } from "react-native";
import LocalSvg from "./LocalSvg"; // render local SVG with colors in Expo

export default function ShieldMeLoader({ text = "Loading..." }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.2,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.6,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [scale, opacity]);

  return (
    <View style={styles.root}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <LocalSvg source={require('../assets/CrawlLight.svg')} width={100} height={100} />
      </Animated.View>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#232625", // match app splash
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: "#F8C1E1",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
