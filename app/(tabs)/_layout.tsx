import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Link, Tabs, useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, View } from "react-native";

import ChatIconWithBadge from "@/components/ChatIconWithBadge";
import ClapLoading from "@/components/ClapLoading";
import CustomTabBar from "@/components/CustomTabBar"; // Imported
import NotificationIconWithBadge from "@/components/NotificationIconWithBadge";
import { useTheme } from "@/providers/ThemeProvider";
import Colors from "@/constants/Colors";
import { appEvents, EVENTS } from "@/lib/events";
import { useUser } from "@/providers/UserProvider";
import { useEffect } from "react";
import { Platform } from "react-native";

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: 0 }} {...props} />;
}

export default function TabLayout() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { profile, refreshProfile, isLoading: userLoading } = useUser();

  useEffect(() => {
    // Écouter spécifiquement les mises à jour de profil pour forcer le rafraîchissement
    const unsubProfile = appEvents.on(EVENTS.PROFILE_UPDATED, () => {
      console.log("TabLayout: Profile updated event received");
      refreshProfile();
    });

    return () => {
      unsubProfile();
    };
  }, [refreshProfile]);

  const avatarUrl = profile?.avatar_url;
  const userRole = profile?.role;

  const ProfileIcon = ({ pressed }: { pressed: boolean }) => {
    if (avatarUrl) {
      return (
        <Image
          source={{ uri: avatarUrl }}
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            marginLeft: 15,
            opacity: pressed ? 0.5 : 1,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        />
      );
    }
    return (
      <FontAwesome
        name="user-circle"
        size={25}
        color={colors.text}
        style={{ marginLeft: 15, opacity: pressed ? 0.5 : 1 }}
      />
    );
  };

  // Stable callback for rendering the tab bar
  const renderTabBar = React.useCallback(
    (props: BottomTabBarProps) => <CustomTabBar {...props} />,
    [],
  );

  // Uniquement bloquant au tout premier chargement
  if (userLoading && !userRole) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ClapLoading size={40} color={colors.primary} />
      </View>
    );
  }

  const isAgent = userRole?.trim().toLowerCase() === "agent";

  return (
    <Tabs
      tabBar={renderTabBar}
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: Platform.OS !== "web",
        headerStyle: {
          backgroundColor: colors.background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTitleStyle: {
          color: colors.text,
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="my-projects"
        options={{
          title: "Mes Projets",
          tabBarIcon: ({ color }) => <TabBarIcon name="film" color={color} />,
          headerLeft:
            Platform.OS === "web"
              ? undefined
              : () => (
                  <Link href="/account" asChild>
                    <Pressable>
                      {({ pressed }) => <ProfileIcon pressed={pressed} />}
                    </Pressable>
                  </Link>
                ),
          headerRight:
            Platform.OS === "web"
              ? undefined
              : () => (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <NotificationIconWithBadge />
                    <ChatIconWithBadge />
                  </View>
                ),
        }}
      />

      <Tabs.Screen
        name="my-talents"
        options={{
          href: isAgent ? "/my-talents" : null,
          // @ts-ignore - handled in CustomTabBar
          display: isAgent ? "flex" : "none",
          title: "Mes Talents",
          tabBarIcon: ({ color }) => <TabBarIcon name="users" color={color} />,
          headerLeft:
            Platform.OS === "web"
              ? undefined
              : () => (
                  <Link href="/account" asChild>
                    <Pressable>
                      {({ pressed }) => <ProfileIcon pressed={pressed} />}
                    </Pressable>
                  </Link>
                ),
          headerRight:
            Platform.OS === "web"
              ? undefined
              : () => (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <NotificationIconWithBadge />
                    <ChatIconWithBadge />
                  </View>
                ),
        }}
      />

      <Tabs.Screen
        name="jobs"
        options={{
          title: "Castings",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="briefcase" color={color} />
          ),
          headerLeft:
            Platform.OS === "web"
              ? undefined
              : () => (
                  <Link href="/account" asChild>
                    <Pressable>
                      {({ pressed }) => <ProfileIcon pressed={pressed} />}
                    </Pressable>
                  </Link>
                ),
          headerRight:
            Platform.OS === "web"
              ? undefined
              : () => (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <NotificationIconWithBadge />
                    <ChatIconWithBadge />
                  </View>
                ),
        }}
      />

      <Tabs.Screen
        name="talents"
        options={{
          title: "Réseau",
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          headerLeft:
            Platform.OS === "web"
              ? undefined
              : () => (
                  <Link href="/account" asChild>
                    <Pressable>
                      {({ pressed }) => <ProfileIcon pressed={pressed} />}
                    </Pressable>
                  </Link>
                ),
          headerRight:
            Platform.OS === "web"
              ? undefined
              : () => (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <NotificationIconWithBadge />
                    <ChatIconWithBadge />
                  </View>
                ),
        }}
      />

      <Tabs.Screen
        name="feed"
        options={{
          title: "Fil d'actu",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="newspaper-o" color={color} />
          ),
          headerLeft:
            Platform.OS === "web"
              ? undefined
              : () => (
                  <Link href="/account" asChild>
                    <Pressable>
                      {({ pressed }) => <ProfileIcon pressed={pressed} />}
                    </Pressable>
                  </Link>
                ),
          headerRight:
            Platform.OS === "web"
              ? undefined
              : () => (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <NotificationIconWithBadge />
                    <ChatIconWithBadge />
                  </View>
                ),
        }}
      />
      <Tabs.Screen
        name="hall-of-fame"
        options={{
          title: "Hall of Fame",
          tabBarIcon: ({ color }) => <TabBarIcon name="trophy" color={color} />,
          headerRight:
            Platform.OS === "web"
              ? undefined
              : () => (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <NotificationIconWithBadge />
                    <ChatIconWithBadge />
                  </View>
                ),
        }}
      />
    </Tabs>
  );
}
