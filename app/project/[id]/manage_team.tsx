import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SectionList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";
import { GlobalStyles } from "@/constants/Styles";
import Colors from "@/constants/Colors";

export default function ManageTeam() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    checkOwnerAndFetch();
  }, [id]);

  async function checkOwnerAndFetch() {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // Check Owner
      const { data: proj } = await supabase
        .from("tournages")
        .select("owner_id")
        .eq("id", id)
        .single();

      if (proj?.owner_id !== session.user.id) {
        Alert.alert(
          "Accès refusé",
          "Seul le propriétaire peut gérer l'équipe.",
        );
        router.back();
        return;
      }
      setIsOwner(true);

      // Fetch Roles with Profile
      const { data: roles, error } = await supabase
        .from("project_roles")
        .select(
          `
          id,
          title,
          category,
          is_category_admin,
          assigned_profile:profiles!project_roles_assigned_profile_id_fkey (
             id,
             full_name,
             username,
             avatar_url
          )
        `,
        )
        .eq("tournage_id", id)
        .not("assigned_profile_id", "is", null);

      if (error) throw error;

      // Group by Category
      const grouped = (roles || []).reduce((acc: any, curr: any) => {
        const cat = curr.category || "Autre";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(curr);
        return acc;
      }, {});

      const sectionData = Object.keys(grouped).map((key) => ({
        title: key,
        data: grouped[key],
      }));

      setSections(sectionData);
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAdmin(roleId: string, currentValue: boolean) {
    try {
      const { error } = await supabase
        .from("project_roles")
        .update({ is_category_admin: !currentValue })
        .eq("id", roleId);

      if (error) throw error;

      // Update local state
      setSections((prev) =>
        prev.map((section) => ({
          ...section,
          data: section.data.map((role: any) =>
            role.id === roleId
              ? { ...role, is_category_admin: !currentValue }
              : role,
          ),
        })),
      );
    } catch (e) {
      Alert.alert("Erreur", "Impossible de modifier les droits.");
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/my-projects")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: Colors.light.background,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: Colors.light.border
          }}
        >
          <Ionicons name="home" size={18} color={Colors.light.text} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: Colors.light.text }}>
            Accueil
          </Text>
        </TouchableOpacity>
        <Text style={GlobalStyles.title2}>Gérer les Admins</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>
        Activez l'option "Admin" pour permettre à un membre de gérer les
        événements de sa catégorie.
      </Text>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.light.primary}
          style={{ marginTop: 50 }}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 50 }}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={GlobalStyles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {item.assigned_profile?.full_name ||
                    item.assigned_profile?.username}
                </Text>
                <Text style={styles.role}>{item.title}</Text>
              </View>

              <View style={{ alignItems: "center" }}>
                <Text style={styles.switchLabel}>Admin</Text>
                <Switch
                  value={item.is_category_admin}
                  onValueChange={() =>
                    toggleAdmin(item.id, item.is_category_admin)
                  }
                  trackColor={{ false: "#767577", true: Colors.light.primary }}
                  thumbColor={item.is_category_admin ? Colors.light.tint : "#f4f3f4"}
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Aucun membre assigné pour le moment.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundSecondary, padding: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 30,
  },
  subtitle: {
    color: "#666",
    marginBottom: 20,
    fontSize: 14,
    fontStyle: "italic",
  },
  sectionHeader: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 15,
    borderRadius: 5,
  },
  sectionTitle: {
    fontWeight: "bold",
    color: "#555",
    fontSize: 14,
  },
  name: { fontWeight: "bold", fontSize: 16, marginBottom: 4, color: Colors.light.text },
  role: { color: "#666", fontSize: 14 },
  switchLabel: { fontSize: 10, color: "#888", marginBottom: 2 },
  emptyText: { textAlign: "center", marginTop: 30, color: "#999" },
});
