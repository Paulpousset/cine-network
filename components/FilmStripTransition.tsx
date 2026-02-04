import React, { useEffect } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const { width: windowWidth, height: windowHeight } = Dimensions.get("window");

// On exporte ces composants pour assurer la cohérence avec la page Auth
export const SprocketHolesRow = ({
  top,
  bottom,
  holesPerFrame,
  totalFrameWidth,
  numFrames,
}: any) => (
  <View style={[styles.holesRow, top !== undefined ? { top } : { bottom }]}>
    {[...Array(numFrames)].map((_, frameIdx) => (
      <View
        key={`frame-holes-${frameIdx}`}
        style={[styles.frameHoles, { width: totalFrameWidth }]}
      >
        {[...Array(holesPerFrame)].map((_, holeIdx) => (
          <View key={`hole-${frameIdx}-${holeIdx}`} style={styles.hole} />
        ))}
      </View>
    ))}
  </View>
);

export const EdgeMarkingsRow = ({
  top,
  bottom,
  numFrames,
  totalFrameWidth,
  isTop,
}: any) => (
  <View style={[styles.edgeMarkings, top !== undefined ? { top } : { bottom }]}>
    {[...Array(numFrames)].map((_, i) => (
      <View
        key={`edge-${i}`}
        style={[styles.edgeTextContainer, { width: totalFrameWidth }]}
      >
        <Text style={styles.edgeText}>
          {isTop ? "KODAK 5219 500T" : "EASTMAN SAFETY FILM"}
        </Text>
        <Text style={styles.edgeText}>
          {isTop ? 1400 + i * 20 : `◩ ${2024 + i}`}
        </Text>
      </View>
    ))}
  </View>
);

// Calcul des dimensions pour que les cadres occupent tout l'écran
const FRAME_HEIGHT = windowHeight;
const FRAME_WIDTH = windowWidth;

interface FilmStripTransitionProps {
  isVisible: boolean;
  onScreenCovered?: () => void;
  onAnimationComplete?: () => void;
}

export default function FilmStripTransition({
  isVisible,
  onScreenCovered,
  onAnimationComplete,
}: FilmStripTransitionProps) {
  const translateX = useSharedValue(windowWidth);
  const translateY = useSharedValue(0);

  // Constants for the sharp procedural look
  const numFrames = 10;
  const frameWidth = windowWidth;
  const frameMargin = 0; // Collés pour couvrir l'écran totalement
  const totalFrameWidth = frameWidth + frameMargin * 2;
  // On réduit la distance pour que la pellicule reste sur le dernier cadre
  const stripWidthTotal = totalFrameWidth * (numFrames - 1);

  const holesPerFrame = 8;

  useEffect(() => {
    if (isVisible) {
      translateX.value = windowWidth;
      translateY.value = 0;

      translateX.value = withTiming(
        -stripWidthTotal,
        {
          duration: 1750,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1), // Easing plus doux à la fin
        },
        (finished) => {
          if (finished && onAnimationComplete) {
            scheduleOnRN(onAnimationComplete);
          }
        },
      );

      // Gate weave (slight vertical jitter) to simulate real mechanical projection
      translateY.value = withRepeat(
        withTiming(1.5, {
          duration: 60,
          easing: Easing.linear,
        }),
        -1,
        true,
      );

      const timer = setTimeout(() => {
        if (onScreenCovered) {
          onScreenCovered();
        }
      }, 800); // Divisé par 2 (anciennement 1600)

      return () => clearTimeout(timer);
    } else {
      translateX.value = windowWidth;
    }
  }, [isVisible, stripWidthTotal, onAnimationComplete, onScreenCovered]);

  const animatedStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      translateX.value,
      [windowWidth, -stripWidthTotal],
      ["#E5E5E5", "#6C5CE7"], // Transition vers le violet de la page auth
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
      ],
      backgroundColor: bgColor,
    };
  });

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.strip,
          { width: stripWidthTotal, height: windowHeight },
          animatedStyle,
        ]}
      >
        <View style={styles.filmBody}>
          {/* Film Frames - Background Layer */}
          <View style={styles.framesContainer}>
            {[...Array(numFrames)].map((_, i) => (
              <View
                key={`frame-${i}`}
                style={[
                  styles.frame,
                  { width: frameWidth, marginHorizontal: frameMargin },
                ]}
              >
                <View style={styles.frameInner}>
                  {/* Grain Layer Overlay simulation */}
                  <View style={StyleSheet.absoluteFill}>
                    {[...Array(8)].map((_, dIdx) => (
                      <View
                        key={`dust-${i}-${dIdx}`}
                        style={[
                          styles.dust,
                          {
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            opacity: 0.1 + Math.random() * 0.2,
                            transform: [{ scale: 0.5 + Math.random() }],
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <View
                    style={[styles.scratch, { left: "15%", opacity: 0.15 }]}
                  />
                  <View
                    style={[
                      styles.scratch,
                      { left: "45%", width: 1, opacity: 0.08 },
                    ]}
                  />
                  <View
                    style={[styles.scratch, { left: "80%", opacity: 0.1 }]}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Overlays Fixed at Top/Bottom relative to content */}
          {/* Top Edge markings */}
          <View style={styles.edgeMarkings}>
            {[...Array(numFrames)].map((_, i) => (
              <View
                key={`top-edge-${i}`}
                style={[styles.edgeTextContainer, { width: totalFrameWidth }]}
              >
                <Text style={styles.edgeText}>KODAK 5219 500T</Text>
                <Text style={styles.edgeText}>{1400 + i * 20}</Text>
              </View>
            ))}
          </View>

          {/* Top Sprocket Holes */}
          <View style={styles.holesRow}>
            {[...Array(numFrames)].map((_, frameIdx) => (
              <View
                key={`top-frame-holes-${frameIdx}`}
                style={[styles.frameHoles, { width: totalFrameWidth }]}
              >
                {[...Array(holesPerFrame)].map((_, holeIdx) => (
                  <View
                    key={`top-hole-${frameIdx}-${holeIdx}`}
                    style={styles.hole}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Soundtrack area simulation */}
          <View style={styles.soundtrack} />

          {/* Bottom Sprocket Holes */}
          <View style={styles.holesRowBottom}>
            {[...Array(numFrames)].map((_, frameIdx) => (
              <View
                key={`bottom-frame-holes-${frameIdx}`}
                style={[styles.frameHoles, { width: totalFrameWidth }]}
              >
                {[...Array(holesPerFrame)].map((_, holeIdx) => (
                  <View
                    key={`bottom-hole-${frameIdx}-${holeIdx}`}
                    style={styles.hole}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Bottom Edge markings */}
          <View style={styles.edgeMarkingsBottom}>
            {[...Array(numFrames)].map((_, i) => (
              <View
                key={`bottom-edge-${i}`}
                style={[styles.edgeTextContainer, { width: totalFrameWidth }]}
              >
                <Text style={styles.edgeText}>EASTMAN SAFETY FILM</Text>
                <Text style={styles.edgeText}>◩ {2024 + i}</Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  strip: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#D0D0D0",
  },
  filmBody: {
    flex: 1,
    position: "relative",
    backgroundColor: "rgba(0, 0, 0, 0.08)", // Increased grain overlay
  },
  edgeMarkings: {
    position: "absolute",
    top: 15,
    left: 0,
    right: 0,
    flexDirection: "row",
    height: 20,
    zIndex: 2,
  },
  edgeMarkingsBottom: {
    position: "absolute",
    bottom: 15,
    left: 0,
    right: 0,
    flexDirection: "row",
    height: 20,
    zIndex: 2,
  },
  edgeTextContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  edgeText: {
    color: "rgba(0, 0, 0, 0.5)",
    fontSize: 12,
    fontWeight: "800",
    fontFamily: "monospace",
  },
  holesRow: {
    position: "absolute",
    top: 45,
    left: 0,
    right: 0,
    flexDirection: "row",
    height: 40,
    zIndex: 2,
  },
  holesRowBottom: {
    position: "absolute",
    bottom: 45,
    left: 0,
    right: 0,
    flexDirection: "row",
    height: 40,
    zIndex: 2,
  },
  frameHoles: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  hole: {
    width: 35,
    height: 45,
    backgroundColor: "#000000",
    borderRadius: 6,
  },
  soundtrack: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    height: 15,
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    zIndex: 2,
  },
  framesContainer: {
    flexDirection: "row",
    height: windowHeight,
  },
  frame: {
    height: windowHeight,
    backgroundColor: "transparent",
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderColor: "#000000",
  },
  frameInner: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scratch: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "rgba(0, 0, 0, 0.12)", // Scratches
  },
  dust: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0, 0, 0, 0.2)", // Dust particles
  },
});
