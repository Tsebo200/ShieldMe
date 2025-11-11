// import React, { useEffect, useRef } from "react";
// import { View, Text, StyleSheet, Animated } from "react-native";
// import { SvgUri } from "react-native-svg";
// import * as SplashScreen from "expo-splash-screen";
// import Mascot from "../assets/CrawlLight.svg";

// type Props = {
//   onFinish?: () => void;
//   minutesToShow?: number;
//   iconUri?: string;
//   title?: string;
// };

// export default function AnimatedSplash({ onFinish, minutesToShow = 900, iconUri, title = "ShieldMe" }: Props) {
//   const scale = useRef(new Animated.Value(0.7)).current;
//   const opacity = useRef(new Animated.Value(0)).current;
//   const translateY = useRef(new Animated.Value(8)).current;

//   useEffect(() => {
//     // Hide the native splash only when the animated splash is mounted and ready to animate.
//     // This ensures the user sees our animated view rather than a sudden blank screen.
//     (async () => {
//       try {
//         // hide the native splash so our animated view becomes visible
//         await SplashScreen.hideAsync();
//       } catch (err) {
//         // ignore if already hidden
//         // console.warn('Splash hide error', err);
//       }

//       // start the animation AFTER the native splash is hidden
//       Animated.sequence([
//         Animated.parallel([
//           Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
//           Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }),
//           Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
//         ]),
//         Animated.delay(450),
//         Animated.parallel([
//           Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true }),
//           Animated.timing(scale, { toValue: 0.9, duration: 280, useNativeDriver: true }),
//           Animated.timing(translateY, { toValue: -8, duration: 280, useNativeDriver: true }),
//         ]),
//       ]).start(() => {
//         if (onFinish) onFinish();
//       });
//     })();

//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   return (
//     <View style={styles.root} pointerEvents="none">
//       <Animated.View
//         style={[
//           styles.inner,
//           {
//             transform: [{ scale }, { translateY }],
//             opacity,
//           },
//         ]}
//       >
//         {iconUri ? (
//           <SvgUri width={120} height={120} uri={iconUri} />
//         ) : (
//           <Mascot width={120} height={120} />
//         )}

//         <Text style={styles.title}>{title}</Text>
//       </Animated.View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   root: {
//     ...StyleSheet.absoluteFillObject,
//     backgroundColor: "#232625",
//     justifyContent: "center",
//     alignItems: "center",
//     zIndex: 9999,
//   },
//   inner: {
//     alignItems: "center",
//   },
//   title: {
//     marginTop: 12,
//     color: "#F8C1E1",
//     fontSize: 22,
//     fontWeight: "700",
//     letterSpacing: 0.2,
//   },
// });
