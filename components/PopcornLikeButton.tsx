import { useTheme } from "@/providers/ThemeProvider";
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
  const { colors, isDark } = useTheme();
  const [isLiked, setIsLiked] = useState(liked);
  const [likesCount, setLikesCount] = useState(initialLikes);

  const styles = getStyles(colors, isDark, size);

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
              { translateX: -15 },
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
              { translateX: 15 },
              { rotate: "25deg" },
            ],
          },
        ]}
      >
        <Text style={{ fontSize: size * 0.7 }}>🍿</Text>
      </Animated.View>
    </Hoverable>
  );
}

const getStyles = (colors: any, isDark: boolean, size: number) => StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: isDark ? colors.backgroundSecondary : "#F3F4F6",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E5E7EB",
  },
  buttonLiked: {
    backgroundColor: isDark ? "rgba(255, 191, 0, 0.15)" : "#FEF3C7",
    borderColor: isDark ? "#FFBF00" : "#FCD34D",
    // Glow effect in dark mode
    ...(isDark && {
      shadowColor: "#FFBF00",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 5,
    }),
  },
  countText: {
    fontWeight: "700",
    color: isDark ? "#9CA3AF" : "#6B7280",
    fontSize: size * 0.6,
  },
  textLiked: {
    color: isDark ? "#FFBF00" : "#D97706",
  },
  particle: {
    position: "absolute",
    top: -10,
    pointerEvents: "none",
  },
});
