import ClapLoading from "@/components/ClapLoading";
import PostCard, { FeedPost } from "@/components/PostCard";
import { SuggestedCastingsSidebar } from "@/components/SuggestedCastingsSidebar";
import { SuggestedProfilesSidebar } from "@/components/SuggestedProfilesSidebar";
import { useFeed } from "@/hooks/useFeed";
import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { router, Stack } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

export default function FeedScreen() {
  const { colors, isDark } = useTheme();
  const { isGuest } = useUser();
  const styles = createStyles(colors, isDark);
  const { width } = useWindowDimensions();
  const isWebLarge = Platform.OS === "web" && width > 1000;

  const {
    posts,
    loading,
    refreshing,
    onRefresh,
    feedMode,
    setFeedMode,
    userId,
  } = useFeed();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const renderItem = ({ item }: { item: FeedPost }) => (
    <PostCard item={item} onImagePress={setSelectedImage} />
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: "Fil d'actualité",
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 15, marginRight: 15 }}>
              <TouchableOpacity
                onPress={() =>
                  userId &&
                  router.push({
                    pathname: "/profile/posts",
                    params: { userId: userId, userName: "Moi" },
                  })
                }
              >
                <Ionicons
                  name="documents-outline"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>

              {!isGuest && (
                <TouchableOpacity onPress={() => router.push("/post/new")}>
                  <Ionicons
                    name="add-circle-outline"
                    size={24}
                    color={colors.text}
                  />
                </TouchableOpacity>
              )}
            </View>
          ),
        }}
      />

      {/* En-tête spécifique au Web car le header natif est masqué */}
      {Platform.OS === "web" && (
        <View style={styles.webHeader}>
          <Text style={styles.webHeaderTitle}>Fil d'actualité</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              onPress={() =>
                userId &&
                router.push({
                  pathname: "/profile/posts",
                  params: { userId: userId, userName: "Moi" },
                })
              }
              style={styles.webHeaderButton}
            >
              <Ionicons
                name="documents-outline"
                size={18}
                color={colors.text}
              />
              <Text style={[styles.webHeaderButtonText, { color: colors.text }]}>Mes posts</Text>
            </TouchableOpacity>

            {!isGuest && (
              <TouchableOpacity
                onPress={() => router.push("/post/new")}
                style={[
                  styles.webHeaderButton,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Ionicons name="add-circle-outline" size={18} color="white" />
                <Text style={[styles.webHeaderButtonText, { color: "white" }]}>
                  Nouveau post
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Feed Filters - Segmented Control style - Sortie du feedWrapper pour être full-width sur Web */}
      <View style={styles.filterContainer}>
        <View
          style={[
            styles.segmentedControl,
            Platform.OS === "web" && {
              alignSelf: "center",
              width: "100%",
              maxWidth: "100%", // Truly edge to edge if needed, or matched to general content area
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => setFeedMode("network")}
            style={[
              styles.filterBtn,
              feedMode === "network" && styles.filterBtnActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                feedMode === "network" && styles.filterTextActive,
              ]}
            >
              Mon Réseau
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setFeedMode("all")}
            style={[
              styles.filterBtn,
              feedMode === "all" && styles.filterBtnActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                feedMode === "all" && styles.filterTextActive,
              ]}
            >
              Global
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mainContent}>
        <View style={styles.feedWrapper}>
          {loading && !refreshing ? (
            <ClapLoading
              style={{ marginTop: 40 }}
              color={colors.primary}
              size={40}
            />
          ) : (
            <FlashList
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              // @ts-ignore
              estimatedItemSize={400}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  Aucune actualité pour le moment. Connectez-vous avec d'autres
                  personnes pour voir leurs posts !
                </Text>
              }
            />
          )}
        </View>

        {isWebLarge && (
            <View style={{ paddingTop: 12 }}>
                <SuggestedProfilesSidebar />
                <SuggestedCastingsSidebar />
            </View>
        )}
      </View>
      {/* Full Screen Image Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close" size={30} color="white" />
          </TouchableOpacity>
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    mainContent: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "center",
      width: "100%",
    },
    feedWrapper: {
      flex: 1,
      maxWidth: 700,
    },
    listContent: {
      padding: 12,
      paddingBottom: 80,
    },
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
      fontWeight: "800",
      color: colors.text,
    },
    webHeaderButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundSecondary,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 20,
      gap: 6,
    },
    webHeaderButtonText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.text,
    },
    filterContainer: {
      padding: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      width: "100%",
    },
    segmentedControl: {
      flexDirection: "row",
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 10,
      padding: 3,
    },
    filterBtn: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 8,
      alignItems: "center",
    },
    filterBtnActive: {
      backgroundColor: isDark ? colors.background : "white",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    filterText: {
      fontSize: 14,
      fontWeight: "600",
      color: isDark ? "#D1D5DB" : "#666",
    },
    filterTextActive: {
      color: colors.primary,
    },
    emptyText: {
      textAlign: "center",
      marginTop: 60,
      color: colors.text,
      opacity: 0.6,
      fontSize: 15,
      paddingHorizontal: 40,
      lineHeight: 22,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.9)",
      justifyContent: "center",
      alignItems: "center",
    },
    closeButton: {
      position: "absolute",
      top: 50,
      right: 20,
      zIndex: 1,
      padding: 10,
    },
    fullImage: {
      width: "100%",
      height: "100%",
    },
  });
}
