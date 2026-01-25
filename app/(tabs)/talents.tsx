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
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

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
      fetchPendingCount();
    }, []),
  );

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
      <View style={GlobalStyles.card}>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 15 }}
          onPress={() =>
            router.push({ pathname: "/profile/[id]", params: { id: item.id } })
          }
        >
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
            <Text style={GlobalStyles.caption}>
              {item.city || item.ville || item.location || item.website || ""}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.light.tabIconDefault}
          />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: "Profils",
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
      {/* HEADER FILTERS */}
      <View
        style={{
          backgroundColor: Colors.light.background,
          paddingVertical: 10,
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

      {loading ? (
        <ClapLoading
          size={50}
          color={Colors.light.primary}
          style={{ marginTop: 30 }}
        />
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          renderItem={renderProfile}
          contentContainerStyle={{ padding: 15, paddingBottom: 120 }}
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
});
