import { Ionicons } from "@expo/vector-icons";
import { useGlobalSearchParams, useRouter } from "expo-router";
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
  const [loading, setLoading] = useState(false); // Changed to false initially
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
      // setLoading(true) handled in useEffect
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setDebugInfo("No session found in Supabase Auth");
        return;
      }
      const userId = session.user.id;

      // 1. Get Project Owner
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

      // 2. Get all roles in project
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
        setDebugInfo(debugMsg); // Set debug so we know roles are empty
        return;
      }

      // 3. Determine accessible categories
      if (userIsOwner) {
        // Owner sees all categories that have at least one role
        const allUsedCategories = Array.from(
          new Set(roles.map((r: any) => r.category)),
        );
        setChannels(allUsedCategories);
        setDebugInfo(
          `${debugMsg}\nCategories (Owner): ${allUsedCategories.length}`,
        );
      } else {
        // Participant sees only categories where they are assigned
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
        <ActivityIndicator color="#841584" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 60,
          paddingBottom: 15,
          backgroundColor: "white",
          borderBottomWidth: 1,
          borderColor: "#eee",
        }}
      >
        <View style={{ width: 24 }} />
        <Text style={{ fontSize: 20, fontWeight: "bold" }}>Conversation</Text>
        {isOwner ? (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/project/[id]/settings",
                params: { id: projectId as string },
              })
            }
            style={{ padding: 5 }}
          >
            <Ionicons name="settings-outline" size={24} color="#841584" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <View style={{ paddingHorizontal: 20, paddingVertical: 10 }}>
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
            <Text style={{ textAlign: "center", color: "#999", marginTop: 30 }}>
              {isOwner
                ? "Aucun rôle créé pour le moment."
                : "Vous ne faites partie d'aucune équipe."}
            </Text>
            {debugInfo ? (
              <Text
                style={{
                  color: "red",
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
          const color = CATEGORY_COLORS[item] || "#666";
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
                <Text style={{ fontSize: 12, color: "#666" }}>
                  Appuyez pour entrer
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    color: "#666",
    marginTop: 4,
  },
  channelCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    // Shadow
    shadowColor: "#000",
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
    color: "#333",
  },
});
