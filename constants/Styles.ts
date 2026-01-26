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
  // Boutons
  primaryButton: {
    backgroundColor: Colors.light.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12, // Arrondi intermédiaire (Mix Creative/Minimal)
    alignItems: "center",
    justifyContent: "center",
    ...shadowStyle,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  secondaryButtonText: {
    color: Colors.light.text,
    fontWeight: "600",
    fontSize: 16,
  },

  // Cards
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: Platform.OS === "web" ? 16 : 20, // Un peu moins de padding sur web
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, // Ombre très légère (Minimal)
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        maxWidth: 600, // Limite la largeur des cartes sur le web
        alignSelf: "center",
        width: "100%",
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      },
    }),
  },

  // Inputs
  input: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: "transparent", // Bordure transparente par défaut
  },
  inputActive: {
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.background,
  },

  // Typography
  title1: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.light.text,
    marginBottom: 8,
    letterSpacing: -0.5, // Côté moderne/minimal
  },
  title2: {
    fontSize: 22,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 6,
  },
  body: {
    fontSize: 16,
    color: "#4B5563", // Gris moyen
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
    color: Colors.light.text,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
    marginBottom: 8,
  },
});
