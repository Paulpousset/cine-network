import Colors from "@/constants/Colors";
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

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: Platform.select({
      web: "#f5f5f5", // Light grey background for web "gutters"
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
    backgroundColor: Colors.light.background,
  },
  innerContainerWeb: {
    maxWidth: 700, // Réduit la largeur maximale pour que ça ne prenne pas tout l'écran
    alignSelf: "center", // S'assure que le contenu est bien centré
    minHeight: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderRadius: 8,
    overflow: "hidden",
  },
});
