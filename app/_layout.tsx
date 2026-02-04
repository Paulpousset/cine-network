import ErrorBoundary from "@/app/components/ErrorBoundary";
import ClapLoading from "@/components/ClapLoading";
import FilmStripTransition from "@/components/FilmStripTransition";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import GlobalRealtimeListener from "@/components/GlobalRealtimeListener";
import NotificationToast from "@/components/NotificationToast";
import Sidebar from "@/components/Sidebar";
import Colors from "@/constants/Colors";
import { appEvents, EVENTS } from "@/lib/events";
import { UserModeProvider } from "@/providers/UserModeProvider";
import { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    Platform,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

import { useUserMode } from "@/hooks/useUserMode";
import analytics from "@react-native-firebase/analytics";
import crashlytics from "@react-native-firebase/crashlytics";

function RootLayoutContent({
  session,
  isWebLarge,
  pathname,
}: {
  session: Session | null;
  isWebLarge: boolean;
  pathname: string;
}) {
  const { isSidebarCollapsed } = useUserMode();

  // Hide sidebar on landing/login page and update-password page
  const showSidebar =
    isWebLarge &&
    session &&
    pathname !== "/" &&
    pathname !== "/update-password";

  const sidebarWidth = isSidebarCollapsed ? 80 : 250;

  return (
    <View style={{ flex: 1, flexDirection: isWebLarge ? "row" : "column" }}>
      {session && <GlobalRealtimeListener user={session.user} />}
      {showSidebar ? <Sidebar /> : null}
      <View
        style={{
          flex: 1,
          paddingLeft: showSidebar ? sidebarWidth : 0,
        }}
      >
        <Stack
          screenOptions={{
            // On web, we often want to hide the nested stack headers to let the browser or a custom web nav manage it
            headerShown: Platform.OS !== "web",
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="project" options={{ headerShown: false }} />
          <Stack.Screen name="network" options={{ headerShown: false }} />
          <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="hall-of-fame" options={{ headerShown: false }} />
          <Stack.Screen name="my-awards" options={{ headerShown: false }} />
        </Stack>
      </View>
      <NotificationToast />
      {session &&
        isWebLarge &&
        !pathname.includes("direct-messages") &&
        !pathname.includes("spaces") &&
        !pathname.includes("update-password") && (
          <FloatingChatWidget userId={session.user.id} />
        )}
    </View>
  );
}

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [isMobileWeb, setIsMobileWeb] = useState(false);
  const [showFilmTransition, setShowFilmTransition] = useState(false);
  const [filmTransitionTarget, setFilmTransitionTarget] = useState<
    string | null
  >(null);

  const { width } = useWindowDimensions();
  const isWebLarge = Platform.OS === "web" && width >= 768;
  const segments = useSegments();
  const pathname = usePathname() as string;
  const router = useRouter();

  useEffect(() => {
    let fallbackTimer: NodeJS.Timeout;
    const unsub = appEvents.on(EVENTS.START_FILM_TRANSITION, (data) => {
      setFilmTransitionTarget(data?.target || "/auth");
      setShowFilmTransition(true);

      if (fallbackTimer) clearTimeout(fallbackTimer);
      fallbackTimer = setTimeout(() => {
        setShowFilmTransition(false);
      }, 4000);
    });
    return () => {
      unsub();
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, []);

  const onFilmScreenCovered = useCallback(() => {
    if (filmTransitionTarget) {
      router.push(filmTransitionTarget as any);
    }
  }, [filmTransitionTarget, router]);

  const onFilmAnimationComplete = useCallback(() => {
    setShowFilmTransition(false);
    setFilmTransitionTarget(null);
  }, []);

  useEffect(() => {
    // Log pour confirmer la connexion à Crashlytics dans le Dashboard Firebase
    if (Platform.OS !== "web") {
      try {
        crashlytics().log("App started on " + Platform.OS);
        analytics().logAppOpen();
      } catch (e) {
        console.warn("Firebase native module not initialized yet:", e);
      }
      // crashlytics().recordError(new Error("Test: Connectivité Dashboard"));
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      try {
        analytics().logScreenView({
          screen_name: pathname,
          screen_class: pathname,
        });
      } catch (e) {
        // Silently fail if analytics is not available
      }
    }
  }, [pathname]);

  useEffect(() => {
    // 1. Gérer les liens profonds (Deep Linking) pour l'auth
    const handleDeepLink = (event: { url: string }) => {
      const { queryParams } = Linking.parse(event.url.replace("#", "?"));
      const access_token =
        queryParams?.access_token || queryParams?.["#access_token"];
      const refresh_token = queryParams?.refresh_token;

      if (access_token) {
        supabase.auth.setSession({
          access_token: access_token as string,
          refresh_token: (refresh_token as string) || "",
        });
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Vérifier si l'app a été ouverte via un lien au démarrage
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // 2. Écouter l'état de l'authentification (Connexion / Déconnexion)
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setInitialized(true);
    });

    return () => {
      subscription.remove();
      authSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;

    // Définir les pages publiques (accessible sans connexion)
    const isPublicPage =
      pathname === "/" ||
      pathname === "/auth" ||
      pathname === "" ||
      pathname === "/update-password";

    console.log("Auth Check:", {
      hasSession: !!session,
      pathname,
      segments,
      isPublicPage,
    });

    // SCÉNARIO 1 : Pas connecté mais essaie d'aller ailleurs qu'une page publique
    if (!session && !isPublicPage) {
      router.replace("/"); // Retour à la page vitrine
    }
    // SCÉNARIO 2 : Connecté mais essaie d'aller sur la page de login ou la vitrine
    else if (session && (pathname === "/auth" || pathname === "/")) {
      router.replace("/my-projects"); // Direction le dashboard
    }
  }, [session, initialized, pathname]);

  // 3. Bloquer l'accès web sur mobile
  useEffect(() => {
    if (Platform.OS === "web") {
      const userAgent =
        navigator.userAgent || navigator.vendor || (window as any).opera;
      // Détection basique mobile
      if (/android|iPad|iPhone|iPod/i.test(userAgent)) {
        setIsMobileWeb(true);
        // Tentative de redirection automatique
        const hasRedirected = sessionStorage.getItem("deepLinkRedirected");
        if (!hasRedirected) {
          sessionStorage.setItem("deepLinkRedirected", "true");
          const cleanPath = pathname.startsWith("/")
            ? pathname.slice(1)
            : pathname;
          const deepLink = `tita://${cleanPath}${window.location.search}`;

          console.log("[DeepLink] Attempting redirect to app:", deepLink);
          window.location.href = deepLink;
        }
      }
    }
  }, [pathname]);

  // Petit écran de chargement au lancement de l'app
  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ClapLoading size={50} color={Colors.light.primary} />
      </View>
    );
  }

  // Si on est sur mobile web, on affiche l'écran de blocage
  if (isMobileWeb) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
          backgroundColor: "#fff",
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          Tita Mobile
        </Text>
        <Text
          style={{
            fontSize: 16,
            textAlign: "center",
            marginBottom: 40,
            color: "#666",
            lineHeight: 24,
          }}
        >
          L'expérience web n'est pas disponible sur mobile. Veuillez utiliser
          notre application dédiée pour une meilleure expérience.
        </Text>

        <TouchableOpacity
          onPress={() => {
            const cleanPath = pathname.startsWith("/")
              ? pathname.slice(1)
              : pathname;
            const deepLink = `tita://${cleanPath}${window.location.search}`;
            window.location.href = deepLink;
          }}
          style={{
            backgroundColor: Colors.light.primary,
            paddingHorizontal: 30,
            paddingVertical: 15,
            borderRadius: 25,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
            Ouvrir l'application
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <UserModeProvider>
        <RootLayoutContent
          session={session}
          isWebLarge={isWebLarge}
          pathname={pathname}
        />
        <FilmStripTransition
          isVisible={showFilmTransition}
          onScreenCovered={onFilmScreenCovered}
          onAnimationComplete={onFilmAnimationComplete}
        />
      </UserModeProvider>
    </ErrorBoundary>
  );
}
