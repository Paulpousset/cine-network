import Colors from "@/constants/Colors";
import { Platform, StyleSheet } from "react-native";

const shadowStyle = Platform.select({
  ios: {
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  android: {
    elevation: 4,
  },
});

export const GlobalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent", // Let components handle background
  },
  // Boutons
  primaryButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    ...shadowStyle,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  // Cards
  card: {
    backgroundColor: "transparent", // Let components handle themed background
    borderRadius: 16,
    padding: Platform.OS === "web" ? 16 : 20, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "transparent", // Let components handle themed border
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        maxWidth: 600,
        alignSelf: "center",
        width: "100%",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      },
    }),
  },

  // Inputs
  input: {
    backgroundColor: "transparent", // Let components handle themed background
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.background,
  },

  // Typography
  title1: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.5, // Côté moderne/minimal
  },
  title2: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
});
