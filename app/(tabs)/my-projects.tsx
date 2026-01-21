import { useUserMode } from "@/hooks/useUserMode";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router"; // <--- IMPORT useRouter
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    SectionList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type Project = {
  id: string;
  title: string;
  description: string;
  type: string;
  created_at: string;
  owner_id: string;
  has_notifications?: boolean;
};

export default function MyProjects() {
  const router = useRouter(); // <--- Hook de navigation
  const [sections, setSections] = useState<
    { title: string; data: Project[] }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchMyProjects();
    }, []),
  );

  // Mode control: hide FAB if in search mode
  const { mode } = useUserMode();

  async function fetchMyProjects() {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setCurrentUserId(session.user.id);
      } else {
        return;
      }

      // 1. Fetch Owned Projects
      const { data: ownedData, error: ownedError } = await supabase
        .from("tournages")
        .select("*")
        .eq("owner_id", session.user.id)
        .order("created_at", { ascending: false });

      if (ownedError) throw ownedError;

      // Check notifications for owned
      let ownedProjects = ownedData || [];
      if (ownedProjects.length > 0) {
        const tournageIds = ownedProjects.map((p) => p.id);
        const { data: pendingApps } = await supabase
          .from("applications" as any)
          .select(
            `
          role_id,
          project_roles!inner (
            tournage_id
          )
        `,
          )
          .eq("status", "pending")
          .in("project_roles.tournage_id", tournageIds);

        ownedProjects = ownedProjects.map((p) => ({
          ...p,
          has_notifications: pendingApps?.some(
            (app: any) => app.project_roles?.tournage_id === p.id,
          ),
        }));
      }

      // 2. Fetch Participating Projects
      // user is participating if they are 'assigned_profile_id' in a role
      const { data: participations, error: partError } = await supabase
        .from("project_roles")
        .select(
          `
          tournage_id,
          tournages (*)
        `,
        )
        .eq("assigned_profile_id", session.user.id);

      if (partError) throw partError;

      // Extract unique tournages from participations, avoiding duplicates if multiple roles
      const participatingMap = new Map();
      participations?.forEach((p: any) => {
        if (p.tournages) {
          participatingMap.set(p.tournages.id, p.tournages);
        }
      });
      const participatingProjects = Array.from(participatingMap.values());

      setSections([
        { title: "Mes Projets", data: ownedProjects },
        { title: "Mes Participations", data: participatingProjects as any },
      ]);
    } catch (error) {
      Alert.alert("Erreur", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const renderProjectItem = ({ item }: { item: Project }) => (
    <TouchableOpacity
      style={styles.card}
      // Au clic, on va vers le détail aussi
      onPress={() =>
        router.push({ pathname: "/project/[id]", params: { id: item.id } })
      }
    >
      {item.has_notifications && (
        <View
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: "red",
            zIndex: 1, // Ensure it's on top
          }}
        />
      )}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardType}>{item.type.replace("_", " ")}</Text>
      </View>
      <Text numberOfLines={2} style={styles.cardDesc}>
        {item.description || "Pas de description"}
      </Text>
      <Text style={styles.cardDate}>
        Créé le {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#841584"
          style={{ marginTop: 50 }}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item.id + index}
          renderItem={renderProjectItem}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucun projet pour l'instant.</Text>
          }
          stickySectionHeadersEnabled={false}
        />
      )}

      {mode === "creator" ? (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/project/new")}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ... Les styles restent les mêmes que tu avais ...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    padding: 20,
    paddingTop: 60,
    backgroundColor: "white",
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#333",
    backgroundColor: "#f8f9fa", // Match container bg
  },
  listContent: { padding: 15, paddingBottom: 100 },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", flex: 1 },
  cardType: {
    fontSize: 12,
    color: "#841584",
    backgroundColor: "#f3e5f5",
    padding: 4,
    borderRadius: 4,
    overflow: "hidden",
  },
  cardDesc: { color: "#666", marginBottom: 10 },
  cardDate: { fontSize: 10, color: "#aaa", textAlign: "right" },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    color: "#999",
    fontSize: 16,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#841584",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
});
