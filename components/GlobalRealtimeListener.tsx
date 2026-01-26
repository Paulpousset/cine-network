import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";

export default function GlobalRealtimeListener() {
  useEffect(() => {
    // Unique channel names
    const dmChannelId = `global_dm_listener_${Date.now()}`;
    const spacesChannelId = `global_spaces_listener_${Date.now()}`;
    let sessionUserId: string | null = null;

    // Get current user ID for checking self-messages
    supabase.auth.getSession().then(({ data: { session } }) => {
      sessionUserId = session?.user?.id || null;
    });
    
    // 1. Direct Messages Listener
    const dmChannel = supabase
      .channel(dmChannelId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
             const newMsg = payload.new;
             appEvents.emit(EVENTS.NEW_MESSAGE);
             
             // Show notification if it's an incoming message
             const isFromMe = sessionUserId && newMsg.sender_id === sessionUserId;
             console.log("GlobalRealtimeListener: New DM received", { 
               sender: newMsg.sender_id, 
               me: sessionUserId, 
               isFromMe 
             });

             if (sessionUserId && !isFromMe) {
               console.log("GlobalRealtimeListener: Triggering notification for DM");
               // Fetch sender details
               const { data: profile } = await supabase
                 .from("profiles")
                 .select("full_name")
                 .eq("id", newMsg.sender_id)
                 .single();
                 
               appEvents.emit(EVENTS.SHOW_NOTIFICATION, {
                 title: profile?.full_name || "Nouveau message",
                 body: newMsg.content,
                 link: `/direct-messages/${newMsg.sender_id}`
               });
             }
             
          } else if (payload.eventType === "UPDATE") {
             appEvents.emit(EVENTS.MESSAGES_READ);
             appEvents.emit(EVENTS.NEW_MESSAGE);
          }
        }
      )
      .subscribe();

    // 2. Spaces Messages Listener
    const spacesChannel = supabase
      .channel(spacesChannelId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_messages",
        },
        async (payload) => {
          const newMsg = payload.new;
          
          // Show notification if it's an incoming message
          if (sessionUserId && newMsg.sender_id !== sessionUserId) {
             // Fetch sender details
             const { data: profile } = await supabase
               .from("profiles")
               .select("full_name")
               .eq("id", newMsg.sender_id)
               .single();

             // Fetch Project Title for context (optional but nice)
             const { data: project } = await supabase
                .from("tournages")
                .select("title")
                .eq("id", newMsg.project_id)
                .single();
               
             appEvents.emit(EVENTS.SHOW_NOTIFICATION, {
               title: `${project?.title || "Projet"} • ${profile?.full_name || "Membre"}`,
               body: newMsg.content,
               // Link to specific space channel
               link: `/project/${newMsg.project_id}/spaces/${newMsg.category}?tab=chat`
             });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dmChannel);
      supabase.removeChannel(spacesChannel);
    };
  }, []);

  return null; // Headless component
}
