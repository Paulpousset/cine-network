import RoleFormFields from "@/components/RoleFormFields";
import { fuzzyScore } from "@/utils/fuzzy";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";
import { JOB_TITLES } from "../../../utils/roles";

const ROLE_CATEGORIES = [
  "acteur",
  "realisateur",
  "image",
  "son",
  "production",
  "hmc",
  "deco",
  "post_prod",
  "technicien",
] as const;

const HAIR_COLORS = [
  "Brun",
  "Châtain",
  "Blond",
  "Roux",
  "Noir",
  "Gris",
  "Blanc",
  "Autre",
];
const EYE_COLORS = ["Marron", "Bleu", "Vert", "Noisette", "Gris", "Vairons"];

type RoleItem = {
  id: string;
  tournage_id: string;
  category: (typeof ROLE_CATEGORIES)[number];
  title: string;
  description?: string;
  status?: string | null;
  experience_level?: string | null;
  gender?: string | null;
  age_min?: number | null;
  age_max?: number | null;
  height?: number | null;
  hair_color?: string | null;
  eye_color?: string | null;
  equipment?: string | null;
  software?: string | null;
  specialties?: string | null;
  data?: any;
  assigned_profile_id?: string | null;
  assigned_profile?: {
    full_name: string;
    username: string;
    ville?: string;
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
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit/Add Role State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<{
    id?: string;
    category: (typeof ROLE_CATEGORIES)[number];
    title: string;
    description: string;
    quantity: string;
    experience: string;
    gender: string;
    ageMin: string;
    ageMax: string;
    height: string;
    hairColor: string;
    eyeColor: string;
    equipment: string;
    software: string;
    specialties: string;
    status: string; // "draft" | "published"
    assignee: { id: string; label: string } | null;
    data: any;
  } | null>(null);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isSearchingProfileInEdit, setIsSearchingProfileInEdit] =
    useState(false);

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
          .select("id, full_name, username, ville")
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

      // Initial Sort: Assigned (status='assigned') go to bottom
      items.sort((a, b) => {
        const aAssigned = a.status === "assigned";
        const bAssigned = b.status === "assigned";
        if (aAssigned !== bAssigned) return aAssigned ? 1 : -1;
        return 0; // maintain created_at order otherwise
      });

      setRoles(items);
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function openAddRole() {
    setEditingRole({
      category: "acteur",
      title: "",
      description: "",
      quantity: "1",
      experience: "",
      gender: "",
      ageMin: "",
      ageMax: "",
      height: "",
      hairColor: "",
      eyeColor: "",
      equipment: "",
      software: "",
      specialties: "",
      data: {},
      status: "draft",
      assignee: null,
    });
    setEditModalVisible(true);
    setIsSearchingProfileInEdit(false);
    setQuery("");
    setResults([]);
  }

  function openEditRole(role: RoleItem) {
    if (!role) return;
    try {
      console.log("Opening edit for:", role.id);
      setEditingRole({
        id: role.id,
        category: role.category,
        title: role.title || "",
        description: role.description || "",
        quantity: "1",
        experience: role.experience_level || "",
        gender: role.gender || "",
        ageMin: role.age_min ? String(role.age_min) : "",
        ageMax: role.age_max ? String(role.age_max) : "",
        height: role.height ? String(role.height) : "",
        hairColor: role.hair_color || "",
        eyeColor: role.eye_color || "",
        equipment: role.equipment || "",
        software: role.software || "",
        specialties: role.specialties || "",
        data: role.data || {},
        status: role.status || "published",
        assignee: role.assigned_profile
          ? {
              id: role.assigned_profile_id!,
              label:
                role.assigned_profile.full_name ||
                role.assigned_profile.username,
            }
          : null,
      });
      setEditModalVisible(true);
      setIsSearchingProfileInEdit(false);
      setQuery("");
      setResults([]);
    } catch (err) {
      console.error("Error opening edit role:", err);
      Alert.alert("Erreur", "Impossible d'ouvrir ce rôle.");
    }
  }

  async function saveRole() {
    if (!editingRole) return;
    if (!editingRole.title.trim()) {
      Alert.alert("Erreur", "Le titre est requis");
      return;
    }

    try {
      setIsSavingRole(true);

      const payload = {
        tournage_id: id,
        category: editingRole.category,
        title: editingRole.title,
        description: editingRole.description || null,
        experience_level: editingRole.experience || null,
        gender: editingRole.gender || null,
        age_min: editingRole.ageMin ? parseInt(editingRole.ageMin) : null,
        age_max: editingRole.ageMax ? parseInt(editingRole.ageMax) : null,
        height: editingRole.height ? parseInt(editingRole.height) : null,
        hair_color: editingRole.hairColor || null,
        eye_color: editingRole.eyeColor || null,
        equipment: editingRole.equipment || null,
        software: editingRole.software || null,
        specialties: editingRole.specialties || null,
        data: editingRole.data,
        assigned_profile_id: editingRole.assignee?.id ?? null,
        status: editingRole.assignee?.id ? "assigned" : editingRole.status,
      };

      if (editingRole.id) {
        // UPDATE
        const { error } = await supabase
          .from("project_roles")
          .update(payload)
          .eq("id", editingRole.id);
        if (error) throw error;
      } else {
        // CREATE
        // Handle quantity
        const qty = parseInt(editingRole.quantity) || 1;
        const rows = Array.from({ length: qty }).map(() => ({
          ...payload,
        }));
        const { error } = await supabase.from("project_roles").insert(rows);
        if (error) throw error;
      }

      setEditModalVisible(false);
      fetchData(); // Refresh list
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setIsSavingRole(false);
    }
  }

  async function searchProfilesForEdit(term: string) {
    setQuery(term);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    // Si pas de terme, on effectue la recherche immédiatement pour les suggestions
    if (!term || term.trim().length === 0) {
      executeSearchProfilesForEdit("");
    } else {
      // On lance la recherche immédiatement sans attendre "Entrer"
      // Le state est mis à jour et l'UI réagit au fur et à mesure
      setSearching(true);
      searchTimeout.current = setTimeout(() => {
        executeSearchProfilesForEdit(term);
      }, 300); // Réduit un peu le délai pour plus de réactivité
    }
  }

  async function executeSearchProfilesForEdit(term: string) {
    setSearching(true);
    try {
      const category = editingRole?.category;
      let queryBuilder = supabase
        .from("profiles")
        .select("id, full_name, username, ville, role")
        .limit(200); // Fetch more for fuzzy filtering

      if (term && term.trim().length > 0) {
        // Broad search to get candidates for fuzzy ranking
        // Split term into parts to match more broadly
        const parts = term.trim().split(/\s+/);
        const mainPart = parts[0];
        queryBuilder = queryBuilder.or(
          `full_name.ilike.%${mainPart}%,username.ilike.%${mainPart}%,ville.ilike.%${mainPart}%`,
        );
      } else if (category) {
        queryBuilder = queryBuilder.eq("role", category);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;

      let processedResults = data || [];

      if (term) {
        // Apply fuzzy ranking
        processedResults = processedResults
          .map((item) => {
            const searchStr = `${item.full_name || ""} ${item.username || ""} ${item.ville || ""}`;
            return { ...item, score: fuzzyScore(term, searchStr) };
          })
          .filter((item) => item.score > 0)
          .sort((a, b) => {
            // Priority 1: Fuzzy score
            if (b.score !== a.score) return b.score - a.score;
            // Priority 2: Role matching
            if (category) {
              if (a.role === category && b.role !== category) return -1;
              if (a.role !== category && b.role === category) return 1;
            }
            return 0;
          });
      } else if (category) {
        // No term, already filtered by category, just limit
      }

      setResults(processedResults.slice(0, 20));

      // Si aucun résultat après recherche, reset après un délai
      if (processedResults.length === 0 && term) {
        setTimeout(() => {
          if (query === term) {
            // Only clear if query hasn't changed
            setResults([]);
            setSearching(false);
          }
        }, 2000);
      }
    } catch (e) {
      console.error(e);
      Alert.alert(
        "Erreur",
        "Impossible de charger les profils. Vérifiez votre connexion.",
      );
    } finally {
      setSearching(false);
    }
  }

  function selectProfileInEdit(profile: any) {
    if (!editingRole) return;
    setEditingRole({
      ...editingRole,
      status: "assigned",
      assignee: {
        id: profile.id,
        label: profile.full_name || profile.username,
      },
    });
    setIsSearchingProfileInEdit(false);
    setQuery("");
    setResults([]);
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

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    // Si pas de terme, on effectue la recherche immédiatement pour les suggestions
    if (!term || term.trim().length === 0) {
      executeSearchProfiles("");
    } else {
      setSearching(true);
      searchTimeout.current = setTimeout(() => {
        executeSearchProfiles(term);
      }, 300);
    }
  }

  async function executeSearchProfiles(term: string) {
    setSearching(true);
    try {
      const role = roles.find((r) => r.id === assigningRoleId);
      const category = role?.category;

      let queryBuilder = supabase
        .from("profiles")
        .select("id, full_name, username, ville, role")
        .limit(200);

      if (term && term.trim().length > 0) {
        const parts = term.trim().split(/\s+/);
        const mainPart = parts[0];
        queryBuilder = queryBuilder.or(
          `full_name.ilike.%${mainPart}%,username.ilike.%${mainPart}%,ville.ilike.%${mainPart}%`,
        );
      } else if (category) {
        queryBuilder = queryBuilder.eq("role", category);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;

      let processedResults = data || [];
      if (term) {
        processedResults = processedResults
          .map((item) => {
            const searchStr = `${item.full_name || ""} ${item.username || ""} ${item.ville || ""}`;
            return { ...item, score: fuzzyScore(term, searchStr) };
          })
          .filter((item) => item.score > 0)
          .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (category) {
              if (a.role === category && b.role !== category) return -1;
              if (a.role !== category && b.role === category) return 1;
            }
            return 0;
          });
      }

      setResults(processedResults.slice(0, 20));

      // Si aucun résultat après recherche, reset après un délai
      if (processedResults.length === 0 && term) {
        setTimeout(() => {
          if (query === term) {
            setResults([]);
            setSearching(false);
          }
        }, 2000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  }

  async function assignUser(profile: any) {
    if (!assigningRoleId) return;
    const role = roles.find((r) => r.id === assigningRoleId);
    if (!role) return;

    // Find siblings that are unassigned
    const siblings = roles.filter(
      (r) =>
        r.title === role.title &&
        r.category === role.category &&
        !r.assigned_profile_id && // Only consider unassigned ones
        r.id !== role.id, // Don't include current one in count for clarity
    );

    if (siblings.length > 0) {
      Alert.alert(
        "Assignation groupée",
        `Il y a ${siblings.length} autres rôles identiques non assignés. Voulez-vous assigner ${profile.full_name || profile.username} à tous ?`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Celui-ci uniquement",
            onPress: () => executeAssign([assigningRoleId], profile),
          },
          {
            text: `Tous les disponibles (${siblings.length + 1})`,
            onPress: () =>
              executeAssign(
                [assigningRoleId, ...siblings.map((s) => s.id)],
                profile,
              ),
          },
        ],
      );
    } else {
      executeAssign([assigningRoleId], profile);
    }
  }

  async function executeAssign(ids: string[], profile: any) {
    try {
      const { error } = await supabase
        .from("project_roles")
        // Update status to assigned as per requirement
        .update({ assigned_profile_id: profile.id, status: "assigned" })
        .in("id", ids);

      if (error) throw error;

      // Optimistic update
      setRoles((prev) => {
        const updated = prev.map((r) =>
          ids.includes(r.id)
            ? {
                ...r,
                assigned_profile_id: profile.id,
                status: "assigned",
                assigned_profile: {
                  full_name: profile.full_name,
                  username: profile.username,
                  ville: profile.ville,
                },
              }
            : r,
        );
        // Re-sort: unassigned first (published/draft), assigned last
        return updated.sort((a, b) => {
          const aAssigned = a.status === "assigned";
          const bAssigned = b.status === "assigned";
          if (aAssigned !== bAssigned) return aAssigned ? 1 : -1;
          return 0;
        });
      });
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
        .update({ assigned_profile_id: null, status: "published" })
        .eq("id", roleId);
      if (error) throw error;

      setRoles((prev) => {
        const updated = prev.map((r) =>
          r.id === roleId
            ? {
                ...r,
                assigned_profile_id: null,
                assigned_profile: undefined,
                status: "published",
              }
            : r,
        );
        // Resort: unassigned first
        return updated.sort((a, b) => {
          const aAssigned = a.status === "assigned";
          const bAssigned = b.status === "assigned";
          if (aAssigned !== bAssigned) return aAssigned ? 1 : -1;
          return 0;
        });
      });
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
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => openEditRole(item)}
      >
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
              {item.category.toUpperCase()}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 15 }}>
            <Ionicons name="create-outline" size={20} color="#666" />
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation && e.stopPropagation();
                deleteRole(item.id);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ff4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {/* PUBLISH STATUS TEXT */}
          <Text style={{ fontSize: 12, color: "#666" }}>
            {isDraft ? "Non publié" : "Publié"}
          </Text>

          {/* ASSIGNMENT */}
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            {assigneeName ? (
              <View style={styles.assignedContainer}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.assignedText}> {assigneeName}</Text>
              </View>
            ) : (
              <Text style={{ fontSize: 12, color: "#999" }}>Non pourvu</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 5 }}
          >
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <View>
            <Text style={styles.screenTitle}>Gestion des rôles</Text>
            <Text style={styles.subtitle}>{projectTitle}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={openAddRole} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="white" />
          <Text style={{ color: "white", fontWeight: "bold" }}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#841584" />
      ) : (
        <SectionList
          sections={[
            {
              title: "Postes à pourvoir",
              data: roles.filter((r) => r.status !== "assigned"),
            },
            {
              title: "Postes pourvus",
              data: roles.filter((r) => r.status === "assigned"),
            },
          ]}
          keyExtractor={(r) => r.id}
          renderItem={renderRoleItem}
          renderSectionHeader={({ section: { title, data } }) =>
            data.length > 0 ? (
              <View style={styles.listSectionHeader}>
                <Text style={styles.listSectionTitle}>
                  {title} ({data.length})
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={{ padding: 15, paddingBottom: 50 }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 40, color: "#666" }}>
              Aucun rôle trouvé.
            </Text>
          }
        />
      )}

      {/* EDIT ROLE MODAL */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "white",
            padding: 20,
            paddingTop: 60,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: "bold" }}>
              {editingRole?.id ? "Modifier le rôle" : "Ajouter un rôle"}
            </Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={{ fontSize: 16, color: "#007AFF" }}>Fermer</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {editingRole && !isSearchingProfileInEdit && (
              <>
                <Text style={styles.label}>Catégorie</Text>
                <View style={styles.rowWrap}>
                  {ROLE_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() =>
                        setEditingRole({ ...editingRole, category: cat })
                      }
                      style={[
                        styles.catChip,
                        editingRole.category === cat && styles.catChipSelected,
                      ]}
                    >
                      <Text
                        style={{
                          color:
                            editingRole.category === cat ? "white" : "#333",
                        }}
                      >
                        {cat.charAt(0).toUpperCase() +
                          cat.slice(1).replace("_", " ")}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Intitulé du poste</Text>
                <View style={styles.rowWrap}>
                  {(JOB_TITLES[editingRole.category] || [])
                    .slice(0, 8)
                    .map((job) => (
                      <TouchableOpacity
                        key={job}
                        onPress={() =>
                          setEditingRole({ ...editingRole, title: job })
                        }
                        style={[
                          styles.jobChip,
                          editingRole.title === job && styles.jobChipSelected,
                        ]}
                      >
                        <Text
                          style={{
                            color: editingRole.title === job ? "white" : "#333",
                          }}
                        >
                          {job}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
                <TextInput
                  placeholder="Ou un autre titre..."
                  style={styles.input}
                  value={editingRole.title}
                  onChangeText={(t) =>
                    setEditingRole({ ...editingRole, title: t })
                  }
                />

                <View style={{ flexDirection: "row", gap: 10 }}>
                  {!editingRole.id && (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Quantité</Text>
                      <TextInput
                        keyboardType="numeric"
                        style={styles.input}
                        value={editingRole.quantity}
                        onChangeText={(t) =>
                          setEditingRole({ ...editingRole, quantity: t })
                        }
                      />
                    </View>
                  )}
                  <View style={{ flex: 2 }}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                      placeholder="Précisions (optionnel)"
                      style={styles.input}
                      value={editingRole.description}
                      onChangeText={(t) =>
                        setEditingRole({ ...editingRole, description: t })
                      }
                    />
                  </View>
                </View>

                {/* Experience */}
                <Text style={styles.label}>Expérience recherchée</Text>
                <View style={styles.rowWrap}>
                  {["debutant", "intermediaire", "confirme"].map((lvl) => (
                    <TouchableOpacity
                      key={lvl}
                      onPress={() =>
                        setEditingRole({ ...editingRole, experience: lvl })
                      }
                      style={[
                        styles.catChip,
                        editingRole.experience === lvl &&
                          styles.catChipSelected,
                      ]}
                    >
                      <Text
                        style={{
                          color:
                            editingRole.experience === lvl ? "white" : "#333",
                        }}
                      >
                        {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Gender */}
                <Text style={styles.label}>Sexe (optionnel)</Text>
                <View style={styles.rowWrap}>
                  {["homme", "femme", "autre"].map((g) => (
                    <TouchableOpacity
                      key={g}
                      onPress={() =>
                        setEditingRole({ ...editingRole, gender: g })
                      }
                      style={[
                        styles.catChip,
                        editingRole.gender === g && styles.catChipSelected,
                      ]}
                    >
                      <Text
                        style={{
                          color: editingRole.gender === g ? "white" : "#333",
                        }}
                      >
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Age range */}
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Âge min.</Text>
                    <TextInput
                      keyboardType="numeric"
                      style={styles.input}
                      value={editingRole.ageMin}
                      onChangeText={(t) =>
                        setEditingRole({ ...editingRole, ageMin: t })
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Âge max.</Text>
                    <TextInput
                      keyboardType="numeric"
                      style={styles.input}
                      value={editingRole.ageMax}
                      onChangeText={(t) =>
                        setEditingRole({ ...editingRole, ageMax: t })
                      }
                    />
                  </View>
                </View>

                <RoleFormFields
                  category={editingRole.category}
                  data={editingRole}
                  onChange={setEditingRole}
                />

                {/* STATUS TOGGLE */}
                <Text style={styles.label}>Statut de l'annonce</Text>
                {editingRole.assignee ? (
                  <Text
                    style={{
                      color: "#666",
                      fontStyle: "italic",
                      marginBottom: 10,
                    }}
                  >
                    Ce rôle est assigné. Le statut est verrouillé.
                  </Text>
                ) : (
                  <View style={styles.rowWrap}>
                    {["draft", "published"].map((st) => (
                      <TouchableOpacity
                        key={st}
                        onPress={() =>
                          setEditingRole({ ...editingRole, status: st })
                        }
                        style={[
                          styles.catChip,
                          editingRole.status === st && styles.catChipSelected, // eslint-disable-line
                        ]}
                      >
                        <Text
                          style={{
                            color: editingRole.status === st ? "white" : "#333",
                          }}
                        >
                          {st === "draft" ? "Brouillon" : "Publié"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* ASSIGNMENT */}

                {editingRole.assignee ? (
                  <View style={styles.assigneeRow}>
                    <Text style={{ fontWeight: "600" }}>
                      {editingRole.assignee.label}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setEditingRole({
                          ...editingRole,
                          assignee: null,
                          status: "published",
                        })
                      }
                    >
                      <Text style={{ color: "#ff4444", fontWeight: "bold" }}>
                        X
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setIsSearchingProfileInEdit(true);
                      searchProfilesForEdit("");
                    }}
                    style={styles.assignProfileBtn}
                  >
                    <Text style={{ color: "#841584", fontWeight: "600" }}>
                      Choisir un profil+
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={{
                    backgroundColor: "#841584",
                    padding: 15,
                    borderRadius: 8,
                    alignItems: "center",
                    marginTop: 20,
                    opacity: isSavingRole ? 0.7 : 1,
                  }}
                  onPress={saveRole}
                  disabled={isSavingRole}
                >
                  {isSavingRole ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "bold",
                        fontSize: 16,
                      }}
                    >
                      Enregistrer
                    </Text>
                  )}
                </TouchableOpacity>
                <View style={{ height: 50 }} />
              </>
            )}

            {editingRole && isSearchingProfileInEdit && (
              <View>
                <TouchableOpacity
                  onPress={() => setIsSearchingProfileInEdit(false)}
                  style={{ marginBottom: 15 }}
                >
                  <Text style={{ color: "#666" }}>← Retour au rôle</Text>
                </TouchableOpacity>
                <TextInput
                  placeholder="Rechercher (nom, pseudo, ville)..."
                  style={styles.input}
                  value={query}
                  onChangeText={searchProfilesForEdit}
                  autoFocus
                />
                {searching ? (
                  <ActivityIndicator
                    size="large"
                    color="#841584"
                    style={{ marginTop: 20 }}
                  />
                ) : (
                  <View style={{ marginTop: 10, paddingBottom: 40 }}>
                    {results.length === 0 ? (
                      <Text
                        style={{
                          textAlign: "center",
                          marginTop: 20,
                          color: "#666",
                        }}
                      >
                        {query.length > 0
                          ? "Aucun profil trouvé."
                          : "Aucun profil disponible."}
                      </Text>
                    ) : (
                      results.map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.userRow}
                          onPress={() => selectProfileInEdit(item)}
                        >
                          <View>
                            <Text style={{ fontWeight: "600", fontSize: 16 }}>
                              {item.full_name || item.username}
                            </Text>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              {item.role && (
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: "#841584",
                                    fontWeight: "600",
                                  }}
                                >
                                  {item.role.toUpperCase()}
                                </Text>
                              )}
                              {item.ville ? (
                                <Text style={{ fontSize: 12, color: "#666" }}>
                                  {item.role ? `• ${item.ville}` : item.ville}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                          <Ionicons
                            name="add-circle-outline"
                            size={24}
                            color="#841584"
                          />
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

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
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {item.role && (
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#841584",
                              fontWeight: "600",
                            }}
                          >
                            {item.role.toUpperCase()}
                          </Text>
                        )}
                        {item.ville ? (
                          <Text style={{ fontSize: 12, color: "#666" }}>
                            {item.role ? `• ${item.ville}` : item.ville}
                          </Text>
                        ) : null}
                      </View>
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
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#e0e0e0",
  },
  addBtn: {
    backgroundColor: "#841584",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
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
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 15,
    textAlign: "center",
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  catChipSelected: {
    backgroundColor: "#333",
    borderColor: "#333",
  },
  jobChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#eee",
  },
  jobChipSelected: {
    backgroundColor: "#666",
    borderColor: "#666",
  },
  assignProfileBtn: {
    backgroundColor: "#E1BEE7",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CE93D8",
    borderStyle: "dashed",
  },
  assigneeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F3E5F5",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E1BEE7",
  },
  listSectionHeader: {
    paddingVertical: 10,
    backgroundColor: "#f5f5f5", // match container bg to look like divider
    marginBottom: 5,
  },
  listSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
});
