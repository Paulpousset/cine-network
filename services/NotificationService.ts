import { supabase } from "@/lib/supabase";

export interface PushNotificationPayload {
  to: string;
  title: string;
  body: string;
  data?: any;
  sound?: "default" | null;
  badge?: number;
}

export const NotificationService = {
  /**
   * Sends a push notification via Expo Push API
   */
  sendPushNotification: async (payload: PushNotificationPayload) => {
    try {
      console.log(
        "NotificationService: Sending push notification to",
        payload.to,
      );
      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          sound: payload.sound || "default",
        }),
      });

      const data = await response.json();
      console.log("NotificationService: Expo response", data);
      return data;
    } catch (error) {
      console.error(
        "NotificationService: Error sending push notification",
        error,
      );
      return null;
    }
  },

  /**
   * Sends a push notification for a project message
   */
  sendProjectMessageNotification: async (params: {
    projectId: string;
    senderName?: string;
    category: string;
    content: string;
    senderId: string;
  }) => {
    try {
      let finalSenderName = params.senderName;

      // 1. Fetch sender name if not provided
      if (!finalSenderName) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", params.senderId)
          .single();
        finalSenderName = profile?.full_name || "Quelqu'un";
      }

      // 2. Fetch project title
      const { data: project } = await supabase
        .from("tournages")
        .select("title, user_id")
        .eq("id", params.projectId)
        .single();

      if (!project) return;

      // 2. Fetch all assigned members of the project or custom space members
      const recipientIds = new Set<string>();

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.category);
      if (isUUID) {
          // Custom Space: Notify only members + project owner
          const { data: customMembers } = await supabase.from("project_custom_space_members" as any)
            .select("profile_id")
            .eq("space_id", params.category);
          
          if (customMembers) {
              customMembers.forEach(m => recipientIds.add(m.profile_id));
          }
          // Always notify project owner (stored in tournages.owner_id)
          const { data: projOwner } = await supabase.from("tournages").select("owner_id").eq("id", params.projectId).single();
          if (projOwner) recipientIds.add(projOwner.owner_id);
      } else {
        // Standard category: Notify only people in that category OR manually added
        const { data: roleMembers } = await supabase
            .from("project_roles")
            .select("assigned_profile_id")
            .eq("tournage_id", params.projectId)
            .eq("category", params.category)
            .not("assigned_profile_id", "is", null);

        if (roleMembers) {
            roleMembers.forEach(m => {
                if (m.assigned_profile_id) recipientIds.add(m.assigned_profile_id);
            });
        }

        const { data: manualMembers } = await supabase
            .from("project_native_space_members" as any)
            .select("profile_id")
            .eq("project_id", params.projectId)
            .eq("category", params.category);
        
        if (manualMembers) {
            manualMembers.forEach(m => recipientIds.add(m.profile_id));
        }

        // Also always notify project owner
        const { data: projOwner } = await supabase.from("tournages").select("owner_id").eq("id", params.projectId).single();
        if (projOwner) recipientIds.add(projOwner.owner_id);
      }

      // Remove sender from recipients
      recipientIds.delete(params.senderId);

      if (recipientIds.size === 0) return;

      // 3. Fetch push tokens for all recipients
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, expo_push_token")
        .in("id", Array.from(recipientIds))
        .not("expo_push_token", "is", null);

      if (!profiles || profiles.length === 0) return;

      // 4. Send notifications
      let categoryLabel = params.category;
      if (isUUID) {
          const { data: space } = await supabase.from("project_custom_spaces" as any).select("name").eq("id", params.category).single();
          if (space) categoryLabel = space.name;
      }
      categoryLabel = categoryLabel.charAt(0).toUpperCase() + categoryLabel.slice(1);

      for (const profile of profiles) {
        if (profile.expo_push_token) {
          NotificationService.sendPushNotification({
            to: profile.expo_push_token,
            title: `${project.title} - ${categoryLabel}`,
            body: `${finalSenderName}: ${params.content.substring(0, 100)}`,
            data: {
              type: "project_message",
              projectId: params.projectId,
              category: params.category,
              url: `/project/${params.projectId}/spaces/${params.category}`,
            },
          });
        }
      }
    } catch (e) {
      console.error("Error sending project message notifications", e);
    }
  },

  /**
   * Sends a push notification specifically for a direct message
   */
  sendDirectMessageNotification: async (params: {
    receiverId: string;
    senderName: string;
    content: string;
    chatId: string;
  }) => {
    return NotificationService.sendGenericNotification({
      receiverId: params.receiverId,
      title: params.senderName,
      body: params.content,
      data: {
        type: "message",
        chatId: params.chatId,
        url: `/direct-messages/${params.chatId}`,
      },
    });
  },

  /**
   * Notification for a new connection request
   */
  sendConnectionRequestNotification: async (params: {
    receiverId: string;
    requesterName: string;
  }) => {
    return NotificationService.sendGenericNotification({
      receiverId: params.receiverId,
      title: "Nouvelle demande de connexion",
      body: `${params.requesterName} souhaite rejoindre votre réseau.`,
      data: {
        type: "connection_request",
        url: "/notifications",
      },
    });
  },

  /**
   * Notification for an accepted connection request
   */
  sendConnectionAcceptedNotification: async (params: {
    receiverId: string;
    accepterName: string;
  }) => {
    return NotificationService.sendGenericNotification({
      receiverId: params.receiverId,
      title: "Demande de connexion acceptée",
      body: `${params.accepterName} a accepté votre demande de connexion !`,
      data: {
        type: "connection_accepted",
        url: "/notifications",
      },
    });
  },

  /**
   * Notification for a project role invitation
   */
  sendRoleInvitationNotification: async (params: {
    receiverId: string;
    projectTitle: string;
    roleTitle: string;
  }) => {
    return NotificationService.sendGenericNotification({
      receiverId: params.receiverId,
      title: "Nouvelle Invitation !",
      body: `On vous propose le rôle "${params.roleTitle}" sur le projet "${params.projectTitle}".`,
      data: {
        type: "role_invitation",
        url: "/notifications",
      },
    });
  },

  /**
   * Notification for a new job application (to project owner)
   */
  sendNewApplicationNotification: async (params: {
    ownerId: string;
    candidateName: string;
    roleTitle: string;
    projectId: string;
  }) => {
    return NotificationService.sendGenericNotification({
      receiverId: params.ownerId,
      title: "Nouvelle candidature",
      body: `${params.candidateName} a postulé pour le rôle "${params.roleTitle}".`,
      data: {
        type: "new_application",
        projectId: params.projectId,
        url: `/project/${params.projectId}`,
      },
    });
  },

  /**
   * Notification for an application result
   */
  sendApplicationResultNotification: async (params: {
    candidateId: string;
    roleTitle: string;
    projectTitle: string;
    status: "accepted" | "rejected";
  }) => {
    const isAccepted = params.status === "accepted";
    return NotificationService.sendGenericNotification({
      receiverId: params.candidateId,
      title: isAccepted ? "Candidature acceptée !" : "Information Candidature",
      body: isAccepted
        ? `Félicitations, vous avez été retenu pour le rôle "${params.roleTitle}" sur le projet "${params.projectTitle}" !`
        : `Votre candidature pour le rôle "${params.roleTitle}" sur le projet "${params.projectTitle}" n'a pas été retenue.`,
      data: {
        type: "application_result",
        url: "/notifications",
      },
    });
  },

  /**
   * Sends a push notification fetchning the recipient's token automatically
   */
  sendGenericNotification: async (params: {
    receiverId: string;
    title: string;
    body: string;
    data?: any;
  }) => {
    try {
      // 1. Fetch recipient's push token
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("expo_push_token")
        .eq("id", params.receiverId)
        .single();

      if (error || !profile?.expo_push_token) {
        console.log(
          "NotificationService: Recipient has no push token, skipping",
          params.receiverId,
        );
        return;
      }

      // 2. Send the notification
      return await NotificationService.sendPushNotification({
        to: profile.expo_push_token,
        title: params.title,
        body: params.body,
        data: params.data,
      });
    } catch (error) {
      console.error(
        "NotificationService: Error in sendGenericNotification",
        error,
      );
    }
  },
};
