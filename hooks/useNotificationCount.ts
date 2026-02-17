import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/providers/UserProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";

const SEEN_ACCEPTED_KEY = "seen_accepted_connections";
const SEEN_POST_ACTIVITY_KEY = "seen_post_activity";

export function useNotificationCount() {
  const { user } = useUser();
  const [counts, setCounts] = useState({
    total: 0,
    talentsCount: 0,
    projectsCount: 0,
    jobsCount: 0,
    socialCount: 0,
  });

  const fetchCount = useCallback(async () => {
    try {
      if (!user) return;

      // 0. Fetch blocks (mutual)
      const { data: blocks } = await supabase
        .from("user_blocks")
        .select("blocker_id, blocked_id")
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

      const blockedIds =
        blocks?.map((b: any) =>
          b.blocker_id === user.id ? b.blocked_id : b.blocker_id,
        ) || [];

      // 1. Pending Requests (Always counted)
      let pendingQuery = supabase
        .from("connections")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("status", "pending");

      if (blockedIds.length > 0) {
        pendingQuery = pendingQuery.not(
          "requester_id",
          "in",
          `(${blockedIds.join(",")})`,
        );
      }
      const { count: pendingCount } = await pendingQuery;

      // 2. Unseen Accepted Connections
      let acceptedQuery = supabase
        .from("connections")
        .select("id, receiver_id")
        .eq("requester_id", user.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(20);

      if (blockedIds.length > 0) {
        acceptedQuery = acceptedQuery.not(
          "receiver_id",
          "in",
          `(${blockedIds.join(",")})`,
        );
      }
      const { data: acceptedRaw } = await acceptedQuery;

      // 3. Unseen Project Assignments & Invitations
      const { data: assignments } = await supabase
        .from("project_roles")
        .select("id, status")
        .eq("assigned_profile_id", user.id);

      // 4. Unseen Accepted Applications
      const { data: applications } = await supabase
        .from("applications")
        .select("id, role_id, status, role:project_roles(status)")
        .eq("candidate_id", user.id)
        .or("status.eq.accepted,status.eq.invitation_pending");

      // Get local seen IDs
      const seenJson = await AsyncStorage.getItem(SEEN_ACCEPTED_KEY);
      const seenIds = seenJson ? JSON.parse(seenJson) : [];

      const unseenAccepted = (acceptedRaw || []).filter(
        (item) => !seenIds.includes(item.id),
      ).length;

      const appRoleIds = new Set(
        (applications || []).map((app) => app.role_id).filter(Boolean),
      );

      const invitationCount = (assignments || []).filter(
        (item) => item.status !== "assigned" && !appRoleIds.has(item.id),
      ).length;

      const unseenAssignments = (assignments || []).filter((item) => {
        if (item.status !== "assigned") return false;
        if (appRoleIds.has(item.id)) return false;
        return !seenIds.includes(item.id);
      }).length;

      const unseenApplications = (applications || []).filter((item: any) => {
        // Always count if it's an invitation (not yet confirmed)
        if (item.role?.status && item.role.status !== "assigned") return true;
        return !seenIds.includes(item.id);
      }).length;

      // 5. Unseen Likes and Comments on my posts
      let socialCount = 0;
      const seenActivityJson = await AsyncStorage.getItem(SEEN_POST_ACTIVITY_KEY);
      const seenActivityIds = seenActivityJson ? JSON.parse(seenActivityJson) : [];

      const { data: myPosts } = await supabase
        .from("posts")
        .select("id")
        .eq("user_id", user.id);
      
      const myPostIds = myPosts?.map(p => p.id) || [];

      if (myPostIds.length > 0) {
        const { data: likes } = await supabase
          .from("post_likes")
          .select("post_id, user_id")
          .in("post_id", myPostIds)
          .neq("user_id", user.id);
        
        const unseenLikes = (likes || []).filter(l => !seenActivityIds.includes(`like_${l.post_id}_${l.user_id}`)).length;

        const { data: comments } = await supabase
          .from("post_comments")
          .select("id, post_id, user_id")
          .in("post_id", myPostIds)
          .neq("user_id", user.id);
          
        const unseenComments = (comments || []).filter(c => !seenActivityIds.includes(`comment_${c.id}`)).length;
        socialCount = unseenLikes + unseenComments;
      }

      const talentsCount = (pendingCount || 0) + unseenAccepted;
      const projectsCount = unseenAssignments + invitationCount;
      const jobsCount = unseenApplications;
      const total = talentsCount + projectsCount + jobsCount + socialCount;

      setCounts({
        total,
        talentsCount,
        projectsCount,
        jobsCount,
        socialCount,
      });
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  useEffect(() => {
    fetchCount();

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        fetchCount();
      }
    });

    const unsub = appEvents.on(EVENTS.CONNECTIONS_UPDATED, fetchCount);

    return () => {
      subscription.remove();
      unsub();
    };
  }, [fetchCount]);

  return counts;
}
