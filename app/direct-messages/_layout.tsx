import ConversationList from "@/components/ConversationList";
import { useTheme } from "@/providers/ThemeProvider";
import { Slot, useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";

export default function DirectMessagesLayout() {
  const { width } = useWindowDimensions();
  const isWebLarge = Platform.OS === "web" && width >= 768;
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  if (!isWebLarge) {
    return <Slot />;
  }

  return (
    <View style={styles.container}>
      {/* Left Sidebar: Conversations List */}
      <View style={styles.sidebar}>
        <View style={styles.sidebarHeader}>
          <Text style={styles.sidebarTitle}>Messages</Text>
        </View>
        <ConversationList 
          selectedUserId={id} 
          onSelect={(userId) => router.push(`/direct-messages/${userId}`)}
        />
      </View>

      {/* Right Content: Selected Chat */}
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: "row",
      backgroundColor: colors.background,
    },
    sidebar: {
      width: 350,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      backgroundColor: colors.background,
      height: "100%",
    },
    sidebarHeader: {
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    sidebarTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    content: {
      flex: 1,
      height: "100%",
      backgroundColor: colors.backgroundSecondary,
    },
  });
}
