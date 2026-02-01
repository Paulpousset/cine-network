import Colors from "@/constants/Colors";
import { useUserMode } from "@/hooks/useUserMode";
import { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type ProjectCharacter =
  Database["public"]["Tables"]["project_characters"]["Row"] & {
    assigned_actor?: Database["public"]["Tables"]["profiles"]["Row"];
  };

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const FORBIDDEN_TITLES = ["Runner", "Chauffeur", "Cantine", "Runner/Chauffeur"];

export default function CastingScreen() {
  const router = useRouter();
  const { mode } = useUserMode();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<ProjectCharacter[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);

  // Form State
  const [newCharacterName, setNewCharacterName] = useState("");
  const [newCharacterDescription, setNewCharacterDescription] = useState("");
  const [selectedRole, setSelectedRole] = useState<ProjectCharacter | null>(
    null,
  );

  const [projectActors, setProjectActors] = useState<Profile[]>([]);
  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (id) {
      checkPermissions();
      fetchRoles();
      fetchProjectActors();
    }
  }, [id]);

  const fetchProjectActors = async () => {
    // Fetch users who have an "acteur" role in this project
    const { data: rolesData, error } = await supabase
      .from("project_roles")
      .select(
        `
        assigned_profile:profiles(*)
      `,
      )
      .eq("tournage_id", id)
      .eq("category", "acteur")
      .not("assigned_profile_id", "is", null);

    if (!error && rolesData) {
      // Extract unique profiles
      const actors = rolesData
        .map((r: any) => r.assigned_profile)
        .filter((p: any) => !!p);

      // Deduplicate by ID
      const uniqueActors = Array.from(
        new Map(actors.map((item: any) => [item.id, item])).values(),
      ) as Profile[];
      setProjectActors(uniqueActors);
    }
  };

  const checkPermissions = async () => {
    setCheckingAccess(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setHasAccess(false);
      setCheckingAccess(false);
      return;
    }

    // Check if owner
    const { data: project } = await supabase
      .from("tournages")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (project?.owner_id === user.id) {
      setHasAccess(true);
      setCheckingAccess(false);
      return;
    }

    // Check user roles
    const { data: userRoles } = await supabase
      .from("project_roles")
      .select("title")
      .eq("tournage_id", id)
      .eq("assigned_profile_id", user.id);

    if (!userRoles || userRoles.length === 0) {
      setHasAccess(false); // No role in project
    } else {
      // If user has ANY role that implies access (i.e. not in forbidden list)
      // Or simpler: If user ONLY has forbidden roles, deny.
      const allForbidden = userRoles.every((r) =>
        FORBIDDEN_TITLES.includes(r.title),
      );

      if (allForbidden) {
        setHasAccess(false);
      } else {
        setHasAccess(true);
      }
    }
    setCheckingAccess(false);
  };

  const fetchRoles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_characters")
      .select(
        `
        *,
        assigned_actor:profiles(*)
      `,
      )
      .eq("project_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      Alert.alert("Erreur", "Impossible de charger le casting.");
    } else {
      setRoles(data || []);
    }
    setLoading(false);
  };

  const handleCreateCharacter = async () => {
    if (!newCharacterName.trim()) {
      Alert.alert("Erreur", "Le nom du personnage est requis.");
      return;
    }

    const { error } = await supabase.from("project_characters").insert({
      project_id: id,
      name: newCharacterName,
      description: newCharacterDescription,
    });

    if (error) {
      console.error(error);
      Alert.alert("Erreur", "Impossible de créer le personnage.");
    } else {
      setCreateModalVisible(false);
      setNewCharacterName("");
      setNewCharacterDescription("");
      fetchRoles();
    }
  };

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 1) {
      setSearchResults(projectActors); // Show all actors if query is empty
      return;
    }

    setSearching(true);
    // Filter local projectActors list
    const lowerQuery = query.toLowerCase();
    const filtered = projectActors.filter(
      (actor) =>
        (actor.full_name &&
          actor.full_name.toLowerCase().includes(lowerQuery)) ||
        (actor.username && actor.username.toLowerCase().includes(lowerQuery)),
    );

    setSearchResults(filtered);
    setSearching(false);
  };

  const handleAssignRole = async (profileId: string) => {
    if (!selectedRole) return;

    const { error } = await supabase
      .from("project_characters")
      .update({ assigned_actor_id: profileId })
      .eq("id", selectedRole.id);

    if (error) {
      console.error(error);
      Alert.alert("Erreur", "Impossible d'assigner le rôle.");
    } else {
      setAssignModalVisible(false);
      setSelectedRole(null);
      fetchRoles();
    }
  };

  const handleUnassignRole = async (roleId: string) => {
    const { error } = await supabase
      .from("project_characters")
      .update({ assigned_actor_id: null })
      .eq("id", roleId);

    if (error) {
      console.error(error);
      Alert.alert("Erreur", "Impossible de retirer l'acteur.");
    } else {
      fetchRoles();
    }
  };

  const renderRoleItem = ({ item }: { item: ProjectCharacter }) => (
    <View style={styles.roleItem}>
      <View style={styles.roleInfo}>
        <Text style={styles.roleTitle}>{item.name}</Text>
        {item.description ? (
          <Text style={styles.roleDescription}>{item.description}</Text>
        ) : null}
      </View>

      <View style={styles.roleAssignee}>
        {item.assigned_actor ? (
          <View style={styles.assignedContainer}>
            <Image
              source={{
                uri:
                  item.assigned_actor.avatar_url ||
                  "https://ui-avatars.com/api/?name=" +
                    item.assigned_actor.username,
              }}
              style={styles.avatar}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.assignedName}>
                {item.assigned_actor.full_name || item.assigned_actor.username}
              </Text>
              <TouchableOpacity onPress={() => handleUnassignRole(item.id)}>
                <Text style={styles.unassignText}>Retirer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.assignButton}
            onPress={() => {
              setSelectedRole(item);
              setAssignModalVisible(true);
              setSearchQuery("");
              setSearchResults(projectActors); // Initialize with all actors
            }}
          >
            <Text style={styles.assignButtonText}>Assigner un acteur</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (checkingAccess) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  if (!hasAccess) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.forbiddenText}>Accès Interdit</Text>
        <Text style={styles.forbiddenSubtext}>
          Votre rôle ne vous permet pas d'accéder à cette page.
        </Text>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/project/[id]/spaces/[category]",
              params: {
                id: id as string,
                category: "production",
                tab: "tools",
              },
            })
          }
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {mode !== "studio" && (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/project/[id]/spaces/[category]",
                params: {
                  id: id as string,
                  category: "production",
                  tab: "tools",
                },
              })
            }
            style={{ padding: 4 }}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Casting & Personnages</Text>
        <TouchableOpacity
          onPress={() => setCreateModalVisible(true)}
          style={styles.addButton}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : (
        <FlatList
          data={roles}
          renderItem={renderRoleItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucun personnage créé.</Text>
          }
        />
      )}

      {/* Create Character Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouveau Personnage</Text>
            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.label}>Nom du personnage</Text>
            <TextInput
              style={styles.input}
              value={newCharacterName}
              onChangeText={setNewCharacterName}
              placeholder="Ex: James Bond"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newCharacterDescription}
              onChangeText={setNewCharacterDescription}
              placeholder="Description physique, caractère..."
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleCreateCharacter}
            >
              <Text style={styles.saveButtonText}>Créer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Assign Actor Modal */}
      <Modal
        visible={assignModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assigner {selectedRole?.name}</Text>
            <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
              <Text style={styles.cancelText}>Fermer</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={handleSearchUsers}
              placeholder="Rechercher un acteur (nom, pseudo)..."
              autoCapitalize="none"
            />
          </View>

          {searching ? (
            <ActivityIndicator
              style={{ marginTop: 20 }}
              color={Colors.light.tint}
            />
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Aucun acteur trouvé dans l'équipe.
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.userItem}
                  onPress={() => handleAssignRole(item.id)}
                >
                  <Image
                    source={{
                      uri:
                        item.avatar_url ||
                        "https://ui-avatars.com/api/?name=" + item.username,
                    }}
                    style={styles.avatar}
                  />
                  <View>
                    <Text style={styles.userName}>
                      {item.full_name || item.username}
                    </Text>
                    <Text style={styles.userSub}>
                      {item.role || "Utilisateur"}
                    </Text>
                  </View>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={24}
                    color={Colors.light.tint}
                    style={{ marginLeft: "auto" }}
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: Colors.light.tint,
    padding: 8,
    borderRadius: 20,
  },
  listContent: {
    padding: 16,
  },
  roleItem: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    flexDirection: Platform.OS === "web" ? "row" : "column",
    justifyContent: "space-between",
    alignItems: Platform.OS === "web" ? "center" : "stretch",
    gap: 12,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: "#6c757d",
  },
  roleAssignee: {
    minWidth: 200,
  },
  assignButton: {
    backgroundColor: "#e7f5ff",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  assignButtonText: {
    color: "#1c7ed6",
    fontWeight: "600",
  },
  assignedContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#dee2e6",
  },
  assignedName: {
    fontWeight: "600",
    fontSize: 14,
  },
  unassignText: {
    fontSize: 12,
    color: "#fa5252",
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    color: "#adb5bd",
    marginTop: 40,
  },
  // Permissions
  forbiddenText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#c92a2a",
    marginBottom: 8,
  },
  forbiddenSubtext: {
    fontSize: 16,
    color: "#495057",
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    padding: 12,
    backgroundColor: "#f1f3f5",
    borderRadius: 8,
  },
  backButtonText: {
    color: "#212529",
    fontWeight: "600",
  },
  // Modals
  modalContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  cancelText: {
    color: Colors.light.tint,
    fontSize: 16,
  },
  modalContent: {
    padding: 20,
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#495057",
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  // Search
  searchContainer: {
    padding: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  searchInput: {
    backgroundColor: "#f1f3f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "white",
    marginBottom: 8,
    borderRadius: 8,
    gap: 12,
  },
  userName: {
    fontWeight: "bold",
    fontSize: 16,
  },
  userSub: {
    color: "#868e96",
    fontSize: 14,
  },
});
