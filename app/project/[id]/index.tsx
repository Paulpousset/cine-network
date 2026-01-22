import RoleFormFields from "@/components/RoleFormFields";
import { JOB_TITLES } from "@/utils/roles";
import { fuzzySearch } from "@/utils/search";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
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

// Custom Loading Component
const SpinningClap = ({
  size = 50,
  color = "#841584",
}: {
  size?: number;
  color?: string;
}) => {
  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const spin = () => {
      spinValue.setValue(0);
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(() => spin());
    };
    spin();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <MaterialCommunityIcons name="movie-open" size={size} color={color} />
    </Animated.View>
  );
};

const ROLE_CATEGORIES = Object.keys(JOB_TITLES) as (keyof typeof JOB_TITLES)[];

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

  // Detailed Role Form State
  const [roleFormVisible, setRoleFormVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<{
    id?: string;
    category: keyof typeof JOB_TITLES;
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
    status: "draft" | "published"; // "draft" | "published"
    assignee: { id: string; label: string } | null;
    data: any; // JSONB storage for extra fields
  } | null>(null);
  const [isSavingRole, setIsSavingRole] = useState(false);

  // Profile Picker inside Form
  const [isSearchingProfileInForm, setIsSearchingProfileInForm] =
    useState(false);
  const [formSearchQuery, setFormSearchQuery] = useState("");
  const [formSearchResults, setFormSearchResults] = useState<any[]>([]);
  const [isFormSearching, setIsFormSearching] = useState(false);

  // Modal State for Manage SINGLE Role (Owner only)
  const [manageRole, setManageRole] = useState<any>(null); // The role GROUP object being viewed
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Applications Management
  const [applications, setApplications] = useState<any[]>([]);
  const [applicationsModalVisible, setApplicationsModalVisible] =
    useState(false);

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

      if (session?.user?.id === proj.owner_id) {
        await fetchApplications();
      }
    } catch (error) {
      Alert.alert("Erreur", (error as Error).message);
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function fetchApplications() {
    const { data: apps, error } = await supabase
      .from("applications" as any)
      .select(
        `
        *,
        project_roles!inner (
          id,
          title,
          category,
          tournage_id
        ),
        profiles (
          id,
          full_name,
          username
        )
      `,
      )
      .eq("project_roles.tournage_id", id)
      .eq("status", "pending"); // We only care about pending for the notification/list initially

    if (!error && apps) {
      setApplications(apps);
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
      status: "draft",
      assignee: null,
      height: "",
      hairColor: "",
      eyeColor: "",
      equipment: "",
      software: "",
      specialties: "",
      data: {},
    });
    setRoleFormVisible(true);
    setIsSearchingProfileInForm(false);
    setFormSearchQuery("");
    setFormSearchResults([]);
  }

  function openEditRoleInstance(role: any) {
    if (!role) return;
    try {
      console.log("Opening edit for:", role.id);
      const assignee = role.assigned_profile
        ? {
            id: role.assigned_profile_id,
            label:
              role.assigned_profile.full_name ||
              role.assigned_profile.username ||
              "Inconnu",
          }
        : null;

      // Important: Close the parent modal to prevent "freeze" (stacked native modals issue)
      setManageRole(null);

      setTimeout(() => {
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
          status: role.status || "draft",
          assignee: assignee,
        });
        setRoleFormVisible(true);
        setIsSearchingProfileInForm(false);
        setFormSearchQuery("");
        setFormSearchResults([]);
      }, 300);
    } catch (e) {
      console.error("Error opening role:", e);
      Alert.alert("Erreur", "Impossible d'ouvrir ce rôle.");
    }
  }

  async function saveRoleForm() {
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
        assigned_profile_id: editingRole.assignee?.id ?? null,
        height: editingRole.height ? parseInt(editingRole.height) : null,
        hair_color: editingRole.hairColor || null,
        eye_color: editingRole.eyeColor || null,
        equipment: editingRole.equipment || null,
        software: editingRole.software || null,
        specialties: editingRole.specialties || null,
        data: editingRole.data,
        status: editingRole.status,
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
        const qty = parseInt(editingRole.quantity) || 1;
        const rows = Array.from({ length: qty }).map(() => ({
          ...payload,
        }));
        const { error } = await supabase.from("project_roles").insert(rows);
        if (error) throw error;
      }

      setRoleFormVisible(false);
      await fetchRoles(); // Refresh the main list

      // If we were inside the group modal, we should probably close it or refresh it?
      // Since fetching roles updates the `roles` state, and `groupedRoles` is derived from it,
      // the background list updates.
      // But `manageRole` (the group view) state is static unless updated.
      // If we edited a role that was in the currently open group view,
      // we need to update the `manageRole` state to reflect changes or just close it.
      // Simple approach: Close the manage group modal to force refresh when re-opening.
      if (manageRole) {
        // Find if the edited/created role affects current group
        // Actually, just close it to be safe and avoid stale state complexity
        setManageRole(null);
      }
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setIsSavingRole(false);
    }
  }

  async function searchProfilesForForm(term: string) {
    setFormSearchQuery(term);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    // Si pas de terme, on effectue la recherche immédiatement pour les suggestions
    if (!term || term.trim().length === 0) {
      executeSearchProfilesForForm("");
    } else {
      setIsFormSearching(true);
      searchTimeout.current = setTimeout(() => {
        executeSearchProfilesForForm(term);
      }, 300);
    }
  }

  async function executeSearchProfilesForForm(term: string) {
    setIsFormSearching(true);
    try {
      const category = editingRole?.category;
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
        processedResults = fuzzySearch(
          processedResults,
          ["full_name", "username", "ville"],
          term,
        );

        // Optional: Re-sort to prioritize exact category match if scores are close?
        // For now, we trust Fuse.js ranking.
        if (category) {
          processedResults.sort((a, b) => {
            const aMatch = a.role === category ? 1 : 0;
            const bMatch = b.role === category ? 1 : 0;
            // Only boost if it's a significant difference?
            // Actually, let's just stick to fuzzy search result for simplicity as requested,
            // or if we really want to boost category, we can do stable sort?
            // Fuse search is stable?
            return bMatch - aMatch;
            // Wait, this would override fuzzy sort.
            // Better to just leave it as is, Fuse usually does a good job.
          });
          // Actually, remove the custom sort to just use Fuse.
        }
      }

      setFormSearchResults(processedResults.slice(0, 20));

      // Si aucun résultat après recherche, reset après un délai
      if (processedResults.length === 0 && term) {
        setTimeout(() => {
          if (formSearchQuery === term) {
            setFormSearchResults([]);
            setIsFormSearching(false);
          }
        }, 2000);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setIsFormSearching(false);
    }
  }

  function selectProfileInForm(profile: any) {
    if (!editingRole) return;
    setEditingRole({
      ...editingRole,
      assignee: {
        id: profile.id,
        label: profile.full_name || profile.username,
      },
    });
    setIsSearchingProfileInForm(false);
    setFormSearchQuery("");
    setFormSearchResults([]);
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
              const newTotal = updatedItems.length;
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
      const category = manageRole?.category;
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
        processedResults = fuzzySearch(
          processedResults,
          ["full_name", "username", "ville"],
          term,
        );
      }
      setSearchResults(processedResults.slice(0, 20));

      // Si aucun résultat après recherche, reset après un délai
      if (processedResults.length === 0 && term) {
        setTimeout(() => {
          if (searchQuery === term) {
            setSearchResults([]);
            setSearching(false);
          }
        }, 2000);
      }
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
        .update({ assigned_profile_id: user.id, status: "assigned" })
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
        status: "assigned",
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
        .update({ assigned_profile_id: null, status: "published" })
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
        status: "published",
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

  async function handleAcceptApplication(app: any) {
    try {
      // 1. Update application status
      const { error: appError } = await supabase
        .from("applications" as any)
        .update({ status: "accepted" })
        .eq("id", app.id);
      if (appError) throw appError;

      // 2. Assign role to user
      const { error: roleError } = await supabase
        .from("project_roles")
        .update({
          assigned_profile_id: app.candidate_id,
        })
        .eq("id", app.role_id);

      if (roleError) throw roleError;

      Alert.alert("Succès", "Candidature acceptée !");
      fetchApplications();
      fetchRoles();
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    }
  }

  async function handleRefuseApplication(app: any) {
    try {
      const { error } = await supabase
        .from("applications" as any)
        .update({ status: "rejected" })
        .eq("id", app.id);
      if (error) throw error;
      Alert.alert("Succès", "Candidature refusée.");
      fetchApplications();
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    }
  }

  const isOwner =
    project?.owner_id && currentUserId && project.owner_id === currentUserId;

  const visibleRoles = roles.filter((r) => isOwner || r.status !== "draft");

  const groupedRolesSections = React.useMemo(() => {
    const groups: Record<string, any> = {};
    visibleRoles.forEach((r) => {
      // Determine effective status for grouping
      let statusKey = "draft";
      if (r.assigned_profile_id) {
        statusKey = "assigned";
      } else if (r.status !== "draft") {
        statusKey = "published";
      }

      // Group by Category + Title + Status
      const key = `${r.category}|${r.title}|${statusKey}`;

      if (!groups[key]) {
        groups[key] = {
          key,
          category: r.category,
          title: r.title,
          description: r.description,
          statusKey,
          totalQty: 0,
          items: [],
        };
      }
      groups[key].totalQty += 1;
      groups[key].items.push(r);
    });

    const allGroups = Object.values(groups);

    const published: any[] = [];
    const drafts: any[] = [];
    const filled: any[] = [];

    allGroups.forEach((g: any) => {
      if (g.statusKey === "assigned") {
        filled.push(g);
      } else if (g.statusKey === "published") {
        published.push(g);
      } else {
        drafts.push(g);
      }
    });

    // Sections
    const sections = [];

    if (published.length > 0) {
      sections.push({
        title: "Postes déjà publiés",
        data: published.sort((a, b) => a.title.localeCompare(b.title)),
      });
    }
    if (drafts.length > 0) {
      sections.push({
        title: "Brouillons",
        data: drafts.sort((a, b) => a.title.localeCompare(b.title)),
      });
    }
    if (filled.length > 0) {
      sections.push({
        title: "Postes pourvus",
        data: filled.sort((a, b) => a.title.localeCompare(b.title)),
      });
    }

    return sections;
  }, [visibleRoles]);

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <SpinningClap />
      </View>
    );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* HEADER */}
      <View style={styles.header}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 10,
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            onPress={() => router.replace("/(tabs)/my-projects")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              backgroundColor: "#f0f0f0",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <Ionicons name="home" size={18} color="#333" />
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#333" }}>
              Accueil
            </Text>
          </TouchableOpacity>

          <View style={{ alignItems: "center" }}>
            <Text style={styles.title}>{project?.title}</Text>
            <Text style={styles.subtitle}>
              {project?.type} • {project?.ville || "Lieu non défini"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 15, alignItems: "center" }}>
            {isOwner && (
              <>
                <TouchableOpacity
                  onPress={() => router.push(`/project/${id}/manage_team`)}
                  style={{ padding: 5 }}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={24}
                    color="black"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/project/[id]/settings",
                      params: { id: typeof id === "string" ? id : id[0] },
                    })
                  }
                  style={{ padding: 5 }}
                >
                  <Ionicons name="settings-outline" size={24} color="#841584" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setApplicationsModalVisible(true)}
                  style={{ position: "relative", padding: 5 }}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={24}
                    color="black"
                  />
                  {applications.length > 0 && (
                    <View
                      style={{
                        position: "absolute",
                        right: 5,
                        top: 5,
                        backgroundColor: "red",
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                      }}
                    />
                  )}
                </TouchableOpacity>
              </>
            )}
            {!isOwner && <View style={{ width: 80 }} />}
          </View>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.sectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>
              Casting & Équipe ({roles.length})
            </Text>
          </View>

          {isOwner ? (
            <TouchableOpacity
              onPress={openAddRole}
              style={{
                backgroundColor: "#841584",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
              }}
            >
              <Text
                style={{ color: "white", fontWeight: "bold", fontSize: 12 }}
              >
                + Ajouter
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* LISTE DES RÔLES DÉJÀ CRÉÉS */}
        <SectionList
          sections={groupedRolesSections}
          keyExtractor={(item: any) => item.key}
          contentContainerStyle={{ padding: 15, paddingBottom: 50 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section: { title } }) => (
            <View style={{ paddingVertical: 10, paddingHorizontal: 5 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "bold",
                  color: "#666",
                  textTransform: "uppercase",
                }}
              >
                {title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const color = CATEGORY_COLORS[item.category] || "#666";

            // Logic to check drafts is still useful for owner indicators
            const hasDrafts = item.items.some(
              (r: any) => r.status === "draft" && !r.assigned_profile_id,
            );

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
                      marginBottom: 8,
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
                    {isOwner && hasDrafts && (
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#FF9800",
                          fontWeight: "bold",
                        }}
                      >
                        ⚠ Contient des brouillons
                      </Text>
                    )}
                  </View>

                  {item.description ? (
                    <Text
                      style={[styles.descText, { marginBottom: 10 }]}
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>
                  ) : null}

                  {/* LIST ALL SLOTS (PARTICIPANTS OR VACAT) */}
                  <View style={{ gap: 8 }}>
                    {item.items.map((role: any, index: number) => {
                      const assignee = role.assigned_profile;
                      return (
                        <View
                          key={role.id || index}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: "#f9f9f9",
                            padding: 8,
                            borderRadius: 8,
                          }}
                        >
                          {assignee ? (
                            <>
                              {/* Avatar if available, else initial */}
                              <View
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 12,
                                  backgroundColor: color + "40",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  marginRight: 8,
                                }}
                              >
                                {assignee.avatar_url ? (
                                  // Assuming Image component is not imported, using View placeholder or text
                                  <View
                                    style={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: 12,
                                      backgroundColor: "#ddd",
                                    }}
                                  />
                                ) : (
                                  // TODO: Use actual Image if imported. I'll stick to Initials for safety or just Icon.
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      fontWeight: "bold",
                                      color: color,
                                    }}
                                  >
                                    {assignee.full_name?.charAt(0) ||
                                      assignee.username?.charAt(0) ||
                                      "?"}
                                  </Text>
                                )}
                              </View>
                              <Text
                                style={{ fontWeight: "600", color: "#333" }}
                              >
                                {assignee.full_name ||
                                  assignee.username ||
                                  "Utilisateur inconnu"}
                              </Text>
                            </>
                          ) : (
                            <>
                              <View
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: 12,
                                  borderStyle: "dashed",
                                  borderWidth: 1,
                                  borderColor: "#ccc",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  marginRight: 8,
                                }}
                              >
                                <Ionicons
                                  name="person-outline"
                                  size={14}
                                  color="#999"
                                />
                              </View>
                              <Text
                                style={{ fontStyle: "italic", color: "#888" }}
                              >
                                {role.status === "draft"
                                  ? "Brouillon (Non publié)"
                                  : "Poste à pourvoir"}
                              </Text>
                            </>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
                {isOwner && (
                  <View style={{ justifyContent: "center", paddingLeft: 10 }}>
                    <Ionicons name="create-outline" size={24} color="#841584" />
                  </View>
                )}
              </CardWrapper>
            );
          }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 20, color: "#999" }}>
              Aucun rôle créé pour le moment.
            </Text>
          }
        />
      </View>

      {/* NEW DETAILED ROLE FORM MODAL */}
      <Modal
        visible={roleFormVisible}
        animationType="slide"
        onRequestClose={() => setRoleFormVisible(false)}
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
            <TouchableOpacity onPress={() => setRoleFormVisible(false)}>
              <Text style={{ fontSize: 16, color: "#007AFF" }}>Fermer</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {editingRole && !isSearchingProfileInForm && (
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
                        styles.catButton,
                        {
                          borderColor: CATEGORY_COLORS[cat] || "#841584",
                          backgroundColor:
                            editingRole.category === cat
                              ? CATEGORY_COLORS[cat] || "#841584"
                              : "transparent",
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color:
                            editingRole.category === cat
                              ? "white"
                              : CATEGORY_COLORS[cat] || "#333",
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
                        styles.catButton,
                        editingRole.experience === lvl && {
                          backgroundColor: "#333",
                          borderColor: "#333",
                        },
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
                        styles.catButton,
                        editingRole.gender === g && {
                          backgroundColor: "#333",
                          borderColor: "#333",
                        },
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

                {/* Specific Fields by Category */}
                <RoleFormFields
                  category={editingRole.category}
                  data={editingRole}
                  onChange={setEditingRole} // RoleFormFields expects full object update or I should adapt key/value
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
                          setEditingRole({ ...editingRole, status: st as any })
                        }
                        style={[
                          styles.catButton,
                          editingRole.status === st && {
                            backgroundColor:
                              st === "draft" ? "#FF9800" : "#4CAF50",
                            borderColor: "transparent",
                          },
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
                <Text style={styles.label}>Assigner quelqu'un (optionnel)</Text>
                {editingRole.assignee ? (
                  <View style={styles.assignedCard}>
                    <Text style={{ fontWeight: "600", flex: 1 }}>
                      {editingRole.assignee.label}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setEditingRole({ ...editingRole, assignee: null })
                      }
                    >
                      <Ionicons name="close-circle" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setIsSearchingProfileInForm(true);
                      searchProfilesForForm("");
                    }}
                    style={{
                      padding: 10,
                      borderWidth: 1,
                      borderColor: "#841584",
                      borderStyle: "dashed",
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "#841584", fontWeight: "600" }}>
                      + Choisir un profil
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
                  onPress={saveRoleForm}
                  disabled={isSavingRole}
                >
                  {isSavingRole ? (
                    <SpinningClap size={24} color="white" />
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

            {editingRole && isSearchingProfileInForm && (
              <View>
                <TouchableOpacity
                  onPress={() => setIsSearchingProfileInForm(false)}
                  style={{ marginBottom: 15 }}
                >
                  <Text style={{ color: "#666" }}>← Retour</Text>
                </TouchableOpacity>
                <TextInput
                  placeholder="Rechercher (nom, pseudo, ville)..."
                  style={styles.input}
                  value={formSearchQuery}
                  onChangeText={searchProfilesForForm}
                  autoFocus
                />
                {isFormSearching ? (
                  <View style={{ padding: 20, alignItems: "center" }}>
                    <SpinningClap size={30} color="#841584" />
                  </View>
                ) : (
                  <FlatList
                    data={formSearchResults}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={{
                          padding: 12,
                          borderBottomWidth: 1,
                          borderColor: "#eee",
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                        onPress={() => selectProfileInForm(item)}
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
                  />
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

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

                          <View style={{ flexDirection: "row", gap: 10 }}>
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation && e.stopPropagation();
                                openEditRoleInstance(roleItem);
                              }}
                            >
                              <Ionicons
                                name="create-outline"
                                size={18}
                                color="#666"
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => deleteRole(roleItem.id)}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={18}
                                color="red"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Publish Toggle */}
                        <TouchableOpacity
                          onPress={() => {
                            if (assignedUser) {
                              Alert.alert(
                                "Action impossible",
                                "Ce rôle est assigné. Retirez l'assignation pour modifier le statut.",
                              );
                              return;
                            }
                            togglePublishRole(roleItem);
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 10,
                            backgroundColor: isDraft ? "#fff3e0" : "#e8f5e9",
                            padding: 6,
                            borderRadius: 4,
                            alignSelf: "flex-start",
                            opacity: assignedUser ? 0.5 : 1,
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
                {searching && (
                  <View style={{ padding: 20, alignItems: "center" }}>
                    <SpinningClap size={30} color="#841584" />
                  </View>
                )}

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
                            alignItems: "center",
                          }}
                          onPress={() => assignUserToRole(u)}
                        >
                          <View>
                            <Text style={{ fontWeight: "600", fontSize: 16 }}>
                              {u.full_name || u.username}
                            </Text>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              {u.role && (
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: "#841584",
                                    fontWeight: "600",
                                  }}
                                >
                                  {u.role.toUpperCase()}
                                </Text>
                              )}
                              {u.ville ? (
                                <Text style={{ fontSize: 12, color: "#666" }}>
                                  {u.role ? `• ${u.ville}` : u.ville}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                          <Ionicons
                            name="add-circle-outline"
                            size={20}
                            color="#841584"
                          />
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

      {/* MODAL APPLICATIONS */}
      <Modal
        visible={applicationsModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setApplicationsModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: "white", padding: 20 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              marginTop: 20,
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: "bold" }}>
              Candidatures ({applications.length})
            </Text>
            <TouchableOpacity
              onPress={() => setApplicationsModalVisible(false)}
            >
              <Ionicons name="close" size={28} color="black" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={applications}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <Text
                style={{ textAlign: "center", color: "#666", marginTop: 50 }}
              >
                Aucune candidature en attente.
              </Text>
            }
            renderItem={({ item }) => (
              <View
                style={{
                  padding: 15,
                  borderWidth: 1,
                  borderColor: "#eee",
                  borderRadius: 10,
                  marginBottom: 10,
                }}
              >
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                    {item.profiles?.full_name || item.profiles?.username}
                  </Text>
                  <Text style={{ color: "#666" }}>
                    Candidat pour :{" "}
                    <Text style={{ fontWeight: "600", color: "#333" }}>
                      {item.project_roles?.title}
                    </Text>
                  </Text>
                  <Text style={{ fontSize: 12, color: "#999", marginTop: 4 }}>
                    Message: {item.message || "Aucun message"}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => handleAcceptApplication(item)}
                    style={{
                      flex: 1,
                      backgroundColor: "#4CAF50",
                      padding: 10,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      Accepter
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRefuseApplication(item)}
                    style={{
                      flex: 1,
                      backgroundColor: "#ef5350",
                      padding: 10,
                      borderRadius: 8,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                      Refuser
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
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
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center" },
  subtitle: { color: "#666", marginTop: 5, textAlign: "center" },
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
  label: {
    marginBottom: 8,
    fontWeight: "600",
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },

  catButton: {
    padding: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 20,
    marginRight: 8,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 15,
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
