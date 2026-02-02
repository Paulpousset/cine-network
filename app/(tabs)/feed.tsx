import ClapLoading from "@/components/ClapLoading";
import PostCard, { FeedPost } from "@/components/PostCard";
import Colors from "@/constants/Colors";
import { useFeed } from "@/hooks/useFeed";
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
  View,
} from "react-native";

export default function FeedScreen() {
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
    <View style={styles.container}>
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
                  color={Colors.light.text}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push("/post/new")}>
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  color={Colors.light.text}
                />
              </TouchableOpacity>
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
                color={Colors.light.text}
              />
              <Text style={styles.webHeaderButtonText}>Mes posts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/post/new")}
              style={[
                styles.webHeaderButton,
                { backgroundColor: Colors.light.tint },
              ]}
            >
              <Ionicons name="add-circle-outline" size={18} color="white" />
              <Text style={[styles.webHeaderButtonText, { color: "white" }]}>
                Nouveau post
              </Text>
            </TouchableOpacity>
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

      <View style={styles.feedWrapper}>
        {loading && !refreshing ? (
          <ClapLoading
            style={{ marginTop: 40 }}
            color={Colors.light.primary}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  feedWrapper: {
    flex: 1,
    width: "100%",
    maxWidth: 700,
    alignSelf: "center",
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
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  webHeaderTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.light.text,
  },
  webHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  webHeaderButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.light.text,
  },
  filterContainer: {
    padding: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    width: "100%",
  },
  segmentedControl: {
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
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
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  filterTextActive: {
    color: Colors.light.tint,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 60,
    color: "#999",
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
