import { FeedPost } from "@/components/feed/PostCard";
import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/providers/UserProvider";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

const PAGE_SIZE = 15;

interface RecommendedPostRPCResult {
  p_id: string;
  p_content: string;
  p_image_url: string;
  p_user_id: string;
  p_created_at: string;
  p_visibility: string;
  p_project_id: string;
  author_full_name: string;
  author_avatar_url: string;
  likes_total: string | number;
  comments_total: string | number;
  recommendation_score: number;
  score_details: string;
}

export const useFeed = () => {
  const { user } = useUser();
  const [feedMode, setFeedMode] = useState<"network" | "all">("all");
  const queryClient = useQueryClient();

  const fetchPosts = async ({ pageParam = 0 }): Promise<FeedPost[]> => {
    const currentUserId = user?.id;
    if (!currentUserId) return [];

    console.log("[useFeed] Fetching page", pageParam, "for", currentUserId, "mode:", feedMode);

    const { data: recData, error: recError } = await supabase.rpc("get_recommended_posts", {
      user_id_param: currentUserId,
      filter_mode: feedMode,
      limit_param: PAGE_SIZE,
      offset_param: pageParam * PAGE_SIZE
    });
    
    if (recError) {
      // Fallback for old RPC signature if new one hasn't been applied yet
      if (recError.message.includes("too many arguments")) {
        console.warn("RPC lacks pagination params, falling back...");
        const { data: fallbackData, error: fallbackError } = await supabase.rpc("get_recommended_posts", {
          user_id_param: currentUserId,
          filter_mode: feedMode
        });
        if (fallbackError) throw fallbackError;
        return processRecData(fallbackData || [], currentUserId);
      }
      throw recError;
    }

    return processRecData(recData || [], currentUserId);
  };

  const processRecData = async (recData: RecommendedPostRPCResult[], currentUserId: string): Promise<FeedPost[]> => {
    if (recData.length === 0) return [];

    const postIds = recData.map((p) => p.p_id);
    const { data: userLikes } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", currentUserId)
      .in("post_id", postIds);
    
    const likedPostIds = new Set(userLikes?.map((l: any) => l.post_id) || []);

    return recData.map((p) => ({
      id: p.p_id,
      content: p.p_content,
      image_url: p.p_image_url,
      created_at: p.p_created_at,
      user_id: p.p_user_id,
      user: {
        full_name: p.author_full_name,
        avatar_url: p.author_avatar_url,
      },
      likes_count: typeof p.likes_total === 'string' ? parseInt(p.likes_total) : p.likes_total,
      comments_count: typeof p.comments_total === 'string' ? parseInt(p.comments_total) : p.comments_total,
      user_has_liked: likedPostIds.has(p.p_id),
      score: p.recommendation_score,
      score_details: p.score_details
    }));
  };

  const {
    data,
    isLoading: loading,
    refetch,
    isRefetching: refreshing,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["feed", user?.id, feedMode],
    queryFn: fetchPosts,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
  });

  const posts = data?.pages.flat() || [];

  useEffect(() => {
    const unsubTutorial = appEvents.on(EVENTS.TUTORIAL_COMPLETED, () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    });

    const unsubBlock = appEvents.on(EVENTS.USER_BLOCKED, () => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    });

    return () => {
      unsubTutorial();
      unsubBlock();
    };
  }, [queryClient]);

  const onRefresh = () => {
    refetch();
  };

  return {
    posts,
    loading,
    refreshing,
    onRefresh,
    feedMode,
    setFeedMode,
    userId: user?.id,
    loadMore: fetchNextPage,
    hasNextPage,
    isLoadingMore: isFetchingNextPage
  };
};
