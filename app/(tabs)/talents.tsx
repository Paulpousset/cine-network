import ClapLoading from "@/components/ClapLoading";
import { TalentCard } from "@/components/TalentCard";
import { GlobalStyles } from "@/constants/Styles";
import { useTalents } from "@/hooks/useTalents";
import { JOB_TITLES } from "@/utils/roles";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
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

import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";

const ROLE_CATEGORIES = ["all", ...Object.keys(JOB_TITLES)];

export default function DiscoverProfiles() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const { isGuest } = useUser();
  const router = useRouter();
  const {
    profiles,
    suggestedProfiles,
    loading,
    availableCities,
    selectedRole,
    setSelectedRole,
    selectedCity,
    setSelectedCity,
    query,
    setQuery,
    fetchPendingCount,
    sendConnectionRequest,
  } = useTalents();

  // Modals
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchPendingCount();
    }, [fetchPendingCount]),
  );

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

        {!isGuest && (
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
        )}
      </TouchableOpacity>
    );
  }

  const listHeader = (
    <View>
     
      {Platform.OS === "web" ? (
        <View style={styles.webHeader}>
          <Text style={styles.webHeaderTitle}>Réseau</Text>
          <View style={{ flexDirection: "row", gap: 20 }}>
            {!isGuest && (
              <TouchableOpacity
                onPress={() => router.push("/network/connections")}
                style={styles.webHeaderButton}
              >
                <Ionicons name="people" size={22} color={colors.text} />
                <Text style={styles.webHeaderButtonText}>Mes relations</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        !isGuest && (
          <TouchableOpacity
            onPress={() => router.push("/network/connections")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 15,
              backgroundColor: colors.background,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Ionicons
              name="people"
              size={24}
              color={colors.primary}
              style={{ marginRight: 10 }}
            />
            <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>Mes relations</Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color="#ccc"
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>
        )
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
          backgroundColor: colors.background,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
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
      {loading ? (
        <ClapLoading
          size={50}
          color={colors.primary}
          style={{ marginTop: 30 }}
        />
      ) : (
        <FlashList
          ListHeaderComponent={listHeader}
          data={profiles}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }) => <TalentCard item={item} />}
          estimatedItemSize={100}
          contentContainerStyle={{ paddingBottom: 120 }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 50, color: "#999" }}>
              Aucun profil trouvé.
            </Text>
          }
          {...({} as any)}
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
                      setCityModalVisible(false);
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
                        color={colors.primary}
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
                        color={colors.primary}
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

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
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
      marginRight: 4,
    },
    filterValue: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
      marginRight: 4,
    },
    searchRow: { paddingHorizontal: 20, paddingBottom: 10 },
    searchInput: {
      backgroundColor: colors.backgroundSecondary,
    },
    role: { marginTop: 4, fontWeight: "600" },
    cta: { color: colors.primary, fontWeight: "700" },

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
    modalItemText: { fontSize: 16, color: colors.text },
    modalItemTextSelected: { color: colors.primary, fontWeight: "bold" },

    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.backgroundSecondary,
    },
    avatarPlaceholder: {
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.primary,
    },
    avatarText: {
      color: "white",
      fontSize: 18,
      fontWeight: "bold",
    },

    // Suggestions
    suggestionsSection: {
      paddingVertical: 15,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionHeaderRow: {
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: isDark ? "#A0A0A0" : "#666",
      marginTop: 2,
    },
    suggestionsList: {
      paddingHorizontal: 15,
    },
    suggestionCard: {
      width: 130,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      padding: 12,
      marginHorizontal: 5,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.text,
      textAlign: "center",
    },
    suggestionRole: {
      fontSize: 11,
      color: colors.primary,
      textAlign: "center",
      marginTop: 2,
      textTransform: "capitalize",
    },
    suggestionBadge: {
      backgroundColor: colors.primary + "15",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      marginTop: 8,
    },
    suggestionBadgeText: {
      fontSize: 10,
      color: colors.primary,
      fontWeight: "bold",
    },
    connectButton: {
      marginTop: 10,
      backgroundColor: colors.primary,
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
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    webHeaderTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: colors.text,
    },
    webHeaderButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    webHeaderButtonText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    notificationBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.danger,
    },
  });
}
