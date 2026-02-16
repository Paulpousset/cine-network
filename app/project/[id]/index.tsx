import { Hoverable } from "@/components/Hoverable";
import PaymentModal from "@/components/PaymentModal";
import RoleFormFields from "@/components/RoleFormFields";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useUserMode } from "@/hooks/useUserMode";
import { useTheme } from "@/providers/ThemeProvider";
import { useTutorial } from "@/providers/TutorialProvider";
import { NotificationService } from "@/services/NotificationService";
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
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

// --- Showcase Component (Vitrine pour non-membres) ---
function ProjectShowcase({
  project,
  roles,
  isLiked,
  onToggleLike,
}: {
  project: any;
  roles: any[];
  isLiked: boolean;
  onToggleLike: () => void;
}) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const themedGlobalStyles = useThemedStyles();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter only published roles that are not assigned
  // We align with the logic that if it's not draft and not assigned, it's open.
  const openRoles = roles.filter(
    (r) => r.status !== "draft" && !r.assigned_profile_id,
  );

  const teamVisible = roles.filter(
    (r) => r.assigned_profile_id && r.show_in_team !== false,
  );

  // Group team by category
  const teamByGroup = teamVisible.reduce((acc: any, member: any) => {
    const group = member.category || "Autre";
    if (!acc[group]) acc[group] = [];
    acc[group].push(member);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    acteur: "Acteurs",
    realisation: "Réalisation",
    image: "Image",
    son: "Son",
    production: "Production",
    deco: "Décors & Costumes",
    technique: "Technique",
    postprod: "Post-Production",
    HMC: "HMC",
    regie: "Régie",
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Hero Image */}
      <View style={{ height: 250, width: "100%", backgroundColor: colors.backgroundSecondary }}>
        {project.image_url ? (
          <Image
            source={{ uri: project.image_url }}
            style={{ width: "100%", height: "100%", resizeMode: "cover" }}
          />
        ) : (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: colors.primary,
            }}
          >
            <Ionicons name="film-outline" size={80} color="white" />
          </View>
        )}
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 80,
            backgroundColor: "rgba(0,0,0,0.5)",
            padding: 15,
            justifyContent: "flex-end",
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 12,
              fontWeight: "bold",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {project.type?.replace("_", " ") || "PROJET"}
          </Text>
          <Text style={{ color: "white", fontSize: 24, fontWeight: "bold" }}>
            {project.title}
          </Text>
        </View>

        {/* LIKE BUTTON */}
        <TouchableOpacity
          onPress={onToggleLike}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            backgroundColor: "rgba(255,255,255,0.2)",
            borderRadius: 25,
            width: 50,
            height: 50,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={30}
            color={isLiked ? "#E91E63" : "white"}
          />
        </TouchableOpacity>
      </View>

      <View style={{ padding: 20 }}>
        {/* Info Bar */}
        <View style={{ flexDirection: "row", gap: 15, marginBottom: 20 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Ionicons name="location-outline" size={16} color={colors.text + "80"} />
            <Text style={{ color: colors.text + "80" }}>
              {project.ville || "Lieu inconnu"}
            </Text>
          </View>
          {project.start_date && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.text + "80"} />
              <Text style={{ color: colors.text + "80" }}>
                {new Date(project.start_date).toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Synopsis */}
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.text, marginBottom: 10 }}>Synopsis</Text>
        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            color: colors.text + "CC",
            marginBottom: 30,
          }}
        >
          {project.description ||
            "Aucune description disponible pour ce projet."}
        </Text>

        {/* Team Members grouped by category */}
        {Object.keys(teamByGroup).length > 0 && (
          <View style={{ marginBottom: 30 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.text, marginBottom: 15 }}>
              Équipe du film
            </Text>

            {/* Category Selector */}
            <View style={{ position: "relative" }}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={{ gap: 10, paddingBottom: 20, paddingRight: 40 }}
              >
                <TouchableOpacity
                  onPress={() => setSelectedCategory(null)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: selectedCategory === null ? colors.primary : colors.backgroundSecondary,
                    borderWidth: 1,
                    borderColor: selectedCategory === null ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ 
                    color: selectedCategory === null ? "white" : colors.text, 
                    fontWeight: "bold",
                    fontSize: 12 
                  }}>TOUT</Text>
                </TouchableOpacity>
                {Object.keys(teamByGroup).sort().map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setSelectedCategory(cat)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: selectedCategory === cat ? colors.primary : colors.backgroundSecondary,
                      borderWidth: 1,
                      borderColor: selectedCategory === cat ? colors.primary : colors.border,
                    }}
                  >
                    <Text style={{ 
                      color: selectedCategory === cat ? "white" : colors.text, 
                      fontWeight: "bold",
                      fontSize: 12,
                      textTransform: "uppercase"
                    }}>
                      {categoryLabels[cat] || cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Scroll Indicator Arrow */}
              <View 
                style={{
                  position: "absolute",
                  right: 5,
                  top: 8,
                  bottom: 28,
                  justifyContent: "center",
                  alignItems: "center",
                }}
                pointerEvents="none"
              >
                <Ionicons name="chevron-forward" size={14} color={colors.primary} style={{ opacity: 0.8 }} />
              </View>
            </View>
            
            {(selectedCategory ? [[selectedCategory, teamByGroup[selectedCategory]]] as [string, any][] : Object.entries(teamByGroup).sort()).map(([category, members]) => (
              <View key={category} style={{ marginBottom: 20 }}>
                <Text style={{ 
                  fontSize: 12, 
                  fontWeight: "700", 
                  color: colors.primary, 
                  textTransform: "uppercase", 
                  letterSpacing: 1,
                  marginBottom: 10,
                  opacity: 0.8
                }}>
                  {categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
                
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 15 }}>
                  {members.map((member: any) => (
                    <TouchableOpacity
                      key={member.id}
                      onPress={() => router.push(`/profile/${member.assigned_profile_id}`)}
                      style={{ alignItems: "center", width: 75 }}
                    >
                      <View
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 27,
                          backgroundColor: colors.backgroundSecondary,
                          justifyContent: "center",
                          alignItems: "center",
                          marginBottom: 5,
                          borderWidth: 1,
                          borderColor: colors.border,
                          overflow: "hidden"
                        }}
                      >
                        {member.assigned_profile?.avatar_url ? (
                          <Image
                            source={{ uri: member.assigned_profile.avatar_url }}
                            style={{ width: "100%", height: "100%", resizeMode: "cover" }}
                          />
                        ) : (
                          <Ionicons name="person" size={24} color={colors.textSecondary} />
                        )}
                      </View>
                      <Text
                        style={{ fontSize: 11, color: colors.text, textAlign: "center", fontWeight: "600" }}
                        numberOfLines={1}
                      >
                        {member.assigned_profile?.full_name || member.assigned_profile?.username || "Inconnu"}
                      </Text>
                      <Text
                        style={{ fontSize: 9, color: colors.textSecondary, textAlign: "center" }}
                        numberOfLines={1}
                      >
                        {member.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Open Roles */}
        <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.text, marginBottom: 10 }}>Casting ({openRoles.length})</Text>
        {openRoles.length === 0 ? (
          <Text style={{ color: colors.text + "60", fontStyle: "italic" }}>
            Aucun rôle ouvert pour le moment.
          </Text>
        ) : (
          <View style={{ gap: 15 }}>
            {openRoles.map((role) => (
              <TouchableOpacity
                key={role.id}
                onPress={() => router.push(`/project/role/${role.id}`)}
                style={{
                  backgroundColor: colors.card,
                  padding: 15,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  shadowColor: colors.shadow,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.3 : 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 10,
                        color: colors.primary,
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        marginBottom: 4,
                      }}
                    >
                      {role.category}
                    </Text>
                    <Text
                      style={{
                        fontSize: 18,
                        fontWeight: "bold",
                        marginBottom: 5,
                        color: colors.text,
                      }}
                    >
                      {role.title}
                    </Text>
                    <Text style={{ color: colors.text + "99" }} numberOfLines={2}>
                      {role.description}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: colors.backgroundSecondary,
                      padding: 8,
                      borderRadius: 8,
                    }}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.text}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// Custom Loading Component
const SpinningClap = ({
  size = 50,
  color,
}: {
  size?: number;
  color?: string;
}) => {
  const { colors } = useTheme();
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
      <MaterialCommunityIcons name="movie-open" size={size} color={color || colors.primary} />
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
const getCategoryColor = (category: string, colors: any) => {
  const mapping: Record<string, string> = {
    realisateur: "#E91E63", // Rose
    acteur: colors.primary, // Dynamic primary color replaces violet
    image: "#2196F3", // Bleu
    son: "#FF9800", // Orange
    production: "#4CAF50", // Vert
    hmc: "#E91E63", // Rose foncé
    deco: "#795548", // Marron
    post_prod: "#607D8B", // Gris bleu
    technicien: "#607D8B",
  };
  return mapping[category] || colors.text + "80";
};

export default function ProjectDetails() {
  const { colors, isDark } = useTheme();
  const themedGlobalStyles = useThemedStyles();
  const styles = createStyles(colors, isDark);
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768; // Tablet/Desktop breakpoint
  const { mode } = useUserMode();

  const [project, setProject] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isVisitor, setIsVisitor] = useState(false); // New state to track visitor status

  // Detailed Role Form State
  const [roleFormVisible, setRoleFormVisible] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [editingRole, setEditingRole] = useState<{
    id?: string;
    category: keyof typeof JOB_TITLES;
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
    status: string; // "draft" | "published" | "assigned" | "invitation_pending"
    isPaid: boolean;
    remunerationAmount: string;
    assignee: { id: string; label: string } | null;
    data: any; // JSONB storage for extra fields
    createPost: boolean;
    initialAssigneeId?: string | null;
    initialStatus?: string;
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

  // Boost Logic
  const [boostModalVisible, setBoostModalVisible] = useState(false);
  const [roleToBoost, setRoleToBoost] = useState<any>(null);
  const savedManageRole = useRef<any>(null);

  // Like Logic
  const [isLiked, setIsLiked] = useState(false);

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
    fetchProjectDetails();
  }, [id]);

  useEffect(() => {
    const projectId = Array.isArray(id) ? id[0] : id;
    if (!projectId) return;

    // Applications channel
    const appsChannel = supabase
      .channel(`project-apps-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "applications",
        },
        () => {
          fetchApplications();
        },
      )
      .subscribe();

    // Roles channel
    const rolesChannel = supabase
      .channel(`project-roles-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_roles",
          filter: `tournage_id=eq.${projectId}`,
        },
        () => {
          fetchRoles();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appsChannel);
      supabase.removeChannel(rolesChannel);
    };
  }, [id]);

  async function toggleLike() {
    if (!currentUserId) {
      Alert.alert(
        "Connexion requise",
        "Vous devez être connecté pour aimer un projet.",
      );
      return;
    }

    const isLikedNow = !isLiked;
    // Optimistic Update
    setIsLiked(isLikedNow);
    setProject((prev: any) => ({
      ...prev,
      likes_count: isLikedNow
        ? (prev?.likes_count || 0) + 1
        : Math.max(0, (prev?.likes_count || 1) - 1),
    }));

    try {
      if (isLiked) {
        const { error } = await supabase
          .from("project_likes")
          .delete()
          .eq("project_id", id)
          .eq("user_id", currentUserId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("project_likes")
          .insert({ project_id: id, user_id: currentUserId });

        if (error && error.code !== "23505") throw error;
      }
    } catch (e) {
      console.log("Error toggling like:", e);
      // Revert optimistic update
      setIsLiked(!isLikedNow);
      setProject((prev: any) => ({
        ...prev,
        likes_count: !isLikedNow
          ? (prev?.likes_count || 0) + 1
          : Math.max(0, (prev?.likes_count || 1) - 1),
      }));
      Alert.alert("Erreur", "Impossible de modifier le like.");
    }
  }

  async function fetchProjectDetails() {
    const projectId = Array.isArray(id) ? id[0] : id;
    if (!projectId || projectId === "undefined") return;
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setCurrentUserId(session?.user?.id ?? null);
      const { data: proj, error: errProj } = await supabase
        .from("tournages")
        .select(
          `
            *,
            project_likes(user_id)
        `,
        )
        .eq("id", projectId)
        .maybeSingle();

      if (errProj) throw errProj;
      if (!proj) {
        router.back();
        return;
      }

      const userId = session?.user?.id;
      const likes = proj.project_likes || [];

      const processedProj = {
        ...proj,
        likes_count: likes.length,
        isLiked: userId ? likes.some((l: any) => l.user_id === userId) : false,
      };

      setProject(processedProj);
      setIsLiked(processedProj.isLiked);

      const ownerId = proj.owner_id;

      // Check membership
      let isMember = false;
      if (userId) {
        if (userId === ownerId) {
          isMember = true;
        } else {
          const { data: memberData } = await supabase
            .from("project_roles")
            .select("id")
            .eq("tournage_id", projectId)
            .eq("assigned_profile_id", userId)
            .limit(1);
          if (memberData && memberData.length > 0) isMember = true;
        }
      }

      setIsVisitor(!isMember);

      await fetchRoles();

      if (isMember) {
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
    const projectId = Array.isArray(id) ? id[0] : id;
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
      .eq("project_roles.tournage_id", projectId)
      .eq("status", "pending"); // We only care about pending for the notification/list initially

    if (!error && apps) {
      setApplications(apps);
    }
  }

  async function fetchRoles() {
    const projectId = Array.isArray(id) ? id[0] : id;
    // We assume fetchProjectDetails handles loading
    const { data: rolesData, error: errRoles } = await supabase
      .from("project_roles")
      .select("*, show_in_team")
      .eq("tournage_id", projectId)
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
        .select("id, full_name, username, avatar_url")
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
      isPaid: false,
      remunerationAmount: "",
      assignee: null,
      height: "",
      hairColor: "",
      eyeColor: "",
      equipment: "",
      software: "",
      specialties: "",
      data: {},
      createPost: false,
      initialAssigneeId: null,
      initialStatus: "draft",
    });
    setRoleFormVisible(true);
    setFormErrors({});
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
          status: role.status || "draft",
          isPaid: role.is_paid ?? false,
          remunerationAmount: role.remuneration_amount
            ? String(role.remuneration_amount)
            : "",
          assignee: assignee,
          createPost: false,
          initialAssigneeId: role.assigned_profile_id || null,
          initialStatus: role.status || "published",
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

  function handleSaveRoleForm() {
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
    saveRoleForm();
  }

  async function saveRoleForm() {
    if (!editingRole) return;
    if (!editingRole.title.trim()) {
      Alert.alert("Erreur", "Le titre est requis");
      return;
    }

    try {
      setIsSavingRole(true);

      // FORCE invitation_pending if there is an assignee.
      let resolvedStatus = editingRole.status;
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
        assigned_profile_id: editingRole.assignee?.id ?? null,
        equipment: editingRole.equipment || null,
        software: editingRole.software || null,
        specialties: editingRole.specialties || null,
        is_paid: editingRole.isPaid,
        remuneration_amount: editingRole.isPaid
          ? editingRole.remunerationAmount
          : null,
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
          // Build link to the role. Prefer explicit id when editing, otherwise try to
          // reference the first inserted row.
          let roleLink = `/project/${id}`;
          if (editingRole.id) {
            roleLink = `/project/role/${editingRole.id}`;
          } else {
            // Try to read the most recently created role for this title/project
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
            `Pour le projet "${project?.title || ""}"`,
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
        setFormSearchResults([]);
        setIsFormSearching(false);
        return;
      }

      const category = editingRole?.category;
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
      status: "invitation_pending",
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

      const category = manageRole?.category;
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
        .update({ assigned_profile_id: user.id, status: "invitation_pending" })
        .eq("id", manageRole.id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error(
          "Impossible d'assigner ce membre. Vérifiez vos droits ou les politiques RLS.",
        );
      }

      // Send Push Notification
      NotificationService.sendRoleInvitationNotification({
        receiverId: user.id,
        projectTitle: project?.title || "Projet",
        roleTitle: manageRole.title,
      });

      const updated = {
        ...manageRole,
        assigned_profile_id: user.id,
        assigned_profile: user,
        status: "invitation_pending",
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
      // Remove accepted application to allow re-apply
      await supabase
        .from("applications")
        .delete()
        .eq("role_id", role.id)
        .eq("status", "accepted");

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

      // 1b. Reject other applicants for the same role
      const { error: rejectError } = await supabase
        .from("applications" as any)
        .update({ status: "rejected" })
        .eq("role_id", app.role_id)
        .neq("id", app.id)
        .eq("status", "pending");

      if (rejectError) {
        console.error("Error rejecting other candidates:", rejectError);
      }

      // 2. Assign role to user
      const { error: roleError } = await supabase
        .from("project_roles")
        .update({
          assigned_profile_id: app.candidate_id,
          status: "invitation_pending",
        })
        .eq("id", app.role_id);

      if (roleError) throw roleError;

      // Send Push Notification
      NotificationService.sendApplicationResultNotification({
        candidateId: app.candidate_id,
        roleTitle: app.project_roles?.title || "votre rôle",
        projectTitle: project?.title || "Projet",
        status: "accepted",
      });

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

      // Send Push Notification
      NotificationService.sendApplicationResultNotification({
        candidateId: app.candidate_id,
        roleTitle: app.project_roles?.title || "votre rôle",
        projectTitle: project?.title || "Projet",
        status: "rejected",
      });

      Alert.alert("Succès", "Candidature refusée.");
      fetchApplications();
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    }
  }

  async function handleBoostSuccess() {
    if (!roleToBoost) return;
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 2); // +48h

      const { error } = await supabase
        .from("project_roles")
        .update({
          is_boosted: true,
          boost_expires_at: expiresAt.toISOString(),
        })
        .eq("id", roleToBoost.id);

      if (error) throw error;

      Alert.alert("Succès", "Votre annonce est boostée pour 48h !");

      // Close Boost Modal
      setBoostModalVisible(false);
      setRoleToBoost(null);

      // Refresh data
      await fetchRoles();

      // Restore Group Modal if it was open
      if (savedManageRole.current) {
        // We need to update the group data because one item inside it changed
        // Since fetchRoles() updates the 'roles' state, we need to re-find the group
        // But 'manageRole' is a disconnected state object.
        // We should ideally re-construct it from the new 'roles' state, but for now let's just restore it
        // and maybe the user will see the old state until they close/reopen?
        // To fix visual state: manually update the item in savedManageRole.current
        const updatedGroup = { ...savedManageRole.current };
        updatedGroup.items = updatedGroup.items.map((i: any) =>
          i.id === roleToBoost.id ? { ...i, is_boosted: true } : i,
        );
        setTimeout(() => setManageRole(updatedGroup), 300);
        savedManageRole.current = null;
      }
    } catch (e) {
      Alert.alert("Erreur", "Le boost n'a pas pu être activé.");
    }
  }

  const { isTutorialActive, currentStep } = useTutorial();

  const isOwner =
    (project?.owner_id &&
      currentUserId &&
      project.owner_id === currentUserId) ||
    (isTutorialActive &&
      project?.title?.includes("Vitrine") &&
      currentStep?.id?.startsWith("admin"));

  // Un rôle est visible s'il n'est pas en brouillon OU s'il y a quelqu'un d'assigné (pour l'équipe)
  const visibleRoles = roles.filter(
    (r) => isOwner || r.status !== "draft" || r.assigned_profile_id,
  );

  const groupedRolesSections = React.useMemo(() => {
    const buckets = {
      filled: [] as any[],
      pending: [] as any[],
      published: [] as any[],
      draft: [] as any[],
    };

    visibleRoles.forEach((r) => {
      if (r.assigned_profile_id) {
        if (r.status === "assigned") {
          buckets.filled.push(r);
        } else {
          buckets.pending.push(r);
        }
      } else {
        if (r.status === "draft") {
          buckets.draft.push(r);
        } else {
          buckets.published.push(r);
        }
      }
    });

    const processBucket = (items: any[], statusKey: string) => {
      const groups: Record<string, any> = {};
      items.forEach((r) => {
        const trimmedTitle = (r.title || "").trim();
        const key = `${r.category}|${trimmedTitle.toLowerCase()}|${statusKey}`;
        if (!groups[key]) {
          groups[key] = {
            key,
            category: r.category,
            title: trimmedTitle,
            description: r.description,
            statusKey,
            items: [],
          };
        }
        groups[key].items.push(r);
      });
      return Object.values(groups).sort((a: any, b: any) =>
        a.title.localeCompare(b.title),
      );
    };

    const sections = [];

    const publishedGroups = processBucket(buckets.published, "published");
    if (publishedGroups.length > 0) {
      sections.push({
        title: "Recrutement en cours",
        data: publishedGroups,
      });
    }

    const pendingGroups = processBucket(buckets.pending, "pending");
    if (pendingGroups.length > 0) {
      sections.push({
        title: "En attente (Invitations)",
        data: pendingGroups,
      });
    }

    const draftGroups = processBucket(buckets.draft, "draft");
    if (draftGroups.length > 0) {
      sections.push({
        title: "Brouillons",
        data: draftGroups,
      });
    }

    const filledGroups = processBucket(buckets.filled, "assigned");
    if (filledGroups.length > 0) {
      sections.push({
        title: "Équipe & Participants",
        data: filledGroups,
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

  if (isVisitor && project) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <ProjectShowcase
          project={project}
          roles={roles}
          isLiked={isLiked}
          onToggleLike={toggleLike}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* HEADER */}
      <View style={styles.header}>
        <View style={{ width: "100%", maxWidth: 1000, alignSelf: "center" }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 10,
              alignItems: "center",
            }}
          >
            {(Platform.OS !== "web" || mode !== "studio") && (
              <TouchableOpacity
                onPress={() => router.replace("/(tabs)/my-projects")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  backgroundColor: isDark ? colors.backgroundSecondary : "#f0f0f0",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
              >
                <Ionicons name="home" size={18} color={colors.text} />
                <Text
                  style={{ fontSize: 12, fontWeight: "600", color: colors.text }}
                >
                  Accueil
                </Text>
              </TouchableOpacity>
            )}

            <View
              style={{ alignItems: "center", flex: 1, marginHorizontal: 10 }}
            >
              <Text style={styles.title} numberOfLines={2}>
                {project?.title}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {project?.type} • {project?.ville || "Lieu non défini"}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", gap: 15, alignItems: "center" }}
            >
              {isOwner && (
                <>
                  <TouchableOpacity
                    onPress={() => router.push(`/project/${id}/manage_team`)}
                    style={{ padding: 5 }}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={24}
                      color={colors.text}
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
                    <Ionicons
                      name="settings-outline"
                      size={24}
                      color={colors.primary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setApplicationsModalVisible(true)}
                    style={{ position: "relative", padding: 5 }}
                  >
                    <Ionicons
                      name="notifications-outline"
                      size={24}
                      color={colors.text}
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
      </View>

      <View style={{ flex: 1, alignItems: "center" }}>
        <View style={{ flex: 1, width: "100%", maxWidth: 1000 }}>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                Casting & Équipe ({roles.length})
              </Text>
            </View>

            {isOwner ? (
              <Hoverable
                onPress={openAddRole}
                style={
                  {
                    backgroundColor: colors.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 25,
                    cursor: "pointer",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  } as any
                }
                hoverStyle={{ opacity: 0.9, transform: [{ scale: 1.05 }] }}
              >
                <Ionicons name="add-circle-outline" size={18} color="white" />
                <Text
                  style={{ color: "white", fontWeight: "bold", fontSize: 13 }}
                >
                  Ajouter un poste
                </Text>
              </Hoverable>
            ) : null}
          </View>

          {/* LISTE DES RÔLES DÉJÀ CRÉÉS */}
          <ScrollView
            contentContainerStyle={{ padding: 15, paddingBottom: 50 }}
          >
            {groupedRolesSections.length === 0 ? (
              <Text
                style={{ textAlign: "center", marginTop: 20, color: colors.text + "80" }}
              >
                Aucun rôle créé pour le moment.
              </Text>
            ) : (
              groupedRolesSections.map((section: any, sectionIndex) => (
                <View key={section.title + sectionIndex}>
                  <View style={{ paddingVertical: 12, paddingHorizontal: 5 }}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "800",
                        color: colors.text + "70",
                        textTransform: "uppercase",
                        letterSpacing: 1.2,
                      }}
                    >
                      {section.title}
                    </Text>
                  </View>

                  <View
                    style={
                      isLargeScreen
                        ? { flexDirection: "row", flexWrap: "wrap", gap: 20 }
                        : { gap: 12 }
                    }
                  >
                    {section.data.map((item: any) => {
                      const color = getCategoryColor(item.category, colors);
                      const hasDrafts = item.items.some(
                        (r: any) =>
                          r.status === "draft" && !r.assigned_profile_id,
                      );

                      // Card Styles
                      // User requested max 2 columns with larger gap.
                      // Adjusting widths to account for larger gap (gap: 30).
                      // If we have 2 columns with a gap of 30, roughly (100% - gap) / 2
                      // But using percentage "48%" usually works safely with standard gaps.
                      // Let's try "47%" to be safe with gap 30.
                      const cardWidth = isLargeScreen ? "47%" : "100%";

                      return (
                        <Hoverable
                          key={item.key}
                          disabled={!isOwner}
                          style={[
                            styles.roleCard,
                            isLargeScreen &&
                              ({ width: cardWidth, flex: undefined } as any),
                            { marginBottom: isLargeScreen ? 12 : 12 }, 
                            isOwner && ({ cursor: "pointer" } as any),
                          ]}
                          hoverStyle={
                            isOwner
                              ? {
                                  transform: [{ translateY: -2 }],
                                  shadowOpacity: 0.15,
                                  borderColor: colors.primary + "80",
                                }
                              : {}
                          }
                          onPress={() => isOwner && setManageRole(item)}
                        >
                          <View style={{ flex: 1 }}>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 10,
                                flexWrap: "wrap",
                                marginBottom: 10,
                              }}
                            >
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <View
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: color,
                                  }}
                                />
                                <Text
                                  style={[
                                    styles.roleCategoryTag,
                                    {
                                      color: color,
                                      backgroundColor: color + "15",
                                      marginRight: 0,
                                    },
                                  ]}
                                >
                                  {item.category.toUpperCase()}
                                </Text>
                              </View>

                              {item.items[0]?.is_paid && (
                                <View
                                  style={{
                                    backgroundColor: "#4CAF5015",
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 6,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 9,
                                      fontWeight: "800",
                                      color: "#4CAF50",
                                    }}
                                  >
                                    PRO
                                  </Text>
                                </View>
                              )}

                              {isOwner && hasDrafts && (
                                <View
                                  style={{
                                    backgroundColor: "#FF980015",
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 6,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 9,
                                      fontWeight: "800",
                                      color: "#FF9800",
                                    }}
                                  >
                                    BROUILLON
                                  </Text>
                                </View>
                              )}
                            </View>

                            <Text style={[styles.roleTitle, { marginBottom: 4 }]}>
                              {item.title}
                            </Text>

                            {item.description ? (
                              <Text
                                style={[styles.descText, { marginBottom: 12 }]}
                                numberOfLines={2}
                              >
                                {item.description}
                              </Text>
                            ) : (
                              <View style={{ height: 8 }} />
                            )}

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
                                      backgroundColor: isDark
                                        ? colors.backgroundSecondary
                                        : "#f9f9f9",
                                      padding: 8,
                                      borderRadius: 10,
                                      borderWidth: assignee ? 0 : 1,
                                      borderColor: isDark
                                        ? colors.border
                                        : "#eee",
                                      borderStyle: assignee ? "solid" : "dashed",
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
                                            <Image
                                              source={{
                                                uri: assignee.avatar_url,
                                              }}
                                              style={{
                                                width: 24,
                                                height: 24,
                                                borderRadius: 12,
                                              }}
                                            />
                                          ) : (
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
                                          style={{
                                            fontWeight: "600",
                                            color: colors.text,
                                            fontSize: 13,
                                          }}
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
                                            borderColor: isDark
                                              ? colors.text + "40"
                                              : "#ccc",
                                            justifyContent: "center",
                                            alignItems: "center",
                                            marginRight: 8,
                                          }}
                                        >
                                          <Ionicons
                                            name="person-outline"
                                            size={14}
                                            color={
                                              isDark
                                                ? colors.text + "60"
                                                : "#999"
                                            }
                                          />
                                        </View>
                                        <Text
                                          style={{
                                            fontStyle: "italic",
                                            color: isDark
                                              ? colors.text + "60"
                                              : "#888",
                                            fontSize: 13,
                                          }}
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
                            <View
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: isDark
                                  ? colors.backgroundSecondary
                                  : "#f5f5f5",
                                justifyContent: "center",
                                alignItems: "center",
                                marginLeft: 10,
                              }}
                            >
                              <Ionicons
                                name="pencil"
                                size={16}
                                color={colors.primary}
                              />
                            </View>
                          )}
                        </Hoverable>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>

      {/* NEW DETAILED ROLE FORM MODAL */}
      <Modal
        visible={roleFormVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRoleFormVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
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
                borderBottomColor: colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: "bold",
                  color: colors.text,
                }}
              >
                {editingRole?.id ? "Modifier le rôle" : "Ajouter un rôle"}
              </Text>
              <Hoverable
                onPress={() => setRoleFormVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ cursor: "pointer" } as any}
                hoverStyle={{ opacity: 0.7 }}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Hoverable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 50 }}
            >
              {editingRole && !isSearchingProfileInForm && (
                <>
                  {/* SECTION 1: LE POSTE */}
                  <View style={styles.formSection}>
                    <View style={styles.formSectionHeader}>
                      <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
                      <Text style={styles.formSectionTitle}>Informations du poste</Text>
                    </View>

                    <Text style={styles.fieldLabel}>Catégorie {formErrors.category && <Text style={{ color: "red", fontSize: 11 }}>- {formErrors.category}</Text>}</Text>
                    <View style={[styles.rowWrap, { justifyContent: "flex-start", marginBottom: 20 }]}>
                      {ROLE_CATEGORIES.map((cat) => (
                        <Hoverable
                          key={cat}
                          onPress={() => setEditingRole({ ...editingRole, category: cat })}
                          style={[
                            styles.catButton,
                            {
                              borderColor: getCategoryColor(cat, colors),
                              backgroundColor: editingRole.category === cat ? getCategoryColor(cat, colors) : "transparent",
                            } as any,
                          ]}
                        >
                          <Text style={{ fontWeight: "600", color: editingRole.category === cat ? "white" : getCategoryColor(cat, colors) }}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " ")}
                          </Text>
                        </Hoverable>
                      ))}
                    </View>

                    <Text style={styles.fieldLabel}>Intitulé du poste {formErrors.title && <Text style={{ color: "red", fontSize: 11 }}>- {formErrors.title}</Text>}</Text>
                    <View style={[styles.rowWrap, { justifyContent: "flex-start", marginBottom: 10 }]}>
                      {(JOB_TITLES[editingRole.category] || []).slice(0, 8).map((job) => (
                        <Hoverable
                          key={job}
                          onPress={() => setEditingRole({ ...editingRole, title: job })}
                          style={[styles.jobChip, editingRole.title === job && styles.jobChipSelected]}
                        >
                          <Text style={{ color: editingRole.title === job ? "white" : colors.text, fontSize: 13 }}>{job}</Text>
                        </Hoverable>
                      ))}
                    </View>
                    <TextInput
                      placeholder="Ou tapez un intitulé personnalisé..."
                      style={styles.formInput}
                      placeholderTextColor={colors.text + "60"}
                      value={editingRole.title}
                      onChangeText={(t) => setEditingRole({ ...editingRole, title: t })}
                    />

                    <View style={[styles.formRow, { marginTop: 15 }]}>
                      {!editingRole.id && (
                        <View style={{ width: 100 }}>
                          <Text style={styles.fieldLabel}>Quantité</Text>
                          <TextInput
                            keyboardType="numeric"
                            style={styles.formInput}
                            value={editingRole.quantity}
                            onChangeText={(t) => setEditingRole({ ...editingRole, quantity: t })}
                          />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.fieldLabel}>Description</Text>
                        <TextInput
                          placeholder="Précisions sur les missions..."
                          style={styles.formInput}
                          placeholderTextColor={colors.text + "60"}
                          value={editingRole.description}
                          onChangeText={(t) => setEditingRole({ ...editingRole, description: t })}
                        />
                      </View>
                    </View>
                  </View>

                  {/* SECTION 2: PROFIL RECHERCHÉ */}
                  <View style={styles.formSection}>
                    <View style={styles.formSectionHeader}>
                      <Ionicons name="person-outline" size={18} color={colors.primary} />
                      <Text style={styles.formSectionTitle}>Profil recherché</Text>
                    </View>

                    <Text style={styles.fieldLabel}>Expérience</Text>
                    <View style={[styles.rowWrap, { justifyContent: "flex-start", marginBottom: 15 }]}>
                      {["debutant", "intermediaire", "confirme"].map((lvl) => (
                        <Hoverable
                          key={lvl}
                          onPress={() => toggleMultiValue("experience", lvl)}
                          style={[
                            styles.catButton,
                            toArray(editingRole.experience).includes(lvl) && { backgroundColor: colors.primary, borderColor: colors.primary },
                          ]}
                        >
                          <Text style={{ color: toArray(editingRole.experience).includes(lvl) ? "white" : colors.text }}>
                            {lvl === "debutant" ? "Débutant" : lvl === "intermediaire" ? "Intermédiaire" : "Confirmé"}
                          </Text>
                        </Hoverable>
                      ))}
                    </View>

                    <View style={styles.formRow}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Sexe</Text>
                        <View style={[styles.rowWrap, { justifyContent: "flex-start" }]}>
                          {["homme", "femme", "autre"].map((g) => (
                            <Hoverable
                              key={g}
                              onPress={() => toggleMultiValue("gender", g)}
                              style={[
                                styles.catButton,
                                toArray(editingRole.gender).includes(g) && { backgroundColor: colors.primary, borderColor: colors.primary },
                              ]}
                            >
                              <Text style={{ color: toArray(editingRole.gender).includes(g) ? "white" : colors.text }}>
                                {g.charAt(0).toUpperCase() + g.slice(1)}
                              </Text>
                            </Hoverable>
                          ))}
                        </View>
                      </View>
                    </View>

                    <View style={styles.formRow}>
                      <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Âge minimum</Text>
                        <TextInput
                          keyboardType="numeric"
                          placeholder="Ex: 18"
                          style={styles.formInput}
                          placeholderTextColor={colors.text + "60"}
                          value={editingRole.ageMin}
                          onChangeText={(t) => setEditingRole({ ...editingRole, ageMin: t })}
                        />
                      </View>
                      <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Âge maximum</Text>
                        <TextInput
                          keyboardType="numeric"
                          placeholder="Ex: 99"
                          style={styles.formInput}
                          placeholderTextColor={colors.text + "60"}
                          value={editingRole.ageMax}
                          onChangeText={(t) => setEditingRole({ ...editingRole, ageMax: t })}
                        />
                      </View>
                    </View>

                    {/* Champs spécifiques (Taille, Cheveux, etc. pour Acteurs) */}
                    <View style={{ marginTop: 10 }}>
                      <RoleFormFields
                        category={editingRole.category}
                        data={editingRole}
                        onChange={setEditingRole}
                      />
                    </View>
                  </View>

                  {/* SECTION 3: CONDITIONS */}
                  <View style={styles.formSection}>
                    <View style={styles.formSectionHeader}>
                      <Ionicons name="card-outline" size={18} color={colors.primary} />
                      <Text style={styles.formSectionTitle}>Conditions & Rémunération</Text>
                    </View>

                    <Text style={styles.fieldLabel}>Type de contrat</Text>
                    <View style={[styles.rowWrap, { justifyContent: "flex-start", marginBottom: 15 }]}>
                      <Hoverable
                        onPress={() => setEditingRole({ ...editingRole, isPaid: true })}
                        style={[styles.catButton, editingRole.isPaid && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      >
                        <Text style={{ color: editingRole.isPaid ? "white" : colors.text }}>Rémunéré</Text>
                      </Hoverable>
                      <Hoverable
                        onPress={() => setEditingRole({ ...editingRole, isPaid: false })}
                        style={[styles.catButton, !editingRole.isPaid && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      >
                        <Text style={{ color: !editingRole.isPaid ? "white" : colors.text }}>Bénévole</Text>
                      </Hoverable>
                    </View>

                    {editingRole.isPaid && (
                      <View style={{ marginTop: 5 }}>
                        <Text style={styles.fieldLabel}>Détails de la rémunération {formErrors.remunerationAmount && <Text style={{ color: "red", fontSize: 11 }}>- {formErrors.remunerationAmount}</Text>}</Text>
                        <TextInput
                          placeholder="Ex: 150€ / jour, Cachet global, selon profil..."
                          style={styles.formInput}
                          placeholderTextColor={colors.text + "60"}
                          value={editingRole.remunerationAmount}
                          onChangeText={(t) => setEditingRole({ ...editingRole, remunerationAmount: t })}
                        />
                      </View>
                    )}
                  </View>

                  {/* SECTION 4: DIFFUSION */}
                  <View style={styles.formSection}>
                    <View style={styles.formSectionHeader}>
                      <Ionicons name="megaphone-outline" size={18} color={colors.primary} />
                      <Text style={styles.formSectionTitle}>Visibilité</Text>
                    </View>

                    <Text style={styles.fieldLabel}>Statut de l'annonce</Text>
                    {editingRole.assignee && editingRole.status === "assigned" ? (
                      <View style={{ backgroundColor: colors.backgroundSecondary, padding: 12, borderRadius: 10 }}>
                        <Text style={{ color: colors.text + "80", fontStyle: "italic", textAlign: "center", fontSize: 13 }}>
                          Ce rôle est déjà confirmé (assigné).
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.rowWrap, { justifyContent: "flex-start", marginBottom: 15 }]}>
                        {["draft", "published"].map((st) => (
                          <Hoverable
                            key={st}
                            onPress={() => setEditingRole({ ...editingRole, status: st as any, ...(st === "draft" ? { createPost: false } : {}) })}
                            style={[
                              styles.catButton,
                              editingRole.status === st && { backgroundColor: st === "draft" ? "#FF9800" : colors.primary, borderColor: "transparent" },
                            ]}
                          >
                            <Text style={{ color: editingRole.status === st ? "white" : colors.text }}>
                              {st === "draft" ? "Brouillon (Interne)" : "Publié (Ouvert au casting)"}
                            </Text>
                          </Hoverable>
                        ))}
                      </View>
                    )}

                    <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Diffusion</Text>
                    <View style={[styles.rowWrap, { justifyContent: "flex-start", marginBottom: 15 }]}>
                      <Hoverable
                        onPress={() => setEditingRole({ ...editingRole, createPost: false })}
                        disabled={editingRole.status !== "published"}
                        style={[
                          styles.catButton,
                          !editingRole.createPost && { backgroundColor: colors.primary, borderColor: colors.primary },
                          editingRole.status !== "published" && { opacity: 0.5 },
                        ]}
                      >
                        <Text style={{ color: !editingRole.createPost ? "white" : colors.text }}>Jobs uniquement</Text>
                      </Hoverable>
                      <Hoverable
                        onPress={() => setEditingRole({ ...editingRole, createPost: true })}
                        disabled={editingRole.status !== "published"}
                        style={[
                          styles.catButton,
                          editingRole.createPost && { backgroundColor: colors.primary, borderColor: colors.primary },
                          editingRole.status !== "published" && { opacity: 0.5 },
                        ]}
                      >
                        <Text style={{ color: editingRole.createPost ? "white" : colors.text }}>Jobs + Feed</Text>
                      </Hoverable>
                    </View>

                    <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Assigner quelqu'un (optionnel)</Text>
                    {editingRole.assignee ? (
                      <View style={[styles.assignedCard, { backgroundColor: colors.backgroundSecondary, borderStyle: 'solid', borderWidth: 1, borderColor: colors.primary + '40' }]}>
                        <Ionicons name="person-circle-outline" size={24} color={colors.primary} />
                        <Text style={{ fontWeight: "600", flex: 1, color: colors.text, marginLeft: 8 }}>{editingRole.assignee.label}</Text>
                        <Hoverable onPress={() => setEditingRole({ ...editingRole, assignee: null })}>
                          <Ionicons name="close-circle" size={20} color={colors.text + "60"} />
                        </Hoverable>
                      </View>
                    ) : (
                      <Hoverable
                        onPress={() => {
                          setIsSearchingProfileInForm(true);
                          searchProfilesForForm("");
                        }}
                        style={{
                          padding: 12,
                          borderWidth: 1,
                          borderColor: colors.primary,
                          borderStyle: "dashed",
                          borderRadius: 10,
                          alignItems: "center",
                          backgroundColor: colors.primary + "08",
                        }}
                      >
                        <Text style={{ color: colors.primary, fontWeight: "600" }}>+ Choisir un profil</Text>
                      </Hoverable>
                    )}
                  </View>
                  <Hoverable
                    style={
                      {
                        backgroundColor: colors.primary,
                        padding: 15,
                        borderRadius: 8,
                        alignItems: "center",
                        marginTop: 20,
                        opacity: isSavingRole ? 0.7 : 1,
                        cursor: isSavingRole ? "default" : "pointer",
                      } as any
                    }
                    onPress={handleSaveRoleForm}
                    disabled={isSavingRole}
                    hoverStyle={{ opacity: 0.9, transform: [{ scale: 1.01 }] }}
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
                  </Hoverable>
                  <View style={{ height: 50 }} />
                </>
              )}

              {editingRole && isSearchingProfileInForm && (
                <View>
                  <Hoverable
                    onPress={() => setIsSearchingProfileInForm(false)}
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
                    <Text style={{ color: colors.text + "B3", fontSize: 16 }}>
                      ← Retour
                    </Text>
                  </Hoverable>
                  <TextInput
                    placeholder="Rechercher (nom, pseudo, ville)..."
                    style={[
                      styles.input,
                      { textAlign: "left", paddingLeft: 10 },
                    ]}
                    placeholderTextColor={colors.text + "80"}
                    value={formSearchQuery}
                    onChangeText={searchProfilesForForm}
                    autoFocus
                  />
                  {isFormSearching ? (
                    <View style={{ padding: 20, alignItems: "center" }}>
                      <SpinningClap size={30} color={colors.primary} />
                    </View>
                  ) : (
                    <FlatList
                      data={formSearchResults}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
                      renderItem={({ item }) => (
                        <Hoverable
                          style={
                            {
                              padding: 12,
                              borderBottomWidth: 1,
                              borderColor: colors.border,
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              cursor: "pointer",
                            } as any
                          }
                          onPress={() => selectProfileInForm(item)}
                          hoverStyle={{
                            backgroundColor: colors.backgroundSecondary,
                          }}
                        >
                          <View>
                            <Text style={{ fontWeight: "600", fontSize: 16, color: colors.text }}>
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
                                    color: colors.primary,
                                    fontWeight: "600",
                                  }}
                                >
                                  {item.role.toUpperCase()}
                                </Text>
                              )}
                              {item.ville ? (
                                <Text style={{ fontSize: 12, color: colors.text + "99" }}>
                                  {item.role ? `• ${item.ville}` : item.ville}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                          <Ionicons
                            name="add-circle-outline"
                            size={24}
                            color={colors.primary}
                          />
                        </Hoverable>
                      )}
                    />
                  )}
                </View>
              )}
            </ScrollView>
          </View>
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
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <Text style={{ color: colors.text + "99", marginBottom: 15 }}>
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
                          borderColor: colors.border,
                          borderRadius: 8,
                          padding: 10,
                          marginBottom: 10,
                          backgroundColor: isDark ? colors.backgroundSecondary : "#f9f9f9",
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
                            style={{ fontWeight: "bold", color: colors.primary }}
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
                                color={colors.text + "99"}
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => deleteRole(roleItem.id)}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={18}
                                color="#FF4444"
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

                        {/* BOOST BUTTON */}
                        {!isDraft && !assignedUser && (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              marginBottom: 10,
                              gap: 8,
                            }}
                          >
                            <TouchableOpacity
                              onPress={() => {
                                // 1. Save and Close Group Modal
                                savedManageRole.current = manageRole;
                                setManageRole(null);

                                // 2. Open Boost Modal (delayed)
                                setRoleToBoost(roleItem);
                                setTimeout(
                                  () => setBoostModalVisible(true),
                                  100,
                                );
                              }}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                backgroundColor: roleItem.is_boosted
                                  ? "#FFF8E1"
                                  : "transparent",
                                borderWidth: 1,
                                borderColor: "#FFD700",
                                padding: 6,
                                borderRadius: 4,
                                alignSelf: "flex-start",
                              }}
                              disabled={roleItem.is_boosted}
                            >
                              <Ionicons
                                name="flash"
                                size={16}
                                color="#FFD700"
                              />
                              <Text
                                style={{
                                  marginLeft: 6,
                                  fontSize: 12,
                                  fontWeight: "600",
                                  color: "#DAA520",
                                }}
                              >
                                {roleItem.is_boosted
                                  ? "Boost Actif"
                                  : "Booster (5€)"}
                              </Text>
                            </TouchableOpacity>

                            {!roleItem.is_boosted && (
                              <TouchableOpacity
                                onPress={() =>
                                  Alert.alert(
                                    "Booster une annonce",
                                    "Le boost permet d'afficher votre annonce en tête des résultats de recherche pendant 48h. Elle sera mise en valeur avec un badge 'Sponsorisé'.",
                                  )
                                }
                                style={{ padding: 4 }}
                              >
                                <Ionicons
                                  name="information-circle-outline"
                                  size={20}
                                  color="#999"
                                />
                              </TouchableOpacity>
                            )}
                          </View>
                        )}

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
                                <Text style={{ color: colors.text + "80", fontSize: 12 }}>
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
                    <SpinningClap size={30} color={colors.primary} />
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
                            borderColor: colors.border,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                          onPress={() => assignUserToRole(u)}
                        >
                          <View>
                            <Text style={{ fontWeight: "600", fontSize: 16, color: colors.text }}>
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
                                    color: colors.primary,
                                    fontWeight: "600",
                                  }}
                                >
                                  {u.role.toUpperCase()}
                                </Text>
                              )}
                              {u.ville ? (
                                <Text style={{ fontSize: 12, color: colors.text + "80" }}>
                                  {u.role ? `• ${u.ville}` : u.ville}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                          <Ionicons
                            name="add-circle-outline"
                            size={20}
                            color={colors.primary}
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
        <View
          style={{ flex: 1, backgroundColor: colors.background, alignItems: "center" }}
        >
          <View style={{ flex: 1, width: "100%", maxWidth: 800, padding: 20 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                marginTop: 20,
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: "bold", color: colors.text }}>
                Candidatures ({applications.length})
              </Text>
              <TouchableOpacity
                onPress={() => setApplicationsModalVisible(false)}
              >
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={applications}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text
                  style={{ textAlign: "center", color: colors.text + "80", marginTop: 50 }}
                >
                  Aucune candidature en attente.
                </Text>
              }
              renderItem={({ item }) => (
                <View
                  style={{
                    padding: 15,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    marginBottom: 10,
                    backgroundColor: colors.card,
                  }}
                >
                  <View style={{ marginBottom: 10 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setApplicationsModalVisible(false);
                        router.push(`/profile/${item.candidate_id}`);
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: "bold",
                          fontSize: 16,
                          color: colors.primary,
                          textDecorationLine: "underline",
                        }}
                      >
                        {item.profiles?.full_name || item.profiles?.username}
                      </Text>
                    </TouchableOpacity>
                    <Text style={{ color: colors.text + "99" }}>
                      Candidat pour :{" "}
                      <Text style={{ fontWeight: "600", color: colors.text }}>
                        {item.project_roles?.title}
                      </Text>
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.text + "80", marginTop: 4 }}>
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
        </View>
      </Modal>

      <PaymentModal
        visible={boostModalVisible}
        amount={5.0}
        label={`Booster l'annonce "${roleToBoost?.title}"`}
        onClose={() => {
          setBoostModalVisible(false);
          // Restore Group Modal on cancel too
          setTimeout(() => {
            if (savedManageRole.current) {
              setManageRole(savedManageRole.current);
              savedManageRole.current = null;
            }
          }, 300);
        }}
        onSuccess={handleBoostSuccess}
      />
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    color: colors.text,
  },
  subtitle: { color: isDark ? "#aaa" : "#666", marginTop: 5, textAlign: "center" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: colors.text },

  roleCard: {
    flexDirection: "row",
    backgroundColor: colors.card,
    padding: 18,
    borderRadius: 16,
    marginBottom: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.4 : 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: isDark ? colors.border : "#f0f0f0",
  },
  roleCategoryTag: {
    fontSize: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontWeight: "800",
    overflow: "hidden",
    marginRight: 5,
    letterSpacing: 0.5,
  },
  roleTitle: { fontWeight: "700", fontSize: 17, color: colors.text },
  descText: { fontSize: 13, color: isDark ? "#aaa" : "#666", marginTop: 4, lineHeight: 18 },

  assignedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: isDark ? "#1B5E20" : "#E8F5E9",
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 20,
    maxHeight: "85%",
    width: "100%",
    maxWidth: 600,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: colors.backgroundSecondary,
    textAlign: "center",
    color: colors.text,
  },
  label: {
    marginBottom: 8,
    fontWeight: "600",
    fontSize: 13,
    color: colors.text,
    textAlign: "center",
  },

  catButton: {
    padding: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 20,
    marginRight: 8,
    borderColor: colors.border,
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
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jobChipSelected: { backgroundColor: colors.primary },

  // Form Structure
  formSection: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
  },
  formSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
    textAlign: "left",
  },
  formInput: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
});

function setResults(arg0: never[]) {
  throw new Error("Function not implemented.");
}
