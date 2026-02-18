import ClapLoading from "@/components/ClapLoading";
import { GlobalStyles } from "@/constants/Styles";
import { useUserMode } from "@/hooks/useUserMode";
import { useTutorial } from "@/providers/TutorialProvider";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type Project = {
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
};

import DynamicLogo from "@/components/DynamicLogo";
import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";

export default function MyProjects() {
  const { colors, isDark } = useTheme();
  const { isGuest } = useUser();
  const styles = createStyles(colors, isDark);
  const router = useRouter(); // <--- Hook de navigation
  const { width } = useWindowDimensions();
  // Breakpoints classiques (inspirés de Tailwind)
  const isSm = width >= 640;
  const isMd = width >= 768; 
  const isLg = width >= 1024;
  const isXl = width >= 1280; 
  const is2Xl = width >= 1536;

  // Adaptateurs existants
  const isWebLarge = Platform.OS === "web" && isMd;
  const isWebWide = Platform.OS === "web" && isLg;
  const { hasCompletedTutorial } = useTutorial();
  const [sections, setSections] = useState<
    { title: string; data: Project[] }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [isHistoryVisible, setIsHistoryVisible] = useState(false);
  const [seenNotificationIds, setSeenNotificationIds] = useState<string[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    start.setHours(0, 0, 0, 0);
    return start;
  });

  const getWeekDays = (start: Date) => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  useFocusEffect(
    useCallback(() => {
      fetchMyProjects();
    }, []),
  );

  // Mode control: hide FAB if in search mode
  const { mode } = useUserMode();

  const markNotifAsRead = async (id: string) => {
    try {
      const stored = await AsyncStorage.getItem("seen_project_notifications");
      let seenIds: string[] = stored ? JSON.parse(stored) : [];
      if (!seenIds.includes(id)) {
        seenIds.push(id);
        await AsyncStorage.setItem("seen_project_notifications", JSON.stringify(seenIds));
        setSeenNotificationIds(seenIds);
        
        // Update both states
        setRecentNotifications(prev => prev.filter(n => n.id !== id));
        setAllNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const allIds = allNotifications.map(n => n.id);
      await AsyncStorage.setItem("seen_project_notifications", JSON.stringify(allIds));
      setSeenNotificationIds(allIds);
      setRecentNotifications([]);
      setAllNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.error(e);
    }
  };

  async function fetchMyProjects() {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setCurrentUserId(session.user.id);
      } else {
        return;
      }

      // 1. Fetch Owned Projects (Excluding completed ones)
      const { data: ownedData, error: ownedError } = await supabase
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
        .eq("owner_id", session.user.id)
        .neq("status", "completed")
        .order("created_at", { ascending: false });

      if (ownedError) throw ownedError;

      // Check notifications for owned
      let ownedProjects = (ownedData || []).map(p => ({
        ...p,
        team_visible: p.team?.filter((r: any) => r.show_in_team && r.assigned_profile).map((r: any) => ({
          ...r.assigned_profile,
          role_title: r.title
        })) || []
      }));

      if (ownedProjects.length > 0) {
        const tournageIds = ownedProjects.map((p) => p.id);
        const { data: pendingApps } = await supabase
          .from("applications" as any)
          .select(
            `
          role_id,
          project_roles!inner (
            tournage_id
          )
        `,
          )
          .eq("status", "pending")
          .in("project_roles.tournage_id", tournageIds);

        ownedProjects = ownedProjects.map((p) => ({
          ...p,
          has_notifications: pendingApps?.some(
            (app: any) => app.project_roles?.tournage_id === p.id,
          ),
        }));
      }

      // 2. Fetch Participating Projects (Excluding completed ones)
      const { data: participations, error: partError } = await supabase
        .from("project_roles")
        .select(
          `
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
        `,
        )
        .eq("assigned_profile_id", session.user.id)
        .neq("tournages.owner_id", session.user.id)
        .neq("tournages.status", "completed")
        .eq("status", "assigned");

      if (partError) throw partError;

      const participatingMap = new Map();
      participations?.forEach((p: any) => {
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
      const participatingProjects = Array.from(participatingMap.values());

      setSections([
        { title: "Mes Créations", data: ownedProjects },
        { title: "Mes Participations", data: participatingProjects as any },
      ]);

      // 3. Fetch Recent Messages for these projects
      const allProjectIds = [
        ...ownedProjects.map((p) => p.id),
        ...participatingProjects.map((p: any) => p.id),
      ];

      if (allProjectIds.length > 0) {
        const { data: messages, error: msgError } = await supabase
          .from("project_messages" as any)
          .select(`
            id,
            project_id,
            category,
            content,
            created_at,
            sender:profiles(full_name),
            project:tournages(title)
          `)
          .in("project_id", allProjectIds)
          .order("created_at", { ascending: false })
          .limit(30); // limit 30 to be sure we get 4 different groups

        if (!msgError && messages) {
          const uniqueGroups: any[] = [];
          const seen = new Set();
          for (const msg of messages) {
            const key = `${msg.project_id}-${msg.category}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueGroups.push(msg);
              if (uniqueGroups.length === 4) break;
            }
          }
          setRecentMessages(uniqueGroups);
        }

        // 4. Fetch All Events for the current projects
        const { data: events, error: eventError } = await supabase
          .from("project_events" as any)
          .select(`
            *,
            project:tournages(title)
          `)
          .in("tournage_id", allProjectIds);

        // 5. Fetch All Shoot Days
        const { data: shootDays, error: sdError } = await supabase
          .from("shoot_days")
          .select(`
            *,
            project:tournages(title)
          `)
          .in("tournage_id", allProjectIds);

        let allCalendarEvents: any[] = [];
        
        if (!eventError && events) {
          allCalendarEvents = [...allCalendarEvents, ...events];
        }

        if (!sdError && shootDays) {
          const shootEvents = shootDays.map(sd => ({
            id: sd.id,
            tournage_id: sd.tournage_id,
            title: `🎥 Tournage: ${sd.location || "Lieu non défini"}`,
            start_time: sd.date + (sd.call_time ? `T${sd.call_time}` : "T08:00:00"),
            project: sd.project,
            is_shoot_day: true
          }));
          allCalendarEvents = [...allCalendarEvents, ...shootEvents];
        }

        setUpcomingEvents(allCalendarEvents);

        // 6. Fetch Recent Notifications (Applications, Files, Participants)
        let allNotifs: any[] = [];
        const seenJson = await AsyncStorage.getItem("seen_project_notifications");
        const seenIds: string[] = seenJson ? JSON.parse(seenJson) : [];
        setSeenNotificationIds(seenIds);
        
        // 6a. Pending Applications for owned projects
        const ownedIds = ownedProjects.map(p => p.id);
        if (ownedIds.length > 0) {
          const { data: apps } = await supabase
            .from('applications')
            .select('*, candidate:profiles(full_name), role:project_roles!inner(title, tournage:tournages(title, id, image_url))')
            .eq('status', 'pending')
            .in('project_roles.tournage_id', ownedIds)
            .order('created_at', { ascending: false })
            .limit(20);
            
          if (apps) {
            allNotifs = [...allNotifs, ...apps.map(a => ({
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
        }

        // 6b. New Files
        const { data: files } = await supabase
          .from('project_files')
          .select('*, uploader:profiles(full_name), project:tournages(title, id, image_url)')
          .in('project_id', allProjectIds)
          .order('created_at', { ascending: false })
          .limit(20);
          
        if (files) {
          allNotifs = [...allNotifs, ...files.map(f => ({
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

        // 6c. New Participants (Assigned roles)
        const { data: participants } = await supabase
          .from('project_roles')
          .select('*, assigned_profile:profiles(full_name), tournage:tournages(title, id, image_url)')
          .in('tournage_id', allProjectIds)
          .not('assigned_profile_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20);

        if (participants) {
           allNotifs = [...allNotifs, ...participants.map(p => ({
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
        setAllNotifications(sorted);
        setRecentNotifications(sorted.filter(n => !n.isRead).slice(0, 4));
      }
    } catch (error) {
      Alert.alert("Erreur", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const renderProjectItem = ({ item }: { item: Project }) => {
    // Calcul des tailles basé sur l'état des breakpoints
    const imgSize = isLg ? 100 : 70;
    const titleSize = isLg ? 18 : 15;
    const descSize = isLg ? 13 : 11;
    const iconSize = isLg ? 14 : 12;

    return (
      <TouchableOpacity
        style={[
          GlobalStyles.card, 
          styles.projectCard, 
          isWebLarge && styles.webProjectCard,
          { 
            padding: isLg ? 20 : 15,
            minHeight: isLg ? 180 : 140
          }
        ]}
        onPress={() => {
          router.push({ pathname: "/project/[id]", params: { id: item.id } });
        }}
      >
        {item.has_notifications && <View style={styles.notificationDot} />}
        <View style={{ flexDirection: "row", gap: isLg ? 15 : 10, flex: 1 }}>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={[
                styles.projectImage, 
                isWebLarge && styles.webProjectImage,
                { width: imgSize, height: imgSize }
              ]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.projectImage,
                isWebLarge && styles.webProjectImage,
                styles.projectImagePlaceholder,
                { width: imgSize, height: imgSize }
              ]}
            >
              <Ionicons
                name="film-outline"
                size={isLg ? 32 : 24}
                color={isDark ? "#FFFFFF80" : "#999"}
              />
            </View>
          )}
          <View
            style={{
              flex: 1,
              justifyContent: "flex-start",
            }}
          >
            <View>
              <View style={styles.cardHeader}>
                <Text 
                  style={[styles.projectTitle, { fontSize: titleSize }]} 
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <Text style={[styles.cardType, { fontSize: isLg ? 10 : 8 }]}>
                    {item.type.replace("_", " ")}
                  </Text>
                  {item.is_paid && <Text style={[styles.paidBadge, { fontSize: isLg ? 9 : 7, paddingHorizontal: 4 }]}>PAYÉ</Text>}
                </View>
              </View>

              {item.city && (
                <View style={styles.cardLocation}>
                  <Ionicons name="location-outline" size={iconSize} color={isDark ? "#FFFFFF" : "#666"} />
                  <Text style={[styles.cardLocationText, { fontSize: descSize }]}>{item.city}</Text>
                </View>
              )}

              <Text
                numberOfLines={isLg ? 2 : 1}
                style={[
                  GlobalStyles.body,
                  {
                    marginTop: item.city ? 4 : 8,
                    fontSize: descSize,
                    color: isDark ? "#FFFFFF" : "#4A5568",
                  },
                ]}
              >
                {item.description || "Pas de description"}
              </Text>
            </View>

            {isWebLarge ? (
              <View style={[styles.cardActions, { marginTop: isLg ? 20 : 10, paddingTop: isLg ? 15 : 10 }]}>
                <TouchableOpacity
                  style={styles.cardAction}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push(`/project/${item.id}/calendar` as any);
                  }}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={iconSize}
                    color={colors.primary}
                  />
                  <Text style={[styles.cardActionText, { fontSize: isLg ? 12 : 10 }]}>Calendrier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cardAction}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push(`/project/${item.id}/team` as any);
                  }}
                >
                  <Ionicons
                    name="people-outline"
                    size={iconSize}
                    color={colors.primary}
                  />
                  <Text style={[styles.cardActionText, { fontSize: isLg ? 12 : 10 }]}>Équipe</Text>
                </TouchableOpacity>
                {item.owner_id === currentUserId && (
                  <TouchableOpacity
                    style={styles.cardAction}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/project/${item.id}/admin` as any);
                    }}
                  >
                    <Ionicons
                      name="settings-outline"
                      size={iconSize}
                      color={colors.primary}
                    />
                    <Text style={[styles.cardActionText, { fontSize: isLg ? 12 : 10 }]}>Gérer</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <Text
                style={[
                  GlobalStyles.caption,
                  { textAlign: "right", marginTop: 8 },
                ]}
              >
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ClapLoading
          size={50}
          color={colors.primary}
          style={{ marginTop: 50 }}
        />
      ) : isWebLarge ? (
        /* Layout Web avec ScrollView global pour que tout défile ensemble */
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Nouveau : Header interne au ScrollView pour un défilement unifié */}
          <View style={[styles.webHeader, { marginBottom: 0, paddingBottom: 10 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
              <DynamicLogo />
              <Text style={styles.webHeaderTitle}>Mes Projets</Text>
            </View>
            {!isGuest && (
              <TouchableOpacity
                onPress={() => router.push("/project/new")}
                style={styles.webHeaderButton}
              >
                <Ionicons name="add-circle" size={24} color="white" />
                <Text style={styles.webHeaderButtonText}>Nouveau tournage</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.webMainContent, { flexDirection: "row", gap: 30, paddingBottom: 100 }]}>
            {/* Colonne de Gauche : Statistiques et Projets */}
            <View style={{ flex: 1, minWidth: 350 }}>
              {/* Statistiques */}
              <View style={[styles.webStatsContainer, { paddingHorizontal: 10, maxWidth: '100%', marginBottom: 20, paddingTop: 10 }]}>
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', width: '100%' }}>
                  <View style={[styles.webStatCard, { 
                    flex: 1,
                    flexBasis: "45%",
                    minWidth: 120,
                    padding: isLg ? 20 : 15,
                    minHeight: isLg ? 100 : 80 
                  }]}>
                    <View
                      style={[
                        styles.webStatIconContainer,
                        { backgroundColor: colors.primary + "15", width: isLg ? 44 : 36, height: isLg ? 44 : 36 },
                      ]}
                    >
                      <Ionicons name="film" size={isLg ? 22 : 18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.webStatValue, { fontSize: isLg ? 24 : 18 }]}>
                        {sections[0]?.data.length || 0}
                      </Text>
                      <Text style={[styles.webStatLabel, { fontSize: isLg ? 12 : 10 }]} numberOfLines={1}>Mes Créations</Text>
                    </View>
                  </View>

                  <View style={[styles.webStatCard, { 
                    flex: 1,
                    flexBasis: "45%",
                    minWidth: 120,
                    padding: isLg ? 20 : 15,
                    minHeight: isLg ? 100 : 80 
                  }]}>
                    <View
                      style={[
                        styles.webStatIconContainer,
                        { backgroundColor: "#4CAF5015", width: isLg ? 44 : 36, height: isLg ? 44 : 36 },
                      ]}
                    >
                      <Ionicons name="people" size={isLg ? 22 : 18} color="#4CAF50" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.webStatValue, { fontSize: isLg ? 24 : 18 }]}>
                        {sections[1]?.data.length || 0}
                      </Text>
                      <Text style={[styles.webStatLabel, { fontSize: isLg ? 12 : 10 }]} numberOfLines={1}>Participations</Text>
                    </View>
                  </View>

                  <View style={[styles.webStatCard, { 
                    flex: 1,
                    flexBasis: "45%",
                    minWidth: 120,
                    padding: isLg ? 20 : 15,
                    minHeight: isLg ? 100 : 80 
                  }]}>
                    <View
                      style={[
                        styles.webStatIconContainer,
                        { backgroundColor: "#FF980015", width: isLg ? 44 : 36, height: isLg ? 44 : 36 },
                      ]}
                    >
                      <Ionicons name="calendar" size={isLg ? 22 : 18} color="#FF9800" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.webStatValue, { fontSize: isLg ? 24 : 18 }]}>
                        {upcomingEvents.filter(e => {
                          const eventDate = new Date(e.start_time);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return eventDate >= today;
                        }).length}
                      </Text>
                      <Text style={[styles.webStatLabel, { fontSize: isLg ? 12 : 10 }]} numberOfLines={1}>Prochains RDV</Text>
                    </View>
                  </View>

                  <View style={[styles.webStatCard, { 
                    flex: 1,
                    flexBasis: "45%",
                    minWidth: 120,
                    padding: isLg ? 20 : 15,
                    minHeight: isLg ? 100 : 80 
                  }]}>
                    <View
                      style={[
                        styles.webStatIconContainer,
                        { backgroundColor: "#E91E6315", width: isLg ? 44 : 36, height: isLg ? 44 : 36 },
                      ]}
                    >
                      <Ionicons name="notifications" size={isLg ? 22 : 18} color="#E91E63" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.webStatValue, { fontSize: isLg ? 24 : 18 }]}>
                        {sections[0]?.data.filter(p => (p as any).has_notifications).length || 0}
                      </Text>
                      <Text style={[styles.webStatLabel, { fontSize: isLg ? 12 : 10 }]} numberOfLines={1}>Alertes</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Sections de Projets */}
              {sections.map((section, sIndex) => (
                <View key={section.title + sIndex} style={[styles.webSectionWrapper, { paddingHorizontal: 10, marginBottom: 30 }]}>
                  <View style={styles.webSectionHeaderContainer}>
                    <Text style={styles.webSectionHeader}>{section.title}</Text>
                    <View style={styles.webSectionUnderline} />
                  </View>

                  <View style={styles.webGridContainer}>
                    {section.data.length > 0 ? (
                      section.data.map((item) => (
                        <View 
                          key={item.id} 
                          style={[
                            styles.webGridItem, 
                            { width: is2Xl ? "48.5%" : "100%" }
                          ]}
                        >
                          {renderProjectItem({ item })}
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyText}>
                        Aucun projet dans cette catégorie.
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Colonne de Droite : Toutes les cards d'info */}
            <View style={[styles.webSidebarsContainer, { 
              flexDirection: 'column', 
              gap: 20, 
              flex: 1,
              flexShrink: 0
            }]}>
              {/* Bloc Notifications */}
              <View style={[styles.webSidebarBlock, { width: '100%', marginVertical: 0, marginLeft: 0 }]}>
                <View style={[styles.sidebarHeader, { marginBottom: 15, justifyContent: 'space-between' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Ionicons name="notifications-outline" size={20} color={colors.primary} />
                      <Text style={[styles.sidebarTitle, { fontSize: 16 }]}>Alertes ({recentNotifications.length})</Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsHistoryVisible(true)}>
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>Voir l'historique</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ 
                  flexDirection: 'row', 
                  flexWrap: 'wrap', 
                  borderWidth: 1, 
                  borderColor: colors.border, 
                  borderRadius: 16, 
                  overflow: 'hidden' 
                }}>
                  {recentNotifications.length > 0 ? (
                    recentNotifications.slice(0, 4).map((notif, index) => (
                      <TouchableOpacity
                        key={notif.id}
                        style={{ 
                          width: '50%', 
                          padding: 12, 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          gap: 10,
                          backgroundColor: (isDark ? '#FFFFFF08' : '#F8FAFC'),
                          borderRightWidth: index % 2 === 0 ? 1 : 0,
                          borderBottomWidth: index < 2 ? 1 : 0,
                          borderColor: colors.border
                        }}
                        onPress={() => {
                          markNotifAsRead(notif.id);
                          router.push(`/project/${notif.project_id}` as any);
                        }}
                      >
                        <View style={[styles.webStatIconContainer, { width: 32, height: 32, borderRadius: 8, backgroundColor: notif.type === 'application' ? '#E91E6315' : notif.type === 'file' ? '#3B82F615' : '#10B98115' }]}>
                           <View style={{
                             position: 'absolute',
                             top: -2,
                             right: -2,
                             width: 8,
                             height: 8,
                             borderRadius: 4,
                             backgroundColor: '#EF4444',
                             zIndex: 10,
                             borderWidth: 1,
                             borderColor: colors.card
                           }} />
                           <Ionicons 
                             name={notif.type === 'application' ? 'person-add' : notif.type === 'file' ? 'document' : 'people'} 
                             size={16} 
                             color={notif.type === 'application' ? '#E91E63' : notif.type === 'file' ? '#3B82F6' : '#10B981'} 
                           />
                        </View>
                        <View style={{ flex: 1 }}>
                           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                             <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }} numberOfLines={1}>{notif.title}</Text>
                             <Text style={{ fontSize: 7, color: '#94A3B8' }}>{new Date(notif.created_at || '').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</Text>
                           </View>
                           <Text style={{ fontSize: 9, color: isDark ? '#E2E8F0' : '#64748B', marginTop: 1, fontWeight: '600' }} numberOfLines={1}>{notif.subtitle}</Text>
                           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                             {notif.project_image ? (
                               <Image source={{ uri: notif.project_image }} style={{ width: 14, height: 14, borderRadius: 4 }} />
                             ) : (
                               <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
                                 <Ionicons name="film-outline" size={10} color="#94A3B8" />
                               </View>
                             )}
                             <Text style={{ fontSize: 8, color: colors.primary, fontWeight: '700' }} numberOfLines={1}>{notif.project_title}</Text>
                           </View>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={{ width: '100%', padding: 30, alignItems: 'center', backgroundColor: isDark ? '#FFFFFF02' : '#FFFFFF' }}>
                       <Ionicons name="notifications-off-outline" size={32} color="#94A3B8" />
                       <Text style={{ fontSize: 13, color: '#94A3B8', marginTop: 10 }}>Aucune nouvelle alerte</Text>
                    </View>
                  )}
                  {/* Fill empty slots if less than 4 but more than 0 unread */}
                  {recentNotifications.length > 0 && recentNotifications.length < 4 && Array.from({ length: 4 - recentNotifications.length }).map((_, i) => (
                      <View key={`empty-${i}`} style={{ 
                          width: '50%', 
                          height: 60,
                          backgroundColor: isDark ? '#FFFFFF02' : '#FAFAFA',
                          borderRightWidth: (recentNotifications.length + i) % 2 === 0 ? 1 : 0,
                          borderBottomWidth: (recentNotifications.length + i) < 2 ? 1 : 0,
                          borderColor: colors.border 
                      }} />
                  ))}
                </View>
              </View>

              {/* Bloc Discussions en Grille */}
              {recentMessages.length > 0 && (
                <View style={[styles.webSidebarBlock, { width: '100%', marginVertical: 0, marginLeft: 0 }]}>
                  <View style={[styles.sidebarHeader, { marginBottom: 15 }]}>
                    <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
                    <Text style={[styles.sidebarTitle, { fontSize: 16 }]}>Dernières Discussions</Text>
                  </View>
                  <View style={{ 
                    flexDirection: 'row', 
                    flexWrap: 'wrap', 
                    borderWidth: 1, 
                    borderColor: colors.border, 
                    borderRadius: 16, 
                    overflow: 'hidden' 
                  }}>
                    {recentMessages.slice(0, 4).map((msg, index) => (
                      <TouchableOpacity
                        key={msg.id}
                        style={{ 
                          width: '50%', 
                          padding: 12, 
                          backgroundColor: isDark ? '#FFFFFF02' : '#FFFFFF',
                          borderRightWidth: index % 2 === 0 ? 1 : 0,
                          borderBottomWidth: index < 2 ? 1 : 0,
                          borderColor: colors.border
                        }}
                        onPress={() =>
                          router.push({
                            pathname: "/project/[id]/spaces/[category]",
                            params: { id: msg.project_id, category: msg.category },
                          } as any)
                        }
                      >
                        <View style={styles.msgHeader}>
                          <Text style={[styles.msgProjectTitle, { fontSize: 10, fontWeight: 'bold' }]} numberOfLines={1}>
                            {msg.project?.title}
                          </Text>
                          <View style={[styles.categoryBadge, { paddingHorizontal: 4, paddingVertical: 1 }]}>
                            <Text style={[styles.categoryBadgeText, { fontSize: 8 }]}>{msg.category}</Text>
                          </View>
                        </View>
                        <Text style={[styles.msgSender, { fontSize: 9, marginTop: 2 }]} numberOfLines={1}>
                          {msg.sender?.full_name}
                        </Text>
                        <Text style={[styles.msgContent, { fontSize: 9, height: 26, marginTop: 2, lineHeight: 12 }]} numberOfLines={2}>
                          {msg.content}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Calendrier */}
              <View style={[styles.webCalendarWrapper, { width: '100%', marginTop: 0, marginHorizontal: 0, padding: 15 }]}>
                <View style={[styles.sidebarHeader, { justifyContent: 'space-between', marginBottom: 15 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                    <Text style={[styles.sidebarTitle, { fontSize: 16 }]}>
                      Agenda - {currentWeekStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase())}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 5 }}>
                    <TouchableOpacity 
                      onPress={() => {
                        const next = new Date(currentWeekStart);
                        next.setDate(next.getDate() - 7);
                        setCurrentWeekStart(next);
                      }}
                      style={[styles.weekNavBtn, { width: 28, height: 28 }]}
                    >
                      <Ionicons name="chevron-back" size={16} color={colors.primary} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => {
                        const d = new Date();
                        const day = d.getDay();
                        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
                        const start = new Date(d.setDate(diff));
                        start.setHours(0, 0, 0, 0);
                        setCurrentWeekStart(start);
                      }}
                      style={[styles.weekNavBtn, { paddingHorizontal: 8, height: 28, width: 'auto' }]}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.primary }}>Aujourd'hui</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => {
                        const next = new Date(currentWeekStart);
                        next.setDate(next.getDate() + 7);
                        setCurrentWeekStart(next);
                      }}
                      style={[styles.weekNavBtn, { width: 28, height: 28 }]}
                    >
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.weekContainer, { 
                  flexDirection: 'row', 
                  flexWrap: 'wrap', 
                  borderWidth: 1, 
                  borderColor: colors.border, 
                  borderRadius: 12, 
                  overflow: 'hidden',
                  marginTop: 15,
                  gap: 0 
                }]}>
                  {getWeekDays(currentWeekStart).map((day, index) => {
                    const dayEvents = upcomingEvents.filter(e => {
                      const eDate = new Date(e.start_time);
                      return eDate.getDate() === day.getDate() && 
                             eDate.getMonth() === day.getMonth() && 
                             eDate.getFullYear() === day.getFullYear();
                    }).sort((a,b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                    const isToday = new Date().toDateString() === day.toDateString();

                    return (
                      <View 
                        key={index} 
                        style={[
                          { 
                            width: '25%', 
                            height: 150, 
                            borderRightWidth: (index + 1) % 4 === 0 ? 0 : 1, 
                            borderBottomWidth: index < 4 ? 1 : 0,
                            borderColor: colors.border,
                            padding: 8,
                            backgroundColor: isToday ? colors.primary + '08' : 'transparent'
                          }
                        ]}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: isToday ? colors.primary : '#94A3B8' }}>
                            {day.toLocaleDateString('fr-FR', { weekday: 'short' }).toUpperCase().replace('.', '')}
                          </Text>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: isToday ? colors.primary : colors.text }}>
                            {day.getDate()}
                          </Text>
                        </View>
                        <View style={{ gap: 5, marginTop: 5 }}>
                          {dayEvents.slice(0, 3).map((event, eIdx) => (
                            <TouchableOpacity 
                              key={eIdx} 
                              onPress={() => router.push({ pathname: "/project/[id]/calendar", params: { id: event.tournage_id } } as any)}
                              style={{ 
                                paddingVertical: 4, 
                                paddingHorizontal: 6,
                                borderRadius: 6, 
                                backgroundColor: event.is_shoot_day ? '#10B981' : colors.primary,
                                width: '100%',
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 1 },
                                shadowOpacity: 0.1,
                                shadowRadius: 2,
                                elevation: 1
                              }} 
                            >
                                <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }} numberOfLines={1}>
                                    {event.project?.title}
                                </Text>
                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 7 }} numberOfLines={1}>
                                    {event.title}
                                </Text>
                            </TouchableOpacity>
                          ))}
                          {dayEvents.length > 3 && (
                             <Text style={{ fontSize: 9, color: colors.primary, textAlign: 'center', fontWeight: 'bold' }}>+{dayEvents.length - 3} autres</Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                  {/* Case vide pour compléter la grille de 8 (2x4) si nécessaire */}
                  <View style={{ width: '25%', height: 150, backgroundColor: isDark ? '#FFFFFF02' : '#F8FAFC' }} />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* Layout Mobile avec SectionList standard */
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item.id + index}
          renderItem={renderProjectItem}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucun projet pour l'instant.</Text>
          }
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* FAB uniquement sur mobile car on a le bouton dans le header sur Web */}
      {!isWebLarge && !isGuest ? (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/project/new")}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      ) : null}

      {/* Modal d'historique des notifications pour le Web */}
      <Modal
        visible={isHistoryVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsHistoryVisible(false)}
      >
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
          activeOpacity={1}
          onPress={() => setIsHistoryVisible(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{ 
              width: 500, 
              maxHeight: '80%', 
              backgroundColor: colors.card, 
              borderRadius: 24, 
              padding: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.1,
              shadowRadius: 20,
              elevation: 5
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>Historique des alertes</Text>
              <TouchableOpacity onPress={() => setIsHistoryVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {allNotifications.some(n => !n.isRead) && (
              <TouchableOpacity 
                onPress={markAllAsRead}
                style={{ marginBottom: 20, alignSelf: 'flex-start' }}
              >
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '700' }}>Tout marquer comme lu</Text>
              </TouchableOpacity>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {allNotifications.length > 0 ? (
                Object.entries(
                  allNotifications.reduce((groups: any, notif) => {
                    const date = new Date(notif.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
                    if (!groups[date]) groups[date] = [];
                    groups[date].push(notif);
                    return groups;
                  }, {})
                ).map(([date, notifs]: [string, any]) => (
                  <View key={date} style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 10, textTransform: 'uppercase' }}>{date}</Text>
                    <View style={{ gap: 10 }}>
                      {notifs.map((n: any) => (
                        <TouchableOpacity 
                          key={n.id} 
                          onPress={() => {
                            markNotifAsRead(n.id);
                            setIsHistoryVisible(false);
                            router.push(`/project/${n.project_id}` as any);
                          }}
                          style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            gap: 15, 
                            padding: 12, 
                            borderRadius: 16, 
                            borderWidth: 1, 
                            borderColor: colors.border,
                            backgroundColor: n.isRead ? 'transparent' : colors.primary + '05'
                          }}
                        >
                          <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: n.type === 'application' ? '#E91E6315' : n.type === 'file' ? '#3B82F615' : '#10B98115', justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons 
                                name={n.type === 'application' ? 'person-add' : n.type === 'file' ? 'document' : 'people'} 
                                size={18} 
                                color={n.type === 'application' ? '#E91E63' : n.type === 'file' ? '#3B82F6' : '#10B981'} 
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>{n.title}</Text>
                            <Text style={{ fontSize: 12, color: isDark ? '#E2E8F0' : '#64748B' }}>{n.subtitle}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                               {n.project_image ? (
                                 <Image source={{ uri: n.project_image }} style={{ width: 16, height: 16, borderRadius: 4 }} />
                               ) : (
                                 <View style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }}>
                                   <Ionicons name="film-outline" size={10} color="#94A3B8" />
                                 </View>
                               )}
                               <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>{n.project_title}</Text>
                            </View>
                          </View>
                          {!n.isRead && (
                            <TouchableOpacity 
                              onPress={(e) => {
                                e.stopPropagation();
                                markNotifAsRead(n.id);
                              }}
                              style={{ 
                                padding: 6, 
                                borderRadius: 8, 
                                backgroundColor: colors.primary + '10' 
                              }}
                            >
                              <Ionicons name="checkmark" size={16} color={colors.primary} />
                            </TouchableOpacity>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 40 }}>Aucun historique disponible</Text>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) { return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  webHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? colors.border : "#E2E8F0",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    zIndex: 10,
  },
  webHeaderTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
  },
  webHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  webHeaderButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
  },
  projectCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  webStatsContainer: {
    flexDirection: "row",
    gap: 20,
    paddingHorizontal: 0,
    paddingTop: 20,
    maxWidth: '100%',
    alignSelf: "flex-start",
    width: "100%",
  },
  webStatCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  webStatIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  webStatValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
  },
  webStatLabel: {
    fontSize: 13,
    color: isDark ? "#FFFFFF" : "#64748B",
    fontWeight: "500",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: isDark ? "#FFFFFF" : colors.text,
    backgroundColor: "transparent",
  },
  webSectionHeaderContainer: {
    marginTop: 15,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  webSectionHeader: {
    fontSize: 22,
    color: isDark ? "#FFFFFF" : colors.text,
    backgroundColor: "transparent",
    marginTop: 0,
    marginBottom: 5,
  },
  webSectionUnderline: {
    width: 30,
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
    marginLeft: 2,
  },
  webScrollViewContent: {
    paddingBottom: 100,
    flexDirection: "column",
  },
  webSectionWrapper: {
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  webGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20, // Espacement entre les cartes
    marginTop: 10,
    alignItems: "stretch", // Aligne les hauteurs des cartes dans une même ligne
  },
  webGridItem: {
    width: "48.5%", // Deux colonnes parfaites
    display: "flex",
  },
  webProjectCard: {
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 0,
    marginBottom: 20,
    padding: 20,
    width: "100%", // Prend toute la largeur de son conteneur webGridItem
    minHeight: 180, // Taille minimale pour harmoniser
    flex: 1,
    justifyContent: "space-between",
  },
  notificationDot: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    zIndex: 1,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: isDark ? "#FFFFFF" : colors.text,
    flexShrink: 1,
    marginRight: 10,
  },
  listContent: { padding: 15, paddingBottom: 100 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    alignItems: "flex-start",
  },
  cardType: {
    fontSize: 10,
    color: colors.primary,
    backgroundColor: colors.primary + "10",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    overflow: "hidden",
    fontWeight: "800",
    textTransform: "uppercase",
  },
  cardLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  cardLocationText: {
    fontSize: 13,
    color: isDark ? "#FFFFFF" : "#64748B",
  },
  paidBadge: {
    fontSize: 10,
    color: "#10B981",
    backgroundColor: "#10B98115",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    fontWeight: "800",
    marginLeft: 8,
    overflow: "hidden",
  },
  cardActions: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    justifyContent: "flex-start",
    flexWrap: "wrap",
    gap: 10,
  },
  cardAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 4,
  },
  cardActionText: {
    fontSize: 12,
    color: isDark ? "#FFFFFF" : "#475569",
    fontWeight: "600",
  },
  projectImage: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
  },
  webProjectImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
  },
  projectImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    color: isDark ? "#FFFFFF" : "#999",
    fontSize: 16,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  webMainContent: {
    flex: 1,
    flexDirection: "row",
    paddingHorizontal: 10,
    width: "100%",
    alignSelf: 'center',
  },
  webSidebarsContainer: {
    flexDirection: "row",
    gap: 15,
    marginVertical: 15,
    marginLeft: 10,
    alignItems: "flex-start",
  },
  webSidebarBlock: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
  },
  sidebarTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  msgCard: {
    backgroundColor: isDark ? "#FFFFFF05" : "#F8FAFC",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  msgHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  msgProjectTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: colors.primary + "20",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  categoryBadgeText: {
    fontSize: 9,
    color: colors.primary,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  msgSender: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 4,
  },
  msgContent: {
    fontSize: 12,
    color: isDark ? "#E2E8F0" : "#475569",
    lineHeight: 16,
  },
  msgTime: {
    fontSize: 9,
    color: "#94A3B8",
    marginTop: 8,
    textAlign: "right",
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 4,
  },
  eventTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventTime: {
    fontSize: 12,
    color: isDark ? "#E2E8F0" : "#475569",
  },
  emptySidebarText: {
    fontSize: 13,
    color: "#94A3B8",
    textAlign: "center",
    fontStyle: "italic",
    paddingVertical: 10,
  },
  webCalendarWrapper: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    marginBottom: 30,
    marginTop: 40,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
  },
  weekContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  dayColumn: {
    flex: 1,
    minHeight: 180,
    backgroundColor: isDark ? "#FFFFFF05" : "#F8FAFC",
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  todayColumn: {
    backgroundColor: colors.primary + "08",
    borderColor: colors.primary + "30",
  },
  dayHeader: {
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  dayEventsList: {
    gap: 8,
  },
  eventItem: {
    backgroundColor: colors.primary + "15",
    padding: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  shootDayItem: {
    backgroundColor: "#10B98115",
    borderLeftColor: "#10B981",
  },
  eventTimeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
  },
  eventProjTitle: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.text,
    marginTop: 2,
  },
  eventTitleMini: {
    fontSize: 9,
    color: isDark ? "#A0AEC0" : "#718096",
  },
  weekNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: isDark ? "#FFFFFF10" : "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  sidebarStatRow: {
    flexDirection: "row",
    gap: 10,
  },
  sidebarStatItem: {
    flex: 1,
    backgroundColor: isDark ? "#FFFFFF05" : "#F8FAFC",
    padding: 15,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  sidebarStatValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text,
  },
  sidebarStatLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
});
}
