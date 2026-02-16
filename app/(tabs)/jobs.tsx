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
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View
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
    hideMyParticipations,
    setHideMyParticipations,
  } = useJobs();

  // View Content Type: 'roles' (Jobs) or 'projects' (Tournages)
  const [contentType, setContentType] = useState<"roles" | "projects">("roles");
  // View Mode: 'list' or 'map'
  const [viewMode, setViewMode] = useState<"list" | "map">("list");

  // Show all or only recommendations
  const [showAll, setShowAll] = useState(false);

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
        {/* Row 1: Rechercher & Bouton Mode (Carte/Liste) */}
        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={18}
              color="#999"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Poste, projet..."
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

          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() => setViewMode(viewMode === "list" ? "map" : "list")}
          >
            <Ionicons
              name={viewMode === "list" ? "map" : "list"}
              size={22}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Row 2: Tabs Offres/Tournages */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            onPress={() => {
              setContentType("roles");
              setShowAll(false);
            }}
            style={[
              styles.segmentedButton,
              contentType === "roles" && styles.segmentedButtonActive,
            ]}
          >
            <Text
              style={[
                styles.segmentedText,
                contentType === "roles" && styles.segmentedTextActive,
              ]}
            >
              Offres
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setContentType("projects");
              setShowAll(false);
            }}
            style={[
              styles.segmentedButton,
              contentType === "projects" && styles.segmentedButtonActive,
            ]}
          >
            <Text
              style={[
                styles.segmentedText,
                contentType === "projects" && styles.segmentedTextActive,
              ]}
            >
              Tournages
            </Text>
          </TouchableOpacity>
        </View>

        {/* Filtrer les participations */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginBottom: 12,
          gap: 10,
          paddingRight: 4
        }}>
          <Text style={{
            fontSize: 13,
            fontWeight: "500",
            color: isDark ? "#A0A0A0" : "#666",
          }}>
            Cacher mes participations
          </Text>
          <Switch
            value={hideMyParticipations}
            onValueChange={setHideMyParticipations}
            trackColor={{ false: "#767577", true: colors.primary }}
            thumbColor={hideMyParticipations ? "#fff" : (isDark ? "#374151" : "#f4f3f4")}
            ios_backgroundColor="#3e3e3e"
            style={{ 
              transform: Platform.OS === 'ios' ? [{ scaleX: 0.8 }, { scaleY: 0.8 }] : [],
            }}
          />
        </View>

        {/* Row 3: Filtres */}
        <View style={styles.filtersRow}>
          {(showAll || searchQuery !== "") && contentType === "roles" && recommendations.length > 0 && (
            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor: colors.primary + "15",
                  borderColor: colors.primary + "30",
                  flex: Platform.OS === "web" ? 1 : 0,
                  paddingHorizontal: 16,
                },
              ]}
              onPress={() => {
                setShowAll(false);
                setSearchQuery("");
              }}
            >
              <Ionicons name="sparkles" size={16} color={colors.primary} />
              <Text style={[styles.filterValue, { color: colors.primary, fontSize: 13 }]}>
                {Platform.OS === "web" ? "Revenir aux recommandations" : "Recos"}
              </Text>
            </TouchableOpacity>
          )}

          {renderFilterButton(
            "Cat.",
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
      ) : contentType === "roles" && !showAll && searchQuery === "" && recommendations.length > 0 ? (
        <ScrollView 
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.recsOnlyContainer}>
            <Text style={styles.recsMainTitle}>Recommandé pour vous</Text>
            <Text style={styles.recsSubtitle}>Ces postes correspondent à votre profil et vos préférences.</Text>
            
            <View style={{ gap: 12 }}>
              {recommendations.map((item: any) => (
                <JobCard key={item.id} item={item} />
              ))}
            </View>

            <TouchableOpacity 
              style={styles.exploreAllButton}
              onPress={() => setShowAll(true)}
            >
              <Text style={styles.exploreAllButtonText}>Explorer tous les postes</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </ScrollView>
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
      paddingTop: Platform.OS === "ios" ? 10 : 20,
      paddingBottom: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    searchContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
    },
    viewModeButton: {
      backgroundColor: colors.backgroundSecondary,
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      height: "100%",
      fontSize: 15,
      color: colors.text,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 12,
    },
    segmentedControl: {
      flexDirection: "row",
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      padding: 3,
      marginBottom: 12,
    },
    segmentedButton: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      alignItems: "center",
    },
    segmentedButtonActive: {
      backgroundColor: isDark ? colors.primary + "25" : colors.primary + "15",
      shadowColor: "transparent",
    },
    segmentedText: {
      fontSize: 14,
      fontWeight: "600",
      color: isDark ? "#A0A0A0" : "#999",
    },
    segmentedTextActive: {
      color: colors.primary,
    },
    filtersRow: {
      flexDirection: "row",
      gap: 8,
      justifyContent: "space-between",
      alignItems: "center",
    },
    filterButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundSecondary,
      paddingVertical: Platform.OS === "web" ? 0 : 6,
      paddingHorizontal: 10,
      height: Platform.OS === "web" ? 44 : "auto",
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 5,
      flex: 1,
      justifyContent: "center",
    },
    filterLabel: {
      fontSize: 12,
      color: isDark ? "#D1D5DB" : "#666",
    },
    filterValue: {
      fontWeight: "600",
      color: colors.text,
      maxWidth: Platform.OS === "web" ? 200 : 100,
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
    roleQty: { fontSize: 13, color: isDark ? "#D1D5DB" : "#666", marginBottom: 8 },
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
    recsOnlyContainer: {
      paddingVertical: 10,
    },
    recsMainTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 6,
    },
    recsSubtitle: {
      fontSize: 14,
      color: isDark ? "#A0A0A0" : "#64748b",
      marginBottom: 20,
      lineHeight: 20,
    },
    exploreAllButton: {
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 10,
      marginTop: 20,
      gap: 10,
      alignSelf: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    exploreAllButtonText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "600",
    },
  });
}
