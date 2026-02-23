import { useUserMode } from "@/hooks/useUserMode";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ImpersonationHUD() {
  const { impersonatedUser, setImpersonatedUser } = useUserMode();
  const insets = useSafeAreaInsets();

  if (!impersonatedUser) return null;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Platform.OS !== "web" ? Math.max(insets.top, 5) : 8,
          paddingBottom: 8,
        },
      ]}
    >
      <View style={styles.inner}>
        <View style={styles.messageRow}>
          <Ionicons
            name="eye"
            size={16}
            color="white"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.text} numberOfLines={1}>
            Mode gestion :{" "}
            <Text style={styles.bold}>{impersonatedUser.full_name}</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => setImpersonatedUser(null)}
        >
          <Text style={styles.buttonText}>Quitter</Text>
          <Ionicons
            name="close-circle"
            size={14}
            color="white"
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#333", // Dark gray instead of aggressive red
    paddingHorizontal: 16,
    zIndex: 9999,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    ...Platform.select({
      web: {
        position: "sticky",
        top: 0,
      },
    }),
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 34,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  text: {
    color: "white",
    fontSize: 13,
    fontWeight: "500",
  },
  bold: {
    fontWeight: "700",
  },
  button: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 11,
    fontWeight: "700",
  },
});
