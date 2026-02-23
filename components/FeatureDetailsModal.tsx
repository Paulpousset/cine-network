import { Hoverable } from "@/components/Hoverable";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

interface FeatureDetailsModalProps {
  isVisible: boolean;
  onClose: () => void;
  feature: {
    title: string;
    description: string;
    icon: any;
    details: string;
    screens: any[];
  } | null;
}

export default function FeatureDetailsModal({
  isVisible,
  onClose,
  feature,
}: FeatureDetailsModalProps) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const shutterValue = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      shutterValue.value = withTiming(1, {
        duration: 800,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
      contentOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    } else {
      shutterValue.value = withTiming(0, { duration: 500 });
      contentOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isVisible]);

  const irisStyle = useAnimatedStyle(() => {
    const scale = interpolate(shutterValue.value, [0, 1], [0, 1.5]);
    return {
      transform: [{ scale }],
      width: width * 2.5,
      height: width * 2.5,
      borderRadius: (width * 2.5) / 2,
      overflow: "hidden",
    };
  });

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [
      { translateY: interpolate(contentOpacity.value, [0, 1], [40, 0]) },
      { scale: interpolate(contentOpacity.value, [0, 1], [0.9, 1]) },
    ],
  }));

  const handleClose = () => {
    contentOpacity.value = withTiming(0, { duration: 300 });
    shutterValue.value = withDelay(
      200,
      withTiming(0, {
        duration: 600,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      }),
    );
    setTimeout(onClose, 800);
  };

  if (!feature) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Iris Shutter Effect Background */}
        <Animated.View style={[styles.iris, irisStyle]}>
          <LinearGradient
            colors={isDark ? ["#1a1033", "#08080c"] : ["#2c1a4d", "#1a1a2e"]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View style={[styles.content, contentStyle]}>
          <Hoverable
            style={styles.closeButton}
            hoverStyle={{
              transform: [{ scale: 1.1 }],
              backgroundColor: "rgba(255,255,255,0.2)",
            }}
            onPress={handleClose}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </Hoverable>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name={feature.icon}
                  size={40}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.title}>{feature.title}</Text>
              <Text style={styles.subtitle}>{feature.description}</Text>
            </View>

            <View style={styles.detailsBox}>
              <View style={[styles.detailsDecorator, { backgroundColor: colors.primary }]} />
              <Text style={styles.detailsText}>{feature.details}</Text>
            </View>

            <View style={styles.previewSection}>
              <Text style={styles.sectionTitle}>Aperçu de l'interface</Text>
              
              <View style={styles.deviceGroup}>
                <Text style={styles.deviceLabel}>Mobile</Text>
                <View style={styles.screensRow}>
                  {feature.screens.slice(0, 2).map((screen, index) => (
                    <View key={`mobile-${index}`} style={[styles.screenWrapper, styles.mobileScreenWrapper]}>
                      <Image
                        source={screen}
                        style={styles.screenImage}
                        resizeMode="contain"
                      />
                    </View>
                  ))}
                </View>
              </View>

              <View style={[styles.deviceGroup, { marginTop: 40 }]}>
                <Text style={styles.deviceLabel}>Web</Text>
                <View style={styles.webScreensList}>
                  {feature.screens.slice(2, 4).map((screen, index) => (
                    <View key={`web-${index}`} style={[styles.screenWrapper, styles.webScreenWrapperLarge]}>
                      <Image
                        source={screen}
                        style={styles.screenImage}
                        resizeMode="contain"
                      />
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <Hoverable
              style={[styles.actionButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
              hoverStyle={{ opacity: 0.9, transform: [{ scale: 1.02 }] }}
              onPress={handleClose}
            >
              <Text style={styles.actionButtonText}>J'ai compris</Text>
            </Hoverable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  iris: {
    position: "absolute",
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: (width * 1.5) / 2,
    backgroundColor: "#08080c",
    zIndex: -1,
  },
  content: {
    flex: 1,
    width: "100%",
    paddingTop: 60,
  },
  closeButton: {
    position: "absolute",
    top: Platform.OS === "web" ? 20 : 50,
    right: 25,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 10,
    borderRadius: 25,
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingBottom: 60,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 25,
    backgroundColor: colors.primary + "26", // 26 is ~15% opacity
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.primary + "4D", // 4D is ~30% opacity
  },
  title: {
    fontSize: 42,
    fontWeight: "900",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    lineHeight: 28,
    maxWidth: 500,
  },
  detailsBox: {
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 30,
    borderRadius: 28,
    marginBottom: 50,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    position: "relative",
    overflow: "hidden",
  },
  detailsDecorator: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 6,
    height: "100%",
  },
  detailsText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 17,
    lineHeight: 30,
  },
  previewSection: {
    marginBottom: 50,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 25,
    letterSpacing: -0.5,
  },
  deviceGroup: {
    width: "100%",
  },
  deviceLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 15,
    letterSpacing: 2,
  },
  screensRow: {
    flexDirection: "row",
    gap: width > 768 ? 30 : 15,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  webScreensList: {
    flexDirection: "column",
    gap: 25,
    width: "100%",
  },
  screenWrapper: {
    backgroundColor: "transparent",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  mobileScreenWrapper: {
    flex: 1,
    aspectRatio: 9/18,
    borderRadius: width > 768 ? 45 : 20,
    borderWidth: width > 768 ? 8 : 4,
    borderColor: "#222",
  },
  webScreenWrapperLarge: {
    width: "100%",
    aspectRatio: 16/10,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "transparent",
  },
  screenImage: {
    flex: 1,
    width: "100%",
    height: "100%",
    opacity: 1,
  },
  screenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  actionButton: {
    paddingVertical: 20,
    borderRadius: 22,
    alignItems: "center",
    marginTop: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});

