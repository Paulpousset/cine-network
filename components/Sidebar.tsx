import Colors from "@/constants/Colors";
import { getStudioTools } from "@/constants/Tools";
import { useUserMode } from "@/hooks/useUserMode";
import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
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
import { Hoverable } from "./Hoverable";

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
  const { mode, setUserMode, isSidebarCollapsed, setSidebarCollapsed } =
    useUserMode();

  // Détection précise de l'ID du chat actuel
  const chatMatch = pathname.match(/\/direct-messages\/([^\/]+)/);
  const currentChatId = chatMatch ? chatMatch[1] : null;

  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [pendingConnections, setPendingConnections] = useState(0); // New state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      // 0. Fetch User Avatar
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .single();
      if (profile) setAvatarUrl(profile.avatar_url);

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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) return;
      const userId = session.user.id;

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
          : NAVIGATION_ITEMS;

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
            backgroundColor: isActive ? Colors.light.tint + "20" : "#f5f5f5",
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: isSidebarCollapsed ? "center" : "flex-start",
            padding: 12,
            borderRadius: 8,
            gap: isSidebarCollapsed ? 0 : 12,
            backgroundColor: isActive
              ? Colors.light.tint + "10"
              : "transparent",
          }}
        >
          <View style={{ position: "relative" }}>
            {(item as any).isIonicons ? (
              <Ionicons
                name={item.icon as any}
                size={20}
                color={isActive ? Colors.light.tint : "#666"}
              />
            ) : (
              <FontAwesome
                name={item.icon as any}
                size={20}
                color={isActive ? Colors.light.tint : "#666"}
              />
            )}
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
                  backgroundColor: Colors.light.tint,
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
                  backgroundColor: Colors.light.tint,
                  borderWidth: 2,
                  borderColor: "white",
                }}
              />
            )}
          </View>
          {!isSidebarCollapsed && (
            <>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: isActive ? "600" : "500",
                  color: isActive ? Colors.light.tint : "#666",
                  flex: 1,
                }}
              >
                {item.name}
              </Text>
              {isStudio && (item as any).shortcut && (
                <View
                  style={{
                    backgroundColor: "#f5f5f5",
                    borderRadius: 4,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderWidth: 1,
                    borderColor: "#ddd",
                    borderBottomWidth: 2,
                    marginLeft: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: "#999",
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
                    backgroundColor: "#eee",
                    borderRadius: 4,
                  }}
                  style={{
                    padding: 4,
                    paddingRight: 0,
                  }}
                >
                  <FontAwesome
                    name={expanded ? "chevron-down" : "chevron-right"}
                    size={12}
                    color="#999"
                  />
                </Hoverable>
              )}
            </>
          )}
        </Hoverable>

        {/* Sous-items Projets */}
        {isProjects &&
          expanded &&
          !isSidebarCollapsed &&
          recentProjects.length > 0 && (
            <View
              style={{
                marginLeft: 15,
                marginTop: 4,
                gap: 6,
                paddingRight: 5,
                borderLeftWidth: 2,
                borderLeftColor: isStudio ? Colors.light.tint + "40" : "#eee",
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
                        ? Colors.light.tint + "20"
                        : "#f5f5f5",
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: isStudio ? 10 : 7,
                      paddingHorizontal: 12,
                      backgroundColor: isSelected
                        ? Colors.light.tint + "15"
                        : "transparent",
                      borderRadius: 8,
                      gap: 10,
                      marginLeft: 5,
                    }}
                  >
                    <FontAwesome
                      name="film"
                      size={isStudio ? 14 : 12}
                      color={isSelected ? Colors.light.tint : "#888"}
                    />
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: isStudio ? 14 : 12,
                        color: isSelected ? Colors.light.tint : "#444",
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
          !isSidebarCollapsed &&
          recentChats.length > 0 && (
            <View
              style={{
                marginLeft: 20,
                marginTop: 4,
                gap: 4,
                paddingRight: 5,
                borderLeftWidth: 1,
                borderLeftColor: "#eee",
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
                        ? Colors.light.tint + "25"
                        : "#f0f0f0",
                    }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 7,
                      paddingHorizontal: 10,
                      backgroundColor: isSelected
                        ? Colors.light.tint + "15"
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
                          backgroundColor: "#ddd",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <FontAwesome name="user" size={8} color="#fff" />
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
                            backgroundColor: Colors.light.tint,
                            borderWidth: 1.5,
                            borderColor: "#fcfcfc",
                          }}
                        />
                      )}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 12,
                        color: isSelected ? Colors.light.tint : "#555",
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
                          backgroundColor: Colors.light.tint,
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
    width: isSidebarCollapsed ? 80 : 250,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#eee",
    height: "100%",
    padding: isSidebarCollapsed ? 12 : 20,
    paddingTop: 20,
    zIndex: 100,
    position: "fixed",
    left: 0,
    top: 0,
    transition: "width 0.2s ease-in-out, padding 0.2s ease-in-out",
  };

  return (
    <View style={sidebarStyle}>
      <View
        style={[
          styles.header,
          isSidebarCollapsed && { alignItems: "center", marginBottom: 20 },
        ]}
      >
        {isSidebarCollapsed ? (
          <Hoverable onPress={() => router.push("/")}>
            <Image
              source={require("@/assets/images/logo.jpg")}
              style={{ width: 50, height: 50 }}
              resizeMode="contain"
            />
          </Hoverable>
        ) : isStudio && isInsideProject && currentProjectTitle ? (
          <View>
            <Image
              source={require("@/assets/images/logo.jpg")}
              style={{ width: 180, height: 65, marginBottom: 10 }}
              resizeMode="contain"
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
              <FontAwesome
                name="exchange"
                size={10}
                color={Colors.light.tint}
              />
              <Text
                style={{
                  fontSize: 11,
                  color: Colors.light.tint,
                  fontWeight: "700",
                }}
              >
                CHANGER DE PROJET
              </Text>
            </Hoverable>
          </View>
        ) : (
          <View>
            <Image
              source={require("@/assets/images/logo.jpg")}
              style={{ width: 200, height: 70, marginBottom: 5 }}
              resizeMode="contain"
            />
            {mode === "studio" && (
              <View
                style={{
                  backgroundColor: Colors.light.tint,
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
            hoverStyle={{ backgroundColor: Colors.light.tint + "DD" }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: isSidebarCollapsed ? "center" : "flex-start",
              padding: isSidebarCollapsed ? 12 : 14,
              borderRadius: 12,
              gap: isSidebarCollapsed ? 0 : 12,
              backgroundColor: Colors.light.tint,
              marginBottom: 15,
            }}
          >
            <FontAwesome name="plus-circle" size={18} color="white" />
            {!isSidebarCollapsed && (
              <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                Nouveau Projet
              </Text>
            )}
          </Hoverable>
        )}

        {isInsideProject && mode !== "studio" && !isSidebarCollapsed && (
          <Hoverable
            onPress={() => router.push("/my-projects")}
            hoverStyle={{ backgroundColor: "#f5f5f5" }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              marginBottom: 10,
              gap: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#eee",
            }}
          >
            <FontAwesome name="arrow-left" size={16} color="#666" />
            <Text style={{ color: "#666", fontWeight: "600" }}>
              Tous mes projets
            </Text>
          </Hoverable>
        )}

        {isStudio && isInsideProject
          ? groupedStudioItems.map((group) => {
              const isExpanded = categoriesExpanded[group.id];
              return (
                <View key={group.id} style={{ marginBottom: 15 }}>
                  {!isSidebarCollapsed && (
                    <Hoverable
                      onPress={() =>
                        setCategoriesExpanded((prev) => ({
                          ...prev,
                          [group.id]: !isExpanded,
                        }))
                      }
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        gap: 10,
                      }}
                    >
                      <FontAwesome
                        name={group.icon as any}
                        size={14}
                        color="#999"
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "800",
                          color: "#999",
                          flex: 1,
                          letterSpacing: 1,
                        }}
                      >
                        {group.title}
                      </Text>
                      <FontAwesome
                        name={isExpanded ? "chevron-down" : "chevron-right"}
                        size={10}
                        color="#ccc"
                      />
                    </Hoverable>
                  )}
                  {(isExpanded || isSidebarCollapsed) && (
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
          : currentItems.map((item) => renderItem(item))}

        {/* Spacer pour pousser le lien Compte en bas */}
        <View style={{ flex: 1 }} />

        {/* Mon Compte fixé en bas */}
        <Hoverable
          onPress={() => router.push("/account")}
          hoverStyle={{
            backgroundColor: pathname.startsWith("/account")
              ? Colors.light.tint + "20"
              : "#f5f5f5",
          }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: isSidebarCollapsed ? "center" : "flex-start",
            padding: 12,
            borderRadius: 8,
            gap: isSidebarCollapsed ? 0 : 12,
            backgroundColor: pathname.startsWith("/account")
              ? Colors.light.tint + "10"
              : "transparent",
            marginTop: 10,
            borderTopWidth: 1,
            borderTopColor: "#eee",
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
                  ? Colors.light.tint
                  : "#eee",
              }}
            />
          ) : (
            <FontAwesome
              name="user-circle"
              size={20}
              color={
                pathname.startsWith("/account") ? Colors.light.tint : "#666"
              }
            />
          )}
          {!isSidebarCollapsed && (
            <Text
              style={{
                fontSize: 16,
                fontWeight: pathname.startsWith("/account") ? "600" : "500",
                color: pathname.startsWith("/account")
                  ? Colors.light.tint
                  : "#666",
              }}
            >
              Mon Compte
            </Text>
          )}
        </Hoverable>
      </ScrollView>

      <View
        style={[styles.footer, isSidebarCollapsed && { alignItems: "center" }]}
      >
        {/* Toggle Collapse/Expand Sidebar */}
        <Hoverable
          onPress={() => setSidebarCollapsed(!isSidebarCollapsed)}
          hoverStyle={{ backgroundColor: "#f5f5f5" }}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: isSidebarCollapsed ? "center" : "flex-start",
            padding: 10,
            borderRadius: 8,
            gap: 10,
            marginBottom: 10,
          }}
        >
          <Ionicons
            name={isSidebarCollapsed ? "chevron-forward" : "chevron-back"}
            size={20}
            color="#999"
          />
          {!isSidebarCollapsed && (
            <Text style={{ fontSize: 13, color: "#999", fontWeight: "600" }}>
              Réduire la barre
            </Text>
          )}
        </Hoverable>

        {/* Switch Mode Studio - Toujours visible sur Web Large */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: isSidebarCollapsed ? "center" : "space-between",
            padding: isSidebarCollapsed ? 12 : 12,
            backgroundColor:
              mode === "studio" ? Colors.light.tint + "05" : "transparent",
            borderRadius: 12,
            borderWidth: 1,
            borderColor: mode === "studio" ? Colors.light.tint + "20" : "#eee",
            marginBottom: 10,
          }}
        >
          {!isSidebarCollapsed && (
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: mode === "studio" ? Colors.light.tint : "#666",
              }}
            >
              MODE STUDIO
            </Text>
          )}
          <Switch
            value={mode === "studio"}
            onValueChange={(val) => setUserMode(val ? "studio" : "search")}
            trackColor={{ false: "#ccc", true: Colors.light.tint + "80" }}
            thumbColor={mode === "studio" ? Colors.light.tint : "#f4f3f4"}
            // @ts-ignore
            style={
              Platform.OS === "web"
                ? {
                    transform: isSidebarCollapsed ? "scale(0.8)" : "scale(0.8)",
                  }
                : {}
            }
          />
        </View>

        {!isSidebarCollapsed && (
          <Text style={styles.footerText}>© 2026 Tita</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 250,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#eee",
    height: "100%",
    padding: 20,
    zIndex: 100,
  },
  header: {
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  logo: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.light.tint,
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
    backgroundColor: Colors.light.tint + "10",
  },
  menuText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
  menuTextActive: {
    color: Colors.light.tint,
    fontWeight: "600",
  },
  footer: {
    marginTop: "auto",
    padding: 10,
  },
  footerText: {
    fontSize: 12,
    color: "#999",
  },
});
