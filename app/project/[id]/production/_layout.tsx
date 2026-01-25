import { Stack } from "expo-router";

export default function ProductionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[dayId]" />
    </Stack>
  );
}
