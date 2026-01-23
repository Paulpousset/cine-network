import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Stack, Tabs, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

function CustomProjectTabBar({
  state,
  descriptors,
  navigation,
  isVisitor,
}: BottomTabBarProps & { isVisitor: boolean }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  if (isVisitor) return null; // Or render nothing, though 'display: none' might be safer if controlled by parent

  return (
    <View
      style={[
        styles.tabBarContainer,
        { backgroundColor: colors.background, borderTopColor: colors.border },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        
        // Hide tabs that have href: null
        // Note: Expo Router handles href: null by not including them in state.routes usually,
        // but if it does, we can check options.href or manually filter known hidden routes.
        // However, BottomTabBarProps.state.routes usually only contains the visible tabs if configured correctly in Expo Router?
        // Actually, Expo Router might include all defined screens.
        // Let's rely on the fact that if it's in the state passed to tabBar, it should be rendered,
        // UNLESS we want to manually hide some like 'settings' which we did via options in the normal Tabs.
        // The `href: null` in options usually removes it from the array.
        
        // However, we see 'settings', 'roles' etc in the previous file having href: null.
        // Let's double check if they appear in `state.routes`.
        // If they do, we need to filter them.
        
        // Checking options.tabBarButton? options.tabBarItemStyle?
        // Best way: check if the route name is one of the visible ones we want.
        const visibleRoutes = ["index", "chat", "calendar"];
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
              <Text style={[styles.tabLabel, { color }]}>
                {options.title}
              </Text>
            </TouchableOpacity>

            {/* Add divider if not the last visible item. 
                Since we map, we don't know easily if it's the last *visible* item.
                Hardcoded check for now or cleaner filter approach.
            */}
            {route.name !== "calendar" && (
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
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();

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
        tabBar={(props) => <CustomProjectTabBar {...props} isVisitor={isVisitor} />}
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
