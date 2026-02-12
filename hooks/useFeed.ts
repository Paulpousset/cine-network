import { FeedPost } from "@/components/PostCard";
import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

export const useFeed = () => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [feedMode, setFeedMode] = useState<"network" | "all">("network");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
      }
    });

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
    let currentUserId = userId;

    if (!currentUserId) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      currentUserId = user.id;
      setUserId(user.id);
    }

    try {
      // 1. Fetch blocked users IDs (mutual)
      const { data: blocks } = await supabase
        .from("user_blocks")
        .select("blocker_id, blocked_id")
        .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`);

      const blockedUserIds =
        blocks?.map((b: any) =>
          b.blocker_id === currentUserId ? b.blocked_id : b.blocker_id,
        ) || [];

      // 2. Fetch posts
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
          project:tournages(id, title, image_url, type, ville, start_date, end_date), 
          user:profiles (full_name, avatar_url) 
        `,
        )
        .order("created_at", { ascending: false });

      if (blockedUserIds.length > 0) {
        query = query.not("user_id", "in", `(${blockedUserIds.join(",")})`);
      }

      if (feedMode === "all") {
        query = query.eq("visibility", "public");
      } else {
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

  return {
    posts,
    loading,
    refreshing,
    onRefresh,
    feedMode,
    setFeedMode,
    userId,
  };
};
