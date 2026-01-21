import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, Tabs, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";

export default function ProjectIdLayout() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    checkOwner();
  }, [id]);

  async function checkOwner() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("tournages")
        .select("owner_id")
        .eq("id", id)
        .single();

      if (data && data.owner_id === session.user.id) {
        setIsOwner(true);
      }
    } catch (e) {
      console.log("Error checking owner:", e);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "white",
            borderTopWidth: 1,
            borderTopColor: "#eee",
            height: 60,
            paddingBottom: 10,
            paddingTop: 5,
          },
          tabBarActiveTintColor: "#841584",
          tabBarInactiveTintColor: "#999",
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Participants",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "people" : "people-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "Conversation",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "chatbubbles" : "chatbubbles-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: "Calendrier",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "calendar" : "calendar-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="team"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="setup"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="roles"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />
        <Tabs.Screen
          name="manage_team"
          options={{
            href: null,
            tabBarStyle: { display: "none" },
          }}
        />
      </Tabs>
    </>
  );
}
