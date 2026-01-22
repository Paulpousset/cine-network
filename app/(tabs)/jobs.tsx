import { JOB_TITLES } from "@/utils/roles";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { supabase } from "../../lib/supabase";
import { GlobalStyles } from "@/constants/Styles";
import Colors from "@/constants/Colors";

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
  const [roles, setRoles] = useState<RoleWithProject[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");

  // Modals
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);

  // Data for filters
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  useEffect(() => {
    fetchRoles();
    fetchCities();
  }, [selectedCategory, selectedCity]);

  async function fetchCities() {
    try {
      // Fetch distinct cities from tournages that have active roles
      // This is a bit complex in one query, so we'll fetch all active tournages for simplicity
      // or just extract from loaded roles if we were loading all.
      // Better: distinct select on tournages.

      const { data, error } = await supabase
        .from("tournages")
        .select("ville")
        .not("ville", "is", null);

      if (error) throw error;

      // Extract unique cities
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

      // 1. LA REQUÊTE MAGIQUE (JOINTURE)
      // On sélectionne les rôles ET les infos du tournage lié
      // Utilisation de !inner pour filtrer sur la table jointe si besoin
      let query = supabase
        .from("project_roles")
        .select(
          `
          *,
          tournages!inner ( id, title, type, pays, ville, latitude, longitude )
        `,
        )
        .order("created_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      if (selectedCity !== "all") {
        query = query.eq("tournages.ville", selectedCity);
      }

      const { data, error } = await query;
      if (error) throw error;

      console.log(
        "Roles fetched:",
        data?.length,
        "Sample:",
        JSON.stringify(data?.[0]?.tournages, null, 2),
      );

      // Filter out draft roles client-side to handle nulls gracefully
      const visible = ((data as any[]) || []).filter(
        (r) => r.status !== "draft",
      );
      setRoles(visible);
    } catch (error) {
      Alert.alert("Erreur", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function renderRole({ item }: { item: RoleWithProject }) {
    return (
      <TouchableOpacity
        style={GlobalStyles.card}
        onPress={() => router.push(`/project/role/${item.id}`)}
      >
        {/* En-tête avec le nom du PROJET */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.projectTitle}>
              {item.tournages?.title || "Projet Inconnu"}
            </Text>
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
        <Text style={[GlobalStyles.title2, { color: Colors.light.primary }]}>{item.title}</Text>

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
      <View style={styles.header}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
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

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.light.primary}
          style={{ marginTop: 50 }}
        />
      ) : viewMode === "map" ? (
        <View style={{ flex: 1 }}>
          <MapView
            style={{ width: "100%", height: "100%" }}
            provider={PROVIDER_DEFAULT}
            initialRegion={{
              latitude: 46.603354, // Centre France
              longitude: 1.888334,
              latitudeDelta: 10,
              longitudeDelta: 10,
            }}
          >
            {roles.map((item) => {
              const t = Array.isArray(item.tournages)
                ? item.tournages[0]
                : item.tournages;

              if (!t || !t.latitude || !t.longitude) {
                return null;
              }
              // Unique key to prevent React warnings
              const key = `role-${item.id}`;
              return (
                <Marker
                  key={key}
                  coordinate={{
                    latitude: t.latitude,
                    longitude: t.longitude,
                  }}
                  title={item.title}
                  description={`${t.title} (${item.category})`}
                  onCalloutPress={() => router.push(`/project/role/${item.id}`)}
                >
                  <View style={styles.customMarker}>
                    <Ionicons name="videocam" size={16} color="white" />
                  </View>
                </Marker>
              );
            })}
          </MapView>
        </View>
      ) : (
        <FlatList
          data={roles}
          keyExtractor={(item) => item.id}
          renderItem={renderRole}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucun casting pour le moment.</Text>
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
                      <Ionicons name="checkmark" size={20} color={Colors.light.primary} />
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
                      <Ionicons name="checkmark" size={20} color={Colors.light.primary} />
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
  header: {
    backgroundColor: Colors.light.background,
    paddingTop: 24,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
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
});
