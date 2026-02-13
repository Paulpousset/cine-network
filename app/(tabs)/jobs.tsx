import AppMap, { Marker, PROVIDER_DEFAULT } from "@/components/AppMap";
import ClapLoading from "@/components/ClapLoading";
import { JobCard, ProjectJobCard } from "@/components/JobCard";
import { useJobs } from "@/hooks/useJobs";
import { JOB_TITLES } from "@/utils/roles";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    FlatList,
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

import { useTheme } from "@/providers/ThemeProvider";

// On récupère les clés de ton fichier rolesList.ts
const ROLE_CATEGORIES = ["all", ...Object.keys(JOB_TITLES)];

export default function Discover() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWebLarge = Platform.OS === "web" && width >= 768;

  const {
    roles,
    projects,
    loading,
    recommendations,
    availableCities,
    selectedCategory,
    setSelectedCategory,
    selectedCity,
    setSelectedCity,
    searchQuery,
    setSearchQuery,
  } = useJobs();

  // Recommendations
  const [isRecsCollapsed, setIsRecsCollapsed] = useState(false); // State to toggle recommendations visibility

  // View Content Type: 'roles' (Jobs) or 'projects' (Tournages)
  const [contentType, setContentType] = useState<"roles" | "projects">("roles");
  // View Mode: 'list' or 'map'
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Modals
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);

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
            backgroundColor: colors.backgroundSecondary,
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
                color: contentType === "roles" ? colors.text : "#999",
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
                color: contentType === "projects" ? colors.text : "#999",
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
              backgroundColor: colors.primary,
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
                  backgroundColor: colors.primary + "20",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "bold",
                    color: colors.primary,
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
                  color: colors.primary,
                  marginRight: 4,
                }}
              >
                {isRecsCollapsed ? "Afficher" : "Réduire"}
              </Text>
              <Ionicons
                name={isRecsCollapsed ? "chevron-down" : "chevron-up"}
                size={20}
                color={colors.primary}
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
                        {(item as any).matchScore || 100}% Match
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
                      color={colors.primary}
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
          color={colors.primary}
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
            {projects.map(
              (proj: {
                latitude: any;
                longitude: any;
                id: any;
                title: string | undefined;
                roleCount:
                  | string
                  | number
                  | bigint
                  | boolean
                  | React.ReactElement<
                      unknown,
                      string | React.JSXElementConstructor<any>
                    >
                  | Iterable<React.ReactNode>
                  | React.ReactPortal
                  | Promise<
                      | string
                      | number
                      | bigint
                      | boolean
                      | React.ReactPortal
                      | React.ReactElement<
                          unknown,
                          string | React.JSXElementConstructor<any>
                        >
                      | Iterable<React.ReactNode>
                      | null
                      | undefined
                    >
                  | null
                  | undefined;
                type: any;
              }) => {
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
              },
            )}
          </AppMap>
        </View>
      ) : (
        <FlashList
          data={(contentType === "roles" ? roles : projects) as any}
          keyExtractor={(item) => (item as { id: string }).id}
          renderItem={({ item }) =>
            contentType === "roles" ? (
              <JobCard item={item} />
            ) : (
              <ProjectJobCard item={item} />
            )
          }
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
                        color={colors.primary}
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
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setCityModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Choisir une ville</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {(availableCities as string[]).map((city: string) => (
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
                        color={colors.primary}
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

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    webHeader: {
      paddingHorizontal: 20,
      paddingVertical: 15,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    webHeaderTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
    },
    header: {
      backgroundColor: colors.background,
      paddingTop: 24,
      paddingBottom: 15,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundSecondary,
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
      color: colors.text,
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
      backgroundColor: colors.backgroundSecondary,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    filterLabel: {
      fontSize: 12,
      color: isDark ? "#A0A0A0" : "#666",
    },
    filterValue: {
      fontWeight: "600",
      color: colors.text,
      maxWidth: 100,
    },

    listContent: { padding: 15, paddingBottom: 100 },
    emptyText: { textAlign: "center", marginTop: 50, color: colors.text, opacity: 0.6 },

    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    projectTitle: { fontSize: 16, fontWeight: "bold", color: colors.text },
    projectSubtitle: { fontSize: 12, color: isDark ? "#A0A0A0" : "#999", marginTop: 2 },

    badge: {
      backgroundColor: isDark ? "#2d1a4d" : "#f3e5f5",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    badgeText: { fontSize: 10, color: colors.primary, fontWeight: "bold" },

    divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },

    roleTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.primary,
      marginBottom: 4,
    },
    roleQty: { fontSize: 13, color: isDark ? "#A0A0A0" : "#666", marginBottom: 8 },
    roleDesc: {
      fontSize: 13,
      color: isDark ? "#D1D5DB" : "#444",
      fontStyle: "italic",
      marginBottom: 10,
    },
    ctaText: {
      color: colors.primary,
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
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 20,
      maxHeight: 400,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 15,
      textAlign: "center",
      color: colors.text,
    },
    modalItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    modalItemText: {
      fontSize: 16,
      color: colors.text,
    },
    modalItemTextSelected: {
      color: colors.primary,
      fontWeight: "bold",
    },
    customMarker: {
      backgroundColor: colors.primary,
      padding: 8,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: colors.card,
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
      backgroundColor: isDark ? "#1e1e2d" : "#f8faff",
      borderBottomWidth: 1,
      borderColor: colors.border,
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
      color: colors.primary,
    },
    recsSeeMore: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary,
    },
    recsListContent: {
      paddingHorizontal: 15,
    },
    recCard: {
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 12,
      marginHorizontal: 5,
      width: 220,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    recCardHeader: {
      marginBottom: 8,
    },
    matchBadge: {
      backgroundColor: isDark ? "#2d1a4d" : "#e0e7ff",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      alignSelf: "flex-start",
    },
    matchBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.primary,
    },
    recCardTitle: {
      fontWeight: "700",
      fontSize: 15,
      color: colors.text,
      marginBottom: 2,
    },
    recCardSubtitle: {
      fontSize: 12,
      color: isDark ? "#A0A0A0" : "#64748b",
      marginBottom: 8,
    },
    recCardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "auto",
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    recCardMeta: {
      fontSize: 10,
      color: isDark ? "#A0A0A0" : "#64748b",
      marginLeft: 4,
      fontWeight: "500",
    },
  });
}
