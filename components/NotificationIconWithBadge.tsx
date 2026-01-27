import Colors from "@/constants/Colors";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link } from "expo-router";
import React from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    useColorScheme,
    View,
} from "react-native";

export default function NotificationIconWithBadge() {
  const colorScheme = useColorScheme();
  const unreadCount = useNotificationCount();

  return (
    <Link href="/notifications" asChild>
      <Pressable>
        {({ pressed }) => (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginRight: 15,
            }}
          >
            <FontAwesome
              name="bell"
              size={25}
              color={Colors[colorScheme ?? "light"].text}
              style={{ opacity: pressed ? 0.5 : 1 }}
            />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: -6,
    top: -3,
    backgroundColor: Colors.light.tint,
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "white",
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
});
