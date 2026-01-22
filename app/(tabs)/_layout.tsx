import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, Tabs } from "expo-router";
import React from "react";
import { Pressable } from "react-native";

import { useClientOnlyValue } from "@/components/useClientOnlyValue";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: 0 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: useClientOnlyValue(false, true),
        tabBarStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].background,
          borderTopWidth: 1,
          borderTopColor: Colors[colorScheme ?? "light"].border, // Utilisation de la nouvelle couleur de bordure
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 0, // Suppression de l'ombre sur Android pour le style Minimal
          shadowOpacity: 0, // Suppression de l'ombre sur iOS pour le style Minimal
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          fontFamily: "System", // Police système propre pour le côté Minimal
        },
        headerStyle: {
          backgroundColor: Colors[colorScheme ?? "light"].background,
          elevation: 0, // Suppression de l'ombre du header
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: Colors[colorScheme ?? "light"].border,
        },
        headerTitleStyle: {
          fontWeight: "700",
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
          headerLeft: () => (
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
        }}
      />

      <Tabs.Screen
        name="jobs"
        options={{
          title: "Casting & Jobs ",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="briefcase" color={color} />
          ),
          headerLeft: () => (
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
        }}
      />

      <Tabs.Screen
        name="talents"
        options={{
          title: "Réseau",
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
          headerLeft: () => (
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
        }}
      />

      <Tabs.Screen
        name="feed"
        options={{
          title: "Fil d'actu",
          tabBarIcon: ({ color }) => (
            <TabBarIcon name="newspaper-o" color={color} />
          ),
          headerLeft: () => (
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
        }}
      />
    </Tabs>
  );
}
