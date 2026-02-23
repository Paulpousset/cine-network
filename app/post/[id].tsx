import ClapLoading from "@/components/ui/ClapLoading";
import PostCard from "@/components/feed/PostCard";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";
import { Ionicons } from "@expo/vector-icons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchPost = useCallback(async () => {
    try {
      const postId = Array.isArray(id) ? id[0] : id;
      if (!postId) return;

      // Fetch everything we need for FeedPost interface
      const { data: rawPost, error: postError } = await supabase
        .from("posts")
        .select(`
          *,
          user:profiles!user_id(full_name, avatar_url, job_title),
          project:tournages!project_id(*)
        `)
        .eq("id", postId)
        .single();

      if (postError) throw postError;

      // Fetch counts separately to be sure
      const { count: likesCount } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      const { count: commentsCount } = await supabase
        .from("post_comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      // Check if user has liked
      let hasLiked = false;
      if (user?.id) {
        const { data: likeData } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle();
        hasLiked = !!likeData;
      }

      // Format it like FeedPost
      const formatted = {
        id: rawPost.id,
        content: rawPost.content,
        image_url: rawPost.image_url,
        created_at: rawPost.created_at,
        user_id: rawPost.user_id,
        user: rawPost.user,
        likes_count: likesCount || 0,
        comments_count: commentsCount || 0,
        user_has_liked: hasLiked,
        project: rawPost.project
      };

      setPost(formatted);
    } catch (error) {
      console.error("[PostDetail] Error fetching post:", error);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => {
    if (id) {
        fetchPost();
    }
  }, [id, user?.id, fetchPost]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: "Publication",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 20 }}>
        {loading ? (
          <ClapLoading size={40} color={colors.primary} />
        ) : post ? (
          <PostCard item={post} onImagePress={setSelectedImage} />
        ) : (
          <View style={styles.center}>
            <Text style={{ color: colors.text }}>Post non trouvé.</Text>
          </View>
        )}
      </ScrollView>

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
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
});
