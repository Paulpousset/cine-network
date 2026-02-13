import { getStudioTools } from "@/constants/Tools";
import { useUserMode } from "@/hooks/useUserMode";
import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  AppState,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import DynamicLogo from "./DynamicLogo";
import { Hoverable } from "./Hoverable";

// Safe Icon component to prevent "invalid element type" crashes
const SafeIcon = ({ isIonicons, ...props }: any) => {
  const Comp = isIonicons ? Ionicons : FontAwesome;
  if (
    !Comp ||
    (typeof Comp !== "function" &&
      (typeof Comp !== "object" || Comp === null || !(Comp as any).$$typeof))
  ) {
    return <View style={{ width: props.size, height: props.size }} />;
  }
  return <Comp {...props} />;
};

const NAVIGATION_ITEMS = [
  { name: "Mes Projets", icon: "film", href: "/my-projects", id: "projects" },

  { name: "Fil d'actu", icon: "newspaper-o", href: "/feed" },
  { name: "Casting & Jobs", icon: "briefcase", href: "/jobs" },

  { name: "Réseau", icon: "user", href: "/talents" },
  { name: "Notifications", icon: "bell", href: "/notifications" },
  { name: "Hall of Fame", icon: "trophy", href: "/hall-of-fame" }, // New Item
  { name: "Messages", icon: "comments", href: "/direct-messages", id: "chats" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user, profile: currentUserProfile } = useUser();
  const {
    mode,
    setUserMode,
    isSidebarCollapsed,
    setSidebarCollapsed,
    impersonatedUser,
    setImpersonatedUser,
  } = useUserMode();
  const { colors, isDark } = useTheme(); const styles = createStyles(colors, isDark);

  const [isHovered, setIsHovered] = useState(false);
  // On utilise un état local pour l'expansion au survol
  const effectiveCollapsed = !isHovered;

  useEffect(() => {
    // On s'assure que la barre est considérée comme réduite globalement
    // pour que le contenu principal ne saute pas lors du survol
    if (!isSidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  }, [isSidebarCollapsed]);

  // Détection précise de l'ID du chat actuel
  const chatMatch = pathname.match(/\/direct-messages\/([^\/]+)/);
  const currentChatId = chatMatch ? chatMatch[1] : null;

  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [managedTalents, setManagedTalents] = useState<any[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [pendingConnections, setPendingConnections] = useState(0); // New state
  const avatarUrl = currentUserProfile?.avatar_url;
  const realRole = currentUserProfile?.role;
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const [chatsExpanded, setChatsExpanded] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState<
    Record<string, boolean>
  >({
    general: true,
    preprod: true,
    production: true,
    org: true,
  });

  const userId = user?.id;

  // Ref pour le pathname actuel afin d'avoir toujours la valeur à jour dans les callbacks
  const pathnameRef = React.useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
    fetchRecentData(); // Refresh when changing page
  }, [pathname]);

  // N'afficher que sur Web et sur les écrans larges (> 768px par exemple)
  if (Platform.OS !== "web" || width < 768) {
    return null;
  }

  const projectMatch = pathname.match(/^\/project\/([^\/]+)/);
  // Exclude "new" and "role" (job offers) path from triggering project sidebar
  const isInsideProject =
    !!projectMatch && !pathname.includes("/new") && !pathname.includes("/role");
  const projectId = projectMatch ? projectMatch[1] : null;

  const [isOwner, setIsOwner] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userCategory, setUserCategory] = useState<string | null>(null);
  const [currentProjectTitle, setCurrentProjectTitle] = useState<string | null>(
    null,
  );

  useEffect(() => {
    fetchRecentData();

    // S'abonner aux changements pour mettre à jour les points rouges en temps réel
    // We now rely on appEvents to trigger refresh.

    // Listen for read events to update badges instantly (fallback)
    const unsubscribeMessagesRead = appEvents.on(EVENTS.MESSAGES_READ, () => {
      fetchRecentData();
    });

    // Listen for new message events (fallback if Realtime is slow)
    // NOTE: This might be redundant if the socket works, but good for local optimistic updates
    const unsubscribeNewMessage = appEvents.on(EVENTS.NEW_MESSAGE, () => {
      fetchRecentData();
    });

    // Listen for connection updates
    const unsubscribeConnections = appEvents.on(
      EVENTS.CONNECTIONS_UPDATED,
      () => {
        fetchRecentData();
      },
    );

    // Listen for profile updates
    const unsubscribeProfile = appEvents.on(EVENTS.PROFILE_UPDATED, () => {
      fetchRecentData();
    });

    // Listen for app state changes (background -> foreground) to refresh data
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        fetchRecentData();
      }
    });

    return () => {
      // supabase.removeChannel(channel); // Channel removed
      unsubscribeMessagesRead();
      unsubscribeNewMessage();
      unsubscribeConnections();
      unsubscribeProfile();
      subscription.remove();
    };
  }, [mode]);

  async function fetchRecentData() {
    try {
      if (!userId) return;

      // 1. Projets Récents (Own + Participations)
      // Own
      const { data: ownProjects } = await supabase
        .from("tournages")
        .select("id, title")
        .eq("owner_id", userId)
        .neq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(10);

      // Participations
      const { data: participationData } = await supabase
        .from("project_roles")
        .select("tournage:tournages (id, title)")
        .eq("assigned_profile_id", userId)
        .not("tournage", "is", null);

      const participatedProjects = (participationData || [])
        .map((p: any) => p.tournage)
        .filter(
          (t: any) =>
            t && !ownProjects?.some((own: { id: string }) => own.id === t.id),
        );

      const allProjects = [...(ownProjects || []), ...participatedProjects];
      setRecentProjects(allProjects);

      // 1.5 Pending Connections
      const { count: pendingCount } = await supabase
        .from("connections")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", userId)
        .eq("status", "pending");
      setPendingConnections(pendingCount || 0);

      // 2. Chats Récents avec indicateur de non-lu
      const { data: messages, error: msgError } = await supabase
        .from("direct_messages")
        .select("sender_id, receiver_id, is_read, created_at")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (msgError) console.error("Sidebar: Error fetching messages", msgError);

      if (messages) {
        const unreadCountMap: Record<string, number> = {};
        const uniqueIdsSet = new Set<string>();
        let unreadTotal = 0;

        messages.forEach((m) => {
          const otherId = m.sender_id === userId ? m.receiver_id : m.sender_id;
          uniqueIdsSet.add(otherId);

          // On vérifie si l'utilisateur est actuellement sur ce chat
          const isCurrentlyViewing = pathnameRef.current.includes(otherId);

          if (!m.is_read && m.receiver_id === userId) {
            // On n'incrémente le compteur que si on n'est pas déjà sur la page
            if (!isCurrentlyViewing) {
              unreadCountMap[otherId] = (unreadCountMap[otherId] || 0) + 1;
              unreadTotal++;
            }
          }
        });

        setTotalUnread(unreadTotal);

        // Take top 5 unique conversations
        const uniqueIds = Array.from(uniqueIdsSet).slice(0, 5);

        if (uniqueIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", uniqueIds);

          const sortedProfiles = uniqueIds
            .map((id) => {
              const p = profiles?.find((p: any) => p.id === id);
              if (p) {
                return {
                  ...p,
                  unreadCount: unreadCountMap[id] || 0,
                };
              }
              return null;
            })
            .filter(Boolean);

          setRecentChats(sortedProfiles);
        } else {
          setRecentChats([]);
        }
      }

      // 3. Managed Talents (for Agents)
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (userProfile?.role === "agent") {
        const { data: mandates } = await supabase
          .from("agent_mandates")
          .select("talent:profiles!talent_id(id, full_name, avatar_url)")
          .eq("agent_id", userId)
          .eq("status", "accepted");

        if (mandates) {
          setManagedTalents(mandates.map((m: any) => m.talent));
        }
      } else {
        setManagedTalents([]);
      }
    } catch (e) {
      console.error("Sidebar: Error fetching sidebar recent data:", e);
    }
  }

  useEffect(() => {
    if (isInsideProject && projectId) {
      checkAccess();
    } else {
      setIsOwner(false);
      setIsMember(false);
    }
  }, [isInsideProject, projectId]);

  async function checkAccess() {
    try {
      if (!userId) return;

      const { data: project } = await supabase
        .from("tournages")
        .select("owner_id, title")
        .eq("id", projectId)
        .maybeSingle();

      if (project) {
        setCurrentProjectTitle(project.title);
        if (project.owner_id === userId) {
          setIsOwner(true);
          setIsMember(true);
          setUserRole("Administrateur");
        } else {
          const { data: membership } = await supabase
            .from("project_roles")
            .select("category, title")
            .eq("tournage_id", projectId)
            .eq("assigned_profile_id", userId)
            .maybeSingle();

          if (membership) {
            setIsMember(true);
            setUserRole(membership.title);
            setUserCategory(membership.category);
          } else {
            setIsMember(false);
            setUserRole(null);
            setUserCategory(null);
          }
        }
      } else {
        setCurrentProjectTitle(null);
        setIsOwner(false);
        setIsMember(false);
      }
    } catch (e) {
      console.log("Error checking sidebar access:", e);
    }
  }

  const PROJECT_ITEMS = [
    {
      name: "Tableau de Bord",
      icon: "dashboard",
      href: `/project/${projectId}`,
    },
    { name: "Espaces", icon: "th-large", href: `/project/${projectId}/spaces` },
    {
      name: "Calendrier",
      icon: "calendar",
      href: `/project/${projectId}/calendar`,
    },

    { name: "Équipe", icon: "users", href: `/project/${projectId}/team` },
  ];

  if (isOwner) {
    PROJECT_ITEMS.push({
      name: "Admin",
      icon: "gear",
      href: `/project/${projectId}/admin`,
    });
  }

  const isStudio = mode === "studio";

  const studioToolsFlat =
    isStudio && isInsideProject && projectId
      ? getStudioTools(projectId, isOwner, userRole, userCategory)
      : [];

  const groupedStudioItems = [
    {
      title: "PROJET",
      id: "general",
      icon: "folder-open-o" as const,
      items: studioToolsFlat.filter((t) =>
        ["Général", "Planning", "Espaces", "Équipe"].includes(t.label),
      ),
    },
    {
      title: "PRÉPARATION",
      id: "preprod",
      icon: "clipboard" as const,
      items: studioToolsFlat.filter((t) =>
        ["Breakdown", "Casting"].includes(t.label),
      ),
    },
    {
      title: "PRODUCTION",
      id: "production",
      icon: "video-camera" as const,
      items: studioToolsFlat.filter((t) =>
        ["Plan de Travail", "Lieux"].includes(t.label),
      ),
    },
    {
      title: "ORGANISATION",
      id: "org",
      icon: "shield" as const,
      items: studioToolsFlat.filter((t) =>
        ["Logistique", "Admin"].includes(t.label),
      ),
    },
  ].filter((g) => g.items.length > 0);

  // Force l'expansion des projets en mode studio pour un accès rapide
  useEffect(() => {
    if (isStudio) {
      setProjectsExpanded(true);
    }
  }, [isStudio]);

  const studioItems = [
    {
      name: "Projets",
      icon: "folder-open",
      href: "/my-projects",
      id: "projects",
    },
    { name: "Casting & Jobs", icon: "briefcase", href: "/jobs" },
  ];

  const currentItems =
    isStudio && isInsideProject && projectId
      ? studioToolsFlat.map((t) => ({
          name: t.label,
          icon: t.icon,
          href: t.href,
          isIonicons: true,
          shortcut: (t as any).shortcut,
        }))
      : isInsideProject && !isStudio
        ? PROJECT_ITEMS
        : isStudio
          ? studioItems
          : NAVIGATION_ITEMS.filter((item) => {
              // Hide Mes Talents if not an agent (though it's not and wasn't in NAVIGATION_ITEMS)
              // We'll actually prepend it if an agent
              return true;
            });

  const finalItems = [...currentItems];
  if (realRole === "agent" && !isInsideProject && !isStudio) {
    // Insérer "Mes Talents" après "Mes Projets" (index 0)
    // On s'assure de ne pas le dupliquer s'il est déjà là
    if (!finalItems.some((item) => (item as any)?.id === "my-talents")) {
      finalItems.splice(1, 0, {
        name: "Mes Talents",
        icon: "users",
        href: "/my-talents",
        id: "my-talents",
      } as any);
    }
  } else {
    // Si on n'est plus agent, on s'assure de le retirer
    const index = finalItems.findIndex((item) => (item as any)?.id === "my-talents");
    if (index !== -1) {
      finalItems.splice(index, 1);
    }
  }

  useEffect(() => {
    if (Platform.OS !== "web" || !isStudio || !isInsideProject) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const key = e.key.toUpperCase();
      const item = currentItems.find((i) => (i as any).shortcut === key);
      if (item) {
        e.preventDefault();
        router.push(item.href as any);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isStudio, isInsideProject, currentItems, router]);

  const renderItem = (item: any) => {
    // Pour les projets, on vérifie l'égalité exacte ou le préfixe
    const isActive = isInsideProject
      ? pathname === item.href
      : pathname.startsWith(item.href);

    const isProjects = (item as any).id === "projects";
    const isChats = (item as any).id === "chats";

    // Dans le mode studio, on affiche toujours les projets récents expanded pour un accès rapide
    const expanded =
      (isProjects && isStudio) ||
      (isProjects ? projectsExpanded : isChats ? chatsExpanded : false);

    const toggleExpand = (e: any) => {
      e.stopPropagation();
      if (isProjects && !isStudio) setProjectsExpanded(!projectsExpanded);
      if (isChats) setChatsExpanded(!chatsExpanded);
    };

    return (
      <View key={item.href}>
        <Hoverable
          onPress={() => router.push(item.href as any)}
          hoverStyle={{
          backgroundColor: isActive ? colors.tint + "20" : colors.backgroundSecondary,
        }}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingVertical: 12,
          paddingHorizontal: 15,
          borderRadius: 8,
          gap: 12,
          backgroundColor: isActive
            ? colors.tint + "10"
            : "transparent",
        }}
      >
        <View style={{ position: "relative" }}>
          <SafeIcon
            isIonicons={(item as any).isIonicons}
            name={item.icon as any}
            size={20}
            color={isActive ? colors.tint : colors.text + "80"}
          />
            {/* Badge Chat */}
            {isChats && !expanded && totalUnread > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: colors.primary,
                  borderWidth: 2,
                  borderColor: "white",
                }}
              />
            )}
            {/* Badge Notifications */}
            {item.href === "/notifications" && pendingConnections > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: colors.primary,
                  borderWidth: 2,
                  borderColor: "white",
                }}
              />
            )}
          </View>
          {!effectiveCollapsed && (
            <>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: isActive ? "600" : "500",
                  color: isActive ? colors.tint : colors.text,
                  flex: 1,
                }}
              >
                {item.name}
              </Text>
              {isStudio && (item as any).shortcut && (
                <View
                  style={{
                    backgroundColor: colors.backgroundSecondary,
                    borderRadius: 4,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderBottomWidth: 2,
                    marginLeft: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: colors.text + "80",
                    }}
                  >
                    {(item as any).shortcut}
                  </Text>
                </View>
              )}
              {(isProjects || isChats) && (
                <Hoverable
                  onPress={toggleExpand}
                  hoverStyle={{
                    backgroundColor: colors.border,
                    borderRadius: 4,
                  }}
                  style={{
                    padding: 4,
                    paddingRight: 0,
                  }}
                >
                  <SafeIcon
                    isIonicons={false}
                    name={expanded ? "chevron-down" : "chevron-right"}
                    size={12}
                    color={colors.text + "80"}
                  />
                </Hoverable>
              )}
            </>
          )}
        </Hoverable>

        {/* Sous-items Projets */}
        {isProjects &&
          expanded &&
          !effectiveCollapsed &&
          recentProjects.length > 0 && (
            <View
              style={{
                marginLeft: 15,
                marginTop: 4,
                gap: 6,
                paddingRight: 5,
                borderLeftWidth: 2,
                borderLeftColor: isStudio ? colors.primary + "40" : colors.border,
              }}
            >
              {recentProjects.map((p) => {
                const isSelected = pathname.includes(`/project/${p.id}`);
                return (
                  <Hoverable
                    key={p.id}
                    onPress={() => router.push(`/project/${p.id}`)}
                    hoverStyle={{
                      backgroundColor: isSelected
                        ? colors.primary + "20"
                        : colors.backgroundSecondary,
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: isStudio ? 10 : 7,
                      paddingHorizontal: 12,
                      backgroundColor: isSelected
                        ? colors.primary + "15"
                        : "transparent",
                      borderRadius: 8,
                      gap: 10,
                      marginLeft: 5,
                    }}
                  >
                    <SafeIcon
                      isIonicons={false}
                      name="film"
                      size={isStudio ? 14 : 12}
                      color={isSelected ? colors.primary : colors.text + "99"}
                    />
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: isStudio ? 14 : 12,
                        color: isSelected ? colors.primary : colors.text + "CC",
                        fontWeight: isSelected ? "700" : "500",
                        flex: 1,
                      }}
                    >
                      {p.title}
                    </Text>
                  </Hoverable>
                );
              })}
            </View>
          )}

        {/* Sous-items Chats */}
        {isChats &&
          expanded &&
          !effectiveCollapsed &&
          recentChats.length > 0 && (
            <View
              style={{
                marginLeft: 20,
                marginTop: 4,
                gap: 4,
                paddingRight: 5,
                borderLeftWidth: 1,
                borderLeftColor: colors.border,
              }}
            >
              {recentChats.map((c) => {
                // Comparaison plus robuste de l'ID
                const isSelected = currentChatId === c.id;
                // Force à 0 si on est déjà sur la discussion pour éviter le lag d'affichage
                const displayUnreadCount = isSelected ? 0 : c.unreadCount || 0;

                return (
                  <Hoverable
                    key={c.id}
                    onPress={() =>
                      router.push({
                        pathname: "/direct-messages/[id]",
                        params: { id: c.id },
                      })
                    }
                    hoverStyle={{
                      backgroundColor: isSelected
                        ? colors.primary + "25"
                        : colors.backgroundSecondary,
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 7,
                      paddingHorizontal: 10,
                      backgroundColor: isSelected
                        ? colors.primary + "15"
                        : "transparent",
                      borderRadius: 6,
                      gap: 8,
                      marginLeft: 10,
                    }}
                  >
                    <View style={{ position: "relative" }}>
                      <View
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          backgroundColor: colors.border,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <SafeIcon isIonicons={false} name="user" size={8} color="#fff" />
                      </View>
                      {displayUnreadCount > 0 && (
                        <View
                          style={{
                            position: "absolute",
                            top: -2,
                            right: -2,
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: colors.primary,
                            borderWidth: 1.5,
                            borderColor: colors.backgroundSecondary,
                          }}
                        />
                      )}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 12,
                        color: isSelected ? colors.primary : colors.text + "CC",
                        fontWeight:
                          isSelected || displayUnreadCount > 0 ? "700" : "500",
                        flex: 1,
                      }}
                    >
                      {c.full_name}
                    </Text>
                    {displayUnreadCount > 0 && (
                      <View
                        style={{
                          backgroundColor: colors.primary,
                          borderRadius: 10,
                          minWidth: 18,
                          height: 18,
                          alignItems: "center",
                          justifyContent: "center",
                          paddingHorizontal: 4,
                          marginLeft: "auto", // Pousse le badge à droite
                        }}
                      >
                        <Text
                          style={{
                            color: "white",
                            fontSize: 10,
                            fontWeight: "bold",
                          }}
                        >
                          {displayUnreadCount}
                        </Text>
                      </View>
                    )}
                  </Hoverable>
                );
              })}
            </View>
          )}
      </View>
    );
  };

  const sidebarStyle: any = {
    width: effectiveCollapsed ? 80 : 250,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    height: "100%",
    paddingHorizontal: 15,
    paddingVertical: 20,
    zIndex: 100,
    position: "fixed",
    left: 0,
    top: 0,
    transition: "width 0.2s ease-in-out",
  };

  return (
    <View
      style={sidebarStyle}
      // @ts-ignore
      onMouseEnter={() => setIsHovered(true)}
      // @ts-ignore
      onMouseLeave={() => setIsHovered(false)}
    >
      <View
        style={[
          styles.header,
          {
            alignItems: effectiveCollapsed ? "center" : "flex-start",
            paddingLeft: effectiveCollapsed ? 0 : 15,
          },
        ]}
      >
        {effectiveCollapsed ? (
          <Hoverable onPress={() => router.push("/")} style={{ width: 50, height: 50, justifyContent: 'center', alignItems: 'center' }}>
            <DynamicLogo
              width={70}
              height={70}
            />
          </Hoverable>
        ) : isStudio && isInsideProject && currentProjectTitle ? (
          <View style={{ minHeight: 60, justifyContent: 'center' }}>
            <DynamicLogo
              width={160}
              height={60}
              style={{ marginBottom: 10 }}
            />
            <Text
              style={[styles.logo, { fontSize: 16, marginBottom: 4 }]}
              numberOfLines={2}
            >
              {currentProjectTitle.toUpperCase()}
            </Text>
            <Hoverable
              onPress={() => router.push("/my-projects")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
              }}
            >
              <SafeIcon
                isIonicons={false}
                name="exchange"
                size={10}
                color={colors.tint}
              />
              <Text
                style={{
                  fontSize: 11,
                  color: colors.tint,
                  fontWeight: "700",
                }}
              >
                CHANGER DE PROJET
              </Text>
            </Hoverable>
          </View>
        ) : (
          <View style={{ minHeight: 70, justifyContent: 'center' }}>
            <DynamicLogo
              width={140}
              height={55}
              style={{ marginBottom: 5 }}
            />
            {mode === "studio" && (
              <View
                style={{
                  backgroundColor: colors.tint,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4,
                  alignSelf: "flex-start",
                  marginTop: 5,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}
                >
                  STUDIO
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <ScrollView
        style={styles.menu}
        contentContainerStyle={{ flexGrow: 1, gap: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {mode === "studio" && !isInsideProject && (
          <Hoverable
            onPress={() => router.push("/project/new")}
            hoverStyle={{ backgroundColor: colors.primary + "DD" }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-start",
              paddingVertical: 14,
              paddingHorizontal: 15,
              borderRadius: 12,
              gap: 12,
              backgroundColor: colors.primary,
              marginBottom: 15,
            }}
          >
            <SafeIcon isIonicons={false} name="plus-circle" size={18} color="white" />
            {!effectiveCollapsed && (
              <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                Nouveau Projet
              </Text>
            )}
          </Hoverable>
        )}

        {isInsideProject && mode !== "studio" && (
          <Hoverable
            onPress={() => router.push("/my-projects")}
            hoverStyle={{ backgroundColor: colors.backgroundSecondary }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              paddingHorizontal: 15,
              marginBottom: 10,
              gap: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <SafeIcon isIonicons={false} name="arrow-left" size={16} color={colors.text + "CC"} />
            {!effectiveCollapsed && (
              <Text style={{ color: colors.text + "CC", fontWeight: "600" }}>
                Tous mes projets
              </Text>
            )}
          </Hoverable>
        )}

        {isStudio && isInsideProject
          ? groupedStudioItems.map((group) => {
              const isExpanded = categoriesExpanded[group.id];
              return (
                <View key={group.id} style={{ marginBottom: 15 }}>
                  <Hoverable
                    onPress={() =>
                      !effectiveCollapsed &&
                      setCategoriesExpanded((prev) => ({
                        ...prev,
                        [group.id]: !isExpanded,
                      }))
                    }
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 8,
                      paddingHorizontal: 15,
                      gap: 12,
                    }}
                  >
                    <SafeIcon
                      isIonicons={false}
                      name={group.icon as any}
                      size={14}
                      color={colors.text + "80"}
                    />
                    {!effectiveCollapsed && (
                      <>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "800",
                            color: colors.text + "80",
                            flex: 1,
                            letterSpacing: 1,
                          }}
                        >
                          {group.title}
                        </Text>
                        <SafeIcon
                          isIonicons={false}
                          name={isExpanded ? "chevron-down" : "chevron-right"}
                          size={10}
                          color={colors.border}
                        />
                      </>
                    )}
                  </Hoverable>
                  {(isExpanded || effectiveCollapsed) && (
                    <View style={{ gap: 2, marginTop: 4 }}>
                      {group.items.map((t) =>
                        renderItem({
                          name: t.label,
                          icon: t.icon,
                          href: t.href,
                          isIonicons: true,
                          shortcut: (t as any).shortcut,
                        }),
                      )}
                    </View>
                  )}
                </View>
              );
            })
          : finalItems.map((item) => renderItem(item))}

        {/* Spacer pour pousser le lien Compte en bas */}
        <View style={{ flex: 1 }} />

        {/* SECTION: Managed Talents (Account Switcher) - Moved to bottom to avoid jumping */}
        {!effectiveCollapsed && managedTalents.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: colors.text + "80",
                marginLeft: 15,
                marginBottom: 8,
              }}
            >
              GESTION TALENTS
            </Text>
            {impersonatedUser && (
              <Hoverable
                onPress={() => setImpersonatedUser(null)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 15,
                  borderRadius: 8,
                  gap: 10,
                  backgroundColor: colors.danger + "10",
                  marginBottom: 5,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.primary,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <SafeIcon isIonicons={true} name="person" size={16} color="white" />
                </View>
                <Text
                  style={{ fontSize: 13, fontWeight: "600", color: colors.danger }}
                >
                  Revenir à mon compte
                </Text>
              </Hoverable>
            )}
            {managedTalents.map((talent) => (
              <Hoverable
                key={talent.id}
                onPress={() => setImpersonatedUser(talent)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 8,
                  paddingHorizontal: 15,
                  borderRadius: 8,
                  gap: 10,
                  backgroundColor:
                    impersonatedUser?.id === talent.id
                      ? colors.primary + "15"
                      : "transparent",
                }}
              >
                {talent.avatar_url ? (
                  <Image
                    source={{ uri: talent.avatar_url }}
                    style={{ width: 32, height: 32, borderRadius: 16 }}
                  />
                ) : (
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: colors.border,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 12, color: colors.text + "80" }}>
                      {talent.full_name?.charAt(0)}
                    </Text>
                  </View>
                )}
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 13,
                    fontWeight:
                      impersonatedUser?.id === talent.id ? "600" : "500",
                    color:
                      impersonatedUser?.id === talent.id
                        ? colors.primary
                        : colors.text + "CC",
                    flex: 1,
                  }}
                >
                  {talent.full_name}
                </Text>
                {impersonatedUser?.id === talent.id && (
                  <SafeIcon
                    isIonicons={true}
                    name="checkmark-circle"
                    size={16}
                    color={colors.primary}
                  />
                )}
              </Hoverable>
            ))}
          </View>
        )}

        {/* Mon Compte fixé en bas */}
        <Hoverable
          onPress={() => router.push("/account")}
          hoverStyle={{
            backgroundColor: pathname.startsWith("/account")
              ? colors.primary + "20"
              : colors.backgroundSecondary,
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingVertical: 12,
            paddingHorizontal: 15,
            borderRadius: 8,
            gap: 12,
            backgroundColor: pathname.startsWith("/account")
              ? colors.primary + "10"
              : "transparent",
            marginTop: 10,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: 15,
          }}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: pathname.startsWith("/account")
                  ? colors.primary
                  : colors.border,
              }}
            />
          ) : (
            <SafeIcon
              isIonicons={false}
              name="user-circle"
              size={20}
              color={
                pathname.startsWith("/account") ? colors.primary : colors.text + "CC"
              }
            />
          )}
          {!effectiveCollapsed && (
            <Text
              style={{
                fontSize: 16,
                fontWeight: pathname.startsWith("/account") ? "600" : "500",
                color: pathname.startsWith("/account")
                  ? colors.primary
                  : colors.text + "CC",
              }}
            >
              Mon Compte
            </Text>
          )}
        </Hoverable>
      </ScrollView>

      <View
        style={[styles.footer, effectiveCollapsed && { alignItems: "center" }]}
      >
        {/* Switch Mode Studio - Toujours visible sur Web Large */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: effectiveCollapsed ? "center" : "space-between",
            paddingVertical: 12,
            paddingHorizontal: 15,
            backgroundColor:
              mode === "studio" ? colors.primary + "05" : "transparent",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: mode === "studio" ? colors.primary + "20" : colors.border,
            marginBottom: 10,
          }}
        >
          {!effectiveCollapsed && (
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: mode === "studio" ? colors.primary : colors.text + "CC",
              }}
            >
              MODE STUDIO
            </Text>
          )}
          <Switch
            value={mode === "studio"}
            onValueChange={(val) => setUserMode(val ? "studio" : "search")}
            trackColor={{ false: colors.border, true: colors.primary + "80" }}
            thumbColor={mode === "studio" ? colors.primary : colors.backgroundSecondary}
            // @ts-ignore
            style={
              Platform.OS === "web"
                ? {
                    transform: [{ scale: 0.8 }],
                  }
                : {}
            }
          />
        </View>

        {!effectiveCollapsed && (
          <Text style={styles.footerText}>© 2026 Tita</Text>
        )}
      </View>
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      width: 250,
      backgroundColor: colors.background,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      height: "100%",
      padding: 20,
      zIndex: 100,
    },
    header: {
      height: 140,
      marginBottom: 20,
      paddingHorizontal: 0,
      justifyContent: "center",
    },
    logo: {
      fontSize: 20,
      fontWeight: "900",
      color: colors.primary,
      letterSpacing: 1,
    },
    menu: {
      flex: 1,
      gap: 8,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderRadius: 8,
      gap: 12,
    },
    menuItemActive: {
      backgroundColor: colors.primary + "10",
    },
    menuText: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text + "CC",
    },
    menuTextActive: {
      color: colors.primary,
      fontWeight: "600",
    },
    footer: {
      marginTop: "auto",
      padding: 10,
    },
    footerText: {
      fontSize: 12,
      color: colors.text + "80",
    },
  });
}
