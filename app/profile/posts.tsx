import ClapLoading from "@/components/ClapLoading";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Platform,
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
  };
  project?: {
    id: string;
    title: string;
  };
}

export default function UserPostsScreen() {
  const { userId, userName } = useLocalSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchUserPosts();
    }, [userId]),
  );

  const fetchUserPosts = async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          id,
          content,
          image_url,
          created_at,
          user_id,
          project:tournages(id, title), 
          user:profiles (full_name, avatar_url)
        `,
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching posts:", error);
      } else {
        setPosts(data as any);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId: string) => {
    const confirmDelete = async () => {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) {
        Alert.alert("Erreur", "Impossible de supprimer le post.");
      } else {
        fetchUserPosts();
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Êtes-vous sûr de vouloir supprimer ce post ?")) {
        confirmDelete();
      }
      return;
    }

    Alert.alert("Supprimer", "Êtes-vous sûr de vouloir supprimer ce post ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: confirmDelete,
      },
    ]);
  };

  const renderItem = ({ item }: { item: Post }) => (
    <View style={GlobalStyles.card}>
      <View style={styles.header}>
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
            {new Date(item.created_at).getMinutes().toString().padStart(2, "0")}
          </Text>
        </View>

        {currentUserId === userId && (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={() => router.push(`/post/edit/${item.id}`)}
            >
              <Ionicons name="pencil" size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deletePost(item.id)}>
              <Ionicons name="trash" size={20} color={Colors.light.danger} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {item.content && <Text style={GlobalStyles.body}>{item.content}</Text>}

      {item.image_url && (
        <Image
          source={{ uri: item.image_url }}
          style={styles.postImage}
          resizeMode="cover"
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
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: userName ? `Posts de ${userName}` : "Posts",
          headerBackTitle: "Profil",
        }}
      />

      {loading ? (
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
          contentContainerStyle={{ padding: 10, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="newspaper-outline" size={50} color="#ccc" />
              <Text style={styles.emptyText}>Aucun post pour le moment.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
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
    color: Colors.light.text,
  },
  date: {
    color: "#666",
    fontSize: 12,
  },
  postImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: "#eee",
  },
  projectLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  projectTitle: {
    marginLeft: 8,
    fontWeight: "600",
    color: "#333",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 10,
    color: "#666",
    fontSize: 16,
  },
});
