import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/providers/UserProvider";
import { NotificationService } from "@/services/NotificationService";
import { fuzzySearch } from "@/utils/search";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState } from "react-native";

export function useTalents() {
  const { user, profile: currentUserProfile } = useUser();
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [suggestedProfiles, setSuggestedProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [myTournageIds, setMyTournageIds] = useState<string[]>([]);
  const [myConnections, setMyConnections] = useState<any[]>([]);
  const [suggestedRoles, setSuggestedRoles] = useState<string[]>([]);
  const isFetchingRef = useRef(false);

  // Filters State
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedSubRoles, setSelectedSubRoles] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [isFreeOnly, setIsFreeOnly] = useState(false);
  const [experienceLevel, setExperienceLevel] = useState<string>("all");
  const [query, setQuery] = useState<string>("");

  const currentUserId = user?.id || null;

  const fetchMyData = useCallback(async () => {
    if (!currentUserId) return;
    try {
      // Fetch my projects
      const { data: myRoles } = await supabase
        .from("project_roles")
        .select("tournage_id")
        .eq("assigned_profile_id", currentUserId);
      
      const ids = Array.from(new Set(myRoles?.map(r => r.tournage_id).filter(Boolean))) as string[];
      setMyTournageIds(ids);

      // Fetch my connections
      const { data: conns } = await supabase
        .from("connections")
        .select(`
          *,
          requester:profiles!requester_id(id, full_name, avatar_url),
          receiver:profiles!receiver_id(id, full_name, avatar_url)
        `)
        .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .eq("status", "accepted");
      
      const friends = (conns || []).map(c => 
        c.requester_id === currentUserId ? c.receiver : c.requester
      );
      setMyConnections(friends);
    } catch (e) {
      console.error("Error fetching my data:", e);
    }
  }, [currentUserId]);

  const fetchPendingCount = useCallback(async () => {
    if (!currentUserId) return;
    const { count } = await supabase
      .from("connections")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", currentUserId)
      .eq("status", "pending");
    setPendingCount(count || 0);
  }, [currentUserId]);

  const fetchSuggestions = async (uid: string) => {
    try {
      setLoadingSuggestions(true);

      // 1. Get all my connections (accepted or pending) and blocked users to exclude them
      const [connectionsResp, blockedResp] = await Promise.all([
        supabase
          .from("connections")
          .select("receiver_id, requester_id, status")
          .or(`receiver_id.eq.${uid},requester_id.eq.${uid}`),
        supabase
          .from("blocks")
          .select("blocked_id")
          .eq("blocker_id", uid)
      ]);

      const connectionIds = (connectionsResp.data || []).flatMap(c => [c.receiver_id, c.requester_id]);
      const acceptedConnectionIds = (connectionsResp.data || [])
        .filter(c => c.status === "accepted")
        .flatMap(c => [c.receiver_id, c.requester_id])
        .filter(id => id !== uid);

      const blockedIds = (blockedResp.data || []).map(b => b.blocked_id);
      const forbiddenIds = new Set([...connectionIds, ...blockedIds, uid]);

      // 2. Find projects of my connections (Level 2 suggestions: colleagues of my connections)
      let connectionTournageIds: string[] = [];
      if (acceptedConnectionIds.length > 0) {
        const { data: connProjects } = await supabase
          .from("project_roles")
          .select("tournage_id")
          .in("assigned_profile_id", acceptedConnectionIds);
        connectionTournageIds = Array.from(new Set((connProjects || []).map(p => p.tournage_id).filter(Boolean))) as string[];
      }

      // 3. Find my own projects (Level 1 suggestions: my colleagues)
      const { data: myProjects } = await supabase
        .from("project_roles")
        .select("tournage_id")
        .eq("assigned_profile_id", uid);
      const myTournageIds = Array.from(new Set((myProjects || []).map(p => p.tournage_id).filter(Boolean))) as string[];

      const suggestions = new Map();

      // PRIORITÉ 1: Collègues de mes relations
      if (connectionTournageIds.length > 0) {
        const { data: colleaguesOfFriends } = await supabase
          .from("project_roles")
          .select("profiles!inner(*)")
          .in("tournage_id", connectionTournageIds.slice(0, 50)) // Limit project count for perf
          .not("assigned_profile_id", "is", null);

        colleaguesOfFriends?.forEach((c: any) => {
          const p = c.profiles;
          if (p && !forbiddenIds.has(p.id)) {
            suggestions.set(p.id, { ...p, suggestionReason: "Relat. commune" });
          }
        });
      }

      // PRIORITÉ 2: Mes propres collègues directs
      if (myTournageIds.length > 0) {
        const { data: myColleagues } = await supabase
          .from("project_roles")
          .select("profiles!inner(*)")
          .in("tournage_id", myTournageIds)
          .not("assigned_profile_id", "is", null);

        myColleagues?.forEach((c: any) => {
          const p = c.profiles;
          if (p && !forbiddenIds.has(p.id) && !suggestions.has(p.id)) {
            suggestions.set(p.id, { ...p, suggestionReason: "Ancien collègue" });
          }
        });
      }

      setSuggestedProfiles(Array.from(suggestions.values()));
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

  const fetchRoleSuggestions = useCallback(async () => {
    if (!currentUserId) return;
    try {
      // 1. Catégories des offres ouvertes sur mes projets
      const { data: openRoles, error } = await supabase
        .from("project_roles")
        .select("category, tournages!inner(owner_id)")
        .eq("tournages.owner_id", currentUserId)
        .is("assigned_profile_id", null);

      if (error) throw error;

      let suggestions = Array.from(new Set(openRoles?.map(r => r.category).filter(Boolean))) as string[];

      // 2. Si pas assez (moins de 3), on ajoute les catégories du profil de l'utilisateur
      if (suggestions.length < 3 && currentUserProfile?.role) {
        const myRole = currentUserProfile.role.trim().toLowerCase();
        if (!suggestions.includes(myRole)) {
           suggestions.push(myRole);
        }
      }

      // 3. Toujours pas assez ? On complète avec des catégories populaires par défaut
      const defaults = ["acteur", "realisateur", "image"];
      for (const d of defaults) {
        if (suggestions.length >= 3) break;
        if (!suggestions.includes(d)) suggestions.push(d);
      }

      setSuggestedRoles(suggestions.slice(0, 3));
    } catch (e) {
      console.error("Error fetching role suggestions", e);
    }
  }, [currentUserId, currentUserProfile?.role]);

  const fetchProfiles = useCallback(async () => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      if (allProfiles.length === 0) {
        setLoading(true);
      }
      console.log("[useTalents] Start fetching profiles");

      let q = supabase
        .from("profiles")
        .select(`
          *,
          project_roles (
            id,
            title,
            tournages (
              id,
              status,
              title
            )
          )
        `)
        .neq("full_name", "Invité");

      if (currentUserId) {
        // 1. Exclude self
        q = q.neq("id", currentUserId);

        // 2. Exclude blocked users AND accepted connections
        const [blocksResult, connectionsResult] = await Promise.all([
          supabase
            .from("user_blocks")
            .select("blocker_id, blocked_id")
            .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`),
          supabase
            .from("connections")
            .select("receiver_id, requester_id")
            .or(`receiver_id.eq.${currentUserId},requester_id.eq.${currentUserId}`)
            .eq("status", "accepted"),
        ]);

        const blockedIds =
          blocksResult.data?.map((b: any) =>
            b.blocker_id === currentUserId ? b.blocked_id : b.blocker_id,
          ) || [];

        const connectionIds =
          connectionsResult.data?.map((c: any) =>
            c.receiver_id === currentUserId ? c.requester_id : c.receiver_id,
          ) || [];

        const excludeIds = Array.from(
          new Set([...blockedIds, ...connectionIds]),
        );

        if (excludeIds.length > 0) {
          q = q.not("id", "in", `(${excludeIds.map(id => `"${id}"`).join(",")})`);
        }
      }

      if (selectedRoles.length > 0) {
        q = q.in("role", selectedRoles);
      }

      if (selectedSubRoles.length > 0) {
        q = q.in("job_title", selectedSubRoles);
      }

      if (selectedCities.length > 0) {
        q = q.in("ville", selectedCities);
      }

      const { data, error } = await q;
      if (error) throw error;

      setAllProfiles((data as any[]) || []);
    } catch (error) {
      console.error("[useTalents] Fetch error:", error);
      Alert.alert("Erreur", (error as Error).message);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      console.log("[useTalents] Fetching profiles finished");
    }
  }, [selectedRoles, selectedSubRoles, selectedCities, currentUserId]);

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
    if (currentUserId) {
      fetchSuggestions(currentUserId);
      fetchPendingCount();
      fetchRoleSuggestions();
      fetchMyData();
    }
  }, [currentUserId, fetchPendingCount, fetchRoleSuggestions, fetchMyData]);

  useEffect(() => {
    fetchProfiles();
    fetchCities();
    fetchMyData();

    const unsubTutorial = appEvents.on(EVENTS.TUTORIAL_COMPLETED, () => {
      fetchProfiles();
      fetchCities();
      fetchRoleSuggestions();
      fetchMyData();
      if (currentUserId) fetchSuggestions(currentUserId);
    });
    const unsubBlock = appEvents.on(EVENTS.USER_BLOCKED, () => {
      fetchProfiles();
    });
    const unsubConnection = appEvents.on(EVENTS.CONNECTIONS_UPDATED, () => {
      fetchPendingCount();
      fetchMyData();
    });
    return () => {
      unsubTutorial();
      unsubBlock();
      unsubConnection();
    };
  }, [fetchProfiles, currentUserId, fetchPendingCount, fetchRoleSuggestions, fetchMyData]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        fetchProfiles();
        fetchCities();
        fetchPendingCount();
        fetchRoleSuggestions();
        fetchMyData();
        if (currentUserId) fetchSuggestions(currentUserId);
      }
    });
    return () => subscription.remove();
  }, [fetchProfiles, currentUserId, fetchPendingCount, fetchRoleSuggestions, fetchMyData]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    let filtered = allProfiles;

    // Search filter
    if (normalizedQuery) {
      filtered = fuzzySearch(
        allProfiles,
        ["full_name", "username", "city", "ville", "location", "website"],
        normalizedQuery,
      );
    }

    // Availability filter (Show only people NOT currently on a shoot)
    if (isFreeOnly) {
      filtered = filtered.filter((p) => {
        const roles = p.project_roles || [];
        // If they have ANY project in production, they are NOT free
        const isCurrentlyShooting = roles.some((r: any) => r.tournages?.status === "production");
        return !isCurrentlyShooting;
      });
    }

    // Experience filter
    if (experienceLevel !== "all") {
      filtered = filtered.filter((p) => {
        const uniqueTournages = new Set(
          (p.project_roles || [])
            .map((r: any) => r.tournage_id)
            .filter((id: string) => id),
        );
        const count = uniqueTournages.size;
        if (experienceLevel === "junior") return count <= 2;
        if (experienceLevel === "pro") return count > 2 && count <= 10;
        if (experienceLevel === "senior") return count > 10;
        return true;
      });
    }

    // ENRICHMENT: Calculate common projects and mutual friends
    const enriched = filtered.map(p => {
      const talentTournageIds = (p.project_roles || []).map((r: any) => r.tournage_id);
      const common_projects = talentTournageIds.filter((id: string) => myTournageIds.includes(id));
      const commonCount = new Set(common_projects).size;
      
      let suggestionReason = "";
      if (commonCount > 0) {
        suggestionReason = `${commonCount} ${commonCount > 1 ? 'projets en commun' : 'projet en commun'}`;
      } else if (p.role === currentUserProfile?.role) {
        suggestionReason = "Même métier que vous";
      } else if (p.city === currentUserProfile?.city || p.ville === currentUserProfile?.city) {
        suggestionReason = `Basé à ${p.city || p.ville}`;
      }

      return {
        ...p,
        common_projects_count: commonCount,
        suggestionReason,
        // We could also add actual project titles if we fetched them
      };
    });

    setProfiles(enriched);
  }, [query, allProfiles, isFreeOnly, experienceLevel, myTournageIds]);

  return {
    profiles,
    suggestedProfiles,
    loading,
    loadingSuggestions,
    pendingCount,
    currentUserId,
    availableCities,
    suggestedRoles,
    selectedRoles,
    setSelectedRoles,
    selectedSubRoles,
    setSelectedSubRoles,
    selectedCities,
    setSelectedCities,
    isFreeOnly,
    setIsFreeOnly,
    experienceLevel,
    setExperienceLevel,
    query,
    setQuery,
    myConnections,
    fetchPendingCount,
    sendConnectionRequest,
    refreshProfiles: fetchProfiles,
  };
}
