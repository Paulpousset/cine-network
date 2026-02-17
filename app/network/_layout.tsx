import { useTheme } from "@/providers/ThemeProvider";
import { Stack } from "expo-router";

export default function NetworkLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: "bold",
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="requests"
        options={{ presentation: "modal", headerTitle: "Invitations" }}
      />
      <Stack.Screen
        name="connections"
        options={{ headerTitle: "Mon Réseau" }}
      />
    </Stack>
  );
}
