import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { NotificationService } from "@/services/NotificationService";
import { fuzzySearch } from "@/utils/search";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

export function useTalents() {
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [suggestedProfiles, setSuggestedProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Filters State
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  const fetchCurrentUserId = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      setCurrentUserId(session.user.id);
      fetchSuggestions(session.user.id);

      // Fetch profile for notification sender name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", session.user.id)
        .single();
      if (profile) setCurrentUserProfile(profile);
    }
  }, []);

  const fetchPendingCount = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const { count } = await supabase
      .from("connections")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", session.user.id)
      .eq("status", "pending");
    setPendingCount(count || 0);
  }, []);

  const fetchSuggestions = async (uid: string) => {
    try {
      setLoadingSuggestions(true);

      const { data: myOwned } = await supabase
        .from("tournages")
        .select("id")
        .eq("owner_id", uid);

      const { data: myParticipations } = await supabase
        .from("project_roles")
        .select("tournage_id")
        .eq("assigned_profile_id", uid);

      const myTournageIds = [
        ...(myOwned?.map((t) => t.id) || []),
        ...(myParticipations?.map((p) => p.tournage_id) || []),
      ].filter((id) => id);

      if (myTournageIds.length === 0) {
        setSuggestedProfiles([]);
        return;
      }

      const { data: colleagues, error } = await supabase
        .from("project_roles")
        .select(`assigned_profile:profiles (*)`)
        .in("tournage_id", myTournageIds)
        .not("assigned_profile_id", "is", null)
        .neq("assigned_profile_id", uid);

      if (error) throw error;

      const { data: myConnections } = await supabase
        .from("connections")
        .select("receiver_id, requester_id")
        .or(`receiver_id.eq.${uid},requester_id.eq.${uid}`);

      const connectedIds = new Set(
        myConnections?.flatMap((c) => [c.receiver_id, c.requester_id]) || [],
      );

      const uniqueColleagues = new Map();
      colleagues?.forEach((c: any) => {
        if (
          c.assigned_profile &&
          !uniqueColleagues.has(c.assigned_profile.id) &&
          !connectedIds.has(c.assigned_profile.id)
        ) {
          uniqueColleagues.set(c.assigned_profile.id, c.assigned_profile);
        }
      });

      setSuggestedProfiles(Array.from(uniqueColleagues.values()));
    } catch (e) {
      console.error("Error fetching suggestions:", e);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("ville")
        .not("ville", "is", null);

      if (error) throw error;
      const cities = Array.from(
        new Set(
          data
            ?.map((p: any) => p.ville)
            .filter((c) => c)
            .map((c) => c!.trim()),
        ),
      ).sort();
      setAvailableCities(["all", ...cities]);
    } catch (e) {
      console.log("Error fetching cities", e);
    }
  };

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      let q = supabase.from("profiles").select("*");

      if (selectedRole !== "all") {
        q = q.eq("role", selectedRole);
      }

      if (selectedCity !== "all") {
        q = q.eq("ville", selectedCity);
      }

      const { data, error } = await q;
      if (error) throw error;

      setAllProfiles((data as any[]) || []);
    } catch (error) {
      Alert.alert("Erreur", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedRole, selectedCity]);

  const sendConnectionRequest = async (targetId: string) => {
    try {
      if (!currentUserId) return;

      const { error } = await supabase.from("connections").insert({
        requester_id: currentUserId,
        receiver_id: targetId,
        status: "pending",
      });

      if (error) throw error;

      // Send Push Notification
      NotificationService.sendConnectionRequestNotification({
        receiverId: targetId,
        requesterName:
          currentUserProfile?.full_name ||
          currentUserProfile?.username ||
          "Quelqu'un",
      });

      Alert.alert("Succès", "Demande de connexion envoyée !");
      setSuggestedProfiles((prev) => prev.filter((p) => p.id !== targetId));
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible d’envoyer la demande");
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchCities();

    const unsub = appEvents.on(EVENTS.TUTORIAL_COMPLETED, () => {
      fetchProfiles();
      fetchCities();
      if (currentUserId) fetchSuggestions(currentUserId);
    });
    return () => unsub();
  }, [fetchProfiles, currentUserId]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    let filtered = allProfiles;

    if (normalizedQuery) {
      filtered = fuzzySearch(
        allProfiles,
        ["full_name", "username", "city", "ville", "location", "website"],
        normalizedQuery,
      );
    }
    setProfiles(filtered);
  }, [query, allProfiles]);

  return {
    profiles,
    suggestedProfiles,
    loading,
    loadingSuggestions,
    pendingCount,
    currentUserId,
    availableCities,
    selectedRole,
    setSelectedRole,
    selectedCity,
    setSelectedCity,
    query,
    setQuery,
    fetchCurrentUserId,
    fetchPendingCount,
    sendConnectionRequest,
    refreshProfiles: fetchProfiles,
  };
}
