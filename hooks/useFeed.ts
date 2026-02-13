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
  const [feedMode, setFeedMode] = useState<"network" | "all">("network");
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
      // Only show full loading if we don't have posts yet
      if (posts.length === 0) {
        setLoading(true);
      }
      console.log("[useFeed] Start fetching posts for", currentUserId);

      // 1. Fetch blocked users IDs (mutual)
      let blockedUserIds: string[] = [];
      try {
        const { data: blocks } = await supabase
          .from("user_blocks")
          .select("blocker_id, blocked_id")
          .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`);
        
        blockedUserIds =
          blocks?.map((b: any) =>
            b.blocker_id === currentUserId ? b.blocked_id : b.blocker_id,
          ) || [];
      } catch (e) {
        console.warn("Error fetching blocks:", e);
      }

      // 2. Fetch connected IDs if in network mode
      let connectedIds: string[] = [currentUserId];
      if (feedMode === "network") {
        try {
          const { data: connections } = await supabase
            .from("connections")
            .select("receiver_id, requester_id")
            .eq("status", "accepted")
            .or(`receiver_id.eq.${currentUserId},requester_id.eq.${currentUserId}`);

          const ids = connections?.map((c) =>
            c.requester_id === currentUserId ? c.receiver_id : c.requester_id,
          ) || [];
          connectedIds = [...connectedIds, ...ids];
        } catch (e) {
          console.warn("Error fetching connections:", e);
        }
      }

      // 3. Try complex query first
      const buildQuery = (withInteractions: boolean) => {
        const baseSelect = `
          id,
          content,
          image_url,
          created_at,
          user_id,
          visibility,
          project:tournages(id, title, image_url, type, ville, start_date, end_date), 
          user:profiles!user_id(full_name, avatar_url)
        `;

        const select = withInteractions 
          ? `${baseSelect}, likes:post_likes(user_id), comments:post_comments(count)`
          : baseSelect;

        let q = supabase
          .from("posts")
          .select(select)
          .order("created_at", { ascending: false });

        if (blockedUserIds.length > 0) {
          q = q.not("user_id", "in", `(${blockedUserIds.join(",")})`);
        }

        if (feedMode === "all") {
          q = q.eq("visibility", "public");
        } else {
          q = q.in("user_id", connectedIds);
        }
        return q;
      };

      let { data, error } = await buildQuery(true);

      // 4. Fallback if complex query fails (likely missing tables or ambiguous relationships)
      if (error && (
        error.message.includes("post_likes") || 
        error.message.includes("post_comments") || 
        error.code === "PGRST204" || 
        error.code === "42P01" ||
        error.code === "PGRST201"
      )) {
        console.log("Secondary query fallback triggered:", error.message);
        const fallback = await buildQuery(false);
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error("Error fetching posts:", error);
      } else if (data) {
        console.log("[useFeed] Successfully fetched", data.length, "posts");
        const formattedPosts = (data as any[]).map((post) => ({
          ...post,
          likes_count: post.likes?.length || 0,
          comments_count: post.comments?.[0]?.count || 0,
          user_has_liked: post.likes?.some(
            (l: any) => l.user_id === currentUserId,
          ) || false,
        }));
        setPosts(formattedPosts);
      }
    } catch (e) {
      console.error("Critical error in fetchPosts:", e);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
      console.log("[useFeed] Fetching posts finished");
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
