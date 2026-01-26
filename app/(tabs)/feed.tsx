import ClapLoading from "@/components/ClapLoading";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { getRecommendedRoles } from "@/lib/matching";
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

  // Recommendations
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        fetchRecommendations(user.id);
      }
    });
  }, []);

  const fetchRecommendations = async (uid: string) => {
    try {
      // 1. Get User Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();
      if (!profile) return;

      // 2. Get Open Roles
      const { data: roles } = await supabase
        .from("project_roles")
        .select(
          `
                *,
                tournages (*)
            `,
        )
        .eq("status", "published")
        .is("assigned_profile_id", null)
        .limit(50); // Limit for performance

      if (!roles) return;

      // 3. Calculate
      const recs = getRecommendedRoles(profile, roles);
      setRecommendations(recs.slice(0, 3)); // Top 3
    } catch (e) {
      console.log("Error fetching recommendations", e);
    }
  };

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
    if (userId) fetchRecommendations(userId);
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
                  style={{ alignItems: "center", marginVertical: 6 }}
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
    <View style={GlobalStyles.card}>
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
              uri: item.user?.avatar_url || "https://via.placeholder.com/40",
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

      {item.content && renderContent(item.content)}

      {item.image_url && (
        <AutoHeightImage
          uri={item.image_url}
          onPress={() => setSelectedImage(item.image_url)}
        />
      )}

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

      {/* En-tête spécifique au Web car le header natif est masqué */}
      {Platform.OS === "web" && (
        <View style={styles.webHeader}>
          <Text style={styles.webHeaderTitle}>Fil d'actualité</Text>
          <View style={{ flexDirection: "row", gap: 20 }}>
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
                size={22}
                color={Colors.light.text}
              />
              <Text style={styles.webHeaderButtonText}>Mes posts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/post/new")}
              style={styles.webHeaderButton}
            >
              <Ionicons
                name="add-circle-outline"
                size={22}
                color={Colors.light.text}
              />
              <Text style={styles.webHeaderButtonText}>Nouveau post</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Feed Filters */}
      <View
        style={{
          flexDirection: "row",
          padding: 10,
          gap: 10,
          backgroundColor: Colors.light.background,
        }}
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
              feedMode === "network" && { color: "white" },
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
              feedMode === "all" && { color: "white" },
            ]}
          >
            Global
          </Text>
        </TouchableOpacity>
      </View>

      {/* RECOMMENDATIONS SECTION */}
      {recommendations.length > 0 && (
        <View
          style={{
            padding: 15,
            backgroundColor: "#f0f4ff",
            borderBottomWidth: 1,
            borderColor: "#e0e0e0",
          }}
        >
          <Text
            style={{
              fontWeight: "bold",
              fontSize: 16,
              marginBottom: 10,
              color: Colors.light.primary,
            }}
          >
            ✨ Recommandé pour vous
          </Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={recommendations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => router.push(`/project/role/${item.id}`)}
                style={{
                  backgroundColor: "white",
                  padding: 10,
                  borderRadius: 8,
                  marginRight: 10,
                  width: 200,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                  elevation: 2,
                }}
              >
                <Text
                  style={{ fontWeight: "bold", marginBottom: 2 }}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text
                  style={{ fontSize: 10, color: "#666", marginBottom: 5 }}
                  numberOfLines={1}
                >
                  {item.tournages?.title} • {item.matchScore}% Match
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      color: Colors.light.primary,
                      fontWeight: "bold",
                    }}
                  >
                    {item.category}
                  </Text>
                  <Ionicons
                    name="arrow-forward-circle"
                    size={20}
                    color={Colors.light.tint}
                  />
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {loading && !refreshing ? (
        <ClapLoading
          style={{ marginTop: 20 }}
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
          contentContainerStyle={{ padding: 10, paddingBottom: 80 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Aucune actualité pour le moment. Connectez-vous avec d'autres
              personnes pour voir leurs posts !
            </Text>
          }
        />
      )}

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
    backgroundColor: Colors.light.backgroundSecondary,
  },
  webHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  webHeaderTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.light.text,
  },
  webHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  webHeaderButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.light.text,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    justifyContent: "space-between",
  },
  webProjectHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 6,
    borderRadius: 20,
    maxWidth: 200,
    gap: 8,
  },
  webProjectHeaderImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  webProjectHeaderPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
  },
  webProjectHeaderText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#444",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  name: {
    fontWeight: "bold",
    fontSize: 16,
    color: Colors.light.text,
  },
  date: {
    color: "#666",
    fontSize: 12,
  },
  contentBlock: {
    marginBottom: 10,
  },
  kvKey: {
    fontWeight: "700",
    color: Colors.light.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  linkButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  linkButtonText: {
    color: "white",
    fontWeight: "700",
    textAlign: "center",
  },
  projectLink: {
    // Removed old style
  },
  projectCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 10,
    marginBottom: 10,
    gap: 12,
  },
  projectCardImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  projectCardPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  projectCardContent: {
    flex: 1,
    justifyContent: "center",
  },
  projectCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  projectCardType: {
    fontSize: 10,
    fontWeight: "bold",
    color: Colors.light.primary,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  projectCardMeta: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  projectCardDate: {
    fontSize: 10,
    color: "#888",
  },
  footer: {
    marginTop: 5,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    color: "#666",
    paddingHorizontal: 40,
  },
  filterBtn: {
    flex: 1,
    padding: 8,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    alignItems: "center",
  },
  filterBtnActive: {
    backgroundColor: Colors.light.tint,
  },
  filterText: {
    fontWeight: "600",
    color: "#666",
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
