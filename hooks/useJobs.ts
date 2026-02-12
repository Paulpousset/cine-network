import { Tables } from "@/lib/database.types";
import { appEvents, EVENTS } from "@/lib/events";
import { getRecommendedRoles } from "@/lib/matching";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { useUserMode } from "./useUserMode";

export type RoleWithProject = Tables<"project_roles"> & {
  tournages: Tables<"tournages">;
};

export type ProjectWithRoles = Tables<"tournages"> & {
  roleCount: number;
  roles: RoleWithProject[];
};

export function useJobs() {
  const { effectiveUserId } = useUserMode();
  const [allRoles, setAllRoles] = useState<RoleWithProject[]>([]);
  const [roles, setRoles] = useState<RoleWithProject[]>([]);
  const [projects, setProjects] = useState<ProjectWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<RoleWithProject[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>(["all"]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchRecommendations = useCallback(async () => {
    try {
      if (!effectiveUserId) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", effectiveUserId)
        .single();
      if (!profile) return;

      const { data: roles } = await supabase
        .from("project_roles")
        .select(`*, tournages (*)`)
        .eq("status", "published")
        .is("assigned_profile_id", null)
        .limit(50);

      if (!roles) return;

      const recs = getRecommendedRoles(profile, roles);
      setRecommendations(recs.slice(0, 3));
    } catch (e) {
      console.log("Error fetching recommendations", e);
    }
  }, []);

  const fetchCities = useCallback(async () => {
    try {
      // On récupère les villes uniquement pour les rôles publiés
      const { data, error } = await supabase
        .from("project_roles")
        .select("tournages!inner(ville)")
        .eq("status", "published");

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
    try {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      let query = supabase
        .from("project_roles")
        .select(
          `*, tournages!inner ( id, title, type, pays, ville, latitude, longitude, owner_id )`,
        )
        .eq("status", "published") // Only show published roles
        .order("is_boosted", { ascending: false })
        .order("created_at", { ascending: false });

      if (session) {
        const { data: blocks } = await supabase
          .from("user_blocks")
          .select("blocker_id, blocked_id")
          .or(
            `blocker_id.eq.${session.user.id},blocked_id.eq.${session.user.id}`,
          );

        const blockedIds =
          blocks?.map((b: any) =>
            b.blocker_id === session.user.id ? b.blocked_id : b.blocker_id,
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

      const visible = ((data as any[]) || []).filter(
        (r) => r.status === "published" && r.tournages,
      );
      setAllRoles(visible);
    } catch (error) {
      Alert.alert("Erreur", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedCity]);

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
    refreshRoles: fetchRoles,
  };
}
