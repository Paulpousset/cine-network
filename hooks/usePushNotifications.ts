import { supabase } from "@/lib/supabase";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [notification, setNotification] = useState<
    Notifications.Notification | undefined
  >();
  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const router = useRouter();

  async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === "web") {
      return;
    }

    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") {
        console.log("Push: Failed to get push token for push notification!");
        if (Platform.OS === "ios" || Platform.OS === "android") {
          Alert.alert(
            "Notifications désactivées",
            "Pour recevoir des notifications, veuillez les activer dans les réglages de votre appareil.",
          );
        }
        return;
      }

      try {
        const projectId = "0104688d-5fc8-4c1c-8eed-82044da3a523"; // From app.json
        console.log("Push: Fetching Expo token for project", projectId);
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log("Push: Expo token obtained:", token);
      } catch (e) {
        console.error("Push: Error getting expo push token", e);
      }
    } else {
      console.log("Push: Must use physical device for Push Notifications");
    }

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    return token;
  }

  useEffect(() => {
    if (Platform.OS === "web") return;

    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        setExpoPushToken(token);
        console.log("Push: Attempting to save token to profile...");

        // Update Supabase profile
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          const { error } = await supabase
            .from("profiles")
            .update({ expo_push_token: token } as any)
            .eq("id", session.user.id);

          if (error) {
            console.error("Push: Error updating push token in profile:", error);
          } else {
            console.log(
              "Push: Token successfully saved to profile for user",
              session.user.id,
            );
          }
        } else {
          console.warn("Push: No session found, cannot save token to profile");
        }
      } else {
        console.warn("Push: No token generated, registration skipped");
      }
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Push: Notification received in foreground:", notification);
        setNotification(notification);
      });

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Push: Notification response received:", response);
        const data = response.notification.request.content.data;

        // Basic navigation logic based on notification data
        if (data?.url && typeof data.url === "string") {
          router.push(data.url as any);
        } else if (data?.type === "message" && data?.chatId) {
          router.push(`/direct-messages/${data.chatId}` as any);
        } else if (data?.type === "application") {
          router.push("/notifications" as any);
        }
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return { expoPushToken, notification };
}
