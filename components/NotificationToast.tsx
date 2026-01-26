import Colors from "@/constants/Colors";
import { appEvents, EVENTS } from "@/lib/events";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function NotificationToast() {
  const [notification, setNotification] = useState<{
    title: string;
    body: string;
    link?: string;
  } | null>(null);
  
  const translateY = useRef(new Animated.Value(-150)).current;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = appEvents.on(EVENTS.SHOW_NOTIFICATION, (payload: any) => {
      console.log("NotificationToast: Received request", payload);
      // Clear any existing timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      setNotification(payload);

      // Animate In
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();

      // Auto hide after 4 seconds
      timeoutRef.current = setTimeout(() => {
        hideNotification();
      }, 4000);
    });

    return () => {
      unsubscribe();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function hideNotification() {
    Animated.timing(translateY, {
      toValue: -200, // Move up out of view
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setNotification(null);
    });
  }

  function handlePress() {
    if (notification?.link) {
      router.push(notification.link as any);
      hideNotification();
    }
  }

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          top: Platform.OS === "web" ? 20 : insets.top + 10,
          right: width >= 768 ? 20 : 0, // Right on web, center/full on mobile
          left: width >= 768 ? "auto" : 0,
          width: width >= 768 ? 350 : "auto", // Fixed width web, fluid mobile
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={styles.toast}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="chatbubble-ellipses" size={24} color={Colors.light.tint} />
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {notification.body}
          </Text>
        </View>
        <TouchableOpacity onPress={() => hideNotification()} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 9999,
    paddingHorizontal: 15,
    marginHorizontal: Platform.OS === "web" ? 0 : 10, // Margin only on mobile
  },
  toast: {
    backgroundColor: "white",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.tint,
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#333",
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    color: "#666",
  },
  closeBtn: {
    padding: 5,
  },
});
