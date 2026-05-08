import { Stack } from "expo-router";

export default function ProjectLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="new" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="role/[id]" />
    </Stack>
  );
}
