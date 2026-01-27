import Colors from "@/constants/Colors";
import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  AppState,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

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

  // Détection précise de l'ID du chat actuel
  const chatMatch = pathname.match(/\/direct-messages\/([^\/]+)/);
  const currentChatId = chatMatch ? chatMatch[1] : null;

  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [pendingConnections, setPendingConnections] = useState(0); // New state
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const [chatsExpanded, setChatsExpanded] = useState(false);

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

  useEffect(() => {
    fetchRecentData();

    // S'abonner aux changements pour mettre à jour les points rouges en temps réel
    // MOVED TO GLOBAL LISTENER (GlobalRealtimeListener.tsx)
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
      subscription.remove();
    };
  }, []);

  async function fetchRecentData() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      // 1. Projets Récents (on exclut ceux du Hall of Fame / complétés)
      const { data: projects } = await supabase
        .from("tournages")
        .select("id, title")
        .eq("owner_id", userId)
        .neq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(4);
      setRecentProjects(projects || []);

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
        .select("owner_id")
        .eq("id", projectId)
        .maybeSingle();

      if (project && project.owner_id === userId) {
        setIsOwner(true);
        setIsMember(true);
      } else {
        const { data: membership } = await supabase
          .from("project_roles")
          .select("id")
          .eq("tournage_id", projectId)
          .eq("assigned_profile_id", userId)
          .limit(1);

        if (membership && membership.length > 0) {
          setIsMember(true);
        }
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
    {
      name: "Logistique",
      icon: "truck",
      href: `/project/${projectId}/logistics`,
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

  const currentItems = isInsideProject ? PROJECT_ITEMS : NAVIGATION_ITEMS;

  const sidebarStyle: any = {
    width: 250,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: "#eee",
    height: "100%",
    padding: 20,
    zIndex: 100,
    position: "fixed",
    left: 0,
    top: 0,
  };

  return (
    <View style={sidebarStyle}>
      <View style={styles.header}>
        <Text style={styles.logo}>
          {isInsideProject ? "PROJET" : "CINE TITA"}
        </Text>
      </View>

      <View style={styles.menu}>
        {isInsideProject && (
          <TouchableOpacity
            onPress={() => router.push("/my-projects")}
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
          </TouchableOpacity>
        )}

        {currentItems.map((item) => {
          // Pour les projets, on vérifie l'égalité exacte ou le préfixe
          const isActive = isInsideProject
            ? pathname === item.href
            : pathname.startsWith(item.href);

          const isProjects = item.name === "Mes Projets";
          const isChats = item.name === "Messages";
          const expanded = isProjects
            ? projectsExpanded
            : isChats
              ? chatsExpanded
              : false;

          const toggleExpand = (e: any) => {
            e.stopPropagation();
            if (isProjects) setProjectsExpanded(!projectsExpanded);
            if (isChats) setChatsExpanded(!chatsExpanded);
          };

          return (
            <View key={item.href}>
              <TouchableOpacity
                onPress={() => router.push(item.href as any)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 8,
                  gap: 12,
                  backgroundColor: isActive
                    ? Colors.light.tint + "10"
                    : "transparent",
                }}
              >
                <View style={{ position: "relative" }}>
                  <FontAwesome
                    name={item.icon as any}
                    size={20}
                    color={isActive ? Colors.light.tint : "#666"}
                  />
                  {/* Badge Chat */}
                  {isChats && !chatsExpanded && totalUnread > 0 && (
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
                {(isProjects || isChats) && (
                  <TouchableOpacity
                    onPress={toggleExpand}
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
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Sous-items Projets */}
              {isProjects && projectsExpanded && recentProjects.length > 0 && (
                <View
                  style={{
                    marginLeft: 35,
                    marginTop: 4,
                    gap: 4,
                    paddingRight: 5,
                  }}
                >
                  {recentProjects.map((p) => {
                    const isSelected = pathname.includes(`/project/${p.id}`);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => router.push(`/project/${p.id}`)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 7,
                          paddingHorizontal: 10,
                          backgroundColor: isSelected
                            ? Colors.light.tint + "15"
                            : "#fcfcfc",
                          borderRadius: 6,
                          gap: 8,
                          borderLeftWidth: 3,
                          borderLeftColor: isSelected
                            ? Colors.light.tint
                            : "transparent",
                        }}
                      >
                        <FontAwesome
                          name="film"
                          size={10}
                          color={isSelected ? Colors.light.tint : "#999"}
                        />
                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 12,
                            color: isSelected ? Colors.light.tint : "#555",
                            fontWeight: isSelected ? "700" : "500",
                            flex: 1,
                          }}
                        >
                          {p.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Sous-items Chats */}
              {isChats && chatsExpanded && recentChats.length > 0 && (
                <View
                  style={{
                    marginLeft: 35,
                    marginTop: 4,
                    gap: 4,
                    paddingRight: 5,
                  }}
                >
                  {recentChats.map((c) => {
                    // Comparaison plus robuste de l'ID
                    const isSelected = currentChatId === c.id;
                    // Force à 0 si on est déjà sur la discussion pour éviter le lag d'affichage
                    const displayUnreadCount = isSelected
                      ? 0
                      : c.unreadCount || 0;

                    return (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() =>
                          router.push({
                            pathname: "/direct-messages/[id]",
                            params: { id: c.id },
                          })
                        }
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 7,
                          paddingHorizontal: 10,
                          backgroundColor: isSelected
                            ? Colors.light.tint + "15"
                            : "#fcfcfc",
                          borderRadius: 6,
                          gap: 8,
                          borderLeftWidth: 3,
                          borderLeftColor: isSelected
                            ? Colors.light.tint
                            : "transparent",
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
                              isSelected || displayUnreadCount > 0
                                ? "700"
                                : "500",
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
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}

        {/* Spacer pour pousser le lien Compte en bas */}
        <View style={{ flex: 1 }} />

        {/* Mon Compte fixé en bas */}
        <TouchableOpacity
          onPress={() => router.push("/account")}
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 12,
            borderRadius: 8,
            gap: 12,
            backgroundColor: pathname.startsWith("/account")
              ? Colors.light.tint + "10"
              : "transparent",
            marginTop: 10,
            borderTopWidth: 1,
            borderTopColor: "#eee",
            paddingTop: 15,
          }}
        >
          <FontAwesome
            name="user-circle"
            size={20}
            color={pathname.startsWith("/account") ? Colors.light.tint : "#666"}
          />
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
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2026 Cine Network</Text>
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
