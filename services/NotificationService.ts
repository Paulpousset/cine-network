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
