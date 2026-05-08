import { Text, View } from "@/components/ui/Themed";
import { GlobalStyles } from "@/constants/Styles";
import { appEvents, EVENTS } from "@/lib/events";
import { useTheme } from "@/providers/ThemeProvider";
import { JOB_TITLES } from "@/utils/roles";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  ImageStyle,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TextStyle,
  TouchableOpacity,
  useWindowDimensions,
  ViewStyle,
} from "react-native";
import { supabase } from "../../lib/supabase";

const ROLE_CATEGORIES = Object.keys(JOB_TITLES);

export default function NetworkConnections() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;
  const styles = createStyles(colors, isDark, width);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"connections" | "blocked">(
    "connections",
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const myId = session.user.id;
      setCurrentUserId(myId);

      // Fetch all connections
      const { data: conns, error: connError } = await supabase
        .from("connections")
        .select(
          `
          *,
          requester:profiles!requester_id(id, full_name, username, role, ville, avatar_url, gender, job_title),
          receiver:profiles!receiver_id(id, full_name, username, role, ville, avatar_url, gender, job_title)
        `,
        )
        .or(`requester_id.eq.${myId},receiver_id.eq.${myId}`)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });

      if (connError) throw connError;
      setConnections(conns || []);

      // Fetch all blocked users (where I am the blocker)
      const { data: blocks, error: blockError } = await supabase
        .from("user_blocks")
        .select(`*, blocked:profiles!blocked_id(*)`)
        .eq("blocker_id", myId);

      if (blockError) throw blockError;
      setBlockedUsers(blocks || []);
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  }

  const filteredConnections = connections.filter((conn) => {
    const isMeRequester = conn.requester_id === currentUserId;
    const otherUser = isMeRequester ? conn.receiver : conn.requester;

    // Search query filter
    const nameMatch = (otherUser.full_name || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
      (otherUser.username || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    if (!nameMatch) return false;

    // Gender filter
    if (selectedGender && otherUser.gender !== selectedGender) return false;

    // Role (type) filter
    if (selectedRole && otherUser.role !== selectedRole) return false;

    // Category filter
    if (selectedCategory) {
      const jobsInCategory = JOB_TITLES[selectedCategory as keyof typeof JOB_TITLES] || [];
      if (!otherUser.job_title || !jobsInCategory.includes(otherUser.job_title)) return false;
    }

    // Job title filter
    if (selectedJob && otherUser.job_title !== selectedJob) return false;

    return true;
  });

  const handleUnblock = async (blockedId: string) => {
    const doUnblock = async () => {
      try {
        const { error } = await supabase
          .from("user_blocks")
          .delete()
          .eq("blocker_id", currentUserId)
          .eq("blocked_id", blockedId);

        if (error) throw error;

        appEvents.emit(EVENTS.USER_BLOCKED, {
          userId: blockedId,
          blocked: false,
        });

        setBlockedUsers((prev) =>
          prev.filter((b) => b.blocked_id !== blockedId),
        );
        Alert.alert("Succès", "Utilisateur débloqué.");
      } catch (e) {
        console.error(e);
        Alert.alert("Erreur", "Impossible de débloquer cet utilisateur.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Voulez-vous débloquer cet utilisateur ?")) {
        doUnblock();
      }
    } else {
      Alert.alert("Débloquer", "Voulez-vous débloquer cet utilisateur ?", [
        { text: "Annuler", style: "cancel" },
        { text: "Débloquer", onPress: doUnblock },
      ]);
    }
  };

  const removeConnection = async (connectionId: string, name: string) => {
    const doDelete = async () => {
      try {
        const { error } = await supabase
          .from("connections")
          .delete()
          .eq("id", connectionId);
        if (error) throw error;
        setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      } catch (e) {
        console.error(e);
        Alert.alert("Erreur", "Impossible de supprimer la connexion.");
      }
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(`Voulez-vous vraiment retirer ${name} de votre réseau ?`)
      ) {
        doDelete();
      }
    } else {
      Alert.alert(
        "Supprimer",
        `Voulez-vous vraiment retirer ${name} de votre réseau ?`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Retirer",
            style: "destructive",
            onPress: doDelete,
          },
        ],
      );
    }
  };

const renderFilters = (hideHeaderOnWeb = false) => (
    <View style={isLargeScreen ? styles.webSidebarInner : styles.container}>
      {!hideHeaderOnWeb && isLargeScreen && <Text style={styles.sidebarTitle}>Filtres</Text>}
      <ScrollView contentContainerStyle={isLargeScreen ? undefined : styles.filtersScroll}>
        <Text style={styles.filterLabel}>Genre</Text>
        <View style={styles.filterOptions}>
          {[null, "male", "female", "other"].map((g) => (
            <TouchableOpacity
              key={String(g)}
              style={[
                styles.filterChip,
                selectedGender === g && styles.filterChipActive,
              ]}
              onPress={() => setSelectedGender(g)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedGender === g && styles.filterChipTextActive,
                ]}
              >
                {g === null ? "Tous" : g === "male" ? "Homme" : g === "female" ? "Femme" : "Autre"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>


        <Text style={styles.filterLabel}>Catégorie de rôle</Text>
        <View style={styles.filterOptions}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedCategory === null && styles.filterChipActive,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === null && styles.filterChipTextActive,
              ]}
            >
              Toutes
            </Text>
          </TouchableOpacity>
          {ROLE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                selectedCategory === cat && styles.filterChipActive,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === cat && styles.filterChipTextActive,
                ]}
              >
                {cat.replace("_", " ").toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.filterLabel}>Métier (Poste)</Text>
        <View style={styles.jobFiltersContainer}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedJob === null && styles.filterChipActive,
              { marginBottom: 8 }
            ]}
            onPress={() => setSelectedJob(null)}
          >
            <Text style={[
              styles.filterChipText,
              selectedJob === null && styles.filterChipTextActive
            ]}>
              Tous les métiers
            </Text>
          </TouchableOpacity>
          
          {Object.entries(JOB_TITLES).map(([category, jobs]) => (
            <View key={category} style={styles.categoryContainer}>
              <Text style={styles.categoryTitle}>{category.replace("_", " ").toUpperCase()}</Text>
              <View style={styles.filterOptions}>
                {jobs.map((job) => (
                  <TouchableOpacity
                    key={job}
                    style={[
                      styles.filterChip,
                      selectedJob === job && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedJob(job)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedJob === job && styles.filterChipTextActive,
                      ]}
                    >
                      {job}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {!isLargeScreen && (
        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              setSelectedGender(null);
              setSelectedRole(null);
              setSelectedCategory(null);
              setSelectedJob(null);
            }}
          >
            <Text style={styles.resetButtonText}>Réinitialiser</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => setShowFilters(false)}
          >
            <Text style={styles.applyButtonText}>Appliquer</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLargeScreen && (selectedGender || selectedRole || selectedCategory || selectedJob) && (
        <TouchableOpacity
          style={styles.webResetButton}
          onPress={() => {
            setSelectedGender(null);
            setSelectedRole(null);
            setSelectedCategory(null);
            setSelectedJob(null);
          }}
        >
          <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    if (activeTab === "connections") {
      const isMeRequester = item.requester_id === currentUserId;
      const otherUser = isMeRequester ? item.receiver : item.requester;

      return (
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.info}
            onPress={() =>
              router.push({
                pathname: "/profile/[id]",
                params: { id: otherUser.id },
              })
            }
          >
            {otherUser.avatar_url ? (
              <Image
                source={{ uri: otherUser.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons
                  name="person"
                  size={30}
                  color={colors.tabIconDefault}
                />
              </View>
            )}

            <View style={styles.textContainer}>
              <Text style={styles.name}>
                {otherUser.full_name || otherUser.username}
              </Text>
              <Text style={styles.description}>
                {otherUser.role ? otherUser.role.toUpperCase() : "Membre"} •{" "}
                {otherUser.ville || "N/A"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() =>
              removeConnection(
                item.id,
                otherUser.full_name || otherUser.username,
              )
            }
          >
            <Ionicons name="trash-outline" size={24} color={colors.danger} />
          </TouchableOpacity>
        </View>
      );
    } else {
      // RENDERING BLOCKED USERS
      const otherUser = item.blocked;
      if (!otherUser) return null;

      return (
        <View style={styles.card}>
          <View style={styles.info}>
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={30} color={colors.tabIconDefault} />
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.name}>
                {otherUser.full_name || otherUser.username}
              </Text>
              <Text style={[styles.description, { color: colors.danger }]}>
                Bloqué
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.unblockButton}
            onPress={() => handleUnblock(otherUser.id)}
          >
            <Text style={styles.unblockButtonText}>Débloquer</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: "Mon Réseau",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: Platform.OS === "ios" ? 0 : 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerStyle: {
            backgroundColor: colors.card,
          },
          headerTintColor: colors.text,
        }}
      />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "connections" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("connections")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "connections" && styles.tabTextActive,
            ]}
          >
            Relations ({connections.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "blocked" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("blocked")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "blocked" && styles.tabTextActive,
            ]}
          >
            Bloqués ({blockedUsers.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={activeTab === "connections" ? styles.searchContainer : null}>
        {activeTab === "connections" && (
          <>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher par nom..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.filterButton,
                (selectedGender || selectedRole || selectedCategory || selectedJob) && styles.filterButtonActive,
              ]}
              onPress={() => setShowFilters(true)}
            >
              <Ionicons
                name="funnel-outline"
                size={20}
                color={(selectedGender || selectedRole || selectedCategory || selectedJob) ? "white" : colors.text}
              />
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.mainLayout}>
        {isLargeScreen && activeTab === "connections" && (
          <View style={styles.webSidebar}>
             {renderFilters(false)}
          </View>
        )}

        <View style={styles.contentArea}>
          <FlatList
            data={activeTab === "connections" ? filteredConnections : blockedUsers}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 15 }}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={fetchData}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              !loading ? (
                <Text style={styles.emptyText}>
                  {activeTab === "connections"
                    ? "Aucune relation ne correspond à vos critères."
                    : "Aucun utilisateur bloqué."}
                </Text>
              ) : null
            }
          />
        </View>
      </View>

      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtres</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            {renderFilters()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: any, isDark: boolean, width: number) {
  const isLargeScreen = width > 768;
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background } as ViewStyle,
  mainLayout: {
    flex: 1,
    flexDirection: "row",
  } as ViewStyle,
  webSidebar: {
    width: 300,
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    height: Platform.OS === 'web' ? 'calc(100vh - 110px)' : '100%',
  } as ViewStyle,
  webSidebarInner: {
    flex: 1,
    padding: 20,
  } as ViewStyle,
  contentArea: {
    flex: 1,
    height: Platform.OS === 'web' ? 'calc(100vh - 110px)' : '100%',
  } as ViewStyle,
  sidebarTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 20,
  } as TextStyle,
  webResetButton: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  } as ViewStyle,
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as ViewStyle,
  tabItem: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  } as ViewStyle,
  tabItemActive: {
    borderBottomColor: colors.text,
  } as ViewStyle,
  tabText: {
    fontSize: 14,
    color: colors.tabIconDefault,
    fontWeight: "500",
  } as TextStyle,
  tabTextActive: {
    color: colors.text,
    fontWeight: "700",
  } as TextStyle,
  card: {
    ...GlobalStyles.card,
    backgroundColor: colors.card,
    flexDirection: "row",
    alignItems: "center",
    borderColor: colors.border,
    borderWidth: 1,
    padding: 12,
  } as ViewStyle,
  info: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
  } as ViewStyle,
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  } as ImageStyle,
  avatarPlaceholder: {
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  textContainer: {
    flex: 1,
    backgroundColor: "transparent",
  } as ViewStyle,
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
  } as TextStyle,
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  } as TextStyle,
  unblockButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  } as ViewStyle,
  unblockButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  } as TextStyle,
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    color: colors.textSecondary,
    fontSize: 16,
  } as TextStyle,
  deleteButton: {
    padding: 10,
    backgroundColor: "transparent",
  } as ViewStyle,
  searchContainer: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as ViewStyle,
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginRight: 10,
    height: 40,
  } as ViewStyle,
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: colors.text,
    fontSize: 14,
  } as TextStyle,
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  filterButtonActive: {
    backgroundColor: colors.primary,
  } as ViewStyle,
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  } as ViewStyle,
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "90%",
    paddingBottom: 30,
  } as ViewStyle,
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as ViewStyle,
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
  } as TextStyle,
  filtersScroll: {
    padding: 20,
  } as ViewStyle,
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
    marginTop: 8,
  } as TextStyle,
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    gap: 8,
  } as ViewStyle,
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  } as ViewStyle,
  filterChipText: {
    fontSize: 14,
    color: colors.textSecondary,
  } as TextStyle,
  filterChipTextActive: {
    color: "white",
    fontWeight: "600",
  } as TextStyle,
  jobFiltersContainer: {
    marginBottom: 20,
  } as ViewStyle,
  categoryContainer: {
    marginBottom: 15,
  } as ViewStyle,
  categoryTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 1,
  } as TextStyle,
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  } as ViewStyle,
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  resetButtonText: {
    color: colors.text,
    fontWeight: "600",
  } as TextStyle,
  applyButton: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  } as ViewStyle,
  applyButtonText: {
    color: "white",
    fontWeight: "600",
  } as TextStyle,
  });
}
