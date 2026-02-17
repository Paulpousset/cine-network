import AppMap, { Marker, PROVIDER_DEFAULT } from "@/components/AppMap";
import ClapLoading from "@/components/ClapLoading";
import { JobCard, ProjectJobCard } from "@/components/JobCard";
import { useJobs } from "@/hooks/useJobs";
import { useUserMode } from "@/hooks/useUserMode";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { JOB_TITLES } from "@/utils/roles";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

// On récupère les clés de ton fichier rolesList.ts
const ROLE_CATEGORIES = ["all", ...Object.keys(JOB_TITLES)];

const getStatusColor = (status: string, isDark: boolean) => {
  switch (status) {
    case 'accepted': return '#10B981'; // Vert
    case 'rejected':
    case 'refused': return '#EF4444'; // Rouge
    case 'pending': return '#F59E0B'; // Orange
    default: return isDark ? '#A0A0A0' : '#666';
  }
};

const formatStatus = (status: string) => {
  switch (status) {
    case 'accepted': return 'Accepté';
    case 'rejected': 
    case 'refused': return 'Refusé';
    case 'pending': return 'En attente';
    default: return status;
  }
};

export default function Discover() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWebLarge = Platform.OS === "web" && width >= 768;
  const { effectiveUserId } = useUserMode();

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

  // Saved Jobs
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [showAppliedOnly, setShowAppliedOnly] = useState(false);
  const [fullSavedRoles, setFullSavedRoles] = useState<any[]>([]);

  // Applications
  const [myApplications, setMyApplications] = useState<any[]>([]);

  useEffect(() => {
    loadSavedJobs();
  }, []);

  useEffect(() => {
    if (effectiveUserId) {
      fetchMyApplications();
    } else {
      setMyApplications([]);
    }
  }, [effectiveUserId]);

  const fetchMyApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          role:project_roles (
            title,
            tournages (title)
          )
        `)
        .eq("candidate_id", effectiveUserId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setMyApplications(data);
      }
    } catch (e) {
      console.error("Error fetching applications", e);
    }
  };

  useEffect(() => {
    if (savedJobIds.length > 0) {
      fetchFullSavedRoles();
    } else {
      setFullSavedRoles([]);
    }
  }, [savedJobIds]);

  const fetchFullSavedRoles = async () => {
    try {
      const { data, error } = await supabase
        .from("project_roles")
        .select(`*, tournages!inner (*)`)
        .in("id", savedJobIds);
      
      if (!error && data) {
        setFullSavedRoles(data);
      }
    } catch (e) {
      console.error("Error fetching full saved roles", e);
    }
  };

  const loadSavedJobs = async () => {
    try {
      const saved = await AsyncStorage.getItem("saved_jobs");
      if (saved) {
        setSavedJobIds(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Error loading saved jobs", e);
    }
  };

  const toggleSaveJob = async (jobId: string) => {
    const newSaved = savedJobIds.includes(jobId)
      ? savedJobIds.filter((id) => id !== jobId)
      : [...savedJobIds, jobId];
    
    setSavedJobIds(newSaved);
    try {
      await AsyncStorage.setItem("saved_jobs", JSON.stringify(newSaved));
    } catch (e) {
      console.error("Error saving job", e);
    }
  };

  const getApplicationStatus = (roleId: string) => {
    return myApplications.find(app => app.role_id === roleId)?.status;
  };

  const handleRemoveApplication = async (roleId: string) => {
    const app = myApplications.find(a => a.role_id === roleId);
    if (!app) return;

    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', app.id);
      
      if (!error) {
        setMyApplications(prev => prev.filter(a => a.id !== app.id));
      }
    } catch (e) {
      console.error("Error removing application", e);
    }
  };

  const savedRolesToDisplay = fullSavedRoles;

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
            style={[
              styles.viewModeButton,
              showSavedOnly && { backgroundColor: colors.primary + "20", borderColor: colors.primary }
            ]}
            onPress={() => {
              setShowSavedOnly(!showSavedOnly);
              setShowAppliedOnly(false);
              if (!showSavedOnly) {
                setViewMode("list");
              }
            }}
          >
            <View>
              <Ionicons
                name={showSavedOnly ? "bookmark" : "bookmark-outline"}
                size={22}
                color={showSavedOnly ? colors.primary : colors.text}
              />
              {savedJobIds.length > 0 && !showSavedOnly && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>{savedJobIds.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewModeButton,
              showAppliedOnly && { backgroundColor: colors.primary + "20", borderColor: colors.primary }
            ]}
            onPress={() => {
              setShowAppliedOnly(!showAppliedOnly);
              setShowSavedOnly(false);
              if (!showAppliedOnly) {
                setViewMode("list");
              }
            }}
          >
            <View>
              <Ionicons
                name={showAppliedOnly ? "paper-plane" : "paper-plane-outline"}
                size={22}
                color={showAppliedOnly ? colors.primary : colors.text}
              />
              {myApplications.length > 0 && !showAppliedOnly && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>{myApplications.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() => {
              setViewMode(viewMode === "list" ? "map" : "list");
              setShowSavedOnly(false);
              setShowAppliedOnly(false);
            }}
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
      ) : (
        <View style={{ flex: 1, flexDirection: isWebLarge ? "row" : "column" }}>
          <View style={{ flex: 1 }}>
            {viewMode === "map" ? (
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
                  {/* ... markers logic ... */}
                  {projects.map((proj: any) => {
                    const lat = parseFloat(String(proj.latitude));
                    const lon = parseFloat(String(proj.longitude));
                    if (isNaN(lat) || isNaN(lon)) return null;
                    return (
                      <Marker
                        key={`proj-${proj.id}-${lat}-${lon}`}
                        coordinate={{ latitude: lat, longitude: lon }}
                        title={proj.title}
                        description={`${proj.roleCount} offre(s) • ${proj.type}`}
                        onCalloutPress={() => router.push(`/project/${proj.id}`)}
                      >
                        <View style={styles.customMarker}>
                          <Text style={{ color: "white", fontWeight: "bold", fontSize: 10 }}>{proj.roleCount}</Text>
                        </View>
                      </Marker>
                    );
                  })}
                </AppMap>
              </View>
            ) : showSavedOnly ? (
              <FlashList
                data={savedRolesToDisplay}
                keyExtractor={(item: any) => item.id}
                renderItem={({ item }: { item: any }) => (
                  <JobCard
                    item={item}
                    isSaved={true}
                    onSaveToggle={toggleSaveJob}
                    applicationStatus={getApplicationStatus(item.id)}
                    onApplicationAction={() => handleRemoveApplication(item.id)}
                  />
                )}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.text }}>
                      Mes Enregistrements ({savedRolesToDisplay.length})
                    </Text>
                  </View>
                }
                ListEmptyComponent={
                  <View style={{ alignItems: "center", marginTop: 50 }}>
                    <Ionicons name="bookmark-outline" size={50} color={colors.text + "33"} />
                    <Text style={[styles.emptyText, { marginTop: 10 }]}>Vous n'avez pas encore d'offres enregistrées.</Text>
                  </View>
                }
              />
            ) : showAppliedOnly ? (
              <FlashList
                data={myApplications}
                keyExtractor={(item: any) => item.id}
                renderItem={({ item }: { item: any }) => (
                  <JobCard
                    item={item.role ?? {}}
                    isSaved={savedJobIds.includes(item.role_id)}
                    onSaveToggle={toggleSaveJob}
                    applicationStatus={item.status}
                    onApplicationAction={() => handleRemoveApplication(item.role_id)}
                  />
                )}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                  <View style={{ marginBottom: 15 }}>
                    <Text style={{ fontSize: 20, fontWeight: "bold", color: colors.text }}>
                      Mes Candidatures ({myApplications.length})
                    </Text>
                  </View>
                }
                ListEmptyComponent={
                  <View style={{ alignItems: "center", marginTop: 50 }}>
                    <Ionicons name="paper-plane-outline" size={50} color={colors.text + "33"} />
                    <Text style={[styles.emptyText, { marginTop: 10 }]}>Vous n'avez pas encore postulé à des offres.</Text>
                  </View>
                }
              />
            ) : contentType === "roles" && !showAll && searchQuery === "" && recommendations.length > 0 ? (
              <ScrollView
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.recsOnlyContainer}>
                  <Text style={styles.recsMainTitle}>Recommandé pour vous</Text>
                  

                  <View style={{ gap: 12 }}>
                    {recommendations.map((item: any) => (
                      <JobCard
                        key={item.id}
                        item={item}
                        isSaved={savedJobIds.includes(item.id)}
                        onSaveToggle={toggleSaveJob}
                        applicationStatus={getApplicationStatus(item.id)}
                        onApplicationAction={() => handleRemoveApplication(item.id)}
                      />
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
                data={(showSavedOnly ? savedRolesToDisplay : (contentType === "roles" ? roles : projects)) as any}
                keyExtractor={(item: any) => item.id}
                renderItem={({ item }: { item: any }) =>
                  contentType === "roles" || showSavedOnly ? (
                    <JobCard
                      item={item}
                      isSaved={savedJobIds.includes(item.id)}
                      onSaveToggle={toggleSaveJob}
                      applicationStatus={getApplicationStatus(item.id)}
                      onApplicationAction={() => handleRemoveApplication(item.id)}
                    />
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
          </View>

          {isWebLarge && (
            <View style={styles.rightSidebar}>
              {/* SECTION ENREGISTREMENTS */}
              <View style={styles.sidebarSection}>
                <View style={styles.sidebarHeader}>
                  <Ionicons name="bookmark" size={18} color={colors.primary} />
                  <Text style={styles.sidebarTitle}>Enregistrements</Text>
                </View>
                
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                  {savedRolesToDisplay.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="bookmark-outline" size={32} color={colors.text + "20"} />
                      <Text style={styles.sidebarEmptyText}>
                        Aucun enregistrement
                      </Text>
                    </View>
                  ) : (
                    savedRolesToDisplay.map((role) => (
                      <TouchableOpacity
                        key={role.id}
                        style={styles.savedItem}
                        onPress={() => router.push(`/project/role/${role.id}`)}
                      >
                        <Text style={styles.savedItemTitle} numberOfLines={1}>
                          {role.title}
                        </Text>
                        <Text style={styles.savedItemSubtitle} numberOfLines={1}>
                          {role.tournages?.title}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
                
                {savedRolesToDisplay.length > 0 && (
                  <TouchableOpacity 
                    style={styles.viewAllButton}
                    onPress={() => setShowSavedOnly(true)}
                  >
                    <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>Voir tout</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* SECTION CANDIDATURES */}
              <View style={styles.sidebarSection}>
                <View style={styles.sidebarHeader}>
                  <Ionicons name="paper-plane" size={18} color={colors.primary} />
                  <Text style={styles.sidebarTitle}>Candidatures</Text>
                </View>
                
                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                  {myApplications.length === 0 ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                      <Ionicons name="paper-plane-outline" size={32} color={colors.text + "20"} />
                      <Text style={styles.sidebarEmptyText}>
                        Aucune candidature
                      </Text>
                    </View>
                  ) : (
                    myApplications.map((app) => (
                      <TouchableOpacity
                        key={app.id}
                        style={styles.savedItem}
                        onPress={() => {
                          if (app.status === 'accepted' || app.status === 'rejected' || app.status === 'refused') {
                            handleRemoveApplication(app.role_id);
                          } else {
                            router.push(`/project/role/${app.role_id}`);
                          }
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.savedItemTitle} numberOfLines={1}>
                              {app.role?.title || "Rôle inconnu"}
                            </Text>
                            <Text style={styles.savedItemSubtitle} numberOfLines={1}>
                              {app.role?.tournages?.title || "Projet inconnu"}
                            </Text>
                            <View style={[
                              styles.statusBadge,
                              { 
                                backgroundColor: getStatusColor(app.status, isDark) + "10",
                                alignSelf: 'flex-start',
                                marginTop: 4,
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                              }
                            ]}>
                              <Text style={[
                                styles.statusBadgeText,
                                { color: getStatusColor(app.status, isDark), fontSize: 9 }
                              ]}>
                                {formatStatus(app.status)}
                              </Text>
                            </View>
                          </View>

                          {(app.status === 'accepted' || app.status === 'rejected' || app.status === 'refused') && (
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                handleRemoveApplication(app.role_id);
                              }}
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor: isDark ? '#EF444433' : '#FEE2E2',
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >
                              <Ionicons name="close" size={14} color="#EF4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            </View>
          )}
        </View>
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
    badgeCount: {
      position: "absolute",
      top: -6,
      right: -6,
      backgroundColor: colors.primary,
      borderRadius: 10,
      minWidth: 16,
      height: 16,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 4,
      borderWidth: 1.5,
      borderColor: colors.background,
    },
    badgeCountText: {
      color: "#fff",
      fontSize: 8,
      fontWeight: "bold",
    },
    rightSidebar: {
      width: 320,
      backgroundColor: colors.backgroundSecondary,
      borderLeftWidth: 1,
      borderLeftColor: colors.border,
      padding: 12,
      display: Platform.OS === "web" ? "flex" : "none",
      gap: 12,
    },
    sidebarSection: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      // Subtle shadow for web
      ...Platform.select({
        web: {
          boxShadow: isDark ? "0 4px 6px rgba(0,0,0,0.3)" : "0 4px 6px rgba(0,0,0,0.05)",
        }
      })
    },
    sidebarHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border + "40",
    },
    sidebarTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.text,
    },
    sidebarEmptyText: {
      fontSize: 12,
      color: isDark ? "#A0A0A0" : "#999",
      textAlign: "center",
      marginTop: 8,
      maxWidth: '80%',
    },
    savedItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    savedItemTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },
    savedItemSubtitle: {
      fontSize: 12,
      color: isDark ? "#A0A0A0" : "#999",
      marginTop: 2,
    },
    viewAllButton: {
      marginTop: 10,
      paddingVertical: 10,
      alignItems: "center",
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    statusBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 8,
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: 'bold',
    },
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
      padding: 4,
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
