import { Tables } from "@/lib/database.types";
import { appEvents, EVENTS } from "@/lib/events";
import { getRecommendedRoles } from "@/lib/matching";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/providers/UserProvider";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useUserMode } from "./useUserMode";

export type RoleWithProject = Tables<"project_roles"> & {
  tournages: Tables<"tournages">;
};

export type ProjectWithRoles = Tables<"tournages"> & {
  roleCount: number;
  roles: RoleWithProject[];
};

export function useJobs() {
  const { user, profile: userProfile } = useUser();
  const { effectiveUserId } = useUserMode();
  const [allRoles, setAllRoles] = useState<RoleWithProject[]>([]);
  const [roles, setRoles] = useState<RoleWithProject[]>([]);
  const [projects, setProjects] = useState<ProjectWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<RoleWithProject[]>([]);
  const isFetchingRef = useRef(false);
  const [availableCities, setAvailableCities] = useState<string[]>(["all"]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hideMyParticipations, setHideMyParticipations] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    try {
      if (!effectiveUserId || !userProfile) return;

      const { data: roles } = await supabase
        .from("project_roles")
        .select(`*, tournages!inner (*)`)
        .eq("status", "published")
        .is("assigned_profile_id", null)
        .neq("tournages.status", "completed")
        .limit(50);

      if (!roles) return;

      let visible = roles;

      if (hideMyParticipations && effectiveUserId) {
        const { data: participations } = await supabase
          .from("project_roles")
          .select("id, tournage_id")
          .eq("assigned_profile_id", effectiveUserId);

        const { data: myOwnedProjects } = await supabase
          .from("tournages")
          .select("id")
          .eq("owner_id", effectiveUserId);

        const { data: characterRoles } = await supabase
          .from("project_characters")
          .select("project_id")
          .eq("assigned_actor_id", effectiveUserId);

        const { data: myApplications } = await supabase
          .from("applications" as any)
          .select("role_id")
          .eq("candidate_id", effectiveUserId);

        const involvedProjectIds = new Set([
          ...(participations?.map((p) => p.tournage_id) || []),
          ...(myOwnedProjects?.map((p) => p.id) || []),
          ...(characterRoles?.map((p) => p.project_id) || []),
        ]);
        const appliedRoleIds = new Set(
          myApplications?.map((a: any) => a.role_id) || [],
        );

        visible = visible.filter(
          (role) =>
            !involvedProjectIds.has(role.tournage_id) &&
            !appliedRoleIds.has(role.id),
        );
      }

      const recs = getRecommendedRoles(userProfile, visible);
      setRecommendations(recs.slice(0, 3));
    } catch (e) {
      console.log("Error fetching recommendations", e);
    }
  }, [effectiveUserId, userProfile, hideMyParticipations]);

  const fetchCities = useCallback(async () => {
    try {
      // On récupère les villes uniquement pour les rôles publiés
      const { data, error } = await supabase
        .from("project_roles")
        .select("tournages!inner(ville, status)")
        .eq("status", "published")
        .neq("tournages.status", "completed");

      if (error) throw error;

      const cities = Array.from(
        new Set(
          (data as any[])
            ?.map((r) => r.tournages?.ville)
            .filter((v) => v)
            .map((v) => v.trim()),
        ),
      ).sort() as string[];

      setAvailableCities(["all", ...cities]);
    } catch (e) {
      console.log("Error fetching cities", e);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      if (allRoles.length === 0) {
        setLoading(true);
      }
      console.log("[useJobs] Start fetching roles");

      const userId = effectiveUserId;

      let query = supabase
        .from("project_roles")
        .select(
          `*, tournages!inner ( id, title, type, pays, ville, latitude, longitude, owner_id, status )`,
        )
        .eq("status", "published") // Only show published roles
        .neq("tournages.status", "completed")
        .order("is_boosted", { ascending: false })
        .order("created_at", { ascending: false });

      if (userId) {
        const { data: blocks } = await supabase
          .from("user_blocks")
          .select("blocker_id, blocked_id")
          .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

        const blockedIds =
          blocks?.map((b: any) =>
            b.blocker_id === userId ? b.blocked_id : b.blocker_id,
          ) || [];
        if (blockedIds.length > 0) {
          query = query.not(
            "tournages.owner_id",
            "in",
            `(${blockedIds.join(",")})`,
          );
        }
      }

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      if (selectedCity !== "all") {
        query = query.eq("tournages.ville", selectedCity);
      }

      const { data, error } = await query;
      if (error) throw error;

      let visible = ((data as any[]) || []).filter(
        (r) => r.status === "published" && r.tournages,
      );

      // Filtering out participations if requested
      if (hideMyParticipations && userId) {
        // We need to know where the user is already involved
        // 1. Applications active
        // 2. Roles assigned
        // 3. Project owner
        const { data: participations } = await supabase
          .from("project_roles")
          .select("id, tournage_id")
          .eq("assigned_profile_id", userId);

        const { data: myOwnedProjects } = await supabase
          .from("tournages")
          .select("id")
          .eq("owner_id", userId);

        const { data: characterRoles } = await supabase
          .from("project_characters")
          .select("project_id")
          .eq("assigned_actor_id", userId);

        const { data: myApplications } = await supabase
          .from("applications" as any)
          .select("role_id")
          .eq("candidate_id", userId);

        const involvedProjectIds = new Set([
          ...(participations?.map((p) => p.tournage_id) || []),
          ...(myOwnedProjects?.map((p) => p.id) || []),
          ...(characterRoles?.map((p) => p.project_id) || []),
        ]);
        const appliedRoleIds = new Set(
          myApplications?.map((a: any) => a.role_id) || [],
        );

        visible = visible.filter(
          (role) =>
            !involvedProjectIds.has(role.tournage_id) &&
            !appliedRoleIds.has(role.id),
        );
      }

      setAllRoles(visible);
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      console.log("[useJobs] Fetching roles finished");
    }
  }, [effectiveUserId, selectedCategory, selectedCity, hideMyParticipations]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    fetchCities();
    fetchRecommendations();

    const unsubTutorial = appEvents.on(EVENTS.TUTORIAL_COMPLETED, () => {
      fetchCities();
      fetchRoles();
      fetchRecommendations();
    });
    const unsubBlock = appEvents.on(EVENTS.USER_BLOCKED, () => {
      fetchRoles();
    });
    return () => {
      unsubTutorial();
      unsubBlock();
    };
  }, [fetchCities, fetchRecommendations, fetchRoles]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        fetchRoles();
        fetchCities();
        fetchRecommendations();
      }
    });
    return () => subscription.remove();
  }, [fetchRoles, fetchCities, fetchRecommendations]);

  useEffect(() => {
    let filtered = [...allRoles];
    if (searchQuery.trim()) {
      const s = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((r) => {
        const roleTitle = (r.title || "").toLowerCase();
        const roleDesc = (r.description || "").toLowerCase();
        const projectTitle = (r.tournages?.title || "").toLowerCase();
        const projectVille = (r.tournages?.ville || "").toLowerCase();
        return (
          roleTitle.includes(s) ||
          roleDesc.includes(s) ||
          projectTitle.includes(s) ||
          projectVille.includes(s)
        );
      });
    }
    setRoles(filtered);

    const uniqueProjectsMap = new Map();
    filtered.forEach((role) => {
      let t = role.tournages;
      if (Array.isArray(t)) t = t[0];
      if (t && t.id) {
        if (!uniqueProjectsMap.has(t.id)) {
          uniqueProjectsMap.set(t.id, { ...t, roleCount: 1, roles: [role] });
        } else {
          const p = uniqueProjectsMap.get(t.id);
          p.roleCount++;
          p.roles.push(role);
        }
      }
    });
    setProjects(Array.from(uniqueProjectsMap.values()));
  }, [searchQuery, allRoles]);

  return {
    roles,
    projects,
    loading,
    recommendations,
    availableCities,
    selectedCategory,
    setSelectedCategory,
    selectedCity,
    setSelectedCity,
    searchQuery,
    setSearchQuery,
    hideMyParticipations,
    setHideMyParticipations,
    refreshRoles: fetchRoles,
  };
}
