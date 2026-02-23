import { useEffect, useCallback, useState } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { useRouter, usePathname, useSegments } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/providers/UserProvider";
import { appEvents, EVENTS } from "@/lib/events";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import analytics from "@react-native-firebase/analytics";
import crashlytics from "@react-native-firebase/crashlytics";

export function AppInitializer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() as string;
  const segments = useSegments();
  const {
    session,
    isLoading: userLoading,
    isProfileComplete,
    isGuest,
    refreshProfile,
  } = useUser();

  // Initialize push notifications
  usePushNotifications();

  // Profile update event listener
  useEffect(() => {
    const unsubProfile = appEvents.on(EVENTS.PROFILE_UPDATED, () => {
      refreshProfile();
    });
    return () => unsubProfile();
  }, [refreshProfile]);

  // Deep Linking & Auth Listeners
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { queryParams } = Linking.parse(event.url.replace("#", "?"));
      const access_token = queryParams?.access_token || queryParams?.["#access_token"];
      const refresh_token = queryParams?.refresh_token;
      const code = queryParams?.code;

      if (access_token) {
        supabase.auth.setSession({
          access_token: access_token as string,
          refresh_token: (refresh_token as string) || "",
        });
      } else if (code) {
        supabase.auth.exchangeCodeForSession(code as string);
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.push("/update-password");
      }
    });

    return () => {
      subscription.remove();
      authSubscription.unsubscribe();
    };
  }, [router]);

  // Firebase Analytics & Crashlytics
  useEffect(() => {
    if (Platform.OS !== "web") {
      try {
        crashlytics().log("App started on " + Platform.OS);
        analytics().logAppOpen();
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      try {
        analytics().logScreenView({ screen_name: pathname, screen_class: pathname });
      } catch (e) {}
    }
  }, [pathname]);

  // Auth Routing Guard
  useEffect(() => {
    if (userLoading) return;

    const isPublicPage =
      pathname === "/" ||
      pathname === "/auth" ||
      pathname === "" ||
      pathname === "/complete-profile" ||
      pathname === "/charte-confidentialite" ||
      pathname === "/protection-mineurs" ||
      pathname.startsWith("/update-password");

    if (!session && !isPublicPage) {
      router.replace("/");
    } else if (session) {
      if (isProfileComplete === false && !isGuest && pathname !== "/complete-profile" && !pathname.startsWith("/update-password")) {
        router.replace("/complete-profile");
      } else if ((isProfileComplete === true || isGuest) && (pathname === "/auth" || pathname === "/" || (pathname === "/complete-profile" && isGuest))) {
        router.replace("/my-projects");
      }
    }
  }, [session, userLoading, pathname, isProfileComplete, isGuest, router]);

  return <>{children}</>;
}
