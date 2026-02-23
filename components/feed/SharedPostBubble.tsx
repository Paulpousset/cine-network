import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface SharedPostBubbleProps {
  postId: string;
}

export const SharedPostBubble = ({ postId }: SharedPostBubbleProps) => {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          content,
          image_url,
          created_at,
          user_id,
          user:profiles!user_id(full_name, avatar_url, job_title),
          project:tournages!project_id(id, title, image_url, type)
        `)
        .eq("id", postId)
        .single();

      if (error) throw error;

      // Also get counts for precise preview
      const { count: likesCount } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      setPost({
        ...data,
        likes_count: likesCount || 0
      });
    } catch (error) {
      console.error("Error fetching shared post:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={16} color={colors.text + "80"} />
        <Text style={[styles.errorText, { color: colors.text + "80" }]}>
          Post inaccessible ou supprimé.
        </Text>
      </View>
    );
  }

  const handlePress = () => {
    router.push(`/post/${postId}`);
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: isDark ? colors.backgroundSecondary : "#F2F2F7", borderColor: colors.border }]} 
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Image
          source={{ uri: post.user?.avatar_url || "https://randomuser.me/api/portraits/lego/1.jpg" }}
          style={styles.avatar}
        />
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {post.user?.full_name}
          </Text>
          <Text style={[styles.job, { color: colors.text + "80" }]} numberOfLines={1}>
            {post.user?.job_title || "Artiste"}
          </Text>
        </View>
      </View>

      {post.content && (
        <Text style={[styles.content, { color: colors.text }]} numberOfLines={3}>
          {post.content}
        </Text>
      )}

      {post.image_url && (
        <Image source={{ uri: post.image_url }} style={styles.postImage} resizeMode="cover" />
      )}

      {post.project && (
        <View style={[styles.projectBadge, { backgroundColor: colors.primary + "10" }]}>
          <Ionicons name="film-outline" size={14} color={colors.primary} />
          <Text style={[styles.projectText, { color: colors.primary }]} numberOfLines={1}>
            Projet: {post.project.title}
          </Text>
        </View>
      )}
      
      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="heart" size={12} color={colors.primary} />
          <Text style={{ fontSize: 11, color: colors.text + '80' }}>{post.likes_count}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[styles.footerText, { color: colors.primary }]}>Voir le détail</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 240,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  loadingContainer: {
    width: 240,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  errorText: {
    fontSize: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
  },
  job: {
    fontSize: 11,
  },
  content: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  postImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },
  projectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  projectText: {
    fontSize: 11,
    fontWeight: "600",
  },
  footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      borderTopWidth: 1,
      borderTopColor: 'rgba(0,0,0,0.05)',
      paddingTop: 8,
      marginTop: 4
  },
  footerText: {
      fontSize: 12,
      fontWeight: '700'
  }
});
