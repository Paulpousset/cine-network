import { supabase } from "@/lib/supabase";
import { useState } from "react";

export const usePostActions = (postId: string) => {
  const [loading, setLoading] = useState(false);

  const toggleLike = async (userId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);
      } else {
        // Like
        await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: userId });
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
