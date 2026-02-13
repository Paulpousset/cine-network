import ConversationList from "@/components/ConversationList";
import { useTheme } from "@/providers/ThemeProvider";
import { Stack } from "expo-router";
import React from "react";
import {
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

export default function DirectMessagesList() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const { width } = useWindowDimensions();
  const isWebLarge = Platform.OS === "web" && width >= 768;

  if (isWebLarge) {
    return (
      <View style={styles.webPlaceholder}>
        <View style={styles.placeholderIconContainer}>
          <Text style={{ fontSize: 50 }}>💬</Text>
        </View>
        <Text style={styles.placeholderText}>Sélectionnez une discussion</Text>
        <Text style={styles.placeholderSubText}>
          Choisissez une conversation dans la liste de gauche pour commencer à discuter.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      <Stack.Screen
        options={{
          headerTitle: "Messages",
          headerBackTitle: "Retour",
          headerTintColor: colors.primary,
        }}
      />
      <ConversationList />
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  webPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    backgroundColor: colors.backgroundSecondary,
  },
  placeholderIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  placeholderText: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 8,
  },
  placeholderSubText: {
    fontSize: 15,
    color: colors.text + "80",
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 22,
  },
});


