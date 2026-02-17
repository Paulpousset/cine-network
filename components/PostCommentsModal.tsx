import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PostCommentsModalProps {
  visible: boolean;
  onClose: () => void;
  postId: string;
  userId: string | null;
}

export const PostCommentsModal = ({
  visible,
  onClose,
  postId,
  userId,
}: PostCommentsModalProps) => {
  const { colors, isDark } = useTheme();
  const { isGuest } = useUser();
  const styles = createStyles(colors, isDark);
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchComments();
    }
  }, [visible, postId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .select(`
          id,
          content,
          created_at,
          user:profiles!user_id(id, full_name, avatar_url)
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (isGuest) {
      Alert.alert("Invité", "Vous devez être connecté pour commenter.");
      return;
    }
    if (!newComment.trim() || !userId || submitting) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          user_id: userId,
          content: newComment.trim(),
        })
        .select(`
          id,
          content,
          created_at,
          user:profiles!user_id(id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      if (data) {
        setComments([...comments, data]);
        setNewComment("");
      }
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = ({ item }: { item: any }) => (
    <View style={styles.commentItem}>
      <Image
        source={{
          uri:
            item.user?.avatar_url ||
            "https://randomuser.me/api/portraits/lego/1.jpg",
        }}
        style={styles.avatar}
      />
      <View style={styles.commentBubble}>
        <Text style={styles.userName}>{item.user?.full_name || "Utilisateur"}</Text>
        <Text style={styles.commentText}>{item.content}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.container, { paddingBottom: insets.bottom || 20 }]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Commentaires</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={28} color={colors.text + "40"} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              renderItem={renderComment}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color={colors.text + "20"} />
                  <Text style={styles.emptyText}>Aucun commentaire pour le moment.</Text>
                </View>
              }
            />
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newComment}
              onChangeText={setNewComment}
              placeholder={isGuest ? "S'inscrire pour commenter" : "Écrire un commentaire..."}
              placeholderTextColor={colors.text + "60"}
              multiline
              editable={!isGuest}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={isGuest || !newComment.trim() || submitting}
              style={[
                styles.sendButton,
                (isGuest || !newComment.trim() || submitting) && styles.sendButtonDisabled,
              ]}
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  dismissArea: {
    flex: 1,
  },
  container: {
    backgroundColor: colors.background,
    height: "80%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  commentItem: {
    flexDirection: "row",
    marginBottom: 20,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: colors.backgroundSecondary,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    padding: 12,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  userName: {
    fontWeight: "600",
    fontSize: 14,
    color: colors.text,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 14,
    color: colors.text + "CC",
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 10,
    color: colors.text + "80",
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    color: colors.text + "80",
    marginTop: 10,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: 8,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 15,
    color: colors.text,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: colors.text + "20",
  },
});

