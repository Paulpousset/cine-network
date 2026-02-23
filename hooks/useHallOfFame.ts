import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/providers/UserProvider";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

export interface HallOfFameProject {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  final_result_url: string | null;
  created_at: string;
  owner_id: string;
  status: string;
  type: string | null;
  owner: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
  likes_count: number;
  isLiked: boolean;
}

export const useHallOfFame = (initialUserId: string | null = null, isRecommended: boolean = true) => {
  const { user } = useUser();
  const [projects, setProjects] = useState<HallOfFameProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const currentUserId = user?.id || initialUserId || null;

  useEffect(() => {
    fetchHallOfFame(currentUserId);

    const unsubBlock = appEvents.on(EVENTS.USER_BLOCKED, () => {
      fetchHallOfFame(currentUserId);
    });

    return () => unsubBlock();
  }, [currentUserId, isRecommended]);

  async function fetchHallOfFame(userId: string | null = currentUserId) {
    try {
      if (projects.length === 0) {
        setLoading(true);
      }
      
      let blockedIds: string[] = [];
      if (userId) {
        const { data: blocks } = await supabase
          .from("user_blocks")
          .select("blocker_id, blocked_id")
          .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
        blockedIds =
          blocks?.map((b: any) =>
            b.blocker_id === userId ? b.blocked_id : b.blocker_id,
          ) || [];
      }

      let projectsRaw: any[] = [];

      if (isRecommended && userId) {
        const { data, error } = await supabase.rpc("get_recommended_tournages", {
          user_id_param: userId
        });
        if (error) throw error;
        
        const mappedData = data?.map((p: any) => ({
          id: p.t_id,
          title: p.t_title,
          description: p.t_description,
          image_url: p.t_image_url,
          final_result_url: p.t_final_result_url,
          ville: p.t_ville,
          type: p.t_type,
          status: p.t_status,
          owner_id: p.t_owner_id,
          created_at: p.t_created_at,
          likes_count: parseInt(p.likes_total),
        })) || [];

        // Re-fetch project_likes for those projects to check isLiked correctly
        const projectIds = mappedData.map(p => p.id);
        if (projectIds.length > 0) {
          const { data: likesData } = await supabase
            .from("project_likes")
            .select("project_id, user_id")
            .in("project_id", projectIds);
          
          projectsRaw = mappedData.map(p => ({
            ...p,
            project_likes: likesData?.filter(l => l.project_id === p.id) || []
          }));
        }
      } else {
        let query = supabase
          .from("tournages")
          .select(
            `
              *,
              project_likes(user_id)
          `,
          )
          .eq("status", "completed")
          .order("created_at", { ascending: false });

        if (blockedIds.length > 0) {
          query = query.not("owner_id", "in", `(${blockedIds.join(",")})`);
        }

        const { data, error } = await query;
        if (error) throw error;
        projectsRaw = data || [];
      }

      const ownerIds = [...new Set(projectsRaw.map((p) => p.owner_id))].filter(
        Boolean,
      );
      let profilesMap: Record<string, any> = {};

      if (ownerIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", ownerIds);

        if (!profilesError && profilesData) {
          profilesData.forEach((p) => {
            profilesMap[p.id] = p;
          });
        }
      }

      const finalProjects = projectsRaw.map((p) => {
        const likes = p.project_likes || [];
        return {
          ...p,
          owner: profilesMap[p.owner_id] || null,
          likes_count: likes.length,
          isLiked: userId
            ? likes.some((l: any) => l.user_id === userId)
            : false,
        };
      });

      setProjects(finalProjects);
    } catch (e) {
      console.error("Error fetching Hall of Fame", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function toggleLike(project: HallOfFameProject, isLikedNow: boolean) {
    if (!currentUserId) return;

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === project.id) {
          return {
            ...p,
            isLiked: isLikedNow,
            likes_count: isLikedNow
              ? (p.likes_count || 0) + 1
              : (p.likes_count || 0) - 1,
          };
        }
        return p;
      }),
    );

    try {
      if (isLikedNow) {
        const { data: existing } = await supabase
          .from("project_likes")
          .select("project_id")
          .eq("project_id", project.id)
          .eq("user_id", currentUserId)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from("project_likes")
            .insert({ project_id: project.id, user_id: currentUserId });
          if (error && error.code !== "23505") throw error;
        }
      } else {
        const { error } = await supabase
          .from("project_likes")
          .delete()
          .eq("project_id", project.id)
          .eq("user_id", currentUserId);
        if (error) throw error;
      }
    } catch (e: any) {
      console.error("Error toggling like", e);
      Alert.alert(
        "Erreur Like",
        e.message || "Impossible de mettre à jour le like.",
      );
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === project.id) {
            return {
              ...p,
              isLiked: !isLikedNow,
              likes_count: !isLikedNow
                ? (p.likes_count || 0) + 1
                : (p.likes_count || 0) - 1,
            };
          }
          return p;
        }),
      );
    }
  }

  const onRefresh = () => {
    setRefreshing(true);
    fetchHallOfFame();
  };

  return {
    projects,
    loading,
    refreshing,
    onRefresh,
    currentUserId,
    toggleLike,
    fetchHallOfFame,
  };
};
