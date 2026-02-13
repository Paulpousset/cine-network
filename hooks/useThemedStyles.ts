import { useTheme } from "@/providers/ThemeProvider";
import { Platform, StyleSheet } from "react-native";

export function useThemedStyles() {
  const { colors, isDark } = useTheme();

  const shadowStyle = Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
    web: {
      boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.1)",
    }
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // Boutons
    primaryButton: {
      backgroundColor: colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
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
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonText: {
      color: "#FFFFFF",
      fontWeight: "600",
      fontSize: 16,
    },
    secondaryButtonText: {
      color: colors.text,
      fontWeight: "600",
      fontSize: 16,
    },

    // Cards
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: Platform.OS === "web" ? 16 : 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.2 : 0.05,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
        web: {
          maxWidth: 600,
          alignSelf: "center",
          width: "100%",
          boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)",
        },
      }),
    },

    // Inputs
    input: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: "transparent",
    },
    inputActive: {
      borderColor: colors.primary,
      backgroundColor: colors.background,
    },

    // Typography
    title1: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 8,
    },
    title2: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 12,
    },
    title3: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    body: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
    },
    caption: {
      fontSize: 14,
      color: isDark ? "#9CA3AF" : "#6B7280",
    },
    errorText: {
        color: colors.danger,
        fontSize: 12,
        marginTop: 4,
        marginLeft: 4,
    }
  });

  return { styles, colors, isDark };
}
