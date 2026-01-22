import { JOB_TITLES } from "@/utils/roles";
import { fuzzySearch } from "@/utils/search";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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

  // Filters State
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [query, setQuery] = useState<string>(""); // recherche libre (nom)

  // Modals
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

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
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {item.full_name || item.username || "Profil"}
          </Text>
          <Text style={styles.role}>
            {(item.role || "").toString().replace("_", " ")}
          </Text>
          <Text style={styles.meta}>
            {item.city || item.ville || item.location || item.website || ""}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            router.push({ pathname: "/profile/[id]", params: { id: item.id } })
          }
        >
          <Text style={styles.cta}>Voir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER FILTERS */}
      <View style={{ backgroundColor: "white", paddingVertical: 10 }}>
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
            style={styles.searchInput}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#841584"
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
                      <Ionicons name="checkmark" size={18} color="#841584" />
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
                      <Ionicons name="checkmark" size={18} color="#841584" />
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
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    paddingHorizontal: 20,
    marginTop: 40,
    marginBottom: 10,
  },
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
    backgroundColor: "#f5f5f5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
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
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "white",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: 15, // Added margin for card list
  },
  name: { fontSize: 16, fontWeight: "700" },
  role: { color: "#841584", marginTop: 4, fontWeight: "600" },
  meta: { color: "#666", marginTop: 6, fontSize: 12 },
  cta: { color: "#841584", fontWeight: "700" },

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
  modalItemTextSelected: { color: "#841584", fontWeight: "bold" },
});
