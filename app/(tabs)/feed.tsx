import ClapLoading from "@/components/ClapLoading";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import type { Href } from "expo-router";
import { router, Stack, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    FlatList,
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

interface Post {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  user: {
    full_name: string;
    avatar_url: string | null;
    job_title?: string;
  };
  project?: {
    id: string;
    title: string;
    image_url?: string | null;
    type?: string;
    ville?: string;
    start_date?: string;
    end_date?: string;
  };
}

// Helper component to display image with correct aspect ratio
const AutoHeightImage = ({
  uri,
  onPress,
}: {
  uri: string;
  onPress: () => void;
}) => {
  const [aspectRatio, setAspectRatio] = useState(1); // Default square
  const [loading, setLoading] = useState(true);
  const { width: windowWidth } = useWindowDimensions();
  const isWeb = Platform.OS === "web";

  useEffect(() => {
    let isMounted = true;
    Image.getSize(
      uri,
      (width, height) => {
        if (isMounted && width && height) {
          setAspectRatio(width / height);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Failed to get image size", error);
        if (isMounted) setLoading(false);
      },
    );
    return () => {
      isMounted = false;
    };
  }, [uri]);

  if (loading) {
    return (
      <View
        style={{
          width: "100%",
          height: 200,
          backgroundColor: Colors.light.backgroundSecondary,
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 8,
          marginBottom: 10,
        }}
      >
        <ClapLoading size={30} color={Colors.light.primary} />
      </View>
    );
  }

  // Sur Web, on limite la hauteur maximale des images pour éviter qu'elles ne remplissent l'écran
  const imageContainerStyle: any = {
    width: "100%",
    aspectRatio: aspectRatio,
    marginBottom: 10,
    maxHeight: isWeb && windowWidth > 768 ? 500 : undefined,
    overflow: "hidden",
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={imageContainerStyle}
    >
      <Image
        source={{ uri }}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 8,
        }}
        resizeMode={isWeb ? "contain" : "cover"}
      />
    </TouchableOpacity>
  );
};

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<"network" | "all">("network");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
      }
    });
  }, []);

  const fetchPosts = async () => {
    let currentUserId = userId;

    if (!currentUserId) {
      // Try getting it just in case state isn't ready
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      currentUserId = user.id;
      setUserId(user.id);
    }

    try {
      let query = supabase
        .from("posts")
        .select(
          `
          id,
          content,
          image_url,
          created_at,
          user_id,
          visibility,
          project:tournages(id, title, image_url, type, ville, start_date, end_date), 
          user:profiles (full_name, avatar_url) 
        `,
        )
        .order("created_at", { ascending: false });

      // Apply filters based on mode
      if (feedMode === "all") {
        query = query.eq("visibility", "public");
      } else {
        // Step 1: Get my connections
        const { data: connections } = await supabase
          .from("connections")
          .select("receiver_id, requester_id")
          .eq("status", "accepted")
          .or(
            `receiver_id.eq.${currentUserId},requester_id.eq.${currentUserId}`,
          );

        const connectedIds =
          connections?.map((c) =>
            c.requester_id === currentUserId ? c.receiver_id : c.requester_id,
          ) || [];

        // Add myself
        if (currentUserId) connectedIds.push(currentUserId);

        query = query.in("user_id", connectedIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching posts:", error);
      } else {
        setPosts(data as any);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [userId, feedMode]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const renderContent = (content: string) => {
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return (
      <View style={styles.contentBlock}>
        {lines.map((line, index) => {
          const hasKeyValue = line.includes(":");
          if (hasKeyValue) {
            const [rawKey, ...rest] = line.split(":");
            const key = rawKey.trim();
            const value = rest.join(":").trim();
            const keyLower = key.toLowerCase();

            // If it's a link line, render as a tappable link
            if (keyLower === "lien" && value.length > 0) {
              return (
                <View
                  key={`${index}-${line}`}
                  style={styles.linkButtonContainer}
                >
                  <TouchableOpacity
                    onPress={() => {
                      try {
                        router.push(value as Href);
                      } catch (e) {
                        // noop
                      }
                    }}
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkButtonText}>Voir l'offre</Text>
                  </TouchableOpacity>
                </View>
              );
            }

            return (
              <Text key={`${index}-${line}`} style={GlobalStyles.body}>
                <Text style={styles.kvKey}>{key}:</Text>
                {value ? ` ${value}` : ""}
              </Text>
            );
          }

          return (
            <Text key={`${index}-${line}`} style={GlobalStyles.body}>
              {line}
            </Text>
          );
        })}
      </View>
    );
  };

  const renderItem = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/profile/[id]",
              params: { id: item.user_id },
            })
          }
          style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
        >
          <Image
            source={{
              uri:
                item.user?.avatar_url ||
                "https://randomuser.me/api/portraits/lego/1.jpg",
            }}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {item.user?.full_name || "Utilisateur"}
            </Text>
            <Text style={styles.date}>
              {new Date(item.created_at).toLocaleDateString()}{" "}
              {new Date(item.created_at).getHours()}:
              {new Date(item.created_at)
                .getMinutes()
                .toString()
                .padStart(2, "0")}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Ajout de la photo du tournage dans le header sur Web */}
        {Platform.OS === "web" && item.project && (
          <TouchableOpacity
            onPress={() => router.push(`/project/${item.project!.id}`)}
            style={styles.webProjectHeaderInfo}
          >
            {item.project.image_url ? (
              <Image
                source={{ uri: item.project.image_url }}
                style={styles.webProjectHeaderImage}
              />
            ) : (
              <View style={styles.webProjectHeaderPlaceholder}>
                <Ionicons name="film" size={14} color="#999" />
              </View>
            )}
            <Text style={styles.webProjectHeaderText} numberOfLines={1}>
              {item.project.title}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.postContentContainer}>
        {item.content && renderContent(item.content)}

        {item.image_url && (
          <AutoHeightImage
            uri={item.image_url}
            onPress={() => setSelectedImage(item.image_url)}
          />
        )}
      </View>

      {item.project && (
        <TouchableOpacity
          onPress={() => router.push(`/project/${item.project!.id}`)}
          style={styles.projectCard}
          activeOpacity={0.9}
        >
          {item.project.image_url ? (
            <Image
              source={{ uri: item.project.image_url }}
              style={styles.projectCardImage}
            />
          ) : (
            <View style={styles.projectCardPlaceholder}>
              <Ionicons
                name="film"
                size={24}
                color={Colors.light.tabIconDefault}
              />
            </View>
          )}

          <View style={styles.projectCardContent}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text style={styles.projectCardType}>
                {item.project.type?.replace("_", " ").toUpperCase() || "PROJET"}
              </Text>
              {item.project.start_date && (
                <Text style={styles.projectCardDate}>
                  •{" "}
                  {new Date(item.project.start_date).toLocaleDateString(
                    undefined,
                    { month: "short", year: "numeric" },
                  )}
                </Text>
              )}
            </View>
            <Text style={styles.projectCardTitle} numberOfLines={1}>
              {item.project.title}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Ionicons name="location-outline" size={12} color="#666" />
              <Text style={styles.projectCardMeta}>
                {item.project.ville || "Lieu non défini"}
              </Text>
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.light.border}
            style={{ marginRight: 5 }}
          />
        </TouchableOpacity>
      )}

      <View style={styles.footer}>
        {/* Actions like Like/Comment could go here */}
      </View>
    </View>
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

      <View style={styles.feedWrapper}>
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

        {/* Feed Filters - Segmented Control style */}
        <View style={styles.filterContainer}>
          <View style={styles.segmentedControl}>
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

        {loading && !refreshing ? (
          <ClapLoading
            style={{ marginTop: 40 }}
            color={Colors.light.primary}
            size={40}
          />
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
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
  postCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eee",
  },
  name: {
    fontWeight: "700",
    fontSize: 16,
    color: Colors.light.text,
  },
  date: {
    color: "#888",
    fontSize: 12,
    marginTop: 1,
  },
  postContentContainer: {
    marginBottom: 12,
  },
  contentBlock: {
    marginBottom: 10,
  },
  kvKey: {
    fontWeight: "700",
    color: Colors.light.primary,
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  linkButtonContainer: {
    alignItems: "flex-start",
    marginTop: 10,
    marginBottom: 5,
  },
  linkButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  linkButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },
  projectCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    padding: 10,
    gap: 12,
  },
  projectCardImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  projectCardPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  projectCardContent: {
    flex: 1,
  },
  projectCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
  },
  projectCardType: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.light.primary,
    backgroundColor: "#fff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.primary + "30",
    overflow: "hidden",
  },
  projectCardMeta: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  projectCardDate: {
    fontSize: 10,
    color: "#999",
  },
  footer: {
    marginTop: 5,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 60,
    color: "#999",
    fontSize: 15,
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  webProjectHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 4,
    paddingRight: 10,
    borderRadius: 20,
    maxWidth: 150,
  },
  webProjectHeaderImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  webProjectHeaderPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ddd",
    marginRight: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  webProjectHeaderText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#444",
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
