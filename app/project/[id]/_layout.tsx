import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Stack, Tabs, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

function CustomProjectTabBar({
  state,
  descriptors,
  navigation,
  isVisitor,
  isOwner,
}: BottomTabBarProps & { isVisitor: boolean; isOwner: boolean }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { width } = useWindowDimensions();

  // Hide on desktop web as we have the sidebar
  if (Platform.OS === "web" && width >= 768) {
    return null;
  }

  if (isVisitor) return null;

  console.log(
    "Routes available in TabBar:",
    state.routes.map((r) => r.name),
  );

  return (
    <View
      style={[
        styles.tabBarContainer,
        { backgroundColor: colors.background, borderTopColor: colors.border },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];

        // Filter visible routes
        let visibleRoutes = ["index", "spaces", "calendar", "logistics"];

        // Add Admin only if owner
        if (isOwner) {
          visibleRoutes.push("admin");
        }

        if (!visibleRoutes.includes(route.name)) return null;

        const isFocused = state.index === index;
        const color = isFocused ? colors.tint : "#999";

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <React.Fragment key={route.key}>
            <TouchableOpacity
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              {options.tabBarIcon?.({ focused: isFocused, color, size: 24 })}
              <Text style={[styles.tabLabel, { color }]}>{options.title}</Text>
            </TouchableOpacity>

            {/* Add divider if not the last visible item. 
                Since we map, we don't know easily if it's the last *visible* item.
                Hardcoded check for now or cleaner filter approach.
            */}
            {route.name !== "admin" && (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.tint, opacity: 0.3 },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function ProjectIdLayout() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [isOwner, setIsOwner] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();

  useEffect(() => {
    checkAccess();
  }, [id]);

  async function checkAccess() {
    const projectId = Array.isArray(id) ? id[0] : id;
    if (!projectId || projectId === "undefined") return;
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
        .eq("id", projectId)
        .maybeSingle();

      if (project && project.owner_id === userId) {
        setIsOwner(true);
        // Owner is implicitly a member
        setIsMember(true);
      } else {
        // Check Member
        const { data: membership } = await supabase
          .from("project_roles")
          .select("id")
          .eq("tournage_id", projectId)
          .eq("assigned_profile_id", userId)
          .limit(1);

        if (membership && membership.length > 0) {
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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Tabs
        tabBar={(props) => (
          <CustomProjectTabBar
            {...props}
            isVisitor={isVisitor}
            isOwner={isOwner}
          />
        )}
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
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
          name="breakdown"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="production"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="spaces"
          options={{
            title: "Espaces",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "grid" : "grid-outline"}
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
          name="logistics"
          options={{
            title: "Logistique",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "clipboard" : "clipboard-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            title: "Admin",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "construct" : "construct-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="team"
          options={{
            href: null,
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
          }}
        />
        <Tabs.Screen
          name="manage_team"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
    height: 85,
    alignItems: "center",
    borderTopWidth: 1,
    paddingBottom: 25,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "System",
  },
  divider: {
    width: 2,
    height: 24,
    borderRadius: 2,
  },
});
