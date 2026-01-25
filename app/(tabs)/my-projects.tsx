import ClapLoading from "@/components/ClapLoading";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { useUserMode } from "@/hooks/useUserMode";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router"; // <--- IMPORT useRouter
import React, { useCallback, useState } from "react";
import {
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
      style={GlobalStyles.card}
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
            backgroundColor: Colors.light.danger,
            zIndex: 1, // Ensure it's on top
          }}
        />
      )}
      <View style={styles.cardHeader}>
        <Text style={[GlobalStyles.title2, { flex: 1 }]}>{item.title}</Text>
        <Text style={styles.cardType}>{item.type.replace("_", " ")}</Text>
      </View>
      <Text numberOfLines={2} style={GlobalStyles.body}>
        {item.description || "Pas de description"}
      </Text>
      <Text
        style={[GlobalStyles.caption, { textAlign: "right", marginTop: 8 }]}
      >
        Créé le {new Date(item.created_at).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ClapLoading
          size={50}
          color={Colors.light.primary}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundSecondary },
  sectionHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: Colors.light.text,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  listContent: { padding: 15, paddingBottom: 100 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
    alignItems: "center",
  },
  cardType: {
    fontSize: 12,
    color: Colors.light.primary,
    backgroundColor: Colors.light.backgroundSecondary, // lighter shade
    padding: 6,
    borderRadius: 8,
    overflow: "hidden",
    fontWeight: "600",
  },
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
    backgroundColor: Colors.light.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
