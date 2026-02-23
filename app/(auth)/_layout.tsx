import { Stack } from "expo-router";
import { useUser } from "@/providers/UserProvider";
import { Redirect } from "expo-router";

export default function AuthLayout() {
  const { session, isLoading, isProfileComplete, isGuest } = useUser();

  if (isLoading) return null;

  // If already logged in and profile is complete (or guest), redirect to dashboard
  if (session && (isProfileComplete || isGuest)) {
    return <Redirect href="/my-projects" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
