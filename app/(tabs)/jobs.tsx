import AppMap, { Marker, PROVIDER_DEFAULT } from "@/components/AppMap";
import ClapLoading from "@/components/ClapLoading";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { appEvents, EVENTS } from "@/lib/events";
import { getRecommendedRoles } from "@/lib/matching";
import { JOB_TITLES } from "@/utils/roles";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    useWindowDimensions,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

// On récupère les clés de ton fichier rolesList.ts
const ROLE_CATEGORIES = ["all", ...Object.keys(JOB_TITLES)];

// Type enrichi avec les infos du tournage
type RoleWithProject = {
  id: string;
  title: string;
  description?: string;
  category: string;
  tournage_id: string;
  status?: string;
  is_boosted?: boolean;
  boost_expires_at?: string;
  tournages: {
    id: string;
    title: string;
    type: string;
    pays?: string | null;
    ville?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
};

export default function Discover() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWebLarge = Platform.OS === "web" && width >= 768;
  const [allRoles, setAllRoles] = useState<RoleWithProject[]>([]);
  const [roles, setRoles] = useState<RoleWithProject[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Recommendations
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [isRecsCollapsed, setIsRecsCollapsed] = useState(false); // State to toggle recommendations visibility

  // View Content Type: 'roles' (Jobs) or 'projects' (Tournages)
  const [contentType, setContentType] = useState<"roles" | "projects">("roles");
  // View Mode: 'list' or 'map'
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");

  // Modals
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);

  // Data for filters
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // 1. Fetch data from DB when category/city changes
  useEffect(() => {
    fetchRoles();
  }, [selectedCategory, selectedCity]);

  // 2. Filter data globally when search query changes (client-side for better reactive feel)
  useEffect(() => {
    applyFilters();
  }, [searchQuery, allRoles]);

  useEffect(() => {
    fetchCities();
    fetchRecommendations();
    fetchProfile();
    const unsub = appEvents.on(EVENTS.PROFILE_UPDATED, fetchProfile);
    return unsub;
  }, []);

  async function fetchProfile() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", session.user.id)
        .single();
      if (profile) setAvatarUrl(profile.avatar_url);
    }
  }

  async function fetchRecommendations() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get User Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (!profile) return;

      // 2. Get Open Roles
      const { data: roles } = await supabase
        .from("project_roles")
        .select(
          `
                *,
                tournages (*)
            `,
        )
        .eq("status", "published")
        .is("assigned_profile_id", null)
        .limit(50); // Limit for performance

      if (!roles) return;

      // 3. Calculate
      const recs = getRecommendedRoles(profile, roles);
      setRecommendations(recs.slice(0, 3)); // Top 3
    } catch (e) {
      console.log("Error fetching recommendations", e);
    }
  }

  async function fetchCities() {
    try {
      const { data, error } = await supabase
        .from("tournages")
        .select("ville")
        .not("ville", "is", null);

      if (error) throw error;

      const cities = Array.from(
        new Set(
          data
            ?.map((t) => t.ville)
            .filter((v) => v)
            .map((v) => v!.trim()),
        ),
      ).sort();

      setAvailableCities(["all", ...cities]);
    } catch (e) {
      console.log("Error fetching cities", e);
    }
  }

  async function fetchRoles() {
    try {
      setLoading(true);

      let query = supabase
        .from("project_roles")
        .select(
          `
          *,
          tournages ( id, title, type, pays, ville, latitude, longitude )
        `,
        )
        .order("is_boosted", { ascending: false })
        .order("created_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      if (selectedCity !== "all") {
        query = query.eq("tournages.ville", selectedCity);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter out draft and assigned roles client-side
      const visible = ((data as any[]) || []).filter(
        (r) => r.status === "published" && r.tournages, // Ensure tournage data is present
      );
      setAllRoles(visible);
    } catch (error) {
      Alert.alert("Erreur", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    let filtered = [...allRoles];

    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((r) => {
        const roleTitle = (r.title || "").toLowerCase();
        const roleDesc = (r.description || "").toLowerCase();
        const projectTitle = (r.tournages?.title || "").toLowerCase();
        const projectVille = (r.tournages?.ville || "").toLowerCase();

        return (
          roleTitle.includes(s) ||
          roleDesc.includes(s) ||
          projectTitle.includes(s) ||
          projectVille.includes(s)
        );
      });
    }

    setRoles(filtered);

    // Derive unique projects from filtered roles
    const uniqueProjectsMap = new Map();
    filtered.forEach((role) => {
      // Robustly handle 'tournages' join which might be an object or an array
      let t = role.tournages;
      if (Array.isArray(t)) t = t[0];

      if (t && t.id) {
        if (!uniqueProjectsMap.has(t.id)) {
          uniqueProjectsMap.set(t.id, {
            ...t,
            roleCount: 1,
            roles: [role],
          });
        } else {
          const p = uniqueProjectsMap.get(t.id);
          p.roleCount++;
          p.roles.push(role);
        }
      }
    });
    setProjects(Array.from(uniqueProjectsMap.values()));
  }

  function renderProject({ item }: { item: any }) {
    return (
      <TouchableOpacity
        style={GlobalStyles.card}
        onPress={() => router.push(`/project/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.projectTitle, { fontSize: 18, marginBottom: 4 }]}
            >
              {item.title || "Projet Inconnu"}
            </Text>
            <Text style={styles.projectSubtitle}>
              {item.type?.replace("_", " ")} • {item.ville || "Lieu N/C"}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: Colors.light.tint + "20" },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: Colors.light.tint, fontSize: 12 },
              ]}
            >
              {item.roleCount} OFFRE{item.roleCount > 1 ? "S" : ""}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {item.roles.slice(0, 3).map((r: any) => (
            <View
              key={r.id}
              style={{
                backgroundColor: "#f5f5f5",
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 4,
              }}
            >
              <Text style={{ fontSize: 10, color: "#666" }}>{r.title}</Text>
            </View>
          ))}
          {item.roles.length > 3 && (
            <Text style={{ fontSize: 10, color: "#999", alignSelf: "center" }}>
              +{item.roles.length - 3} autres
            </Text>
          )}
        </View>

        <Text style={styles.ctaText}>Voir le projet →</Text>
      </TouchableOpacity>
    );
  }

  function renderRole({ item }: { item: RoleWithProject }) {
    const isBoosted = item.is_boosted;

    return (
      <TouchableOpacity
        style={[
          GlobalStyles.card,
          isBoosted && {
            borderColor: "#FFD700",
            borderWidth: 1,
            backgroundColor: "#FFFBE6", // Very light yellow
          },
        ]}
        onPress={() => router.push(`/project/role/${item.id}`)}
      >
        {/* En-tête avec le nom du PROJET */}
        <View style={styles.cardHeader}>
          <View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text style={styles.projectTitle}>
                {item.tournages?.title || "Projet Inconnu"}
              </Text>
              {isBoosted && (
                <View
                  style={{
                    backgroundColor: "#FFD700",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 4,
                  }}
                >
                  <Text
                    style={{ fontSize: 8, fontWeight: "bold", color: "white" }}
                  >
                    SPONSORISÉ
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.projectSubtitle}>
              {item.tournages?.type?.replace("_", " ")} •{" "}
              {item.tournages?.pays || "Pays ?"}{" "}
              {item.tournages?.ville ? `• ${item.tournages.ville}` : ""}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.category.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Corps avec le RÔLE recherché */}
        <Text style={[GlobalStyles.title2, { color: Colors.light.primary }]}>
          {item.title}
        </Text>

        {item.description ? (
          <Text style={GlobalStyles.body} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <Text style={styles.ctaText}>Voir l'annonce →</Text>
      </TouchableOpacity>
    );
  }

  const renderFilterButton = (
    label: string,
    value: string,
    onPress: () => void,
  ) => (
    <TouchableOpacity style={styles.filterButton} onPress={onPress}>
      <Text style={styles.filterLabel}>{label}:</Text>
      <Text style={styles.filterValue}>{value === "all" ? "Tout" : value}</Text>
      <Ionicons name="chevron-down" size={16} color="#666" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      {Platform.OS === "web" && (
        <View style={styles.webHeader}>
          <TouchableOpacity
            onPress={() => router.push("/account")}
            style={{ marginRight: 15 }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#eee",
                }}
              />
            ) : (
              <Ionicons
                name="person-circle-outline"
                size={32}
                color={Colors.light.text}
              />
            )}
          </TouchableOpacity>
          <Text style={styles.webHeaderTitle}>Offres & Tournages</Text>
        </View>
      )}

      <View style={styles.header}>
        {/* Barre de recherche */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un poste, un projet..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* TABS: ROLES vs PROJETS */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: Colors.light.backgroundSecondary,
            borderRadius: 8,
            padding: 4,
            marginBottom: 15,
          }}
        >
          <TouchableOpacity
            onPress={() => setContentType("roles")}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 6,
              backgroundColor:
                contentType === "roles" ? "white" : "transparent",
              ...(contentType === "roles"
                ? {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 2,
                  }
                : {}),
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontWeight: "600",
                color: contentType === "roles" ? Colors.light.text : "#999",
              }}
            >
              Offres
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setContentType("projects")}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: 6,
              backgroundColor:
                contentType === "projects" ? "white" : "transparent",
              ...(contentType === "projects"
                ? {
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 3,
                    elevation: 2,
                  }
                : {}),
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontWeight: "600",
                color: contentType === "projects" ? Colors.light.text : "#999",
              }}
            >
              Tournages
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: Colors.light.primary,
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 20,
            }}
            onPress={() => setViewMode(viewMode === "list" ? "map" : "list")}
          >
            <Ionicons
              name={viewMode === "list" ? "map" : "list"}
              size={18}
              color="#fff"
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                color: "#fff",
                fontWeight: "600",
                textAlign: "center",
              }}
            >
              {viewMode === "list" ? "Carte" : "Liste"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* FILTRES BOUTONS */}
        <View style={styles.filtersRow}>
          {renderFilterButton(
            "Catégorie",
            selectedCategory === "all"
              ? "Toutes"
              : selectedCategory.charAt(0).toUpperCase() +
                  selectedCategory.slice(1),
            () => setCategoryModalVisible(true),
          )}

          {renderFilterButton(
            "Ville",
            selectedCity === "all" ? "Toutes" : selectedCity,
            () => setCityModalVisible(true),
          )}
        </View>
      </View>

      {/* RECOMMENDATIONS SECTION */}
      {contentType === "roles" && recommendations.length > 0 && (
        <View style={styles.recsWrapper}>
          <TouchableOpacity
            style={[styles.recsSectionHeader, { paddingVertical: 5 }]}
            onPress={() => setIsRecsCollapsed(!isRecsCollapsed)}
            activeOpacity={0.7}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text style={styles.recsSectionTitle}>
                ✨ Recommandé pour vous
              </Text>
              <View
                style={{
                  backgroundColor: Colors.light.tint + "20",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "bold",
                    color: Colors.light.tint,
                  }}
                >
                  {recommendations.length}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 12,
                  color: Colors.light.tint,
                  marginRight: 4,
                }}
              >
                {isRecsCollapsed ? "Afficher" : "Réduire"}
              </Text>
              <Ionicons
                name={isRecsCollapsed ? "chevron-down" : "chevron-up"}
                size={20}
                color={Colors.light.tint}
              />
            </View>
          </TouchableOpacity>

          {!isRecsCollapsed && (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={recommendations}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.recsListContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => router.push(`/project/role/${item.id}`)}
                  style={styles.recCard}
                  activeOpacity={0.9}
                >
                  <View style={styles.recCardHeader}>
                    <View style={styles.matchBadge}>
                      <Text style={styles.matchBadgeText}>
                        {item.matchScore}% Match
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.recCardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>

                  <Text style={styles.recCardSubtitle} numberOfLines={1}>
                    {item.tournages?.title}
                  </Text>

                  <View style={styles.recCardFooter}>
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Ionicons
                        name="location-outline"
                        size={10}
                        color="#666"
                      />
                      <Text style={styles.recCardMeta}>
                        {item.tournages?.ville || "N/C"}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={Colors.light.tint}
                    />
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}

      {loading ? (
        <ClapLoading
          size={50}
          color={Colors.light.primary}
          style={{ marginTop: 50 }}
        />
      ) : viewMode === "map" ? (
        <View style={{ flex: 1 }}>
          <AppMap
            style={{ width: "100%", height: "100%" }}
            provider={PROVIDER_DEFAULT}
            initialRegion={{
              latitude: 46.603354, // Centre France
              longitude: 1.888334,
              latitudeDelta: 10,
              longitudeDelta: 10,
            }}
          >
            {/* 
                CORRECTION: Afficher les PROJETS sur la carte pour éviter les doublons 
                (car tous les rôles d'un projet sont au même endroit).
            */}
            {projects.map((proj) => {
              const lat = parseFloat(String(proj.latitude));
              const lon = parseFloat(String(proj.longitude));

              if (isNaN(lat) || isNaN(lon)) {
                return null;
              }
              // Include lat/lon in key to force re-render if coordinates change
              const key = `proj-${proj.id}-${lat}-${lon}`;
              return (
                <Marker
                  key={key}
                  coordinate={{
                    latitude: lat,
                    longitude: lon,
                  }}
                  title={proj.title}
                  description={`${proj.roleCount} offre(s) • ${proj.type}`}
                  onCalloutPress={() => router.push(`/project/${proj.id}`)}
                >
                  <View style={styles.customMarker}>
                    <Text
                      style={{
                        color: "white",
                        fontWeight: "bold",
                        fontSize: 10,
                      }}
                    >
                      {proj.roleCount}
                    </Text>
                  </View>
                </Marker>
              );
            })}
          </AppMap>
        </View>
      ) : (
        <FlatList
          data={contentType === "roles" ? roles : projects}
          keyExtractor={(item) => item.id}
          renderItem={contentType === "roles" ? renderRole : renderProject}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucun résultat pour le moment.</Text>
          }
        />
      )}

      {/* MODAL CATEGORY */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <TouchableWithoutFeedback
          onPress={() => setCategoryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Choisir une catégorie</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {ROLE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setCategoryModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        selectedCategory === cat &&
                          styles.modalItemTextSelected,
                      ]}
                    >
                      {cat === "all"
                        ? "Tout"
                        : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                    {selectedCategory === cat && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={Colors.light.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL CITY */}
      <Modal
        visible={cityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCityModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setCityModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Choisir une ville</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {availableCities.map((city) => (
                  <TouchableOpacity
                    key={city}
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedCity(city);
                      setCityModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        selectedCity === city && styles.modalItemTextSelected,
                      ]}
                    >
                      {city === "all" ? "Toutes" : city}
                    </Text>
                    {selectedCity === city && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={Colors.light.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundSecondary },
  webHeader: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  webHeaderTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.light.text,
  },
  header: {
    backgroundColor: Colors.light.background,
    paddingTop: 24,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 15,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#333",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 15,
  },
  filtersRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    color: "#666",
  },
  filterValue: {
    fontWeight: "600",
    color: "#333",
    maxWidth: 100,
  },

  listContent: { padding: 15, paddingBottom: 100 },
  emptyText: { textAlign: "center", marginTop: 50, color: "#999" },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  projectTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  projectSubtitle: { fontSize: 12, color: "#999", marginTop: 2 },

  badge: {
    backgroundColor: "#f3e5f5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, color: Colors.light.primary, fontWeight: "bold" },

  divider: { height: 1, backgroundColor: "#eee", marginVertical: 12 },

  roleTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.light.primary,
    marginBottom: 4,
  },
  roleQty: { fontSize: 13, color: "#666", marginBottom: 8 },
  roleDesc: {
    fontSize: 13,
    color: "#444",
    fontStyle: "italic",
    marginBottom: 10,
  },
  ctaText: {
    color: Colors.light.primary,
    fontWeight: "bold",
    textAlign: "right",
    fontSize: 12,
    marginTop: 5,
  },

  // Modal Styles
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
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
  },
  modalItemText: {
    fontSize: 16,
    color: "#333",
  },
  modalItemTextSelected: {
    color: Colors.light.primary,
    fontWeight: "bold",
  },
  customMarker: {
    backgroundColor: Colors.light.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  recsWrapper: {
    paddingVertical: 15,
    backgroundColor: "#f8faff",
    borderBottomWidth: 1,
    borderColor: "#eef2ff",
  },
  recsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  recsSectionTitle: {
    fontWeight: "800",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: Colors.light.primary,
  },
  recsSeeMore: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.tint,
  },
  recsListContent: {
    paddingHorizontal: 15,
  },
  recCard: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    marginHorizontal: 5,
    width: 220,
    shadowColor: "#4f46e5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#eef2ff",
  },
  recCardHeader: {
    marginBottom: 8,
  },
  matchBadge: {
    backgroundColor: "#e0e7ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4f46e5",
  },
  recCardTitle: {
    fontWeight: "700",
    fontSize: 15,
    color: "#1e293b",
    marginBottom: 2,
  },
  recCardSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 8,
  },
  recCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  recCardMeta: {
    fontSize: 10,
    color: "#64748b",
    marginLeft: 4,
    fontWeight: "500",
  },
});
