import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "@supabase/supabase-js";
import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

const SEEN_ACCEPTED_KEY = "seen_accepted_connections";

export default function GlobalRealtimeListener({ user }: { user: User }) {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  // Update ref when pathname changes without re-triggering the main effect
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!user) return;

    let dmChannel: any = null;
    let spacesChannel: any = null;
    let connectionsChannel: any = null;
    let applicationsChannel: any = null;
    let projectRolesChannel: any = null;

    const setupListeners = () => {
      // Unique channel names
      const dmChannelId = `global-dm-${user.id}`;
      const spacesChannelId = `global-spaces-${user.id}`;
      const connectionsChannelId = `global-connections-${user.id}`;
      const appsChannelId = `global-apps-${user.id}`;
      const rolesChannelId = `global-roles-${user.id}`;

      // Clean up existing channels before creating new ones to avoid duplicates
      if (dmChannel) supabase.removeChannel(dmChannel);
      if (spacesChannel) supabase.removeChannel(spacesChannel);
      if (connectionsChannel) supabase.removeChannel(connectionsChannel);
      if (applicationsChannel) supabase.removeChannel(applicationsChannel);
      if (projectRolesChannel) supabase.removeChannel(projectRolesChannel);

      console.log("GlobalRealtimeListener: Starting listeners for", user.id);

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
            console.log(
              "GlobalRealtimeListener: DM event",
              payload.eventType,
              msg?.id,
            );
            if (!msg) return;

            // Only care about messages I sent or received
            const isFromMe = msg.sender_id === user.id;
            const isToMe = msg.receiver_id === user.id;

            if (!isFromMe && !isToMe) return;

            if (payload.eventType === "INSERT") {
              // Emit event with message data for smart updates
              appEvents.emit(EVENTS.NEW_MESSAGE, msg);

              // Show notification only if it is an incoming message meant specifically for me
              // AND I am not currently viewing this specific chat
              const isViewingThisChat =
                pathnameRef.current === `/direct-messages/${msg.sender_id}`;

              if (isToMe && !isViewingThisChat) {
                console.log(
                  "GlobalRealtimeListener: Showing notification for DM",
                );
                // Fetch sender details
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
              // Also trigger update for lists
              appEvents.emit(EVENTS.NEW_MESSAGE, msg);
            }
          },
        )
        .subscribe((status) => {
          console.log(
            `GlobalRealtimeListener: DM Subscription status: ${status}`,
          );
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn(
              `GlobalRealtimeListener: DM Channel ${status}, recreating...`,
            );
            // Retry logic for ALL platforms
            setTimeout(() => {
              setupListeners();
            }, 5000);
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
            console.log(
              "GlobalRealtimeListener: Space event",
              payload.eventType,
              newMsg?.id,
            );
            if (!newMsg) return;

            // Always trigger NEW_MESSAGE event so UI indicators can update (sidebar dots, etc.)
            appEvents.emit(EVENTS.NEW_MESSAGE, newMsg);

            if (payload.eventType === "INSERT") {
              // Show notification if it is an incoming message and not from me
              if (newMsg.sender_id !== user.id) {
                // Check if we are already viewing this space to avoid double notifications
                const isViewingThisSpace = pathnameRef.current.includes(
                  `/project/${newMsg.project_id}/spaces/${newMsg.category}`,
                );
                if (isViewingThisSpace) return;

                // Fetch Project Title & Owner for context and security check
                const { data: project } = await supabase
                  .from("tournages")
                  .select("title, owner_id")
                  .eq("id", newMsg.project_id)
                  .single();

                // If project is not found or not accessible, do not show notification
                if (!project) return;

                // Extra verification: am I the owner or a member of this project?
                const isOwner = project.owner_id === user.id;
                let isMember = isOwner;

                if (!isMember) {
                  const { data: role } = await supabase
                    .from("project_roles")
                    .select("id")
                    .eq("tournage_id", newMsg.project_id)
                    .eq("assigned_profile_id", user.id)
                    .maybeSingle();
                  if (role) isMember = true;
                }

                if (!isMember) return;

                // Fetch sender details
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
          console.log(
            `GlobalRealtimeListener: Spaces Subscription status: ${status}`,
          );
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn(
              `GlobalRealtimeListener: Spaces Channel ${status}, recreating...`,
            );
            // Retry logic for ALL platforms
            setTimeout(() => {
              setupListeners();
            }, 5000);
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
          (payload) => {
            const rec = payload.new as any;
            if (!rec) return;

            // Check if it concerns me
            if (rec.receiver_id === user.id || rec.requester_id === user.id) {
              console.log(
                "GlobalRealtimeListener: Connection update",
                payload.eventType,
              );
              appEvents.emit(EVENTS.CONNECTIONS_UPDATED);

              // If I received a NEW request
              if (
                payload.eventType === "INSERT" &&
                rec.receiver_id === user.id &&
                rec.status === "pending"
              ) {
                appEvents.emit(EVENTS.SHOW_NOTIFICATION, {
                  title: "Nouvelle demande de connexion",
                  body: "Quelqu'un souhaite rejoindre votre réseau",
                  link: "/notifications",
                });
              }
              // If my request was ACCEPTED
              else if (
                payload.eventType === "UPDATE" &&
                rec.requester_id === user.id &&
                rec.status === "accepted"
              ) {
                appEvents.emit(EVENTS.SHOW_NOTIFICATION, {
                  title: "Demande acceptée",
                  body: "Vous avez une nouvelle connexion !",
                  link: "/notifications",
                });
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
            filter: `candidate_id=eq.${user.id}`,
          },
          async (payload) => {
            const newApp = payload.new as any;
            if (newApp.status === "accepted") {
              // Check if already seen locally to avoid repeat toasts
              const seenJson = await AsyncStorage.getItem(SEEN_ACCEPTED_KEY);
              const seenIds = seenJson ? JSON.parse(seenJson) : [];
              if (seenIds.includes(newApp.id)) return;

              appEvents.emit(EVENTS.CONNECTIONS_UPDATED); // Refresh notifications
              appEvents.emit(EVENTS.SHOW_NOTIFICATION, {
                title: "Candidature acceptée !",
                body: "Félicitations, vous avez rejoint un projet !",
                link: "/notifications",
              });
            }
          },
        )
        .subscribe();

      // 5. Project Roles Listener (Direct assignments)
      projectRolesChannel = supabase
        .channel(rolesChannelId)
        .on(
          "postgres_changes",
          {
            event: "UPDATE", // Roles are often pre-created and then assigned
            schema: "public",
            table: "project_roles",
            filter: `assigned_profile_id=eq.${user.id}`,
          },
          async (payload) => {
            const newRole = payload.new as any;
            if (!newRole) return;

            // Check if already seen locally to avoid repeat toasts
            const seenJson = await AsyncStorage.getItem(SEEN_ACCEPTED_KEY);
            const seenIds = seenJson ? JSON.parse(seenJson) : [];
            if (seenIds.includes(newRole.id)) return;

            appEvents.emit(EVENTS.CONNECTIONS_UPDATED);

            // Trigger popup
            appEvents.emit(EVENTS.SHOW_NOTIFICATION, {
              title: "Nouveau Rôle !",
              body: "Vous avez été ajouté à un projet.",
              link: "/notifications",
            });
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
    };
  }, [user.id]); // ONLY re-run if user ID changes (e.g. login/logout)

  return null; // Headless component
}
