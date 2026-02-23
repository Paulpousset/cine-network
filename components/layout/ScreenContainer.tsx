import { useTheme } from "@/providers/ThemeProvider";
import React from "react";
import {
    Platform,
    ScrollView,
    StyleProp,
    StyleSheet,
    useWindowDimensions,
    View,
    ViewStyle,
} from "react-native";

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
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
  const isLargeScreen = width >= 1024; // Augmenté pour correspondre à une vue desktop

  const Wrapper = scrollable ? ScrollView : View;

  // Flatten styles for web to avoid "Failed to set an indexed property [0] on 'CSSStyleDeclaration'"
  const flattenedStyle = StyleSheet.flatten([styles.wrapper, style]);

  return (
    <View style={styles.outerContainer}>
      <Wrapper
        style={flattenedStyle}
        {...(scrollable
          ? {
              contentContainerStyle: StyleSheet.flatten([
                isLargeScreen ? styles.webContentContainer : {},
                contentContainerStyle || {},
              ]),
            }
          : {})}
      >
        <View
          style={StyleSheet.flatten([
            styles.innerContainer,
            isLargeScreen ? styles.innerContainerWeb : {},
          ])}
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
      borderRadius: 8,
      overflow: "hidden",
      borderWidth: isDark ? 1 : 0,
      borderColor: colors.border,
    },
  });
}
