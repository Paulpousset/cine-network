import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "@supabase/supabase-js";
import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

const SEEN_ACCEPTED_KEY = "seen_accepted_connections";
const SETTINGS_KEY = "user_notification_preferences";

export default function GlobalRealtimeListener({ user }: { user: User }) {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const userRef = useRef(user);

  const getPreference = async (key: string) => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const prefs = JSON.parse(stored);
        return prefs[key] !== false; // Default to true if not set or explicitly true
      }
    } catch (e) {
      console.error("Error reading notification preferences", e);
    }
    return true; // Default to true
  };

  // Update refs when values change without re-triggering the main effect
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!user?.id) return;

    let dmChannel: any = null;
    let spacesChannel: any = null;
    let connectionsChannel: any = null;
    let applicationsChannel: any = null;
    let projectRolesChannel: any = null;
    let postsActivityChannel: any = null;
    let destroyed = false;

    const setupListeners = () => {
      if (destroyed) return;

      const userId = user.id; // Consistent ID for this effect instance
      // Unique channel names
      const dmChannelId = `global-dm-${user.id}`;
      const spacesChannelId = `global-spaces-${user.id}`;
      const connectionsChannelId = `global-connections-${user.id}`;
      const appsChannelId = `global-apps-${user.id}`;
      const rolesChannelId = `global-roles-${user.id}`;
      const activityChannelId = `global-activity-${user.id}`;

      // Clean up existing channels before creating new ones to avoid duplicates
      if (dmChannel) supabase.removeChannel(dmChannel);
      if (spacesChannel) supabase.removeChannel(spacesChannel);
      if (connectionsChannel) supabase.removeChannel(connectionsChannel);
      if (applicationsChannel) supabase.removeChannel(applicationsChannel);
      if (projectRolesChannel) supabase.removeChannel(projectRolesChannel);
      if (postsActivityChannel) supabase.removeChannel(postsActivityChannel);

      console.log("GlobalRealtimeListener: Starting listeners for", userId);

      // 1. Direct Messages Listener
      dmChannel = supabase
        .channel(dmChannelId)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "direct_messages",
          },
          async (payload) => {
            const msg = payload.new as any;
            if (!msg) return;

            const currentUser = userRef.current;
            const isFromMe = msg.sender_id === currentUser.id;
            const isToMe = msg.receiver_id === currentUser.id;

            if (!isFromMe && !isToMe) return;

            if (payload.eventType === "INSERT") {
              appEvents.emit(EVENTS.NEW_MESSAGE, msg);

              const isViewingThisChat =
                pathnameRef.current === `/direct-messages/${msg.sender_id}`;

              if (isToMe && !isViewingThisChat) {
                const isEnabled = await getPreference("messages");
                if (!isEnabled) return;

                const { data: profile } = await supabase
                  .from("profiles")
                  .select("full_name")
                  .eq("id", msg.sender_id)
                  .single();

                appEvents.emit(EVENTS.SHOW_NOTIFICATION, {
                  title: profile?.full_name || "Nouveau message",
                  body: msg.content,
                  link: `/direct-messages/${msg.sender_id}`,
                });
              }
            } else if (payload.eventType === "UPDATE") {
              appEvents.emit(EVENTS.MESSAGES_READ);
              appEvents.emit(EVENTS.NEW_MESSAGE, msg);
            }
          },
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (!destroyed) {
              setTimeout(setupListeners, 5000);
            }
          }
        });

      // 2. Spaces Messages Listener
      spacesChannel = supabase
        .channel(spacesChannelId)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "project_messages",
          },
          async (payload) => {
            const newMsg = payload.new as any;
            if (!newMsg) return;

            appEvents.emit(EVENTS.NEW_MESSAGE, newMsg);

            if (payload.eventType === "INSERT") {
              const currentUser = userRef.current;
              if (newMsg.sender_id !== currentUser.id) {
                const isViewingThisSpace = pathnameRef.current.includes(
                  `/project/${newMsg.project_id}/spaces/${newMsg.category}`,
                );
                if (isViewingThisSpace) return;

                const { data: project } = await supabase
                  .from("tournages")
                  .select("title, owner_id")
                  .eq("id", newMsg.project_id)
                  .single();

                if (!project) return;

                const isOwner = project.owner_id === currentUser.id;
                let isMember = isOwner;

                if (!isMember) {
                  const { data: role } = await supabase
                    .from("project_roles")
                    .select("id")
                    .eq("tournage_id", newMsg.project_id)
                    .eq("assigned_profile_id", currentUser.id)
                    .maybeSingle();
                  if (role) isMember = true;
                }

                if (!isMember) return;

                const isGlobalEnabled = await getPreference("project_messages");
                if (!isGlobalEnabled) return;

                // Check for per-space override
                const spaceKey = `notifications_space_${newMsg.project_id}_${newMsg.category}`;
                const spacePref = await AsyncStorage.getItem(spaceKey);
                if (spacePref === "false") return;

                const { data: profile } = await supabase
                  .from("profiles")
                  .select("full_name")
                  .eq("id", newMsg.sender_id)
                  .single();

                appEvents.emit(EVENTS.SHOW_NOTIFICATION, {
                  title: `${project?.title || "Projet"} • ${
                    profile?.full_name || "Membre"
                  }`,
                  body: newMsg.content,
                  link: `/project/${newMsg.project_id}/spaces/${newMsg.category}?tab=chat`,
                });
              }
            }
          },
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (!destroyed) {
              setTimeout(setupListeners, 5000);
            }
          }
        });

      // 3. Connections Listener
      connectionsChannel = supabase
        .channel(connectionsChannelId)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "connections",
          },
           async (payload) => {
            const rec = payload.new as any;
            if (!rec) return;

            const currentUser = userRef.current;
            if (rec.receiver_id === currentUser.id || rec.requester_id === currentUser.id) {
              appEvents.emit(EVENTS.CONNECTIONS_UPDATED);

              if (
                payload.eventType === "INSERT" &&
                rec.receiver_id === currentUser.id &&
                rec.status === "pending"
              ) {
                const isEnabled = await getPreference("connections");
                if (isEnabled) {
                  appEvents.emit(EVENTS.SHOW_NOTIFICATION, {
                    title: "Nouvelle demande de connexion",
                    body: "Quelqu'un souhaite rejoindre votre réseau",
                    link: "/notifications",
                  });
                }
              }
              else if (
                payload.eventType === "UPDATE" &&
                rec.requester_id === currentUser.id &&
                rec.status === "accepted"
              ) {
                const isEnabled = await getPreference("connections");
                if (isEnabled) {
                  appEvents.emit(EVENTS.SHOW_NOTIFICATION, {
                    title: "Demande acceptée",
                    body: "Vous avez une nouvelle connexion !",
                    link: "/notifications",
                  });
                }
              }
            }
          },
        )
        .subscribe();

      // 4. Applications Listener
      applicationsChannel = supabase
        .channel(appsChannelId)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "applications",
          },
          async (payload) => {
            const newApp = payload.new as any;
            if (!newApp) return;

            const currentUser = userRef.current;
            let candidateId = newApp.candidate_id;
            let appStatus = newApp.status;
            let roleId = newApp.role_id;

            if (candidateId === undefined || appStatus === undefined) {
              const { data: fullApp } = await supabase
                .from("applications")
                .select("candidate_id, status, role_id")
                .eq("id", newApp.id)
                .single();
              if (fullApp) {
                candidateId = fullApp.candidate_id;
                appStatus = fullApp.status;
                roleId = fullApp.role_id;
              }
            }

            if (candidateId !== currentUser.id) return;

            const isEnabled = await getPreference("applications");
            if (!isEnabled) return;

            let rTitle = "un rôle";
            let pTitle = "un projet";

            if (roleId) {
              const { data: role } = await supabase
                .from("project_roles")
                .select("title, tournage:tournages(title)")
                .eq("id", roleId)
                .single();

              if (role) {
                rTitle = role.title;
                if ((role as any).tournage) {
                  pTitle = (role as any).tournage.title;
                }
              }
            }

            if (appStatus === "accepted") {
              appEvents.emit(EVENTS.SHOW_NOTIFICATION, {
                title: "Candidature acceptée !",
                body: `Félicitations, vous avez été retenu pour le rôle "${rTitle}" sur le projet "${pTitle}" !`,
                link: "/notifications",
              });
            } else if (appStatus === "rejected") {
              appEvents.emit(EVENTS.SHOW_NOTIFICATION, {
                title: "Information Candidature",
                body: `Votre candidature pour le rôle "${rTitle}" sur le projet "${pTitle}" n'a pas été retenue.`,
                link: "/notifications",
              });
            }
          },
        )
        .subscribe();

      // 5. Project Roles Listener
      projectRolesChannel = supabase
        .channel(rolesChannelId)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "project_roles",
          },
          async (payload) => {
            const newRole = payload.new as any;
            if (!newRole) return;

            const currentUser = userRef.current;
            let assignedProfileId = newRole.assigned_profile_id;
            let currentStatus = newRole.status;
            let roleTitle = newRole.title;
            let tournageId = newRole.tournage_id;

            if (
              assignedProfileId === undefined ||
              currentStatus === undefined
            ) {
              const { data: fullRole } = await supabase
                .from("project_roles")
                .select("assigned_profile_id, status, title, tournage_id")
                .eq("id", newRole.id)
                .single();
              if (fullRole) {
                assignedProfileId = fullRole.assigned_profile_id;
                currentStatus = fullRole.status;
                roleTitle = fullRole.title;
                tournageId = fullRole.tournage_id;
              }
            }

            if (assignedProfileId !== currentUser.id) return;

            if (
              currentStatus !== "invitation_pending" &&
              currentStatus !== "assigned"
            ) {
              return;
            }

            const seenJson = await AsyncStorage.getItem(SEEN_ACCEPTED_KEY);
            const seenIds = seenJson ? JSON.parse(seenJson) : [];
            if (seenIds.includes(newRole.id)) return;

            const isInvitation = currentStatus === "invitation_pending";
            const prefKey = isInvitation ? "project_invitations" : "applications"; // "assigned" is like an application update
            const isEnabled = await getPreference(prefKey);
            if (!isEnabled) return;

            appEvents.emit(EVENTS.CONNECTIONS_UPDATED);

            let projectTitle = "un projet";
            if (tournageId) {
              const { data: proj } = await supabase
                .from("tournages")
                .select("title")
                .eq("id", tournageId)
                .single();
              if (proj) projectTitle = proj.title;
            }

            appEvents.emit(EVENTS.SHOW_NOTIFICATION, {
              title: isInvitation ? "Nouvelle Invitation !" : "Poste Assigné !",
              body: isInvitation
                ? `On vous propose le rôle "${roleTitle}" sur le projet "${projectTitle}".`
                : `Vous avez été ajouté au projet "${projectTitle}" pour le rôle "${roleTitle}".`,
              link: "/notifications",
            });
          },
        )
        .subscribe();

      // 6. Posts Activity Listener (Likes & Comments)
      postsActivityChannel = supabase
        .channel(activityChannelId)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "post_likes" },
          async (payload) => {
            const like = payload.new as any;
            if (!like || like.user_id === userId) return;

            // Check if post belongs to me
            const { data: post } = await supabase
              .from("posts")
              .select("user_id")
              .eq("id", like.post_id)
              .single();

            if (post?.user_id === userId) {
              const isEnabled = await getPreference("likes");
              if (!isEnabled) return;

              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", like.user_id)
                .single();

              appEvents.emit(EVENTS.SHOW_NOTIFICATION, {
                title: "Nouveau j'aime",
                body: `${profile?.full_name || "Quelqu'un"} a aimé votre publication.`,
                link: "/notifications",
              });
              appEvents.emit(EVENTS.CONNECTIONS_UPDATED);
            }
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "post_comments" },
          async (payload) => {
            const comment = payload.new as any;
            if (!comment || comment.user_id === userId) return;

            // Check if post belongs to me
            const { data: post } = await supabase
              .from("posts")
              .select("user_id")
              .eq("id", comment.post_id)
              .single();

            if (post?.user_id === userId) {
              const isEnabled = await getPreference("comments");
              if (!isEnabled) return;

              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", comment.user_id)
                .single();

              appEvents.emit(EVENTS.SHOW_NOTIFICATION, {
                title: "Nouveau commentaire",
                body: `${profile?.full_name || "Quelqu'un"} a commenté votre publication.`,
                link: "/notifications",
              });
              appEvents.emit(EVENTS.CONNECTIONS_UPDATED);
            }
          },
        )
        .subscribe();
    };

    // On Web, wait a bit before starting to ensure session is fully propagated
    if (Platform.OS === "web") {
      setTimeout(setupListeners, 1500);
    } else {
      setupListeners();
    }

    return () => {
      console.log("GlobalRealtimeListener: Removing listeners");
      if (dmChannel) supabase.removeChannel(dmChannel);
      if (spacesChannel) supabase.removeChannel(spacesChannel);
      if (connectionsChannel) supabase.removeChannel(connectionsChannel);
      if (applicationsChannel) supabase.removeChannel(applicationsChannel);
      if (projectRolesChannel) supabase.removeChannel(projectRolesChannel);
      if (postsActivityChannel) supabase.removeChannel(postsActivityChannel);
    };
  }, [user.id]); // ONLY re-run if user ID changes (e.g. login/logout)

  return null; // Headless component
}
