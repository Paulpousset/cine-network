import { FeedPost } from "@/components/PostCard";
import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/providers/UserProvider";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

export const useFeed = () => {
  const { user, isLoading } = useUser();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedMode, setFeedMode] = useState<"network" | "all">("all");
  const isFetchingRef = useRef(false);

  useEffect(() => {
    // Listen for tutorial completion and blocks to refresh feed
    const unsubTutorial = appEvents.on(EVENTS.TUTORIAL_COMPLETED, () => {
      console.log("[useFeed] Tutorial completed, refreshing...");
      fetchPosts();
    });

    const unsubBlock = appEvents.on(EVENTS.USER_BLOCKED, () => {
      console.log("[useFeed] User block status changed, refreshing...");
      fetchPosts();
    });

    return () => {
      unsubTutorial();
      unsubBlock();
    };
  }, []);

  const fetchPosts = async () => {
    if (isFetchingRef.current) return;
    const currentUserId = user?.id;

    if (!currentUserId) {
      setLoading(false);
      return;
    }

    try {
      isFetchingRef.current = true;
      if (posts.length === 0) {
        setLoading(true);
      }
      console.log("[useFeed] Start fetching posts for", currentUserId, "mode:", feedMode);

      // 1. Fetch from RPC for recommendation-based sorting (integrated direct in feed)
      const { data: recData, error: recError } = await supabase.rpc("get_recommended_posts", {
        user_id_param: currentUserId,
        filter_mode: feedMode
      });
      
      if (recError) throw recError;

      let finalData: FeedPost[] = [];
      
      if (recData && recData.length > 0) {
        // 2. Fetch likes for user_has_liked status if logged in
        const postIds = recData.map((p: any) => p.p_id);
        const { data: userLikes } = await supabase
          .from("post_likes")
          .select("post_id")
          .eq("user_id", currentUserId)
          .in("post_id", postIds);
        
        const likedPostIds = new Set(userLikes?.map((l: any) => l.post_id) || []);

        finalData = recData.map((p: any) => ({
          id: p.p_id,
          content: p.p_content,
          image_url: p.p_image_url,
          created_at: p.p_created_at,
          user_id: p.p_user_id,
          user: {
            full_name: p.author_full_name,
            avatar_url: p.author_avatar_url,
          },
          likes_count: parseInt(p.likes_total),
          comments_count: parseInt(p.comments_total),
          user_has_liked: likedPostIds.has(p.p_id),
          score: p.recommendation_score,
          score_details: p.score_details
        }));
      }

      setPosts(finalData);
    } catch (e: any) {
      console.error("[useFeed] Error in fetchPosts:", e.message);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPosts();
    }, [user?.id, feedMode]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        fetchPosts();
      }
    });
    return () => subscription.remove();
  }, [user?.id, feedMode]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  return {
    posts,
    loading,
    refreshing,
    onRefresh,
    feedMode,
    setFeedMode,
    userId: user?.id,
  };
};
