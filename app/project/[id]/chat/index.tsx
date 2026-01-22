import { Ionicons } from "@expo/vector-icons";
import { Stack, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../../../lib/supabase";
import { GlobalStyles } from "@/constants/Styles";
import Colors from "@/constants/Colors";

const CATEGORY_COLORS: Record<string, string> = {
  realisateur: "#E91E63",
  acteur: "#9C27B0",
  image: "#2196F3",
  son: "#FF9800",
  production: "#4CAF50",
  hmc: "#E91E63",
  deco: "#795548",
  post_prod: "#607D8B",
  technicien: "#607D8B",
};

export default function ChatList() {
  const { id } = useGlobalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");

  const projectId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (projectId) {
      setLoading(true);
      fetchChannels();
    } else {
      setDebugInfo("No Project ID found in params?? ID: " + typeof id);
    }
  }, [projectId]);

  async function fetchChannels() {
    try {
      setDebugInfo("Fetching... " + projectId);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setDebugInfo("No session found in Supabase Auth");
        return;
      }
      const userId = session.user.id;

      const { data: project, error: projError } = await supabase
        .from("tournages")
        .select("owner_id")
        .eq("id", projectId)
        .single();

      if (projError) {
        setDebugInfo(`Proj Error: ${projError.message}`);
        return;
      }

      const userIsOwner = project?.owner_id === userId;
      setIsOwner(userIsOwner);

      let debugMsg = `User: ${userId?.substring(0, 5)}... Owner: ${project?.owner_id?.substring(0, 5)}... Match: ${userIsOwner}`;

      const { data: roles, error: roleError } = await supabase
        .from("project_roles")
        .select("category, assigned_profile_id")
        .eq("tournage_id", projectId);

      if (roleError) {
        setDebugInfo(`${debugMsg}\nRole Error: ${roleError.message}`);
        setChannels([]);
        return;
      }

      debugMsg += `\nRoles found: ${roles?.length || 0}`;

      if (!roles || roles.length === 0) {
        setChannels([]);
        setDebugInfo(debugMsg);
        return;
      }

      if (userIsOwner) {
        const allUsedCategories = Array.from(
          new Set(roles.map((r: any) => r.category)),
        );
        setChannels(allUsedCategories);
        setDebugInfo(
          `${debugMsg}\nCategories (Owner): ${allUsedCategories.length}`,
        );
      } else {
        const myRoles = roles.filter(
          (r: any) => r.assigned_profile_id === userId,
        );
        const myCategories = myRoles.map((r: any) => r.category);
        const accessible = Array.from(new Set(myCategories));

        setChannels(accessible as string[]);
        setDebugInfo(`${debugMsg}\nMy Roles: ${myRoles.length}`);
      }
    } catch (e: any) {
      setDebugInfo("Exception: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <View style={GlobalStyles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Conversation",
          headerShadowVisible: false,
          headerTitleAlign: "center",
          headerStyle: { backgroundColor: Colors.light.background },
          headerTitleStyle: { fontFamily: "System", fontWeight: "bold", color: Colors.light.text },
          headerRight: isOwner
            ? () => (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/project/[id]/settings",
                      params: { id: projectId as string },
                    })
                  }
                  style={{ padding: 5, marginRight: 10 }}
                >
                  <Ionicons name="settings-outline" size={24} color={Colors.light.text} />
                </TouchableOpacity>
              )
            : undefined,
        }}
      />

      <View style={styles.header}>
        <Text style={styles.subtitle}>
          {isOwner ? "Vue Ensemble" : "Vos équipes"}
        </Text>
      </View>

      <FlatList
        data={channels}
        keyExtractor={(item) => item}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <View style={{ padding: 20 }}>
            <Text style={{ textAlign: "center", color: Colors.light.tabIconDefault, marginTop: 30 }}>
              {isOwner
                ? "Aucun rôle créé pour le moment."
                : "Vous ne faites partie d'aucune équipe."}
            </Text>
            {debugInfo ? (
              <Text
                style={{
                  color: Colors.light.danger,
                  marginTop: 10,
                  fontSize: 10,
                  textAlign: "center",
                }}
              >
                {debugInfo}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          const color = CATEGORY_COLORS[item] || Colors.light.tabIconDefault;
          return (
            <TouchableOpacity
              style={styles.channelCard}
              onPress={() =>
                router.push({
                  pathname: "/project/[id]/chat/[category]",
                  params: { id: projectId as string, category: item },
                })
              }
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: color + "20" },
                ]}
              >
                <Ionicons name="chatbubble" size={24} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.channelTitle}>
                  Équipe {item.toUpperCase()}
                </Text>
                <Text style={{ fontSize: 12, color: Colors.light.tabIconDefault }}>
                  Appuyez pour entrer
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.light.border} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  subtitle: {
    color: Colors.light.tabIconDefault,
    fontWeight: "600",
  },
  channelCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: Colors.light.card,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    // Shadow
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  channelTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
});
