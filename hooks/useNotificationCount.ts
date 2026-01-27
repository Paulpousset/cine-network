import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const SEEN_ACCEPTED_KEY = "seen_accepted_connections";

export function useNotificationCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetchCount();
    const unsub = appEvents.on(EVENTS.CONNECTIONS_UPDATED, fetchCount);
    return unsub;
  }, []);

  async function fetchCount() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Pending Requests (Always counted)
      const { count: pendingCount } = await supabase
        .from("connections")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", session.user.id)
        .eq("status", "pending");

      // 2. Unseen Accepted Connections
      // Fetch recent accepted ones
      const { data: acceptedRaw } = await supabase
        .from("connections")
        .select("id")
        .eq("requester_id", session.user.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(20);

      // 3. Unseen Project Assignments
      const { data: assignments } = await supabase
        .from("project_roles")
        .select("id")
        .eq("assigned_profile_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      // 4. Unseen Accepted Applications
      const { data: applications } = await supabase
        .from("applications")
        .select("id, role_id")
        .eq("candidate_id", session.user.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(20);

      // Get local seen IDs
      const seenJson = await AsyncStorage.getItem(SEEN_ACCEPTED_KEY);
      const seenIds = seenJson ? JSON.parse(seenJson) : [];

      // Calculate counts
      const unseenAccepted = (acceptedRaw || []).filter(
        (item) => !seenIds.includes(item.id),
      ).length;

      // Prevent double counting assignments that came from applications
      const appRoleIds = new Set(
        (applications || []).map((app) => app.role_id).filter(Boolean),
      );

      const unseenAssignments = (assignments || []).filter((item) => {
        if (appRoleIds.has(item.id)) return false;
        return !seenIds.includes(item.id);
      }).length;

      const unseenApplications = (applications || []).filter(
        (item) => !seenIds.includes(item.id),
      ).length;

      const total =
        (pendingCount || 0) +
        unseenAccepted +
        unseenAssignments +
        unseenApplications;

      setCount(total);
    } catch (e) {
      console.error(e);
    }
  }

  return count;
}
