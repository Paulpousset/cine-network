import { supabase } from "@/lib/supabase";
import { useUser } from "@/providers/UserProvider";
import { NotificationService } from "@/services/NotificationService";
import { useState } from "react";

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
          console.error("Error inserting like:", error);
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
          console.error("Error deleting like:", error);
          return;
        }
      }
    } catch (error) {
      console.error("Error toggling like:", error);
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
      console.error("Error adding comment:", error);
      return { data: null, error };
    }
  };

  return { toggleLike, addComment, loading };
};
