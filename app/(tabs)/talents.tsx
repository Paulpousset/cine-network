import ClapLoading from "@/components/ClapLoading";
import { TalentCard } from "@/components/TalentCard";
import { GlobalStyles } from "@/constants/Styles";
import { useTalents } from "@/hooks/useTalents";
import { JOB_TITLES } from "@/utils/roles";
import { fuzzySearch } from "@/utils/search";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";

function FilterSidebar({
  selectedRoles,
  setSelectedRoles,
  selectedSubRoles,
  setSelectedSubRoles,
  selectedCities,
  setSelectedCities,
  availableCities,
  suggestedRoles,
  isFreeOnly,
  setIsFreeOnly,
  experienceLevel,
  setExperienceLevel,
  setQuery,
  colors,
  styles,
  isLargeScreen,
}: any) {
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [roleSearchQuery, setRoleSearchQuery] = useState("");
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const cityObjects = useMemo(() => 
    availableCities.filter((c: string) => c !== "all").map((city: string) => ({ name: city })),
  [availableCities]);

  const filteredCities = useMemo(() => {
    if (citySearchQuery.trim().length > 0) {
      return fuzzySearch(cityObjects, ['name'], citySearchQuery, 0.3)
        .slice(0, 10)
        .map((obj: any) => obj.name);
    }
    return [];
  }, [citySearchQuery, cityObjects]);

  const allRoleEntries = useMemo(() => Object.entries(JOB_TITLES), []);
  
  const roleObjects = useMemo(() => 
    allRoleEntries.map(([category, subRoles]) => ({
      category,
      subRoles,
      combined: `${category} ${(subRoles as string[]).join(' ')}`
    })),
  [allRoleEntries]);

  const displayedRoleEntries = useMemo(() => {
    if (roleSearchQuery.length > 0) {
      const results = fuzzySearch(roleObjects, ['combined'], roleSearchQuery, 0.4);
      return results.map(obj => [obj.category, obj.subRoles]);
    }
    if (showAllRoles) return allRoleEntries;
    
    return allRoleEntries.filter(([category]) => 
      suggestedRoles.includes(category) || selectedRoles.includes(category)
    );
  }, [roleSearchQuery, showAllRoles, suggestedRoles, selectedRoles, allRoleEntries, roleObjects]);

  return (
    <View style={isLargeScreen ? styles.sidebar : { flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {isLargeScreen && <Text style={styles.sidebarTitle}>Filtres</Text>}

        {/* --- DISPONIBILITÉ --- */}
        <Text style={styles.sidebarLabel}>Disponibilité</Text>
        <View style={styles.sidebarSection}>
          <TouchableOpacity
            style={styles.sidebarCheckboxRow}
            onPress={() => setIsFreeOnly(!isFreeOnly)}
          >
            <Ionicons
              name={isFreeOnly ? "checkbox" : "square-outline"}
              size={20}
              color={isFreeOnly ? colors.primary : colors.text}
            />
            <Text
              style={[
                styles.sidebarCheckboxText,
                isFreeOnly && styles.sidebarCheckboxTextActive,
              ]}
            >
              Libre en ce moment
            </Text>
          </TouchableOpacity>
        </View>

        {/* --- EXPÉRIENCE --- */}
        <Text style={styles.sidebarLabel}>Expérience</Text>
        <View style={styles.sidebarSection}>
          {["all", "junior", "pro", "senior"].map((level) => (
            <TouchableOpacity
              key={level}
              style={styles.sidebarCheckboxRow}
              onPress={() => setExperienceLevel(level)}
            >
              <Ionicons
                name={
                  experienceLevel === level
                    ? "radio-button-on"
                    : "radio-button-off"
                }
                size={20}
                color={experienceLevel === level ? colors.primary : colors.text}
              />
              <Text
                style={[
                  styles.sidebarCheckboxText,
                  experienceLevel === level && styles.sidebarCheckboxTextActive,
                ]}
              >
                {level === "all"
                  ? "Toute expérience"
                  : level === "junior"
                  ? "Junior (≤ 2 tournages)"
                  : level === "pro"
                  ? "Pro (3-10 tournages)"
                  : "Senior (10+ tournages)"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* --- ROLES --- */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
          <Text style={[styles.sidebarLabel, { marginTop: 0, marginBottom: 0 }]}>Métiers</Text>
          {!showAllRoles && !roleSearchQuery && (
            <TouchableOpacity onPress={() => setShowAllRoles(true)}>
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Voir tout</Text>
            </TouchableOpacity>
          )}
          {showAllRoles && !roleSearchQuery && (
            <TouchableOpacity onPress={() => setShowAllRoles(false)}>
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Réduire</Text>
            </TouchableOpacity>
          )}
        </View>

        <TextInput
          style={[
            GlobalStyles.input,
            {
              marginBottom: 16,
              fontSize: 14,
              height: 44,
              backgroundColor: colors.backgroundSecondary,
              borderWidth: 1.5,
              borderColor: colors.border,
              paddingHorizontal: 14,
              borderRadius: 12,
              color: colors.text,
            },
          ]}
          placeholder="Rechercher un métier..."
          placeholderTextColor={colors.textSecondary}
          value={roleSearchQuery}
          onChangeText={setRoleSearchQuery}
        />

        <View style={styles.sidebarSection}>
          <TouchableOpacity
            style={[styles.sidebarCheckboxRow, { marginBottom: 10 }]}
            onPress={() => {
              setSelectedRoles([]);
              setSelectedSubRoles([]);
            }}
          >
            <Ionicons
              name={
                selectedRoles.length === 0 && selectedSubRoles.length === 0
                  ? "checkbox"
                  : "square-outline"
              }
              size={20}
              color={
                selectedRoles.length === 0 && selectedSubRoles.length === 0
                  ? colors.primary
                  : colors.text
              }
            />
            <Text
              style={[
                styles.sidebarCheckboxText,
                selectedRoles.length === 0 &&
                  selectedSubRoles.length === 0 &&
                  styles.sidebarCheckboxTextActive,
              ]}
            >
              Tous les métiers
            </Text>
          </TouchableOpacity>

          {displayedRoleEntries.map((entry) => {
            const [category, subs] = entry as [string, string[]];
            const isSelected = selectedRoles.includes(category);
            const isExpanded = expandedCategories.includes(category) || roleSearchQuery.length > 0;

            return (
              <View key={category} style={{ marginBottom: 4 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <TouchableOpacity
                    style={[styles.sidebarCheckboxRow, { flex: 1 }]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedRoles((prev: string[]) =>
                          prev.filter((r) => r !== category),
                        );
                      } else {
                        setSelectedRoles((prev: string[]) => [
                          ...prev,
                          category,
                        ]);
                      }
                    }}
                  >
                    <Ionicons
                      name={isSelected ? "checkbox" : "square-outline"}
                      size={20}
                      color={isSelected ? colors.primary : colors.text}
                    />
                    <Text
                      style={[
                        styles.sidebarCheckboxText,
                        isSelected && styles.sidebarCheckboxTextActive,
                        { textTransform: "capitalize" },
                      ]}
                    >
                      {category.replace("_", " ")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => toggleCategory(category)}
                    style={{ padding: 8 }}
                  >
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {isExpanded && (
                  <View style={{ marginLeft: 25, marginTop: 4, gap: 4 }}>
                    {subs.map((sub) => (
                      <TouchableOpacity
                        key={sub}
                        style={[
                          styles.sidebarCheckboxRow,
                          { paddingVertical: 4 },
                        ]}
                        onPress={() => {
                          if (selectedSubRoles.includes(sub)) {
                            setSelectedSubRoles((prev: string[]) =>
                              prev.filter((s) => s !== sub),
                            );
                          } else {
                            setSelectedSubRoles((prev: string[]) => [
                              ...prev,
                              sub,
                            ]);
                          }
                        }}
                      >
                        <Ionicons
                          name={
                            selectedSubRoles.includes(sub)
                              ? "checkbox"
                              : "square-outline"
                          }
                          size={18}
                          color={
                            selectedSubRoles.includes(sub)
                              ? colors.primary
                              : colors.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.sidebarCheckboxText,
                            { fontSize: 13 },
                            selectedSubRoles.includes(sub) &&
                              styles.sidebarCheckboxTextActive,
                          ]}
                        >
                          {sub}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* --- VILLES --- */}
        <Text style={styles.sidebarLabel}>Villes</Text>
        <TextInput
          style={[
            GlobalStyles.input,
            {
              marginBottom: 16,
              fontSize: 14,
              height: 44,
              backgroundColor: colors.backgroundSecondary,
              borderWidth: 1.5,
              borderColor: colors.border,
              paddingHorizontal: 14,
              borderRadius: 12,
              color: colors.text,
            },
          ]}
          placeholder="Rechercher une ville..."
          placeholderTextColor={colors.textSecondary}
          value={citySearchQuery}
          onChangeText={setCitySearchQuery}
        />

        {/* Selected cities tags */}
        {selectedCities.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {selectedCities.map((city: string) => (
              <TouchableOpacity
                key={city}
                onPress={() => setSelectedCities((prev: string[]) => prev.filter(c => c !== city))}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.primary + '20',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  gap: 4
                }}
              >
                <Text style={{ fontSize: 12, color: colors.primary }}>{city}</Text>
                <Ionicons name="close" size={14} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {filteredCities.length > 0 && (
          <View style={[styles.sidebarSection, { backgroundColor: colors.background, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 5 }]}>
            {filteredCities.map((city: string) => (
              <TouchableOpacity
                key={city}
                style={[styles.sidebarCheckboxRow, { paddingHorizontal: 10 }]}
                onPress={() => {
                  setSelectedCities((prev: string[]) =>
                    prev.includes(city)
                      ? prev.filter((c) => c !== city)
                      : [...prev, city],
                  );
                  setCitySearchQuery("");
                }}
              >
                <Ionicons
                  name={
                    selectedCities.includes(city)
                      ? "checkbox"
                      : "square-outline"
                  }
                  size={20}
                  color={
                    selectedCities.includes(city)
                      ? colors.primary
                      : colors.text
                  }
                />
                <Text style={[styles.sidebarCheckboxText, selectedCities.includes(city) && styles.sidebarCheckboxTextActive]}>
                  {city}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            setSelectedRoles([]);
            setSelectedSubRoles([]);
            setSelectedCities([]);
            setIsFreeOnly(false);
            setExperienceLevel("all");
            setQuery("");
            setCitySearchQuery("");
            setRoleSearchQuery("");
            setExpandedCategories([]);
            setShowAllRoles(false);
          }}
        >
          <Text style={styles.resetButtonText}>Réinitialiser tout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function WebCellWrapper({ children, style, ...props }: any) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <View
      {...props}
      style={[
        style,
        {
          zIndex: isHovered ? 100000 : 1,
          overflow: "visible",
          position: 'relative', // Essentiel pour que le zIndex soit pris en compte sur le web
        },
      ]}
      // @ts-ignore
      onMouseEnter={() => setIsHovered(true)}
      // @ts-ignore
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </View>
  );
}

export default function DiscoverProfiles() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const { isGuest } = useUser();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 1100;
  const isMobile = width <= 768;
  const [mobileFiltersVisible, setMobileFiltersVisible] = useState(false);

  const {
    profiles,
    suggestedProfiles,
    loading,
    availableCities,
    suggestedRoles,
    selectedRoles,
    setSelectedRoles,
    selectedSubRoles,
    setSelectedSubRoles,
    selectedCities,
    setSelectedCities,
    isFreeOnly,
    setIsFreeOnly,
    experienceLevel,
    setExperienceLevel,
    query,
    setQuery,
    fetchPendingCount,
    sendConnectionRequest,
    myConnections,
  } = useTalents();

  useFocusEffect(
    useCallback(() => {
      fetchPendingCount();
    }, [fetchPendingCount]),
  );

  function renderSuggestion(item: any, cardWidth?: any) {
    return (
      <TouchableOpacity
        key={"suggested-" + item.id}
        style={[styles.suggestionCard, cardWidth ? { width: cardWidth, marginHorizontal: 0 } : {}]}
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
          <Text style={styles.suggestionBadgeText}>{item.suggestionReason || "Mutual"}</Text>
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
    <View style={{ backgroundColor: colors.background }}>
      {Platform.OS === "web" ? (
        <View style={styles.webHeader}>
          <Text style={styles.webHeaderTitle}>Communauté</Text>
          <View style={{ flexDirection: "row", gap: 16 }}>
            {!isGuest && (
              <TouchableOpacity
                onPress={() => router.push("/network/connections")}
                style={styles.webHeaderButton}
              >
                <Ionicons name="people" size={20} color={colors.primary} />
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
              padding: 16,
              backgroundColor: colors.background,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
              <Ionicons
                name="people"
                size={20}
                color={colors.primary}
              />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
              Mes relations
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textSecondary}
              style={{ marginLeft: "auto" }}
            />
          </TouchableOpacity>
        )
      )}

      {/* SECTION SUGGESTIONS */}
      {suggestedProfiles.length > 0 && (
        <View style={styles.suggestionsSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recommandations pour vous</Text>
            <Text style={styles.sectionSubtitle}>Basé sur vos relations et vos métiers</Text>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ 
              paddingHorizontal: 24,
              paddingBottom: 20,
              gap: 12,
            }}
          >
            {suggestedProfiles
              .slice(0, 10)
              .map((item) => {
                const cardWidth = 160;
                return renderSuggestion(item, cardWidth);
              })
            }
          </ScrollView>
        </View>
      )}

      {/* SEARCH BAR */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={colors.primary} style={styles.searchIcon} />
          <TextInput
            placeholder="Rechercher un talent par nom..."
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {!isLargeScreen && (
        <TouchableOpacity
          style={styles.mobileFilterButton}
          onPress={() => setMobileFiltersVisible(true)}
        >
          <Ionicons name="options" size={20} color="white" />
          <Text style={styles.mobileFilterButtonText}>Filtres</Text>
          {(selectedRoles.length > 0 ||
            selectedCities.length > 0 ||
            isFreeOnly ||
            experienceLevel !== "all") && (
            <View style={styles.filterBadge} />
          )}
        </TouchableOpacity>
      )}

      <Modal
        visible={mobileFiltersVisible && !isLargeScreen}
        animationType="slide"
        onRequestClose={() => setMobileFiltersVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'bottom']}>
          <View style={styles.mobileFilterHeader}>
            <Text style={styles.mobileFilterTitle}>Filtres</Text>
            <TouchableOpacity onPress={() => setMobileFiltersVisible(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1 }}>
            <FilterSidebar
              selectedRoles={selectedRoles}
              setSelectedRoles={setSelectedRoles}
              selectedSubRoles={selectedSubRoles}
              setSelectedSubRoles={setSelectedSubRoles}
              selectedCities={selectedCities}
              setSelectedCities={setSelectedCities}
              availableCities={availableCities}
              suggestedRoles={suggestedRoles}
              isFreeOnly={isFreeOnly}
              setIsFreeOnly={setIsFreeOnly}
              experienceLevel={experienceLevel}
              setExperienceLevel={setExperienceLevel}
              setQuery={setQuery}
              colors={colors}
              styles={styles}
              isLargeScreen={false}
            />
            <TouchableOpacity
              style={[styles.applyButton, { marginTop: 20 }]}
              onPress={() => setMobileFiltersVisible(false)}
            >
              <Text style={styles.applyButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <View style={styles.mainContent}>
        {isLargeScreen && (
          <FilterSidebar
            selectedRoles={selectedRoles}
            setSelectedRoles={setSelectedRoles}
            selectedSubRoles={selectedSubRoles}
            setSelectedSubRoles={setSelectedSubRoles}
            selectedCities={selectedCities}
            setSelectedCities={setSelectedCities}
            availableCities={availableCities}
            suggestedRoles={suggestedRoles}
            isFreeOnly={isFreeOnly}
            setIsFreeOnly={setIsFreeOnly}
            experienceLevel={experienceLevel}
            setExperienceLevel={setExperienceLevel}
            setQuery={setQuery}
            colors={colors}
            styles={styles}
            isLargeScreen={true}
          />
        )}

        <View style={styles.listContainer}>
          {loading ? (
            <ClapLoading
              size={50}
              color={colors.primary}
              style={{ marginTop: 30 }}
            />
          ) : (
            Platform.OS === 'web' && isLargeScreen ? (
              <FlatList
                numColumns={3}
                ListHeaderComponent={listHeader}
                data={profiles}
                keyExtractor={(item: any) => item.id}
                CellRendererComponent={WebCellWrapper}
                renderItem={({ item }) => (
                  <TalentCard 
                    item={item} 
                    myConnections={myConnections} 
                    style={{ padding: 8, flex: 1/3, height: 140 + 16 }}
                  />
                )}
                contentContainerStyle={{
                  paddingBottom: 120,
                  paddingHorizontal: 15,
                  overflow: 'visible',
                }}
                ListEmptyComponent={
                  <Text style={{ textAlign: "center", marginTop: 50, color: "#999" }}>
                    Aucun profil trouvé.
                  </Text>
                }
              />
            ) : (
              <FlashList
                key={isLargeScreen ? "grid" : "list"}
                numColumns={isLargeScreen ? 3 : 1}
                ListHeaderComponent={listHeader}
                data={profiles}
                keyExtractor={(item: any) => item.id}
                renderItem={({ item }) => (
                  <TalentCard 
                    item={item} 
                    myConnections={myConnections} 
                    style={[
                      isLargeScreen ? { padding: 8, flex: 1/3, height: 180 + 16 } : {},
                    ]}
                  />
                )}
                estimatedItemSize={200}
                contentContainerStyle={{
                  paddingBottom: 120,
                  paddingHorizontal: isLargeScreen ? 15 : 0,
                }}
                ListEmptyComponent={
                  <Text
                    style={{ textAlign: "center", marginTop: 50, color: "#999" }}
                  >
                    Aucun profil trouvé.
                  </Text>
                }
                {...({} as any)}
              />
            )
          )}
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    mainContent: {
      flex: 1,
      flexDirection: "row",
    },
    sidebar: {
      width: 320,
      backgroundColor: colors.card,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      padding: 24,
      height: "100%",
    },
    sidebarTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 24,
      letterSpacing: -0.5,
    },
    sidebarLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textSecondary,
      marginTop: 24,
      marginBottom: 12,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    sidebarSection: {
      marginBottom: 12,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      padding: 8,
    },
    sidebarCheckboxRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 12,
      gap: 12,
      borderRadius: 8,
    },
    sidebarCheckboxText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    sidebarCheckboxTextActive: {
      color: colors.primary,
      fontWeight: "700",
    },
    resetButton: {
      marginTop: 32,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.danger + "08",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.danger + "15",
    },
    resetButtonText: {
      color: colors.danger,
      fontWeight: "700",
      fontSize: 14,
    },
    listContainer: {
      flex: 1,
    },
    mobileFilterButton: {
      position: "absolute",
      bottom: 25,
      alignSelf: "center",
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 30,
      gap: 10,
      zIndex: 100,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 6,
    },
    mobileFilterButtonText: {
      color: "white",
      fontWeight: "bold",
      fontSize: 16,
    },
    filterBadge: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "white",
      position: "absolute",
      top: 10,
      right: 15,
    },
    mobileFilterHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingVertical: 16,
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    mobileFilterTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.5,
    },
    applyButton: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 20,
    },
    applyButtonText: {
      color: "white",
      fontWeight: "bold",
      fontSize: 16,
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
    searchRow: { 
      paddingHorizontal: 24, 
      paddingBottom: 24, 
      paddingTop: 10,
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 16,
      height: 56,
      paddingHorizontal: 20,
      width: '100%',
      ...Platform.select({
        web: {
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
        }
      })
    },
    searchIcon: {
      marginRight: 12,
    },
    searchInput: {
      flex: 1,
      height: '100%',
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
      padding: 0,
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
      backgroundColor: colors.backgroundSecondary,
    },
    avatarText: {
      color: colors.textSecondary,
      fontSize: 18,
      fontWeight: "bold",
    },

    // Suggestions
    suggestionsSection: {
      paddingVertical: 24,
      backgroundColor: colors.background,
    },
    sectionHeaderRow: {
      paddingHorizontal: 24,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -0.5,
    },
    sectionSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    suggestionsList: {
      paddingHorizontal: 15,
    },
    suggestionCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 12,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    suggestionAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      marginBottom: 8,
    },
    suggestionAvatarText: {
      color: colors.textSecondary,
      fontSize: 20,
      fontWeight: "bold",
    },
    suggestionName: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
    },
    suggestionRole: {
      fontSize: 11,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 2,
      fontWeight: '600',
      textTransform: "capitalize",
    },
    suggestionBadge: {
      backgroundColor: colors.backgroundSecondary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      marginTop: 6,
    },
    suggestionBadgeText: {
      fontSize: 10,
      color: colors.text,
      fontWeight: "700",
    },
    connectButton: {
      marginTop: 10,
      backgroundColor: colors.primary,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 12,
      gap: 6,
      width: "100%",
      justifyContent: "center",
    },
    connectButtonText: {
      color: "white",
      fontSize: 12,
      fontWeight: "700",
    },
    // Web Header
    webHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingVertical: 24,
      backgroundColor: colors.background,
    },
    webHeaderTitle: {
      fontSize: 32,
      fontWeight: "800",
      color: colors.text,
      letterSpacing: -1,
    },
    webHeaderButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.card,
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    webHeaderButtonText: {
      fontSize: 14,
      fontWeight: "700",
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
