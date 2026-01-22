import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, Tabs, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import Colors from "@/constants/Colors";

export default function ProjectIdLayout() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, [id]);

  async function checkAccess() {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (!session) {
          setLoading(false);
          return;
      }

      const userId = session.user.id;

      // Check Owner
      const { data: project } = await supabase
        .from("tournages")
        .select("owner_id")
        .eq("id", id)
        .single();

      if (project && project.owner_id === userId) {
        setIsOwner(true);
        // Owner is implicitly a member
        setIsMember(true); 
      } else {
        // Check Member
        const { data: membership } = await supabase
            .from("project_roles")
            .select("id")
            .eq("tournage_id", id)
            .eq("assigned_profile_id", userId)
            .maybeSingle();
        
        if (membership) {
            setIsMember(true);
        }
      }
    } catch (e) {
      console.log("Error checking access:", e);
    } finally {
        setLoading(false);
    }
  }

  const isVisitor = !isOwner && !isMember;

  // If loading, we might show nothing or a spinner, but let's just let it render defaults until we know
  
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: Colors.light.background,
            borderTopWidth: 1,
            borderTopColor: Colors.light.border,
            height: 60,
            paddingBottom: 10,
            paddingTop: 5,
            display: isVisitor ? 'none' : 'flex'
          },
          tabBarActiveTintColor: Colors.light.tint,
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
