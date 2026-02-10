import AppMap, { Marker } from "@/components/AppMap";
import ClapLoading from "@/components/ClapLoading";
import { Hoverable } from "@/components/Hoverable";
import RoleFormFields from "@/components/RoleFormFields";
import Colors from "@/constants/Colors";
import { useUserMode } from "@/hooks/useUserMode";
import { fuzzySearch } from "@/utils/search";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    Platform,
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
  is_paid?: boolean | null;
  remuneration_amount?: string | null;
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
  const { mode } = useUserMode();

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectData, setProjectData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Search/Assign State
  const [assigningRoleId, setAssigningRoleId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Edit/Add Role State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editingRole, setEditingRole] = useState<{
    id?: string;
    category: (typeof ROLE_CATEGORIES)[number];
    title: string;
    description: string;
    quantity: string;
    experience: string | string[];
    gender: string | string[];
    ageMin: string;
    ageMax: string;
    height: string;
    hairColor: string | string[];
    eyeColor: string | string[];
    equipment: string;
    software: string;
    specialties: string;
    status: string; // "draft" | "published" | "assigned"
    isPaid: boolean;
    remunerationAmount: string;
    assignee: { id: string; label: string } | null;
    data: any;
    createPost?: boolean;
    initialAssigneeId?: string | null;
    initialStatus?: string;
  } | null>(null);
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [isSearchingProfileInEdit, setIsSearchingProfileInEdit] =
    useState(false);

  const toArray = (value: any): string[] => {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    if (typeof value === "string" && value.includes(",")) {
      return value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return [String(value)];
  };

  const toggleMultiValue = (key: "experience" | "gender", value: string) => {
    if (!editingRole) return;
    const current = toArray(editingRole[key]);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setEditingRole({ ...editingRole, [key]: next } as typeof editingRole);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    if (!id || id === "undefined") return;
    try {
      setLoading(true);
      // Get project details for title and location
      const { data: proj } = await supabase
        .from("tournages")
        .select("*")
        .eq("id", id)
        .single();
      if (proj) {
        setProjectTitle(proj.title);
        setProjectData(proj);
      }

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
    setFormErrors({});
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
      isPaid: false,
      remunerationAmount: "",
      assignee: null,
      createPost: false,
      initialAssigneeId: null,
      initialStatus: "draft",
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
      setFormErrors({});
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
        isPaid: role.is_paid ?? false,
        remunerationAmount: role.remuneration_amount
          ? String(role.remuneration_amount)
          : "",
        assignee: role.assigned_profile
          ? {
              id: role.assigned_profile_id!,
              label:
                role.assigned_profile.full_name ||
                role.assigned_profile.username,
            }
          : null,
        createPost: false,
        initialAssigneeId: role.assigned_profile_id || null,
        initialStatus: role.status || "published",
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

  function handleSave() {
    if (!editingRole) return;
    const errors: Record<string, string> = {};

    if (!editingRole.category) {
      errors.category = "La catégorie est requise";
    }

    if (!editingRole.title.trim()) {
      errors.title = "L'intitulé du poste est requis";
    }

    if (editingRole.isPaid && !editingRole.remunerationAmount.trim()) {
      errors.remunerationAmount = "Le montant est requis si rémunéré";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    if (!editingRole.id) {
      if (editingRole.status === "assigned") {
        processSave(false);
        return;
      }
      Alert.alert(
        "Publier l'offre",
        "Souhaitez-vous publier cette offre dans Jobs et la partager dans le fil d'actualité ?",
        [
          {
            text: "Brouillon",
            style: "cancel",
            onPress: () => processSave(false, "draft"),
          },
          {
            text: "Publier dans Jobs",
            onPress: () => processSave(false, "published"),
          },
          {
            text: "Jobs + Feed",
            onPress: () => processSave(true, "published"),
          },
        ],
      );
      return;
    }

    if (editingRole.status === "published") {
      Alert.alert(
        "Publier",
        "Voulez-vous aussi créer un post automatique dans le fil d'actualité pour annoncer cette offre ?",
        [
          {
            text: "Non",
            onPress: () => processSave(false),
          },
          {
            text: "Oui, publier l'annonce",
            onPress: () => processSave(true),
          },
        ],
      );
    } else {
      processSave(false);
    }
  }

  async function processSave(createPost: boolean, forcedStatus?: string) {
    if (!editingRole) return;
    try {
      setIsSavingRole(true);

      // FORCE invitation_pending if there is an assignee.
      let resolvedStatus = forcedStatus || editingRole.status;
      const assignedProfileId = editingRole.assignee?.id ?? null;

      if (assignedProfileId) {
        // Determine if this is a confirmed assignment or requires invitation
        // It remains "assigned" ONLY if it was ALREADY assigned to the SAME person.
        // Any change (new person, or status wasn't assigned) forces an invitation.
        const wasAlreadyAssigned = editingRole.initialStatus === "assigned";
        const isSamePerson =
          assignedProfileId === editingRole.initialAssigneeId;

        if (wasAlreadyAssigned && isSamePerson) {
          resolvedStatus = "assigned";
        } else {
          resolvedStatus = "invitation_pending";
        }
      }

      const payload = {
        tournage_id: id,
        category: editingRole.category,
        title: editingRole.title,
        description: editingRole.description || null,
        experience_level: toArray(editingRole.experience).join(", ") || null,
        gender: toArray(editingRole.gender).join(", ") || null,
        age_min: editingRole.ageMin ? parseInt(editingRole.ageMin) : null,
        age_max: editingRole.ageMax ? parseInt(editingRole.ageMax) : null,
        // height: editingRole.height ? parseInt(editingRole.height) : null,
        // hair_color: editingRole.hairColor || null,
        // eye_color: editingRole.eyeColor || null,
        equipment: editingRole.equipment || null,
        software: editingRole.software || null,
        specialties: editingRole.specialties || null,
        is_paid: editingRole.isPaid,
        remuneration_amount: editingRole.isPaid
          ? editingRole.remunerationAmount
          : null,
        // data: editingRole.data,
        assigned_profile_id: editingRole.assignee?.id ?? null,
        status: resolvedStatus,
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
        const { data: insertedRows, error } = await supabase
          .from("project_roles")
          .insert(rows)
          .select();
        if (error) throw error;
      }

      // Create Post if requested
      const shouldCreatePost =
        editingRole.createPost && resolvedStatus === "published";
      if (shouldCreatePost) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const qty = parseInt(editingRole.quantity) || 1;
          const qtyText = qty > 1 ? `${qty} ` : "";
          const ageText =
            editingRole.ageMin || editingRole.ageMax
              ? `Âge: ${editingRole.ageMin || "?"}-${editingRole.ageMax || "?"}`
              : "";
          const details = [
            editingRole.category
              ? `Catégorie: ${editingRole.category.toUpperCase()}`
              : "",
            editingRole.description
              ? `Description: ${editingRole.description}`
              : "",
            toArray(editingRole.experience).length
              ? `Expérience: ${toArray(editingRole.experience).join(", ")}`
              : "",
            toArray(editingRole.gender).length
              ? `Sexe: ${toArray(editingRole.gender).join(", ")}`
              : "",
            ageText,
            editingRole.height ? `Taille: ${editingRole.height} cm` : "",
            toArray(editingRole.hairColor).length
              ? `Cheveux: ${toArray(editingRole.hairColor).join(", ")}`
              : "",
            toArray(editingRole.eyeColor).length
              ? `Yeux: ${toArray(editingRole.eyeColor).join(", ")}`
              : "",
            editingRole.equipment ? `Matériel: ${editingRole.equipment}` : "",
            editingRole.software ? `Logiciels: ${editingRole.software}` : "",
            editingRole.specialties
              ? `Spécialités: ${editingRole.specialties}`
              : "",
          ].filter(Boolean);
          // Prefer direct role id when available (edit path), otherwise try to
          // find the newly created role and link to it.
          let roleLink = `/project/${id}`;
          if (editingRole.id) {
            roleLink = `/project/role/${editingRole.id}`;
          } else {
            const { data: recent } = await supabase
              .from("project_roles")
              .select("id")
              .eq("tournage_id", id)
              .eq("title", editingRole.title)
              .order("created_at", { ascending: false })
              .limit(1);
            if (recent && recent.length > 0) {
              roleLink = `/project/role/${recent[0].id}`;
            }
          }

          const postContent = [
            `📢 Recherche ${qtyText}${editingRole.title}`,
            `Pour le projet "${projectTitle}"`,
            ...details,
            `Lien: ${roleLink}`,
          ].join("\n");

          const { error: postError } = await supabase.from("posts").insert({
            user_id: user.id,
            content: postContent.trim(),
            project_id: id,
            visibility: "public",
          });

          if (postError) {
            Alert.alert(
              "Info",
              "Rôle enregistré, mais le post n'a pas pu être créé.",
            );
          } else {
            Alert.alert(
              "Succès",
              "Rôle enregistré et partagé sur le fil d'actualité !",
            );
          }
        }
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
      // Fetch connections of the current user
      const { data: connections, error: connError } = await supabase
        .from("connections")
        .select("requester_id, receiver_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

      if (connError) throw connError;

      const friendIds =
        connections?.map((c) =>
          c.requester_id === currentUserId ? c.receiver_id : c.requester_id,
        ) || [];

      if (friendIds.length === 0) {
        setResults([]);
        setSearching(false);
        return;
      }

      const category = editingRole?.category;
      let queryBuilder = supabase
        .from("profiles")
        .select("id, full_name, username, ville, role, avatar_url")
        .in("id", friendIds)
        .limit(200);

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
        processedResults = fuzzySearch(
          processedResults,
          ["full_name", "username", "ville"],
          term,
        );
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
      status: "invitation_pending",
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
      // Fetch connections of the current user
      const { data: connections, error: connError } = await supabase
        .from("connections")
        .select("requester_id, receiver_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

      if (connError) throw connError;

      const friendIds =
        connections?.map((c) =>
          c.requester_id === currentUserId ? c.receiver_id : c.requester_id,
        ) || [];

      if (friendIds.length === 0) {
        setResults([]);
        setSearching(false);
        return;
      }

      const role = roles.find((r) => r.id === assigningRoleId);
      const category = role?.category;

      let queryBuilder = supabase
        .from("profiles")
        .select("id, full_name, username, ville, role, avatar_url")
        .in("id", friendIds)
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
        // Update status to invitation_pending
        .update({
          assigned_profile_id: profile.id,
          status: "invitation_pending",
        })
        .in("id", ids);

      if (error) throw error;

      // Optimistic update
      setRoles((prev) => {
        const updated = prev.map((r) =>
          ids.includes(r.id)
            ? {
                ...r,
                assigned_profile_id: profile.id,
                status: "invitation_pending",
                assigned_profile: {
                  full_name: profile.full_name,
                  username: profile.username,
                  ville: profile.ville,
                },
              }
            : r,
        );
        // Re-sort: unassigned first (published/draft), assigned/pending last
        return updated.sort((a, b) => {
          const aAssigned =
            a.status === "assigned" || a.status === "invitation_pending";
          const bAssigned =
            b.status === "assigned" || b.status === "invitation_pending";
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
      // Remove any accepted application so the user can re-apply if needed
      await supabase
        .from("applications")
        .delete()
        .eq("role_id", roleId)
        .eq("status", "accepted");

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
              {item.category.toUpperCase()} •{" "}
              {item.is_paid ? "Rémunéré" : "Bénévole"}
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
            ) : item.status === "assigned" ? (
              <View
                style={[styles.assignedContainer, { backgroundColor: "#eee" }]}
              >
                <Ionicons name="checkmark-circle" size={16} color="#999" />
                <Text style={[styles.assignedText, { color: "#666" }]}>
                  Pourvu (Manuel)
                </Text>
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
          {(Platform.OS !== "web" || mode !== "studio") && (
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
              style={{ padding: 5 }}
            >
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
          )}
          <View>
            <Text style={styles.screenTitle}>Gestion des rôles</Text>
            <Text style={styles.subtitle}>{projectTitle}</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === "list" ? "map" : "list")}
            style={{
              padding: 8,
              borderRadius: 20,
              backgroundColor: Colors.light.backgroundSecondary,
            }}
          >
            <Ionicons
              name={viewMode === "list" ? "map" : "list"}
              size={20}
              color="#333"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={openAddRole} style={styles.addBtn}>
            <Ionicons name="add" size={24} color="white" />
            <Text style={{ color: "white", fontWeight: "bold" }}>Ajouter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={{ marginTop: 40, alignItems: "center" }}>
          <ClapLoading size={50} color={Colors.light.primary} />
        </View>
      ) : viewMode === "map" ? (
        <View style={{ flex: 1 }}>
          <AppMap
            style={{ width: "100%", height: "100%" }}
            initialRegion={{
              latitude: projectData?.latitude || 46.603354,
              longitude: projectData?.longitude || 1.888334,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
          >
            {projectData?.latitude && projectData?.longitude && (
              <Marker
                coordinate={{
                  latitude: projectData.latitude,
                  longitude: projectData.longitude,
                }}
                title={projectData.title}
                description="Lieu du tournage"
              />
            )}
          </AppMap>
        </View>
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
            paddingTop: Platform.OS === "ios" ? 50 : 20,
            alignItems: "center",
          }}
        >
          <View style={{ flex: 1, width: "100%", maxWidth: 800, padding: 20 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                paddingBottom: 15,
                borderBottomWidth: 1,
                borderBottomColor: Colors.light.border,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: Colors.light.text,
                }}
              >
                {editingRole?.id ? "Modifier le rôle" : "Ajouter un rôle"}
              </Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 50 }}
            >
              {editingRole && !isSearchingProfileInEdit && (
                <>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={[styles.label, { marginBottom: 0 }]}>
                      Catégorie
                    </Text>
                    {formErrors.category && (
                      <Text
                        style={{
                          color: "red",
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        - {formErrors.category}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.rowWrap, { marginBottom: 20 }]}>
                    {ROLE_CATEGORIES.map((cat) => (
                      <Hoverable
                        key={cat}
                        onPress={() =>
                          setEditingRole({ ...editingRole, category: cat })
                        }
                        hoverStyle={{
                          transform: [{ scale: 1.02 }],
                          opacity: 0.9,
                        }}
                        style={[
                          styles.catChip,
                          editingRole.category === cat &&
                            styles.catChipSelected,
                        ]}
                      >
                        <Text
                          style={{
                            fontWeight: "500",
                            color:
                              editingRole.category === cat
                                ? "white"
                                : Colors.light.text,
                          }}
                        >
                          {cat.charAt(0).toUpperCase() +
                            cat.slice(1).replace("_", " ")}
                        </Text>
                      </Hoverable>
                    ))}
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text style={[styles.label, { marginBottom: 0 }]}>
                      Intitulé du poste
                    </Text>
                    {formErrors.title && (
                      <Text
                        style={{
                          color: "red",
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        - {formErrors.title}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.rowWrap, { marginBottom: 10 }]}>
                    {(JOB_TITLES[editingRole.category] || [])
                      .slice(0, 8)
                      .map((job) => (
                        <Hoverable
                          key={job}
                          onPress={() =>
                            setEditingRole({ ...editingRole, title: job })
                          }
                          hoverStyle={{
                            transform: [{ scale: 1.02 }],
                            opacity: 0.9,
                          }}
                          style={[
                            styles.jobChip,
                            editingRole.title === job && styles.jobChipSelected,
                            { cursor: "pointer" } as any,
                          ]}
                        >
                          <Text
                            style={{
                              color:
                                editingRole.title === job
                                  ? "white"
                                  : Colors.light.text,
                            }}
                          >
                            {job}
                          </Text>
                        </Hoverable>
                      ))}
                  </View>
                  <TextInput
                    placeholder="Ou un autre titre..."
                    style={[
                      styles.input,
                      { textAlign: "left", paddingLeft: 15 },
                    ]}
                    placeholderTextColor="#999"
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
                          style={[styles.input, { textAlign: "center" }]}
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
                        style={[
                          styles.input,
                          { textAlign: "left", paddingLeft: 15 },
                        ]}
                        placeholderTextColor="#999"
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
                      <Hoverable
                        key={lvl}
                        onPress={() => toggleMultiValue("experience", lvl)}
                        hoverStyle={{
                          transform: [{ scale: 1.02 }],
                          opacity: 0.9,
                        }}
                        style={[
                          styles.catChip,
                          toArray(editingRole.experience).includes(lvl) &&
                            styles.catChipSelected,
                          { cursor: "pointer" } as any,
                        ]}
                      >
                        <Text
                          style={{
                            fontWeight: "500",
                            color: toArray(editingRole.experience).includes(lvl)
                              ? "white"
                              : Colors.light.text,
                          }}
                        >
                          {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                        </Text>
                      </Hoverable>
                    ))}
                  </View>

                  {/* Gender */}
                  <Text style={styles.label}>Sexe (optionnel)</Text>
                  <View style={[styles.rowWrap, { marginBottom: 15 }]}>
                    {["homme", "femme", "autre"].map((g) => (
                      <Hoverable
                        key={g}
                        onPress={() => toggleMultiValue("gender", g)}
                        hoverStyle={{
                          transform: [{ scale: 1.02 }],
                          opacity: 0.9,
                        }}
                        style={[
                          styles.catChip,
                          toArray(editingRole.gender).includes(g) &&
                            styles.catChipSelected,
                          { cursor: "pointer" } as any,
                        ]}
                      >
                        <Text
                          style={{
                            fontWeight: "500",
                            color: toArray(editingRole.gender).includes(g)
                              ? "white"
                              : Colors.light.text,
                          }}
                        >
                          {g.charAt(0).toUpperCase() + g.slice(1)}
                        </Text>
                      </Hoverable>
                    ))}
                  </View>

                  {/* Age range */}
                  <View
                    style={{ flexDirection: "row", gap: 10, paddingBottom: 10 }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Âge min.</Text>
                      <TextInput
                        keyboardType="numeric"
                        style={[styles.input, { textAlign: "center" }]}
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
                        style={[styles.input, { textAlign: "center" }]}
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

                  <Text style={styles.label}>Rémunération</Text>
                  <View style={styles.rowWrap}>
                    <Hoverable
                      onPress={() =>
                        setEditingRole({ ...editingRole, isPaid: true })
                      }
                      hoverStyle={{ transform: [{ scale: 1.02 }] }}
                      style={[
                        styles.catChip,
                        editingRole.isPaid && styles.catChipSelected,
                        { cursor: "pointer" } as any,
                      ]}
                    >
                      <Text
                        style={{
                          fontWeight: "500",
                          color: editingRole.isPaid
                            ? "white"
                            : Colors.light.text,
                        }}
                      >
                        Rémunéré
                      </Text>
                    </Hoverable>
                    <Hoverable
                      onPress={() =>
                        setEditingRole({ ...editingRole, isPaid: false })
                      }
                      hoverStyle={{ transform: [{ scale: 1.02 }] }}
                      style={[
                        styles.catChip,
                        !editingRole.isPaid && styles.catChipSelected,
                        { cursor: "pointer" } as any,
                      ]}
                    >
                      <Text
                        style={{
                          fontWeight: "500",
                          color: !editingRole.isPaid
                            ? "white"
                            : Colors.light.text,
                        }}
                      >
                        Bénévole
                      </Text>
                    </Hoverable>
                  </View>

                  {editingRole.isPaid && (
                    <View style={{ marginTop: 10 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text style={[styles.label, { marginBottom: 0 }]}>
                          Montant de la rémunération
                        </Text>
                        {formErrors.remunerationAmount && (
                          <Text
                            style={{
                              color: "red",
                              fontSize: 11,
                              fontWeight: "600",
                            }}
                          >
                            - {formErrors.remunerationAmount}
                          </Text>
                        )}
                      </View>
                      <TextInput
                        placeholder="Ex: 150€ / jour ou Cachet global"
                        style={[
                          styles.input,
                          { paddingLeft: 15, textAlign: "left" },
                        ]}
                        value={editingRole.remunerationAmount}
                        onChangeText={(t) =>
                          setEditingRole({
                            ...editingRole,
                            remunerationAmount: t,
                          })
                        }
                      />
                    </View>
                  )}

                  {/* STATUS POURVU - REMOVED TO PREVENT FORCED ASSIGNMENT WITHOUT INVITATION
                  <Text style={styles.label}>
                    {editingRole.assignee
                      ? "Confirmer l'assignation (sans invitation) ?"
                      : "Poste déjà pourvu ?"}
                  </Text>
                  <View style={styles.rowWrap}>
                     ... (Validating logic handles status automatically)
                  </View>
                  */}

                  {/* STATUS TOGGLE */}
                  {/* STATUS TOGGLE */}
                  <Text style={styles.label}>Statut de l'annonce</Text>
                  {editingRole.assignee && editingRole.status === "assigned" ? (
                    <Text
                      style={{
                        color: "#666",
                        fontStyle: "italic",
                        marginBottom: 10,
                        textAlign: "center",
                      }}
                    >
                      Ce rôle est déjà confirmé (assigné).
                    </Text>
                  ) : (
                    <View>
                      <View style={styles.rowWrap}>
                        {["draft", "published"].map((st) => (
                          <Hoverable
                            key={st}
                            onPress={() =>
                              setEditingRole({
                                ...editingRole,
                                status: st as any,
                                ...(st === "draft"
                                  ? { createPost: false }
                                  : {}),
                              })
                            }
                            hoverStyle={{ transform: [{ scale: 1.02 }] }}
                            style={[
                              styles.catChip,
                              editingRole.status === st &&
                                styles.catChipSelected,
                              { cursor: "pointer" } as any,
                            ]}
                          >
                            <Text
                              style={{
                                fontWeight: "500",
                                color:
                                  editingRole.status === st
                                    ? "white"
                                    : Colors.light.text,
                              }}
                            >
                              {st === "draft"
                                ? "Brouillon"
                                : "Ouvert (Casting)"}
                            </Text>
                          </Hoverable>
                        ))}
                      </View>
                    </View>
                  )}

                  <Text style={styles.label}>Diffusion</Text>
                  <View style={styles.rowWrap}>
                    <Hoverable
                      onPress={() =>
                        setEditingRole({ ...editingRole, createPost: false })
                      }
                      disabled={editingRole.status !== "published"}
                      hoverStyle={
                        editingRole.status === "published"
                          ? { transform: [{ scale: 1.02 }] }
                          : {}
                      }
                      style={[
                        styles.catChip,
                        !editingRole.createPost && styles.catChipSelected,
                        editingRole.status !== "published" && { opacity: 0.5 },
                        {
                          cursor:
                            editingRole.status === "published"
                              ? "pointer"
                              : ("default" as any),
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontWeight: "500",
                          color: !editingRole.createPost
                            ? "white"
                            : Colors.light.text,
                        }}
                      >
                        Jobs uniquement
                      </Text>
                    </Hoverable>
                    <Hoverable
                      onPress={() =>
                        setEditingRole({ ...editingRole, createPost: true })
                      }
                      disabled={editingRole.status !== "published"}
                      hoverStyle={
                        editingRole.status === "published"
                          ? { transform: [{ scale: 1.02 }] }
                          : {}
                      }
                      style={[
                        styles.catChip,
                        editingRole.createPost && styles.catChipSelected,
                        editingRole.status !== "published" && { opacity: 0.5 },
                        {
                          cursor:
                            editingRole.status === "published"
                              ? "pointer"
                              : ("default" as any),
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontWeight: "500",
                          color: editingRole.createPost
                            ? "white"
                            : Colors.light.text,
                        }}
                      >
                        Jobs + Feed
                      </Text>
                    </Hoverable>
                  </View>

                  {/* ASSIGNMENT */}

                  {editingRole.assignee ? (
                    <View style={styles.assigneeRow}>
                      <Text style={{ fontWeight: "600" }}>
                        {editingRole.assignee.label}
                      </Text>
                      <Hoverable
                        onPress={() =>
                          setEditingRole({
                            ...editingRole,
                            assignee: null,
                            status: "published",
                          })
                        }
                        hoverStyle={{ transform: [{ scale: 1.1 }] }}
                        style={{ cursor: "pointer" } as any}
                      >
                        <Ionicons
                          name="close-circle"
                          size={24}
                          color="#ff4444"
                        />
                      </Hoverable>
                    </View>
                  ) : (
                    <Hoverable
                      onPress={() => {
                        setIsSearchingProfileInEdit(true);
                        searchProfilesForEdit("");
                      }}
                      hoverStyle={{
                        transform: [{ scale: 1.02 }],
                        opacity: 0.8,
                      }}
                      style={[
                        styles.assignProfileBtn,
                        { cursor: "pointer" } as any,
                      ]}
                    >
                      <Text style={{ color: "#841584", fontWeight: "600" }}>
                        Choisir un profil +
                      </Text>
                    </Hoverable>
                  )}

                  <Hoverable
                    style={
                      {
                        backgroundColor: "#841584",
                        padding: 15,
                        borderRadius: 8,
                        alignItems: "center",
                        marginTop: 20,
                        opacity: isSavingRole ? 0.7 : 1,
                        cursor: isSavingRole ? "default" : "pointer",
                      } as any
                    }
                    onPress={handleSave}
                    disabled={isSavingRole}
                    hoverStyle={{ opacity: 0.9, transform: [{ scale: 1.01 }] }}
                  >
                    {isSavingRole ? (
                      <ClapLoading color="white" size={24} />
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
                  </Hoverable>
                  <View style={{ height: 50 }} />
                </>
              )}

              {editingRole && isSearchingProfileInEdit && (
                <View>
                  <Hoverable
                    onPress={() => setIsSearchingProfileInEdit(false)}
                    style={
                      {
                        marginBottom: 15,
                        padding: 5,
                        alignSelf: "flex-start",
                        cursor: "pointer",
                      } as any
                    }
                    hoverStyle={{ opacity: 0.7 }}
                  >
                    <Text style={{ color: "#666", fontSize: 16 }}>
                      ← Retour au rôle
                    </Text>
                  </Hoverable>
                  <TextInput
                    placeholder="Rechercher (nom, pseudo, ville)..."
                    style={[
                      styles.input,
                      { textAlign: "left", paddingLeft: 10 },
                    ]}
                    value={query}
                    onChangeText={searchProfilesForEdit}
                    autoFocus
                  />
                  {searching ? (
                    <View style={{ marginTop: 20, alignItems: "center" }}>
                      <ClapLoading size={40} color={Colors.light.primary} />
                    </View>
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
                          <Hoverable
                            key={item.id}
                            style={[
                              styles.userRow,
                              { cursor: "pointer" } as any,
                            ]}
                            onPress={() => selectProfileInEdit(item)}
                            hoverStyle={{
                              backgroundColor: Colors.light.backgroundSecondary,
                            }}
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
                          </Hoverable>
                        ))
                      )}
                    </View>
                  )}
                </View>
              )}
            </ScrollView>
          </View>
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
              <View style={{ marginVertical: 20, alignItems: "center" }}>
                <ClapLoading size={40} color={Colors.light.primary} />
              </View>
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
  container: { flex: 1, backgroundColor: Colors.light.backgroundSecondary },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: Colors.light.background,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
  },
  addBtn: {
    backgroundColor: Colors.light.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  screenTitle: { fontSize: 20, fontWeight: "bold", color: Colors.light.text },
  subtitle: { fontSize: 14, color: "#666" },
  card: {
    backgroundColor: "white",
    marginBottom: 12,
    borderRadius: 10,
    padding: 15,
    shadowColor: Colors.light.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  roleTitle: { fontSize: 16, fontWeight: "bold", color: Colors.light.text },
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
    borderColor: Colors.light.border,
    paddingTop: 10,
    marginTop: 5,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  btnPublish: { backgroundColor: Colors.light.success },
  btnUnpublish: { backgroundColor: "#eee" },

  assignBtn: {
    padding: 6,
    borderWidth: 1,
    borderColor: Colors.light.primary,
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
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: Colors.light.text },
  input: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    textAlign: "center",
    color: Colors.light.text,
  },
  userRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
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
    color: Colors.light.text,
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
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  catChipSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  jobChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  jobChipSelected: {
    backgroundColor: Colors.light.text,
    borderColor: Colors.light.text,
  },
  assignProfileBtn: {
    backgroundColor: Colors.light.tint,
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderStyle: "dashed",
  },
  assigneeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  listSectionHeader: {
    paddingVertical: 10,
    backgroundColor: Colors.light.backgroundSecondary,
    marginBottom: 5,
  },
  listSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.light.text,
  },
});
