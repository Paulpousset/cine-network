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

export default function ImpersonationHUD() {
  const { impersonatedUser, setImpersonatedUser } = useUserMode();

  if (!impersonatedUser) return null;

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <Ionicons name="eye" size={20} color="white" />
        <Text style={styles.text}>
          Vous agissez en tant que{" "}
          <Text style={styles.bold}>{impersonatedUser.full_name}</Text>
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => setImpersonatedUser(null)}
        >
          <Text style={styles.buttonText}>Quitter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F44336",
    paddingVertical: 8,
    paddingHorizontal: 20,
    zIndex: 9999,
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
    justifyContent: "center",
    gap: 12,
  },
  text: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  bold: {
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  button: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "white",
  },
  buttonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
});
