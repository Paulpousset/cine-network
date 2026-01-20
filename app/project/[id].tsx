import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

// 1. LA "BIBLE" DES MÉTIERS DU CINÉMA
const JOB_TITLES: Record<string, string[]> = {
  realisateur: [
    "Réalisateur",
    "1er Ass. Réal.",
    "2ème Ass. Réal.",
    "Scripte",
    "Storyboarder",
  ],
  acteur: [
    "Rôle Principal",
    "Rôle Secondaire",
    "Silhouette",
    "Figurant",
    "Doublure",
    "Modèle",
  ],
  production: [
    "Directeur de Prod.",
    "Chargé de Prod.",
    "Régisseur Général",
    "Régisseur Adj.",
    "Runner/Chauffeur",
    "Cantine",
  ],
  image: [
    "Chef Opérateur",
    "Cadreur",
    "1er Ass. Caméra",
    "2ème Ass. Caméra",
    "Steadicamer",
    "Chef Élec. (Gaffer)",
    "Électricien",
    "Chef Machino",
    "Machiniste",
  ],
  son: ["Ingénieur du Son", "Perchman", "Mixeur Plateau"],
  hmc: [
    "Chef Costumier",
    "Habilleur",
    "Chef Maquilleur",
    "Coiffeur",
    "Maquilleur FX",
  ],
  deco: [
    "Chef Décorateur",
    "Accessoiriste",
    "Rippeur",
    "Constructeur",
    "Peintre",
  ],
  post_prod: [
    "Monteur Image",
    "Monteur Son",
    "Étalonneur",
    "VFX Artist",
    "Compositeur",
    "Mixeur",
  ],
  technicien: ["Autre Technicien"], // Categorie fourre-tout au cas où
};

const ROLE_CATEGORIES = Object.keys(JOB_TITLES);

// Petites couleurs pour égayer l'interface selon la catégorie
const CATEGORY_COLORS: Record<string, string> = {
  realisateur: "#E91E63", // Rose
  acteur: "#9C27B0", // Violet
  image: "#2196F3", // Bleu
  son: "#FF9800", // Orange
  production: "#4CAF50", // Vert
  hmc: "#E91E63", // Rose foncé
  deco: "#795548", // Marron
  post_prod: "#607D8B", // Gris bleu
  technicien: "#607D8B",
};

export default function ProjectDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [project, setProject] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Modal State for Add Role
  const [modalVisible, setModalVisible] = useState(false);
  const [roleCategory, setRoleCategory] = useState("acteur");
  const [roleTitle, setRoleTitle] = useState("");
  const [roleQty, setRoleQty] = useState("1");
  const [roleDesc, setRoleDesc] = useState("");

  // Modal State for Manage SINGLE Role (Owner only)
  const [manageRole, setManageRole] = useState<any>(null); // The role object being edited
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  async function fetchProjectDetails() {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id ?? null);
      const { data: proj, error: errProj } = await supabase
        .from("tournages")
        .select("*")
        .eq("id", id)
        .single();
      if (errProj) throw errProj;
      setProject(proj);

      await fetchRoles();
    } catch (error) {
      Alert.alert("Erreur", (error as Error).message);
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function fetchRoles() {
    // We assume fetchProjectDetails handles loading
    const { data: rolesData, error: errRoles } = await supabase
      .from("project_roles")
      .select("*")
      .eq("tournage_id", id)
      .order("created_at", { ascending: true });

    if (errRoles) throw errRoles;

    let items = rolesData || [];
    // Manually fetch assignees
    const userIds = items
      .map((r: any) => r.assigned_profile_id)
      .filter((uid: any) => uid !== null) as string[];

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .in("id", userIds);

      const profileMap = new Map();
      profiles?.forEach((p) => profileMap.set(p.id, p));

      items = items.map((r: any) => {
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
  }

  async function addRole() {
    if (!roleTitle)
      return Alert.alert("Erreur", "Le titre du poste est requis");

    try {
      setLoading(true);
      const qty = parseInt(roleQty) || 1;
      const rows = [];

      for (let i = 0; i < qty; i++) {
        rows.push({
          tournage_id: id,
          category: roleCategory,
          title: roleTitle,
          description: roleDesc,
          status: "draft", // Default to draft as requested
          quantity_needed: 1,
        });
      }

      const { error } = await supabase.from("project_roles").insert(rows);
      if (error) throw error;

      setModalVisible(false);
      setRoleTitle("");
      setRoleDesc("");
      setRoleQty("1");
      await fetchRoles();
    } catch (error) {
      Alert.alert("Erreur", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRole(roleId: string) {
    Alert.alert("Supprimer", "Voulez-vous supprimer ce rôle ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("project_roles")
            .delete()
            .eq("id", roleId);
          if (!error) {
            setRoles((prev) => prev.filter((r) => r.id !== roleId));
            if (manageRole && (manageRole as any).key) {
              const updatedItems = (manageRole as any).items.filter(
                (r: any) => r.id !== roleId,
              );
              const newTotal = updatedItems.reduce(
                (acc: number, r: any) => acc + (r.quantity_needed || 1),
                0,
              );
              if (updatedItems.length === 0) setManageRole(null);
              else
                setManageRole({
                  ...manageRole,
                  items: updatedItems,
                  totalQty: newTotal,
                });
            } else {
              setManageRole(null);
            }
          }
        },
      },
    ]);
  }

  // --- Manage Role Logic ---

  async function togglePublishRole(role: any) {
    // Handle potential null/undefined status by defaulting to 'draft'
    const currentStatus = role.status || "draft";
    const newStatus = currentStatus === "draft" ? "published" : "draft";

    try {
      const { data, error } = await supabase
        .from("project_roles")
        .update({ status: newStatus })
        .eq("id", role.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        // Did not update any row -> likely RLS returned empty set for the update condition
        throw new Error(
          "Impossible de modifier ce rôle. Vérifiez vos droits ou les politiques RLS.",
        );
      }

      // Update local state
      const updated = { ...role, status: newStatus };

      // Update list view
      setRoles((prev) => prev.map((r) => (r.id === role.id ? updated : r)));

      // Update modal view if group
      if (manageRole && (manageRole as any).key) {
        setManageRole((prev: any) => ({
          ...prev,
          items: prev.items.map((r: any) => (r.id === role.id ? updated : r)),
        }));
      } else {
        setManageRole(updated);
      }
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    }
  }

  async function searchProfiles(term: string) {
    setSearchQuery(term);
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      setSearching(true);
      // Attempt search on username OR full_name safely
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username")
        .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
        .limit(20);

      if (error) {
        console.warn("Search error:", error);
        throw error;
      }
      setSearchResults(data || []);
    } catch (e) {
      console.warn("Search exception:", e);
    } finally {
      setSearching(false);
    }
  }

  async function assignUserToRole(user: any) {
    if (!manageRole) return;
    try {
      const { data, error } = await supabase
        .from("project_roles")
        .update({ assigned_profile_id: user.id })
        .eq("id", manageRole.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          "Impossible d'assigner ce membre. Vérifiez vos droits ou les politiques RLS.",
        );
      }

      const updated = {
        ...manageRole,
        assigned_profile_id: user.id,
        assigned_profile: user,
      };
      setRoles((prev) =>
        prev.map((r) => (r.id === manageRole.id ? updated : r)),
      );
      setManageRole(null); // Close modal on success
      setSearchQuery("");
      setSearchResults([]);
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    }
  }

  async function removeAssignment(role: any) {
    if (!role) return;
    try {
      const { data, error } = await supabase
        .from("project_roles")
        .update({ assigned_profile_id: null })
        .eq("id", role.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          "Impossible de retirer l'assignation. Vérifiez vos droits ou les politiques RLS.",
        );
      }

      const updated = {
        ...role,
        assigned_profile_id: null,
        assigned_profile: null,
      };
      setRoles((prev) => prev.map((r) => (r.id === role.id ? updated : r)));

      if (manageRole && (manageRole as any).key) {
        setManageRole((prev: any) => ({
          ...prev,
          items: prev.items.map((r: any) => (r.id === role.id ? updated : r)),
        }));
      } else {
        setManageRole(updated);
      }
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    }
  }

  const isOwner =
    project?.owner_id && currentUserId && project.owner_id === currentUserId;

  const visibleRoles = roles.filter((r) => isOwner || r.status !== "draft");

  // GROUP ROLES BY (Category + Title)
  const groupedRoles = React.useMemo(() => {
    const groups: Record<string, any> = {};
    visibleRoles.forEach((r) => {
      const key = `${r.category}|${r.title}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          category: r.category,
          title: r.title,
          description: r.description,
          totalQty: 0,
          items: [],
        };
      }
      // If legacy row has qty > 1, add it to total
      groups[key].totalQty += r.quantity_needed || 1;
      groups[key].items.push(r);
    });
    return Object.values(groups);
  }, [visibleRoles]);

  if (loading)
    return <ActivityIndicator style={{ marginTop: 50 }} color="#841584" />;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginBottom: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.title}>{project?.title}</Text>
        <Text style={styles.subtitle}>
          {project?.type} • {project?.ville || "Lieu non défini"}
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>
            Casting & Équipe ({roles.length})
          </Text>
        </View>

        {isOwner ? (
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={{
              backgroundColor: "#841584",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 12 }}>
              + Ajouter
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* LISTE DES RÔLES DÉJÀ CRÉÉS */}
      <FlatList
        data={groupedRoles}
        keyExtractor={(item: any) => item.key}
        contentContainerStyle={{ padding: 15 }}
        renderItem={({ item }) => {
          const color = CATEGORY_COLORS[item.category] || "#666";
          const assignedCount = item.items.filter(
            (r: any) => r.assigned_profile_id,
          ).length;
          const totalQty = item.totalQty;
          const hasDrafts = item.items.some((r: any) => r.status === "draft");

          // Wrapper: TouchableOpacity only if owner
          const CardWrapper = isOwner ? TouchableOpacity : View;

          return (
            <CardWrapper
              style={styles.roleCard}
              onPress={() => isOwner && setManageRole(item)}
            >
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <Text
                    style={[
                      styles.roleCategoryTag,
                      { color: color, backgroundColor: color + "20" },
                    ]}
                  >
                    {item.category.toUpperCase()}
                  </Text>
                  <Text style={styles.roleTitle}>{item.title}</Text>
                </View>

                {isOwner && hasDrafts && (
                  <Text
                    style={{
                      marginTop: 2,
                      fontSize: 10,
                      color: "#FF9800",
                      fontWeight: "bold",
                    }}
                  >
                    ⚠ Contient des brouillons
                  </Text>
                )}

                <Text style={{ color: "#666", marginTop: 4 }}>
                  {totalQty} poste{totalQty > 1 ? "s" : ""} • {assignedCount}/
                  {totalQty} pourvu{assignedCount > 1 ? "s" : ""}
                </Text>
                {item.description ? (
                  <Text style={styles.descText} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              {isOwner && (
                <Ionicons name="create-outline" size={24} color="#841584" />
              )}
            </CardWrapper>
          );
        }}
      />

      {/* MODAL MANAGE GROUP OF ROLES */}
      <Modal
        visible={!!manageRole && (manageRole as any).key !== undefined}
        animationType="slide"
        transparent
        onRequestClose={() => setManageRole(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "90%" }]}>
            {manageRole && (manageRole as any).key !== undefined && (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 15,
                  }}
                >
                  <Text
                    style={[
                      styles.modalTitle,
                      { margin: 0, fontSize: 18, flex: 1 },
                    ]}
                  >
                    {manageRole.title} ({manageRole.totalQty})
                  </Text>
                  <TouchableOpacity onPress={() => setManageRole(null)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: "#666", marginBottom: 15 }}>
                  {manageRole.description}
                </Text>

                <ScrollView>
                  {manageRole.items.map((roleItem: any, index: number) => {
                    const isDraft = roleItem.status === "draft";
                    const assignedUser = roleItem.assigned_profile;

                    return (
                      <View
                        key={roleItem.id}
                        style={{
                          borderWidth: 1,
                          borderColor: "#eee",
                          borderRadius: 8,
                          padding: 10,
                          marginBottom: 10,
                          backgroundColor: "#f9f9f9",
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            marginBottom: 8,
                          }}
                        >
                          <Text
                            style={{ fontWeight: "bold", color: "#841584" }}
                          >
                            Poste #{index + 1}
                          </Text>

                          {/* Single Delete */}
                          <TouchableOpacity
                            onPress={() => deleteRole(roleItem.id)}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={16}
                              color="red"
                            />
                          </TouchableOpacity>
                        </View>

                        {/* Publish Toggle */}
                        <TouchableOpacity
                          onPress={() => togglePublishRole(roleItem)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 10,
                            backgroundColor: isDraft ? "#fff3e0" : "#e8f5e9",
                            padding: 6,
                            borderRadius: 4,
                            alignSelf: "flex-start",
                          }}
                        >
                          <Ionicons
                            name={isDraft ? "eye-off-outline" : "eye-outline"}
                            size={16}
                            color={isDraft ? "orange" : "green"}
                          />
                          <Text
                            style={{
                              marginLeft: 6,
                              fontSize: 12,
                              fontWeight: "600",
                              color: isDraft ? "orange" : "green",
                            }}
                          >
                            {isDraft
                              ? "Brouillon (Non visible)"
                              : "Publié (Visible)"}
                          </Text>
                        </TouchableOpacity>

                        {/* Assignment */}
                        <View>
                          {assignedUser ? (
                            <View style={styles.assignedCard}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: "bold" }}>
                                  {assignedUser.full_name ||
                                    assignedUser.username}
                                </Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => removeAssignment(roleItem)}
                              >
                                <Ionicons
                                  name="close-circle"
                                  size={20}
                                  color="red"
                                />
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <View>
                              <TextInput
                                placeholder="Assigner : taper un nom..."
                                style={[
                                  styles.input,
                                  { height: 40, fontSize: 12, marginBottom: 5 },
                                ]}
                                editable={false}
                              />
                              <TouchableOpacity
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                                onPress={() => {
                                  setManageRole(roleItem); // Switch to single
                                }}
                              >
                                <Text style={{ color: "#666", fontSize: 12 }}>
                                  🔍 Taper pour chercher...
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL MANAGE SINGLE ROLE (For Searching/Assigning specifically) */}
      <Modal
        visible={!!manageRole && (manageRole as any).key === undefined}
        animationType="slide"
        transparent
        onRequestClose={() => setManageRole(null)}
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
              <TouchableOpacity onPress={() => setManageRole(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {manageRole && (
              <>
                <Text style={{ fontWeight: "bold", marginBottom: 10 }}>
                  {manageRole.title} ({manageRole.category})
                </Text>
                <TextInput
                  placeholder="Rechercher un membre (nom...)"
                  style={styles.input}
                  value={searchQuery}
                  onChangeText={searchProfiles}
                  autoFocus
                />
                {searching && <ActivityIndicator />}

                {searchResults.length > 0 && (
                  <View style={{ maxHeight: 200 }}>
                    <ScrollView>
                      {searchResults.map((u) => (
                        <TouchableOpacity
                          key={u.id}
                          style={{
                            padding: 10,
                            borderBottomWidth: 1,
                            borderColor: "#eee",
                            flexDirection: "row",
                            justifyContent: "space-between",
                          }}
                          onPress={() => assignUserToRole(u)}
                        >
                          <Text style={{ fontWeight: "600" }}>
                            {u.full_name || u.username}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL AJOUT */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ajouter un besoin</Text>

            {/* 1. Catégories (Scroll Horizontal) */}
            <Text style={styles.label}>Famille de métier :</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 15 }}
            >
              {ROLE_CATEGORIES.map((cat) => {
                const isSelected = roleCategory === cat;
                const color = CATEGORY_COLORS[cat] || "#841584";
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => {
                      setRoleCategory(cat);
                      setRoleTitle("");
                    }}
                    style={[
                      styles.catButton,
                      {
                        borderColor: color,
                        backgroundColor: isSelected ? color : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: isSelected ? "white" : color,
                        fontWeight: "600",
                      }}
                    >
                      {cat.charAt(0).toUpperCase() +
                        cat.slice(1).replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 2. Suggestions de métiers (Chips) */}
            <Text style={styles.label}>Poste précis :</Text>
            <View style={styles.suggestionsContainer}>
              {JOB_TITLES[roleCategory].map((job) => (
                <TouchableOpacity
                  key={job}
                  style={[
                    styles.jobChip,
                    roleTitle === job && styles.jobChipSelected,
                  ]}
                  onPress={() => setRoleTitle(job)}
                >
                  <Text
                    style={{
                      color: roleTitle === job ? "white" : "#333",
                      fontSize: 12,
                    }}
                  >
                    {job}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              placeholder="Ou tapez un autre titre..."
              style={styles.input}
              value={roleTitle}
              onChangeText={setRoleTitle}
            />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Quantité</Text>
                <TextInput
                  keyboardType="numeric"
                  style={styles.input}
                  value={roleQty}
                  onChangeText={setRoleQty}
                />
              </View>
              <View style={{ flex: 3 }}>
                <Text style={styles.label}>Détails (optionnel)</Text>
                <TextInput
                  placeholder="ex: Expérience requise..."
                  style={styles.input}
                  value={roleDesc}
                  onChangeText={setRoleDesc}
                />
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 10,
              }}
            >
              <Button
                title="Annuler"
                color="#999"
                onPress={() => setModalVisible(false)}
              />
              <Button title="Ajouter" color="#841584" onPress={addRole} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  title: { fontSize: 24, fontWeight: "bold" },
  subtitle: { color: "#666", marginTop: 5 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold" },

  roleCard: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  roleCategoryTag: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    fontWeight: "bold",
    overflow: "hidden",
    marginRight: 5,
  },
  roleTitle: { fontWeight: "600", fontSize: 16 },
  descText: { fontSize: 12, color: "#999", marginTop: 2, fontStyle: "italic" },

  assignedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#fafafa",
  },
  label: { marginBottom: 8, fontWeight: "600", fontSize: 13, color: "#666" },

  catButton: {
    padding: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 20,
    marginRight: 8,
  },
  suggestionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 15,
  },
  jobChip: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  jobChipSelected: { backgroundColor: "#333" },
});
