import FontAwesome from "@expo/vector-icons/FontAwesome";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Link, Tabs, useRouter } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";

import ChatIconWithBadge from "@/components/ChatIconWithBadge";
import CustomTabBar from "@/components/CustomTabBar"; // Imported
import NotificationIconWithBadge from "@/components/NotificationIconWithBadge";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: 0 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [pendingConnections, setPendingConnections] = useState(0);

  useEffect(() => {
    fetchPendingConnections();
    const unsub = appEvents.on(
      EVENTS.CONNECTIONS_UPDATED,
      fetchPendingConnections,
    );
    return unsub;
  }, []);

  async function fetchPendingConnections() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { count } = await supabase
      .from("connections")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", session.user.id)
      .eq("status", "pending");

    setPendingConnections(count || 0);
  }

  // Stable callback for rendering the tab bar
  const renderTabBar = React.useCallback(
    (props: BottomTabBarProps) => <CustomTabBar {...props} />,
    [],
  );

  return (
    <Tabs
      tabBar={renderTabBar}
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: Platform.OS !== "web",
        headerStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].background,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: Colors[colorScheme ?? "light"].border,
        },
        headerTitleStyle: {
          fontWeight: "700" as const,
          fontSize: 18,
          color: Colors[colorScheme ?? "light"].text,
        },
      }}
    >
      <Tabs.Screen
        name="my-projects"
        options={{
          title: "Mes Projets 🎬",
          tabBarIcon: ({ color }) => <TabBarIcon name="film" color={color} />,
          headerLeft:
            Platform.OS === "web"
              ? undefined
              : () => (
                  <Link href="/account" asChild>
                    <Pressable>
                      {({ pressed }) => (
                        <FontAwesome
                          name="user-circle"
                          size={25}
                          color={Colors[colorScheme ?? "light"].text}
                          style={{ marginLeft: 15, opacity: pressed ? 0.5 : 1 }}
                        />
                      )}
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
          title: "Casting & Jobs ",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="briefcase" color={color} />
          ),
          headerLeft:
            Platform.OS === "web"
              ? undefined
              : () => (
                  <Link href="/account" asChild>
                    <Pressable>
                      {({ pressed }) => (
                        <FontAwesome
                          name="user-circle"
                          size={25}
                          color={Colors[colorScheme ?? "light"].text}
                          style={{ marginLeft: 15, opacity: pressed ? 0.5 : 1 }}
                        />
                      )}
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
                      {({ pressed }) => (
                        <FontAwesome
                          name="user-circle"
                          size={25}
                          color={Colors[colorScheme ?? "light"].text}
                          style={{ marginLeft: 15, opacity: pressed ? 0.5 : 1 }}
                        />
                      )}
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
                      {({ pressed }) => (
                        <FontAwesome
                          name="user-circle"
                          size={25}
                          color={Colors[colorScheme ?? "light"].text}
                          style={{ marginLeft: 15, opacity: pressed ? 0.5 : 1 }}
                        />
                      )}
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
