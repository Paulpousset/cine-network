import ClapLoading from "@/components/ClapLoading";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { useUserMode } from "@/hooks/useUserMode";
import { useTutorial } from "@/providers/TutorialProvider";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../../lib/supabase";

const CATEGORY_COLORS: Record<string, string> = {
  general: "#78909C",
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
  const { isTutorialActive, currentStep } = useTutorial();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { mode } = useUserMode();
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [project, setProject] = useState<any>(null);
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

      const { data: proj, error: projError } = await supabase
        .from("tournages")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (projError) {
        setDebugInfo(`Proj Error: ${projError.message}`);
        return;
      }

      setProject(proj);
      const userIsOwner =
        proj?.owner_id === userId ||
        (isTutorialActive &&
          proj?.title?.includes("Vitrine") &&
          currentStep?.id?.startsWith("admin"));
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
        setChannels(["general", ...allUsedCategories]);
        setDebugInfo(
          `${debugMsg}\nCategories (Owner): ${allUsedCategories.length}`,
        );
      } else {
        const myRoles = roles.filter(
          (r: any) => r.assigned_profile_id === userId,
        );
        const myCategories = myRoles.map((r: any) => r.category);
        const accessible = Array.from(new Set(myCategories));

        if (accessible.length > 0) {
          setChannels(["general", ...(accessible as string[])]);
        } else {
          setChannels([]);
        }
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
        <ClapLoading color={Colors.light.tint} size={50} />
      </View>
    );
  }

  return (
    <SafeAreaView style={GlobalStyles.container} edges={["top"]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.projectHeader}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 10,
            alignItems: "center",
          }}
        >
          {(Platform.OS !== "web" || mode !== "studio") && (
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/my-projects")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: "#f0f0f0",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 20,
                position: "absolute",
                left: 0,
                zIndex: 10,
              }}
            >
              <Ionicons name="home" size={16} color="#333" />
              <Text style={{ fontSize: 11, fontWeight: "600", color: "#333" }}>
                Accueil
              </Text>
            </TouchableOpacity>
          )}

          <View
            style={{
              alignItems: "center",
              flex: 1,
            }}
          >
            <Text style={styles.title} numberOfLines={2}>
              {project?.title}
            </Text>
            <Text style={styles.subtitleProject} numberOfLines={1}>
              {project?.type} • {project?.ville || "Lieu non défini"}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              gap: 15,
              alignItems: "center",
              position: "absolute",
              right: 0,
              zIndex: 10,
            }}
          >
            {isOwner && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/project/[id]/settings",
                    params: { id: projectId as string },
                  })
                }
                style={{ padding: 5 }}
              >
                <Ionicons
                  name="settings-outline"
                  size={24}
                  color={Colors.light.text}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

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
            <Text
              style={{
                textAlign: "center",
                color: Colors.light.tabIconDefault,
                marginTop: 30,
              }}
            >
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
                  pathname: "/project/[id]/spaces/[category]",
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
                <Ionicons name="apps" size={24} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.channelTitle}>
                  {item === "general"
                    ? "Espace Général"
                    : `Équipe ${item.toUpperCase()}`}
                </Text>
                <Text
                  style={{ fontSize: 12, color: Colors.light.tabIconDefault }}
                >
                  Appuyez pour entrer
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.light.border}
              />
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  projectHeader: {
    padding: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  subtitleProject: {
    fontSize: 12,
    color: "#666",
    textTransform: "capitalize",
    textAlign: "center",
  },
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
