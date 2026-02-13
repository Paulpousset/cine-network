import { useTheme } from "@/providers/ThemeProvider";
import React from "react";
import {
    Platform,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
    ViewStyle,
} from "react-native";

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  scrollable?: boolean;
}

/**
 * ScreenContainer helps create a responsive layout.
 * Mobile: Full width, scrollable if needed.
 * Web/Desktop: Centered content with a max width of 1000px, grey background layout.
 */
export default function ScreenContainer({
  children,
  style,
  contentContainerStyle,
  scrollable = true,
}: ScreenContainerProps) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isLargeScreen = width > 1024; // Augmenté pour correspondre à une vue desktop

  const Wrapper = scrollable ? ScrollView : View;

  return (
    <View style={styles.outerContainer}>
      <Wrapper
        style={{
          ...styles.wrapper,
          ...(Array.isArray(style) ? Object.assign({}, ...style) : style),
        }}
        contentContainerStyle={{
          ...(isLargeScreen ? styles.webContentContainer : {}),
          ...(Array.isArray(contentContainerStyle)
            ? Object.assign({}, ...contentContainerStyle)
            : contentContainerStyle),
        }}
      >
        <View
          style={{
            ...styles.innerContainer,
            ...(isLargeScreen ? styles.innerContainerWeb : {}),
          }}
        >
          {children}
        </View>
      </Wrapper>
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    outerContainer: {
      flex: 1,
      backgroundColor: Platform.select({
        web: colors.backgroundSecondary, // Light grey background for web "gutters"
        default: "transparent",
      }),
    },
    wrapper: {
      flex: 1,
    },
    webContentContainer: {
      alignItems: "center",
      paddingVertical: 20,
    },
    innerContainer: {
      flex: 1,
      width: "100%",
      backgroundColor: colors.background,
    },
    innerContainerWeb: {
      maxWidth: 700, // Réduit la largeur maximale pour que ça ne prenne pas tout l'écran
      alignSelf: "center", // S'assure que le contenu est bien centré
      minHeight: "100%",
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
      borderRadius: 8,
      overflow: "hidden",
      borderWidth: isDark ? 1 : 0,
      borderColor: colors.border,
    },
  });
}
