import React from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";

const { width: windowWidth } = Dimensions.get("window");

export const FilmStripFrame = () => {
  // Calculer le nombre de trous en fonction de la largeur
  const holeWidth = 24;
  const holeSpacing = 20;
  const numHoles = Math.ceil(windowWidth / (holeWidth + holeSpacing)) + 1;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Top Film Strip */}
      <View style={[styles.strip, styles.topStrip]}>
        <View style={styles.edgeMarkings}>
          <View style={styles.edgeTextContainer}>
            <Text style={styles.edgeText}>KODAK 5219 500T</Text>
            <Text style={styles.edgeText}>1560</Text>
            <Text style={styles.edgeText}>KODAK 5219</Text>
          </View>
        </View>
        <View style={styles.holesRow}>
          {[...Array(numHoles)].map((_, i) => (
            <View key={`top-${i}`} style={styles.hole} />
          ))}
        </View>
        <View style={styles.soundtrack} />
      </View>

      {/* Bottom Film Strip */}
      <View style={[styles.strip, styles.bottomStrip]}>
        <View style={styles.holesRow}>
          {[...Array(numHoles)].map((_, i) => (
            <View key={`bottom-${i}`} style={styles.hole} />
          ))}
        </View>
        <View style={styles.edgeMarkings}>
          <View style={styles.edgeTextContainer}>
            <Text style={styles.edgeText}>EASTMAN SAFETY FILM</Text>
            <Text style={styles.edgeText}>◩ 2026</Text>
            <Text style={styles.edgeText}>SAFETY FILM</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  strip: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 110,
    backgroundColor: "rgba(5, 5, 10, 0.4)",
    justifyContent: "center",
    zIndex: 10,
  },
  topStrip: {
    top: 0,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  bottomStrip: {
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  edgeMarkings: {
    height: 25,
    justifyContent: "center",
  },
  edgeTextContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 30,
  },
  edgeText: {
    color: "rgba(255, 255, 255, 0.25)",
    fontSize: 10,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 2,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  holesRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: 40,
    gap: 20,
  },
  hole: {
    width: 24,
    height: 34,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  soundtrack: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    marginTop: 8,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
});
