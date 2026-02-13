import { useUserMode } from "@/hooks/useUserMode";
import { useTheme } from "@/providers/ThemeProvider";
import { useTutorial } from "@/providers/TutorialProvider";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function TutorialOverlay() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const {
    currentStep,
    isTutorialActive,
    nextStep,
    skipTutorial,
    currentStepIndex,
  } = useTutorial();

  const { width } = useWindowDimensions();
  const { isSidebarCollapsed } = useUserMode();
  const insets = useSafeAreaInsets();

  if (!isTutorialActive || !currentStep) return null;

  const isWebLarge = Platform.OS === "web" && width >= 768;
  const sidebarWidth = isSidebarCollapsed ? 80 : 250;

  return (
    <View
      style={[
        styles.overlay,
        isWebLarge
          ? {
              justifyContent: "flex-end",
              alignItems: "flex-start",
              paddingLeft: sidebarWidth + 20,
              paddingBottom: 20,
            }
          : {
              justifyContent: "flex-end", // Bottom sheet style for mobile
              paddingBottom: insets.bottom + 65, // Above tab bar if present
              backgroundColor: "transparent",
            },
      ]}
      pointerEvents="box-none"
    >
      <Animated.View
        entering={isWebLarge ? FadeIn : SlideInDown}
        style={[
          styles.container,
          isWebLarge
            ? { maxWidth: 400 }
            : { width: "100%", paddingHorizontal: 16 },
        ]}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="bulb-outline"
                size={20}
                color={colors.primary}
              />
            </View>
            <Text style={styles.title} numberOfLines={1}>
              {currentStep.title}
            </Text>
            <TouchableOpacity
              onPress={skipTutorial}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={colors.text + "80"} />
            </TouchableOpacity>
          </View>

          <Text style={styles.content}>{currentStep.content}</Text>

          <View style={styles.footer}>
            <Text style={styles.stepText}>Étape {currentStepIndex + 1}</Text>
            <View style={styles.buttons}>
              <TouchableOpacity onPress={nextStep} style={[styles.nextButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
                <Text style={styles.nextButtonText}>Suivant</Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color="white"
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  container: {
    // Container constraints handled inline or here
  },
  card: {
    backgroundColor: isDark ? "rgba(30, 30, 45, 0.95)" : "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
    // @ts-ignore
    backdropFilter: "blur(10px)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + "26",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text + "CC",
    marginBottom: 16,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepText: {
    fontSize: 12,
    color: colors.text + "80",
    fontWeight: "500",
  },
  buttons: {
    flexDirection: "row",
    alignItems: "center",
  },
  nextButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  nextButtonText: {
    color: "white",
    fontSize: 13,
    fontWeight: "600",
  },
});

