import GlobalRealtimeListener from "@/components/common/GlobalRealtimeListener";
import ImpersonationHUD from "@/components/common/ImpersonationHUD";
import NotificationToast from "@/components/common/NotificationToast";
import Sidebar from "@/components/layout/Sidebar";
import FloatingChatWidget from "@/components/messaging/FloatingChatWidget";
import { useUserMode } from "@/hooks/useUserMode";
import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";
import { Stack, usePathname } from "expo-router";
import React from "react";
import { Platform, useWindowDimensions, View } from "react-native";

export function Shell() {
  const { session, isProfileComplete, isGuest } = useUser();
  const { isSidebarCollapsed } = useUserMode();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isWebLarge = Platform.OS === "web" && width >= 768;
  const pathname = usePathname() as string;

  const showSidebar =
    isWebLarge &&
    session &&
    (isProfileComplete || isGuest) &&
    pathname !== "/" &&
    pathname !== "/auth" &&
    pathname !== "/complete-profile" &&
    pathname !== "/update-password";

  const sidebarWidth = isSidebarCollapsed ? 80 : 250;

  return (
    <View style={{ flex: 1, flexDirection: isWebLarge ? "row" : "column" }}>
      {session && (isProfileComplete || isGuest) && (
        <GlobalRealtimeListener user={session.user} />
      )}
      {showSidebar ? <Sidebar /> : null}
      <View
        style={{
          flex: 1,
          paddingLeft: showSidebar ? sidebarWidth : 0,
        }}
      >
        <ImpersonationHUD />
        <Stack
          screenOptions={{
            headerShown: Platform.OS !== "web",
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTitleStyle: {
              color: colors.text,
            },
            headerTintColor: colors.tint,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen
            name="complete-profile"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="charte-confidentialite"
            options={{ headerShown: true, title: "Confidentialité" }}
          />
          <Stack.Screen
            name="privacy-policy"
            options={{ headerShown: true, title: "Privacy Policy" }}
          />
          <Stack.Screen
             name="settings"
             options={{ headerShown: true, title: "Réglages" }}
          />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="direct-messages"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen name="project" options={{ headerShown: false }} />
          <Stack.Screen name="locations" options={{ headerShown: false }} />
          <Stack.Screen name="network" options={{ headerShown: false }} />
          <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="hall-of-fame" options={{ headerShown: false }} />
          <Stack.Screen name="my-awards" options={{ headerShown: false }} />
        </Stack>
      </View>
      <NotificationToast />
      {session &&
        isProfileComplete &&
        isWebLarge &&
        !pathname.includes("direct-messages") &&
        !pathname.includes("spaces") &&
        !pathname.includes("update-password") && (
          <FloatingChatWidget userId={session.user.id} />
        )}
    </View>
  );
}
