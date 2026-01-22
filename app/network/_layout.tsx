import { Stack } from "expo-router";

export default function NetworkLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="requests"
        options={{ presentation: "modal", headerTitle: "Invitations" }}
      />
      <Stack.Screen
        name="connections"
        options={{ headerTitle: "Mes Relation" }}
      />
    </Stack>
  );
}
