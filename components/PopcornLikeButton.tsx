import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { Hoverable } from "./Hoverable";

interface PopcornLikeButtonProps {
  initialLikes?: number;
  liked?: boolean;
  onLike?: (newStatus: boolean) => void;
  size?: number;
}

export default function PopcornLikeButton({
  initialLikes = 0,
  liked = false,
  onLike,
  size = 24,
}: PopcornLikeButtonProps) {
  const [isLiked, setIsLiked] = useState(liked);
  const [likesCount, setLikesCount] = useState(initialLikes);

  // Sync with prop changes
  React.useEffect(() => {
    setIsLiked(liked);
  }, [liked]);

  // Update local count if initialLikes changes (optional but good practice)
  React.useEffect(() => {
    setLikesCount(initialLikes);
  }, [initialLikes]);

  // Animation values
  const scale = useRef(new Animated.Value(1)).current;
  const popOpacity = useRef(new Animated.Value(0)).current;
  const popScale = useRef(new Animated.Value(0.5)).current;
  const popTranslateY = useRef(new Animated.Value(0)).current;

  function handlePress() {
    const newStatus = !isLiked;
    // Optimistic update
    setIsLiked(newStatus);
    setLikesCount((prev) => (newStatus ? prev + 1 : prev - 1));

    if (onLike) onLike(newStatus);

    if (newStatus) {
      // Trigger Pop Animation
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      animatePop();
    } else {
      Haptics.selectionAsync();
    }
  }

  function animatePop() {
    // Reset values
    scale.setValue(0.8);
    popOpacity.setValue(1);
    popScale.setValue(0.5);
    popTranslateY.setValue(0);

    // Sequence
    Animated.parallel([
      // Button Bounce
      Animated.spring(scale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
      // Pop element 1 (Left)
      Animated.sequence([
        Animated.parallel([
          Animated.timing(popOpacity, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(popTranslateY, {
            toValue: -50,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(popScale, {
            toValue: 1.5,
            friction: 5,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }

  return (
    <Hoverable
      onPress={handlePress}
      style={({ pressed, hovered }) => [
        styles.container,
        {
          opacity: pressed ? 0.9 : hovered ? 0.9 : 1,
          transform: [{ scale: hovered ? 1.05 : 1 }],
        },
      ]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={[styles.button, isLiked && styles.buttonLiked]}>
          {/* Main Icon */}
          <Text style={{ fontSize: size }}>{isLiked ? "🍿" : "🌽"}</Text>
          <Text
            style={[
              styles.countText,
              { fontSize: size * 0.6 },
              isLiked && styles.textLiked,
            ]}
          >
            {likesCount} {likesCount > 1 ? "Likes" : "Like"}
          </Text>
        </View>
      </Animated.View>

      {/* Floating Popcorns Animation Particles */}
      <Animated.View
        style={[
          styles.particle,
          {
            opacity: popOpacity,
            transform: [
              { translateY: popTranslateY },
              { scale: popScale },
              { translateX: -10 },
            ],
          },
        ]}
      >
        <Text style={{ fontSize: size * 0.8 }}>🍿</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.particle,
          {
            opacity: popOpacity,
            transform: [
              { translateY: popTranslateY },
              { scale: popScale },
              { translateX: 10 },
              { rotate: "45deg" },
            ],
          },
        ]}
      >
        <Text style={{ fontSize: size * 0.6 }}>🍿</Text>
      </Animated.View>
    </Hoverable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  buttonLiked: {
    backgroundColor: "#FEF3C7", // Yellowish for popcorn
    borderColor: "#FCD34D",
  },
  countText: {
    fontWeight: "600",
    color: "#6B7280",
  },
  textLiked: {
    color: "#D97706",
  },
  particle: {
    position: "absolute",
    top: -10,
    pointerEvents: "none",
  },
});
