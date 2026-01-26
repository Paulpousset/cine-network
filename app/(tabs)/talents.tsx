import ClapLoading from "@/components/ClapLoading";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { JOB_TITLES } from "@/utils/roles";
import { fuzzySearch } from "@/utils/search";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

const ROLE_CATEGORIES = ["all", ...Object.keys(JOB_TITLES)];

export default function DiscoverProfiles() {
  const router = useRouter();
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [suggestedProfiles, setSuggestedProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Filters State
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [query, setQuery] = useState<string>(""); // recherche libre (nom)

  // Modals
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchCurrentUserId();
      fetchPendingCount();
    }, []),
  );

  async function fetchCurrentUserId() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      setCurrentUserId(session.user.id);
      fetchSuggestions(session.user.id);
    }
  }

  async function fetchSuggestions(uid: string) {
    try {
      setLoadingSuggestions(true);

      // 1. Trouver les IDs des tournages auxquels je participe ou que je possède
      const { data: myOwned } = await supabase
        .from("tournages")
        .select("id")
        .eq("owner_id", uid);

      const { data: myParticipations } = await supabase
        .from("project_roles")
        .select("tournage_id")
        .eq("assigned_profile_id", uid);

      const myTournageIds = [
        ...(myOwned?.map((t) => t.id) || []),
        ...(myParticipations?.map((p) => p.tournage_id) || []),
      ].filter((id) => id);

      if (myTournageIds.length === 0) {
        setSuggestedProfiles([]);
        return;
      }

      // 2. Trouver tous les autres profils travaillant sur ces mêmes tournages
      const { data: colleagues, error } = await supabase
        .from("project_roles")
        .select(
          `
          assigned_profile:profiles (*)
        `,
        )
        .in("tournage_id", myTournageIds)
        .not("assigned_profile_id", "is", null)
        .neq("assigned_profile_id", uid);

      if (error) throw error;

      // 3. Récupérer mes relations actuelles (acceptées ou en attente) pour les exclure
      const { data: myConnections } = await supabase
        .from("connections")
        .select("receiver_id, requester_id")
        .or(`receiver_id.eq.${uid},requester_id.eq.${uid}`);

      const connectedIds = new Set(
        myConnections?.flatMap((c) => [c.receiver_id, c.requester_id]) || [],
      );

      // Dédupliquer les profils et exclure les relations existantes
      const uniqueColleagues = new Map();
      colleagues?.forEach((c: any) => {
        if (
          c.assigned_profile &&
          !uniqueColleagues.has(c.assigned_profile.id) &&
          !connectedIds.has(c.assigned_profile.id)
        ) {
          uniqueColleagues.set(c.assigned_profile.id, c.assigned_profile);
        }
      });

      setSuggestedProfiles(Array.from(uniqueColleagues.values()));
    } catch (e) {
      console.error("Error fetching suggestions:", e);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function fetchPendingCount() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const { count } = await supabase
      .from("connections")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", session.user.id)
      .eq("status", "pending");
    setPendingCount(count || 0);
  }

  // 1. Fetch data when server-side filters change
  useEffect(() => {
    fetchProfiles();
    fetchCities();
  }, [selectedRole, selectedCity]);

  // 2. Client-side filtering when query or data changes
  useEffect(() => {
    const normalizedQuery = query.trim();
    let filtered = allProfiles;

    if (normalizedQuery) {
      filtered = fuzzySearch(
        allProfiles,
        ["full_name", "username", "city", "ville", "location", "website"],
        normalizedQuery,
      );
    }
    setProfiles(filtered);
  }, [query, allProfiles]);

  async function fetchCities() {
    try {
      // Pour les profils, on regarde la colonne 'city' (ou ville/location selon le schéma)
      // Supposons 'city' comme dans l'interface
      const { data, error } = await supabase
        .from("profiles")
        .select("city")
        .not("city", "is", null);

      if (error) throw error;
      const cities = Array.from(
        new Set(
          data
            ?.map((p) => p.city)
            .filter((c) => c)
            .map((c) => c!.trim()),
        ),
      ).sort();
      setAvailableCities(["all", ...cities]);
    } catch (e) {
      console.log("Error fetching cities", e);
    }
  }

  async function sendConnectionRequest(targetId: string) {
    try {
      if (!currentUserId) return;

      const { error } = await supabase.from("connections").insert({
        requester_id: currentUserId,
        receiver_id: targetId,
        status: "pending",
      });

      if (error) throw error;

      Alert.alert("Succès", "Demande de connexion envoyée !");

      // Mettre à jour la liste des suggestions localement
      setSuggestedProfiles((prev) => prev.filter((p) => p.id !== targetId));
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible d'envoyer la demande");
    }
  }

  async function fetchProfiles() {
    try {
      setLoading(true);

      // On récupère d'abord, avec filtre role côté serveur si possible
      let q = supabase.from("profiles").select("*");

      if (selectedRole !== "all") {
        q = q.eq("role", selectedRole);
      }

      if (selectedCity !== "all") {
        q = q.eq("city", selectedCity);
      }

      const { data, error } = await q;
      if (error) throw error;

      const list = (data as any[]) || [];
      setAllProfiles(list);
    } catch (error) {
      Alert.alert("Erreur", (error as Error).message);
    } finally {
      setLoading(false);
    }
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

  function renderProfile({ item }: { item: any }) {
    return (
      <TouchableOpacity
        style={GlobalStyles.card}
        onPress={() =>
          router.push({ pathname: "/profile/[id]", params: { id: item.id } })
        }
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {(item.full_name || item.username || "?")
                  .charAt(0)
                  .toUpperCase()}
              </Text>
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={GlobalStyles.title2}>
              {item.full_name || item.username || "Profil"}
            </Text>
            <Text style={[styles.role, { color: Colors.light.primary }]}>
              {(item.role || "").toString().replace("_", " ")}
            </Text>
            {item.city && (
              <Text style={GlobalStyles.caption}>
                📍 {item.city || item.ville || item.location}
              </Text>
            )}
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.light.tabIconDefault}
          />
        </View>
      </TouchableOpacity>
    );
  }

  function renderSuggestion({ item }: { item: any }) {
    return (
      <TouchableOpacity
        style={styles.suggestionCard}
        onPress={() =>
          router.push({ pathname: "/profile/[id]", params: { id: item.id } })
        }
      >
        {item.avatar_url ? (
          <Image
            source={{ uri: item.avatar_url }}
            style={styles.suggestionAvatar}
          />
        ) : (
          <View style={[styles.suggestionAvatar, styles.avatarPlaceholder]}>
            <Text style={styles.suggestionAvatarText}>
              {(item.full_name || item.username || "?").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.suggestionName} numberOfLines={1}>
          {item.full_name || item.username}
        </Text>
        <Text style={styles.suggestionRole} numberOfLines={1}>
          {item.role?.replace("_", " ")}
        </Text>
        <View style={styles.suggestionBadge}>
          <Text style={styles.suggestionBadgeText}>Mutual</Text>
        </View>

        <TouchableOpacity
          style={styles.connectButton}
          onPress={(e) => {
            e.stopPropagation();
            sendConnectionRequest(item.id);
          }}
        >
          <Ionicons name="person-add" size={14} color="white" />
          <Text style={styles.connectButtonText}>Clap</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  const ListHeader = () => (
    <View>
      {/* En-tête spécifique au Web car le header natif est masqué */}
      {Platform.OS === "web" && (
        <View style={styles.webHeader}>
          <Text style={styles.webHeaderTitle}>Réseau</Text>
          <View style={{ flexDirection: "row", gap: 20 }}>
            <TouchableOpacity
              onPress={() => router.push("/network/connections")}
              style={styles.webHeaderButton}
            >
              <Ionicons name="people" size={22} color={Colors.light.text} />
              <Text style={styles.webHeaderButtonText}>Mes relations</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push("/network/requests")}
              style={styles.webHeaderButton}
            >
              <View>
                <Ionicons
                  name="notifications"
                  size={22}
                  color={
                    pendingCount > 0 ? Colors.light.danger : Colors.light.text
                  }
                />
                {pendingCount > 0 && <View style={styles.notificationBadge} />}
              </View>
              <Text style={styles.webHeaderButtonText}>
                Demandes {pendingCount > 0 ? `(${pendingCount})` : ""}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* SECTION SUGGESTIONS */}
      {suggestedProfiles.length > 0 && (
        <View style={styles.suggestionsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Suggestions de réseau</Text>
            <Text style={styles.sectionSubtitle}>Basé sur vos tournages</Text>
          </View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={suggestedProfiles}
            keyExtractor={(item) => "suggested-" + item.id}
            renderItem={renderSuggestion}
            contentContainerStyle={styles.suggestionsList}
          />
        </View>
      )}

      {/* HEADER FILTERS */}
      <View
        style={{
          backgroundColor: Colors.light.background,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: Colors.light.border,
          marginBottom: 10,
        }}
      >
        <View style={styles.filtersRow}>
          {renderFilterButton(
            "Catégorie",
            selectedRole === "all"
              ? "Toutes"
              : selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1),
            () => setCategoryModalVisible(true),
          )}

          {renderFilterButton(
            "Ville",
            selectedCity === "all" ? "Toutes" : selectedCity,
            () => setCityModalVisible(true),
          )}
        </View>

        <View style={styles.searchRow}>
          <TextInput
            placeholder="Rechercher par nom..."
            value={query}
            onChangeText={setQuery}
            style={[GlobalStyles.input, styles.searchInput]}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: "Réseau",
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 15, marginRight: 15 }}>
              <TouchableOpacity
                onPress={() => router.push("/network/connections")}
              >
                <Ionicons name="people" size={24} color={Colors.light.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push("/network/requests")}
              >
                <View>
                  <Ionicons
                    name="notifications"
                    size={24}
                    color={
                      pendingCount > 0 ? Colors.light.danger : Colors.light.text
                    }
                  />
                  {pendingCount > 0 && (
                    <View
                      style={{
                        position: "absolute",
                        top: -2,
                        right: -2,
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: Colors.light.danger,
                      }}
                    />
                  )}
                </View>
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {loading ? (
        <ClapLoading
          size={50}
          color={Colors.light.primary}
          style={{ marginTop: 30 }}
        />
      ) : (
        <FlatList
          ListHeaderComponent={ListHeader}
          data={profiles}
          keyExtractor={(item) => item.id}
          renderItem={renderProfile}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 50, color: "#999" }}>
              Aucun profil trouvé.
            </Text>
          }
        />
      )}

      {/* MODAL ROLE */}
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
              <Text style={styles.modalTitle}>Filtrer par Rôle</Text>
              <FlatList
                data={ROLE_CATEGORIES}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedRole(item);
                      setCategoryModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        selectedRole === item && styles.modalItemTextSelected,
                      ]}
                    >
                      {item === "all"
                        ? "Tous"
                        : item.charAt(0).toUpperCase() + item.slice(1)}
                    </Text>
                    {selectedRole === item && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={Colors.light.primary}
                      />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* MODAL VILLE */}
      <Modal
        visible={cityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCityModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setCityModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Filtrer par Ville</Text>
              <FlatList
                data={availableCities}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalItem}
                    onPress={() => {
                      setSelectedCity(item);
                      setCityModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        selectedCity === item && styles.modalItemTextSelected,
                      ]}
                    >
                      {item === "all" ? "Toutes" : item}
                    </Text>
                    {selectedCity === item && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={Colors.light.primary}
                      />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundSecondary },
  filtersRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 4,
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
    marginRight: 4,
  },
  filterValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginRight: 4,
  },
  searchRow: { paddingHorizontal: 20, paddingBottom: 10 },
  searchInput: {
    backgroundColor: Colors.light.backgroundSecondary,
  },
  role: { marginTop: 4, fontWeight: "600" },
  cta: { color: Colors.light.primary, fontWeight: "700" },

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
  modalItemText: { fontSize: 16, color: "#333" },
  modalItemTextSelected: { color: Colors.light.primary, fontWeight: "bold" },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#eee",
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.primary,
  },
  avatarText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },

  // Suggestions
  suggestionsSection: {
    paddingVertical: 15,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  sectionHeaderRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.light.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  suggestionsList: {
    paddingHorizontal: 15,
  },
  suggestionCard: {
    width: 130,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 5,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  suggestionAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  suggestionAvatarText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  suggestionName: {
    fontSize: 13,
    fontWeight: "bold",
    color: Colors.light.text,
    textAlign: "center",
  },
  suggestionRole: {
    fontSize: 11,
    color: Colors.light.primary,
    textAlign: "center",
    marginTop: 2,
    textTransform: "capitalize",
  },
  suggestionBadge: {
    backgroundColor: Colors.light.tint + "15",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 8,
  },
  suggestionBadgeText: {
    fontSize: 10,
    color: Colors.light.tint,
    fontWeight: "bold",
  },
  connectButton: {
    marginTop: 10,
    backgroundColor: Colors.light.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    gap: 5,
    width: "100%",
    justifyContent: "center",
  },
  connectButtonText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
  },
  // Web Header
  webHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  webHeaderTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.light.text,
  },
  webHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  webHeaderButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.danger,
  },
});
