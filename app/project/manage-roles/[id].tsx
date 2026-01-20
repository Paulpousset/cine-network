import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

type RoleItem = {
  id: string;
  category: string;
  title: string;
  quantity_needed: number;
  description?: string;
  status?: string | null; // 'draft' or null/'published'
  assigned_profile_id?: string | null;
  assigned_profile?: {
    full_name: string;
    username: string;
    city?: string;
  };
};

export default function ManageRoles() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectTitle, setProjectTitle] = useState("");

  // Search/Assign State
  const [assigningRoleId, setAssigningRoleId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      setLoading(true);
      // Get project title
      const { data: proj } = await supabase
        .from("tournages")
        .select("title")
        .eq("id", id)
        .single();
      if (proj) setProjectTitle(proj.title);

      // 1. Get roles simplistic query (no join) to avoid relationship errors
      const { data: rolesData, error } = await supabase
        .from("project_roles")
        .select("*")
        .eq("tournage_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      let items: RoleItem[] = rolesData || [];

      // 2. Manually fetch assigned profiles
      const userIds = items
        .map((r) => r.assigned_profile_id)
        .filter((uid) => uid !== null) as string[];

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, username, city")
          .in("id", userIds);

        const profileMap = new Map();
        profiles?.forEach((p) => profileMap.set(p.id, p));

        items = items.map((r) => {
          if (r.assigned_profile_id && profileMap.has(r.assigned_profile_id)) {
            return {
              ...r,
              assigned_profile: profileMap.get(r.assigned_profile_id),
            };
          }
          return r;
        });
      }

      setRoles(items);
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function togglePublish(role: RoleItem) {
    const newStatus = role.status === "draft" ? "published" : "draft";
    try {
      const { error } = await supabase
        .from("project_roles")
        .update({ status: newStatus })
        .eq("id", role.id);

      if (error) throw error;

      // Optimistic update
      setRoles((prev) =>
        prev.map((r) => (r.id === role.id ? { ...r, status: newStatus } : r)),
      );
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    }
  }

  async function deleteRole(roleId: string) {
    Alert.alert("Confirmer", "Voulez-vous vraiment supprimer ce rôle ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("project_roles")
              .delete()
              .eq("id", roleId);
            if (error) throw error;
            setRoles((prev) => prev.filter((r) => r.id !== roleId));
          } catch (e) {
            Alert.alert("Erreur", (e as Error).message);
          }
        },
      },
    ]);
  }

  async function searchProfiles(term: string) {
    setQuery(term);
    if (!term.trim()) {
      setResults([]);
      return;
    }
    try {
      setSearching(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, city")
        .ilike("full_name", `%${term}%`)
        .limit(20);
      if (error) throw error;
      setResults(data || []);
    } catch (e) {
      // silent fail or log
    } finally {
      setSearching(false);
    }
  }

  async function assignUser(profile: any) {
    if (!assigningRoleId) return;
    try {
      const { error } = await supabase
        .from("project_roles")
        .update({ assigned_profile_id: profile.id })
        .eq("id", assigningRoleId);

      if (error) throw error;

      // Optimistic update
      setRoles((prev) =>
        prev.map((r) =>
          r.id === assigningRoleId
            ? {
                ...r,
                assigned_profile_id: profile.id,
                assigned_profile: {
                  full_name: profile.full_name,
                  username: profile.username,
                  city: profile.city,
                },
              }
            : r,
        ),
      );
      setAssigningRoleId(null);
      setQuery("");
      setResults([]);
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    }
  }

  async function removeAssignment(roleId: string) {
    try {
      const { error } = await supabase
        .from("project_roles")
        .update({ assigned_profile_id: null })
        .eq("id", roleId);
      if (error) throw error;

      setRoles((prev) =>
        prev.map((r) =>
          r.id === roleId
            ? { ...r, assigned_profile_id: null, assigned_profile: undefined }
            : r,
        ),
      );
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    }
  }

  const renderRoleItem = ({ item }: { item: RoleItem }) => {
    const isDraft = item.status === "draft";
    const assigneeName = item.assigned_profile
      ? item.assigned_profile.full_name || item.assigned_profile.username
      : null;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {isDraft && (
                <View style={styles.draftBadge}>
                  <Text style={styles.draftText}>BROUILLON</Text>
                </View>
              )}
              <Text style={styles.roleTitle}>{item.title}</Text>
            </View>
            <Text style={styles.categoryText}>
              {item.category.toUpperCase()} • {item.quantity_needed} pers.
            </Text>
          </View>
          <TouchableOpacity onPress={() => deleteRole(item.id)}>
            <Ionicons name="trash-outline" size={20} color="#ff4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          {/* PUBLISH TOGGLE */}
          <TouchableOpacity
            style={[
              styles.actionBtn,
              isDraft ? styles.btnPublish : styles.btnUnpublish,
            ]}
            onPress={() => togglePublish(item)}
          >
            <Text
              style={{
                color: isDraft ? "white" : "#666",
                fontWeight: "600",
                fontSize: 12,
              }}
            >
              {isDraft ? "Publier" : "Dépublier"}
            </Text>
          </TouchableOpacity>

          {/* ASSIGNMENT */}
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            {assigneeName ? (
              <View style={styles.assignedContainer}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.assignedText}> {assigneeName}</Text>
                </View>
                <TouchableOpacity onPress={() => removeAssignment(item.id)}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setAssigningRoleId(item.id)}
                style={styles.assignBtn}
              >
                <Text style={{ color: "#841584", fontSize: 12 }}>
                  + Assigner qqn
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <View>
          <Text style={styles.screenTitle}>Gestion des rôles</Text>
          <Text style={styles.subtitle}>{projectTitle}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#841584" />
      ) : (
        <FlatList
          data={roles}
          keyExtractor={(r) => r.id}
          renderItem={renderRoleItem}
          contentContainerStyle={{ padding: 15, paddingBottom: 50 }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 40, color: "#666" }}>
              Aucun rôle trouvé.
            </Text>
          }
        />
      )}

      {/* MODAL SEARCH USER */}
      <Modal
        visible={!!assigningRoleId}
        transparent
        animationType="fade"
        onRequestClose={() => setAssigningRoleId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text style={styles.modalTitle}>Assigner le rôle</Text>
              <TouchableOpacity onPress={() => setAssigningRoleId(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <TextInput
              placeholder="Rechercher (nom, pseudo, ville)..."
              style={styles.input}
              value={query}
              onChangeText={searchProfiles}
              autoFocus
            />

            {searching ? (
              <ActivityIndicator style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.userRow}
                    onPress={() => assignUser(item)}
                  >
                    <View>
                      <Text style={{ fontWeight: "600", fontSize: 16 }}>
                        {item.full_name || item.username}
                      </Text>
                      {item.city ? (
                        <Text style={{ fontSize: 12, color: "#666" }}>
                          {item.city}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons
                      name="add-circle-outline"
                      size={24}
                      color="#841584"
                    />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  query.length > 0 ? (
                    <Text style={{ textAlign: "center", marginTop: 20 }}>
                      Aucun profil trouvé.
                    </Text>
                  ) : null
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
  },
  screenTitle: { fontSize: 20, fontWeight: "bold" },
  subtitle: { fontSize: 14, color: "#666" },
  card: {
    backgroundColor: "white",
    marginBottom: 12,
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  roleTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  categoryText: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
    fontWeight: "600",
  },
  draftBadge: {
    backgroundColor: "#FF9800",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  draftText: { color: "white", fontSize: 10, fontWeight: "bold" },

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#f0f0f0",
    paddingTop: 10,
    marginTop: 5,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  btnPublish: { backgroundColor: "#4CAF50" },
  btnUnpublish: { backgroundColor: "#eee" },

  assignBtn: {
    padding: 6,
    borderWidth: 1,
    borderColor: "#841584",
    borderRadius: 6,
  },
  assignedContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 8,
  },
  assignedText: { color: "#2E7D32", fontWeight: "600", fontSize: 13 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold" },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  userRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
