// components/AnimatedSplash.tsx
import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { SvgUri } from "react-native-svg";
// If you import local SVG as a React component (you already do this in other screens):
import Mascot from "../assets/CrawlLight.svg";

type Props = {
  onFinish?: () => void;
  minutesToShow?: number; // optional override
  iconUri?: string; // optional remote svg/png url (if you prefer)
  title?: string;
};

export default function AnimatedSplash({ onFinish, minutesToShow = 900, iconUri, title = "Armo" }: Props) {
  // we'll do a short animation ~900ms and then a tiny pause
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.delay(450),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.9, duration: 280, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -8, duration: 280, useNativeDriver: true }),
      ]),
    ]).start(() => {
      // wait the remaining timeToShow then finish — timeToShow default is small; here we call finish immediately
      if (onFinish) onFinish();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <Animated.View
        style={[
          styles.inner,
          {
            transform: [{ scale }, { translateY }],
            opacity,
          },
        ]}
      >
        {/* Use provided remote uri first, otherwise local Mascot component */}
        {iconUri ? (
          <SvgUri width={120} height={120} uri={iconUri} />
        ) : (
          <Mascot width={120} height={120} />
        )}

        <Text style={styles.title}>{title}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#232625",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  inner: {
    alignItems: "center",
  },
  title: {
    marginTop: 12,
    color: "#F8C1E1",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
