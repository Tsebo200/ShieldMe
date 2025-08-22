import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, FlatList, Animated, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";


const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    title: "Stay Safe",
    description: "ShieldMe helps you get safely from point A to B.",
  },
  {
    id: "2",
    title: "Share ETA",
    description: "Easily share your live ETA with trusted friends.",
  },
  {
    id: "3",
    title: "Interactive Safety",
    description: "Solve fun puzzles to confirm you're safe on your journey.",
  },
    // Submit
    {
    id: "4",
    title: "Event Trigger",
    description: "Armo will appear as a drggable object on screen, you can drag and drop him to trigger events. ",
  },
  // Navigation
    {
    id: "5",
    title: "Swipe Navigation",
    description: "whenever you see Armo's lil Bro on the screen, hints what is swipeable ",
  },
];

export const OnboardingScreen = () => {
  const navigation: any = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const slidesRef = useRef(null);

  return (
    <View style={styles.container}>
      <FlatList
        data={slides}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onViewableItemsChanged={viewableItemsChanged}
        viewabilityConfig={viewConfig}
        scrollEventThrottle={32}
        ref={slidesRef}
      />

      {/* Pagination Dots */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <View
            key={index.toString()}
            style={[
              styles.dot,
              { backgroundColor: index === currentIndex ? "#F2A007" : "#024959" },
            ]}
          />
        ))}
      </View>

      {/* "Get Started" as swipe/drag alternative */}
      {currentIndex === slides.length - 1 && (
        <TouchableOpacity
          style={styles.getStarted}
          onPress={() => navigation.replace("LoginScreen")} // adjust destination
        >
          <Text style={styles.getStartedText}>Get Started →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070D0C",
    alignItems: "center",
    justifyContent: "center",
  },
  slide: {
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#F2A007",
    textAlign: "center",
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  dotsContainer: {
    flexDirection: "row",
    marginBottom: 30,
  },
  dot: {
    height: 10,
    width: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  getStarted: {
    backgroundColor: "#025E73",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 20,
    marginBottom: 40,
  },
  getStartedText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default OnboardingScreen;
