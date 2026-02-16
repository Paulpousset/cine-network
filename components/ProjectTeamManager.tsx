import ClapLoading from "@/components/ClapLoading";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { NotificationService } from "@/services/NotificationService";
import { JOB_TITLES } from "@/utils/roles";
import { fuzzySearch } from "@/utils/search";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ProjectTeamManagerProps {
  projectId: string;
  projectTitle: string;
  onClose?: () => void;
}

type RoleItem = {
  id: string;
  tournage_id: string;
  category: string;
  title: string;
  status: string | null;
  assigned_profile_id: string | null;
  assigned_profile?: {
    full_name: string;
    username: string;
    avatar_url?: string | null;
  };
};

export default function ProjectTeamManager({
  projectId,
  projectTitle,
  onClose,
}: ProjectTeamManagerProps) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  
  // Member Search
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [targetRoleId, setTargetRoleId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // New Role Modal
  const [newRoleVisible, setNewRoleVisible] = useState(false);
  const [newCategory, setNewCategory] = useState("acteur");
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    fetchRoles();
  }, [projectId]);

  async function fetchRoles() {
    try {
      setLoading(true);
      
      // Fetch project status
      const { data: projectData } = await supabase
        .from("tournages")
        .select("status")
        .eq("id", projectId)
        .single();
      if (projectData) setProjectStatus(projectData.status);

      const { data, error } = await supabase
        .from("project_roles")
        .select(`
          id,
          tournage_id,
          category,
          title,
          status,
          assigned_profile_id,
          assigned_profile:profiles (
            full_name,
            username,
            avatar_url
          )
        `)
        .eq("tournage_id", projectId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      const formattedData = (data || []).map((role: any) => ({
        ...role,
        assigned_profile: Array.isArray(role.assigned_profile)
          ? role.assigned_profile[0]
          : role.assigned_profile,
      }));
      
      setRoles(formattedData as RoleItem[]);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Erreur", "Impossible de charger les membres.");
    } finally {
      setLoading(false);
    }
  }

  async function addRole() {
    if (!newTitle) {
      Alert.alert("Erreur", "Veuillez saisir un titre de rôle.");
      return;
    }
    try {
      const { data, error } = await supabase
        .from("project_roles")
        .insert({
          tournage_id: projectId,
          category: newCategory,
          title: newTitle,
          status: projectStatus === "completed" ? "draft" : "published",
        })
        .select()
        .single();

      if (error) throw error;
      
      setNewRoleVisible(false);
      setNewTitle("");
      fetchRoles();
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    }
  }

  async function deleteRole(roleId: string) {
    Alert.alert("Supprimer ?", "Voulez-vous retirer ce rôle/membre ?", [
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
            setRoles(roles.filter((r) => r.id !== roleId));
          } catch (e: any) {
            Alert.alert("Erreur", e.message);
          }
        },
      },
    ]);
  }

  function handleSearch(term: string) {
    setQuery(term);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!term.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimeout.current = setTimeout(() => {
      executeSearch(term);
    }, 400);
  }

  async function executeSearch(term: string) {
    if (!term.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    try {
      let queryBuilder = supabase
        .from("profiles")
        .select("id, full_name, username, ville, avatar_url")
        .limit(50);

      const mainPart = term.trim().split(/\s+/)[0];
      queryBuilder = queryBuilder.or(
        `full_name.ilike.%${mainPart}%,username.ilike.%${mainPart}%`
      );

      const { data, error } = await queryBuilder;
      if (error) throw error;

      let processed = data || [];
      processed = fuzzySearch(processed, ["full_name", "username"], term);
      setResults(processed.slice(0, 15));
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }

  async function assignUser(profile: any) {
    if (!targetRoleId) return;
    try {
      const { error } = await supabase
        .from("project_roles")
        .update({
          assigned_profile_id: profile.id,
          status: "invitation_pending",
        })
        .eq("id", targetRoleId);

      if (error) throw error;

      const role = roles.find(r => r.id === targetRoleId);
      NotificationService.sendRoleInvitationNotification({
        receiverId: profile.id,
        projectTitle: projectTitle,
        roleTitle: role?.title || "Membre d'équipe",
      });

      setSearchModalVisible(false);
      setQuery("");
      setResults([]);
      fetchRoles();
      Alert.alert("Succès", `Invitation envoyée à ${profile.full_name || profile.username}`);
    } catch (e: any) {
      Alert.alert("Erreur", e.message);
    }
  }

  const renderRole = ({ item }: { item: RoleItem }) => (
    <View style={styles.roleCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.roleTitle}>{item.title}</Text>
        <Text style={styles.roleSub}>{item.category.toUpperCase()}</Text>
        
        {item.assigned_profile ? (
          <View style={styles.assigneeContainer}>
            <Ionicons name="person-circle" size={16} color={colors.primary} />
            <Text style={styles.assigneeName}>
              {item.assigned_profile.full_name || item.assigned_profile.username}
            </Text>
            {item.status === "invitation_pending" && (
              <Text style={styles.pendingBadge}>En attente</Text>
            )}
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.addMemberBtn}
            onPress={() => {
              setTargetRoleId(item.id);
              setSearchModalVisible(true);
            }}
          >
            <Ionicons name="person-add-outline" size={14} color={colors.primary} />
            <Text style={styles.addMemberBtnText}>Ajouter un membre</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity onPress={() => deleteRole(item.id)} style={styles.deleteBtn}>
        <Ionicons name="trash-outline" size={20} color="#ff4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ClapLoading />
      ) : (
        <>
          <FlatList
            data={roles}
            renderItem={renderRole}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={
              <TouchableOpacity 
                style={styles.newRoleBtn}
                onPress={() => setNewRoleVisible(true)}
              >
                <Ionicons name="add-circle-outline" size={24} color="white" />
                <Text style={styles.newRoleBtnText}>Nouveau rôle / membre</Text>
              </TouchableOpacity>
            }
            ListEmptyComponent={
              <Text style={styles.emptyText}>Aucun membre ajouté pour le moment.</Text>
            }
          />
        </>
      )}

      {/* SEARCH MODAL */}
      <Modal visible={searchModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chercher un membre</Text>
              <TouchableOpacity onPress={() => setSearchModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Nom, prénom ou @username..."
              value={query}
              onChangeText={handleSearch}
              autoFocus
            />

            {searching ? (
              <ClapLoading />
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.userRow} onPress={() => assignUser(item)}>
                    <Text style={styles.userName}>{item.full_name || item.username}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#ccc" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  query.length > 0 ? (
                    <Text style={styles.emptyText}>Aucun utilisateur trouvé.</Text>
                  ) : (
                    <Text style={styles.emptyText}>Commencez à taper pour rechercher un membre...</Text>
                  )
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* NEW ROLE MODAL */}
      <Modal visible={newRoleVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter un rôle</Text>
            
            <Text style={styles.label}>Catégorie</Text>
            <View style={styles.categoryPicker}>
              {Object.keys(JOB_TITLES).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, newCategory === cat && styles.catChipActive]}
                  onPress={() => setNewCategory(cat)}
                >
                  <Text style={[styles.catChipText, newCategory === cat && styles.catChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Titre (ex: Acteur Principal, Monteur...)</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Titre du rôle"
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: '#ccc' }]} 
                onPress={() => setNewRoleVisible(false)}
              >
                <Text>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: colors.primary }]} 
                onPress={addRole}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Créer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, padding: 15 },
    newRoleBtn: {
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      borderRadius: 10,
      marginBottom: 15,
      gap: 10,
    },
    newRoleBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
    roleCard: {
      backgroundColor: colors.background,
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    roleTitle: { fontSize: 16, fontWeight: "bold", color: colors.text },
    roleSub: { fontSize: 12, color: "#999", marginBottom: 5 },
    assigneeContainer: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
    assigneeName: { fontSize: 14, color: colors.primary, fontWeight: "600" },
    pendingBadge: { fontSize: 10, color: "#FF9800", backgroundColor: "#FFF3E0", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 5 },
    addMemberBtn: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5, padding: 5, borderWidth: 1, borderColor: colors.primary, borderRadius: 5, alignSelf: 'flex-start' },
    addMemberBtnText: { fontSize: 12, color: colors.primary, fontWeight: "600" },
    deleteBtn: { padding: 10 },
    emptyText: { textAlign: "center", color: "#999", marginTop: 20 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
    modalContent: { backgroundColor: colors.background, borderRadius: 15, padding: 20, maxHeight: "80%" },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
    modalTitle: { fontSize: 18, fontWeight: "bold", color: colors.text },
    searchInput: { backgroundColor: colors.backgroundSecondary, padding: 12, borderRadius: 10, color: colors.text, marginBottom: 15 },
    userRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    userName: { color: colors.text, fontSize: 15 },
    label: { fontSize: 14, fontWeight: "600", color: colors.text, marginBottom: 10, marginTop: 5 },
    categoryPicker: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 15 },
    catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    catChipText: { fontSize: 11, color: colors.text },
    catChipTextActive: { color: "white" },
    modalButton: { flex: 1, padding: 12, borderRadius: 10, alignItems: "center" },
  });
}
