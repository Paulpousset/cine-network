import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
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
          backgroundColor: "#eee",
          justifyContent: "center",
          alignItems: "center",
          borderRadius: 8,
          marginBottom: 10,
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        width: "100%",
        aspectRatio: aspectRatio,
        marginBottom: 10,
      }}
    >
      <Image
        source={{ uri }}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 8,
          backgroundColor: "#eee",
        }}
        resizeMode="cover"
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
      if (user) setUserId(user.id);
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
          project:tournages(id, title), 
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
                  style={{ alignItems: "center", marginVertical: 6 }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      try {
                        router.push(value);
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
              <Text key={`${index}-${line}`} style={styles.contentLine}>
                <Text style={styles.kvKey}>{key}:</Text>
                {value ? ` ${value}` : ""}
              </Text>
            );
          }

          return (
            <Text key={`${index}-${line}`} style={styles.contentLine}>
              {line}
            </Text>
          );
        })}
      </View>
    );
  };

  const renderItem = ({ item }: { item: Post }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Image
          source={{
            uri: item.user?.avatar_url || "https://via.placeholder.com/40",
          }}
          style={styles.avatar}
        />
        <View style={styles.headerText}>
          <Text style={styles.name}>
            {item.user?.full_name || "Utilisateur"}
          </Text>
          <Text style={styles.date}>
            {new Date(item.created_at).toLocaleDateString()}{" "}
            {new Date(item.created_at).getHours()}:
            {new Date(item.created_at).getMinutes().toString().padStart(2, "0")}
          </Text>
        </View>
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
          style={styles.projectLink}
        >
          <Ionicons name="film" size={16} color="#666" />
          <Text style={styles.projectTitle}>
            Tournage : {item.project.title}
          </Text>
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
                <Ionicons name="documents-outline" size={24} color="black" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push("/post/new")}>
                <Ionicons name="add-circle-outline" size={24} color="black" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* Feed Filters */}
      <View
        style={{
          flexDirection: "row",
          padding: 10,
          gap: 10,
          backgroundColor: "white",
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

      {loading && !refreshing ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
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
    backgroundColor: "#f4f4f4",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  headerText: {
    flex: 1,
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "#eee",
  },
  name: {
    fontWeight: "bold",
    fontSize: 16,
    textAlign: "center",
  },
  date: {
    color: "#666",
    fontSize: 12,
    textAlign: "center",
  },
  contentBlock: {
    marginBottom: 10,
  },
  contentLine: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: "#222",
  },
  kvKey: {
    fontWeight: "700",
    color: "#841584",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  linkText: {
    color: Colors.light.tint,
    textDecorationLine: "underline",
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#eee",
    justifyContent: "center",
  },
  projectTitle: {
    marginLeft: 8,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
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
    backgroundColor: "#f0f0f0",
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
