import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

export interface Project {
  id: string;
  title: string;
  description: string;
  type: string;
  created_at: string;
  owner_id: string;
  image_url?: string;
  has_notifications?: boolean;
  city?: string;
  is_paid?: boolean;
  team_visible?: any[];
}

export const useMyProjectsData = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  // 1. Fetch Owned Projects
  const ownedQuery = useQuery({
    queryKey: ["projects", "owned", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournages")
        .select(`
            *,
            team:project_roles(
                id,
                title,
                show_in_team,
                assigned_profile:profiles(id, avatar_url, full_name)
            )
        `)
        .eq("owner_id", userId)
        .neq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) throw error;

      let projects = (data || []).map(p => ({
        ...p,
        team_visible: p.team?.filter((r: any) => r.show_in_team && r.assigned_profile).map((r: any) => ({
          ...r.assigned_profile,
          role_title: r.title
        })) || []
      }));

      if (projects.length > 0) {
        const tournageIds = projects.map((p) => p.id);
        const { data: pendingApps } = await supabase
          .from("applications" as any)
          .select(`role_id, project_roles!inner (tournage_id)`)
          .eq("status", "pending")
          .in("project_roles.tournage_id", tournageIds);

        projects = projects.map((p) => ({
          ...p,
          has_notifications: pendingApps?.some(
            (app: any) => app.project_roles?.tournage_id === p.id,
          ),
        }));
      }
      return projects as Project[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // 2. Fetch Participating Projects
  const participatingQuery = useQuery({
    queryKey: ["projects", "participating", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_roles")
        .select(`
          tournage_id,
          tournages (
            *,
            team:project_roles(
                id,
                title,
                show_in_team,
                assigned_profile:profiles(id, avatar_url, full_name)
            )
          )
        `)
        .eq("assigned_profile_id", userId)
        .neq("tournages.owner_id", userId)
        .neq("tournages.status", "completed")
        .eq("status", "assigned");

      if (error) throw error;

      const participatingMap = new Map();
      data?.forEach((p: any) => {
        if (p.tournages && p.tournages.status !== "completed") {
          const proj = {
            ...p.tournages,
            team_visible: p.tournages.team?.filter((r: any) => r.show_in_team && r.assigned_profile).map((r: any) => ({
              ...r.assigned_profile,
              role_title: r.title
            })) || []
          };
          participatingMap.set(proj.id, proj);
        }
      });
      return Array.from(participatingMap.values()) as Project[];
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const allProjectIds = useMemo(() => ([
    ...(ownedQuery.data?.map(p => p.id) || []),
    ...(participatingQuery.data?.map(p => p.id) || [])
  ]), [ownedQuery.data, participatingQuery.data]);

  // 3. Recent Messages
  const messagesQuery = useQuery({
    queryKey: ["projects", "messages", allProjectIds],
    queryFn: async () => {
      if (allProjectIds.length === 0) return [];
      const { data, error } = await supabase
        .from("project_messages" as any)
        .select(`
          id, project_id, category, content, created_at,
          sender:profiles(full_name),
          project:tournages(title)
        `)
        .in("project_id", allProjectIds)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      
      const uniqueGroups: any[] = [];
      const seen = new Set();
      for (const msg of data || []) {
        const key = `${msg.project_id}-${msg.category}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueGroups.push(msg);
          if (uniqueGroups.length === 4) break;
        }
      }
      return uniqueGroups;
    },
    enabled: allProjectIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  // 4. Calendar Events & Shoot Days
  const calendarQuery = useQuery({
    queryKey: ["projects", "calendar", allProjectIds],
    queryFn: async () => {
      if (allProjectIds.length === 0) return [];
      
      const [eventsResp, shootDaysResp] = await Promise.all([
        supabase
          .from("project_events" as any)
          .select(`*, project:tournages(title)`)
          .in("tournage_id", allProjectIds),
        supabase
          .from("shoot_days")
          .select(`*, project:tournages(title)`)
          .in("tournage_id", allProjectIds)
      ]);

      let allEvents: any[] = eventsResp.data || [];
      
      if (shootDaysResp.data) {
        const shootEvents = shootDaysResp.data.map(sd => ({
          id: sd.id,
          tournage_id: sd.tournage_id,
          title: `🎥 Tournage: ${sd.location || "Lieu non défini"}`,
          start_time: sd.date + (sd.call_time ? `T${sd.call_time}` : "T08:00:00"),
          project: sd.project,
          is_shoot_day: true
        }));
        allEvents = [...allEvents, ...shootEvents];
      }
      return allEvents;
    },
    enabled: allProjectIds.length > 0,
    staleTime: 1000 * 60 * 10,
  });

  // 5. Notifications
  const notificationsQuery = useQuery({
    queryKey: ["projects", "notifications", allProjectIds, ownedQuery.data?.map(p => p.id)],
    queryFn: async () => {
      if (allProjectIds.length === 0) return { all: [], recent: [], seenIds: [] };
      
      const ownedIds = ownedQuery.data?.map(p => p.id) || [];
      const seenJson = await AsyncStorage.getItem("seen_project_notifications");
      const seenIds: string[] = seenJson ? JSON.parse(seenJson) : [];

      const [appsResp, filesResp, participantsResp] = await Promise.all([
        ownedIds.length > 0 
          ? supabase.from('applications').select('*, candidate:profiles(full_name), role:project_roles!inner(title, tournage:tournages(title, id, image_url))').eq('status', 'pending').in('project_roles.tournage_id', ownedIds).order('created_at', { ascending: false }).limit(20)
          : Promise.resolve({ data: [] }),
        supabase.from('project_files').select('*, uploader:profiles(full_name), project:tournages(title, id, image_url)').in('project_id', allProjectIds).order('created_at', { ascending: false }).limit(20),
        supabase.from('project_roles').select('*, assigned_profile:profiles(full_name), tournage:tournages(title, id, image_url)').in('tournage_id', allProjectIds).not('assigned_profile_id', 'is', null).order('created_at', { ascending: false }).limit(20)
      ]);

      let allNotifs: any[] = [];

      if (appsResp.data) {
        allNotifs = [...allNotifs, ...appsResp.data.map(a => ({
          id: a.id,
          type: 'application',
          title: 'Candidature',
          subtitle: `${a.candidate?.full_name} sur "${a.role?.title}"`,
          project_title: (a.role as any)?.tournage?.title,
          project_image: (a.role as any)?.tournage?.image_url,
          created_at: a.created_at,
          project_id: (a.role as any)?.tournage?.id,
          isRead: seenIds.includes(a.id)
        }))];
      }

      if (filesResp.data) {
        allNotifs = [...allNotifs, ...filesResp.data.map(f => ({
          id: f.id,
          type: 'file',
          title: 'Fichier',
          subtitle: `${f.uploader?.full_name} a ajouté "${f.name}"`,
          project_title: f.project?.title,
          project_image: f.project?.image_url,
          created_at: f.created_at,
          project_id: f.project?.id,
          isRead: seenIds.includes(f.id)
        }))];
      }

      if (participantsResp.data) {
        allNotifs = [...allNotifs, ...participantsResp.data.map(p => ({
          id: p.id,
          type: 'participant',
          title: 'Nouveau membre',
          subtitle: `${p.assigned_profile?.full_name} rejoint "${p.title}"`,
          project_title: p.tournage?.title,
          project_image: p.tournage?.image_url,
          created_at: p.created_at,
          project_id: p.tournage?.id,
          isRead: seenIds.includes(p.id)
        }))];
      }

      const sorted = allNotifs.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return {
        all: sorted,
        recent: sorted.filter(n => !n.isRead).slice(0, 4),
        seenIds
      };
    },
    enabled: allProjectIds.length > 0,
    staleTime: 1000 * 60 * 2,
  });

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  }, [queryClient]);

  return {
    ownedProjects: ownedQuery.data || [],
    participatingProjects: participatingQuery.data || [],
    recentMessages: messagesQuery.data || [],
    upcomingEvents: calendarQuery.data || [],
    notifications: notificationsQuery.data || { all: [], recent: [], seenIds: [] },
    isLoading: (ownedQuery.status === 'pending' || participatingQuery.status === 'pending') && !ownedQuery.data && !participatingQuery.data,
    isRefetching: ownedQuery.isFetching || participatingQuery.isFetching,
    refetch
  };
};
