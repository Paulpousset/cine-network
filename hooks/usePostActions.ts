import { supabase } from "@/lib/supabase";
import { useUser } from "@/providers/UserProvider";
import { Logger } from "@/services/LoggerService";
import { NotificationService } from "@/services/NotificationService";
import { useState } from "react";
import { Alert } from "react-native";

export const usePostActions = (postId: string) => {
  const [loading, setLoading] = useState(false);
  const { profile } = useUser();

  const toggleLike = async (userId: string, shouldBeLiked: boolean) => {
    try {
      if (shouldBeLiked) {
        // Like
        const { error } = await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: userId });

        if (error) {
          Logger.error(error, "usePostActions.toggleLike:insert");
          Alert.alert("Erreur", "Impossible d'aimer cette publication pour le moment.");
          return;
        }

        // Trigger notification
        const { data: post } = await supabase
          .from("posts")
          .select("user_id, content")
          .eq("id", postId)
          .single();

        if (post && post.user_id !== userId) {
          NotificationService.sendGenericNotification({
            receiverId: post.user_id,
            title: "Nouveau j'aime",
            body: `${profile?.full_name || "Quelqu'un"} a aimé votre publication.`,
            data: {
              type: "like",
              postId: postId,
              url: "/notifications", // Or specifically to the post if you have a post details screen
            },
          });
        }
      } else {
        // Unlike
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);

        if (error) {
          Logger.error(error, "usePostActions.toggleLike:delete");
          Alert.alert("Erreur", "Impossible de retirer votre j'aime.");
          return;
        }
      }
    } catch (error) {
      Logger.error(error, "usePostActions.toggleLike:catch");
      Alert.alert("Erreur", "Une erreur inattendue est survenue.");
    }
  };

  const addComment = async (userId: string, content: string) => {
    if (!content.trim()) return { data: null, error: "Comment cannot be empty" };
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          user_id: userId,
          content: content.trim(),
        })
        .select(`
          *,
          user:profiles!user_id(full_name, avatar_url)
        `)
        .single();
        
      if (!error && data) {
        // Trigger notification
        const { data: post } = await supabase
          .from("posts")
          .select("user_id")
          .eq("id", postId)
          .single();

        if (post && post.user_id !== userId) {
          NotificationService.sendGenericNotification({
            receiverId: post.user_id,
            title: "Nouveau commentaire",
            body: `${profile?.full_name || "Quelqu'un"} a commenté votre publication : "${content.substring(0, 50)}${content.length > 50 ? "..." : ""}"`,
            data: {
              type: "comment",
              postId: postId,
              url: "/notifications",
            },
          });
        }
      }

      setLoading(false);
      return { data, error };
    } catch (error) {
      setLoading(false);
      Logger.error(error, "usePostActions.addComment");
      Alert.alert("Erreur", "Impossible d'ajouter le commentaire.");
      return { data: null, error };
    }
  };

  return { toggleLike, addComment, loading };
};
