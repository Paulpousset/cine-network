import ErrorBoundary from "@/app/components/ErrorBoundary";
import ClapLoading from "@/components/ClapLoading";
import FilmStripTransition from "@/components/FilmStripTransition";
import FloatingChatWidget from "@/components/FloatingChatWidget";
import GlobalRealtimeListener from "@/components/GlobalRealtimeListener";
import ImpersonationHUD from "@/components/ImpersonationHUD";
import NotificationToast from "@/components/NotificationToast";
import Sidebar from "@/components/Sidebar";
import { TutorialOverlay } from "@/components/TutorialOverlay";
import { appEvents, EVENTS } from "@/lib/events";
import { TutorialProvider } from "@/providers/TutorialProvider";
import { UserModeProvider } from "@/providers/UserModeProvider";
import { UserProvider, useUser } from "@/providers/UserProvider";
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
import { SafeAreaProvider } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";

import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useUserMode } from "@/hooks/useUserMode";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import analytics from "@react-native-firebase/analytics";
import crashlytics from "@react-native-firebase/crashlytics";

function RootLayoutContent({
  session,
  isProfileComplete,
  isWebLarge,
  pathname,
}: {
  session: Session | null;
  isProfileComplete: boolean | null;
  isWebLarge: boolean;
  pathname: string;
}) {
  const { isSidebarCollapsed } = useUserMode();
  const { colors } = useTheme();

  // Initialize push notifications on mobile/tablet
  usePushNotifications();

  // Hide sidebar on landing/login/complete-profile and update-password pages
  const showSidebar =
    isWebLarge &&
    session &&
    isProfileComplete &&
    pathname !== "/" &&
    pathname !== "/auth" &&
    pathname !== "/complete-profile" &&
    pathname !== "/update-password";

  const sidebarWidth = isSidebarCollapsed ? 80 : 250;

  return (
    <View style={{ flex: 1, flexDirection: isWebLarge ? "row" : "column" }}>
      {session && isProfileComplete && (
        <GlobalRealtimeListener user={session.user} />
      )}
      {showSidebar ? <Sidebar /> : null}
      <View
        style={{
          flex: 1,
          paddingLeft: showSidebar ? sidebarWidth : 0,
        }}
      >
        <ImpersonationHUD />
        <Stack
          screenOptions={{
            // On web, we often want to hide the nested stack headers to let the browser or a custom web nav manage it
            headerShown: Platform.OS !== "web",
            headerStyle: {
              backgroundColor: colors.background,
            },
            headerTitleStyle: {
              color: colors.text,
            },
            headerTintColor: colors.tint,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen
            name="complete-profile"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="charte-confidentialite"
            options={{ headerShown: true, title: "Confidentialité" }}
          />
          <Stack.Screen
             name="settings"
             options={{ headerShown: true, title: "Réglages" }}
          />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="direct-messages"
            options={{
              headerShown: Platform.OS !== "web",
              title: "Messages",
              headerTintColor: colors.tint,
              headerBackTitle: "Retour",
            }}
          />
          <Stack.Screen name="project" options={{ headerShown: false }} />
          <Stack.Screen name="locations" options={{ headerShown: false }} />
          <Stack.Screen name="network" options={{ headerShown: false }} />
          <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="hall-of-fame" options={{ headerShown: false }} />
          <Stack.Screen name="my-awards" options={{ headerShown: false }} />
        </Stack>
      </View>
      <NotificationToast />
      {session &&
        isProfileComplete &&
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
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider>
          <UserProvider>
            <UserModeProvider>
              <TutorialProvider>
                <RootLayoutInner />
              </TutorialProvider>
            </UserModeProvider>
          </UserProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

function RootLayoutInner() {
  const { colors, isDark } = useTheme();
  const {
    session,
    isLoading: userLoading,
    isProfileComplete,
    refreshProfile,
  } = useUser();
  const [isMobileWeb, setIsMobileWeb] = useState(false);
  const [showFilmTransition, setShowFilmTransition] = useState(false);
  const [filmTransitionTarget, setFilmTransitionTarget] = useState<
    string | null
  >(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (!userLoading) {
      setHasInitialized(true);
    }
  }, [userLoading]);

  const { width } = useWindowDimensions();
  const isWebLarge = Platform.OS === "web" && width >= 768;
  const segments = useSegments();
  const pathname = usePathname() as string;
  const router = useRouter();

  useEffect(() => {
    let fallbackTimer: ReturnType<typeof setTimeout>;
    const unsubTransition = appEvents.on(
      EVENTS.START_FILM_TRANSITION,
      (data) => {
        setFilmTransitionTarget(data?.target || "/auth");
        setShowFilmTransition(true);

        if (fallbackTimer) clearTimeout(fallbackTimer);
        fallbackTimer = setTimeout(() => {
          setShowFilmTransition(false);
        }, 4000);
      },
    );

    const unsubProfile = appEvents.on(EVENTS.PROFILE_UPDATED, () => {
      refreshProfile();
    });

    return () => {
      unsubTransition();
      unsubProfile();
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [refreshProfile]);

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

    // Vérifier si l'app a été ouverte via un lien au démarrage
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    // 2. Écouter uniquement les événements spécifiques de navigation
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        router.push("/update-password");
      }
    });

    return () => {
      subscription.remove();
      authSubscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (userLoading) return;

    // Définir les pages publiques (accessible sans connexion)
    const isPublicPage =
      pathname === "/" ||
      pathname === "/auth" ||
      pathname === "" ||
      pathname === "/complete-profile" ||
      pathname === "/charte-confidentialite" ||
      pathname === "/protection-mineurs" ||
      pathname.startsWith("/update-password");

    console.log("Auth Check:", {
      hasSession: !!session,
      pathname,
      segments,
      isPublicPage,
      isProfileComplete,
    });

    // SCÉNARIO 1 : Pas connecté mais essaie d'aller ailleurs qu'une page publique
    if (!session && !isPublicPage) {
      router.replace("/"); // Retour à la page vitrine
    }
    // SCÉNARIO 2 : Connecté
    else if (session) {
      // Si le profil n'est pas complet et qu'on n'est pas déjà sur la page de complétion
      // On autorise quand même la page de reset password
      if (
        isProfileComplete === false &&
        pathname !== "/complete-profile" &&
        !pathname.startsWith("/update-password")
      ) {
        router.replace("/complete-profile");
      }
      // Si le profil est complet (ou en cours de vérification) et qu'on est sur une page de login/vitrine/complétion
      else if (
        isProfileComplete === true &&
        (pathname === "/auth" ||
          pathname === "/" ||
          pathname === "/complete-profile")
      ) {
        router.replace("/my-projects"); // Direction le dashboard
      }
    }
  }, [session, userLoading, pathname, isProfileComplete]);

  // 3. Bloquer l'accès web sur mobile
  useEffect(() => {
    if (Platform.OS === "web") {
      const userAgent =
        navigator.userAgent || navigator.vendor || (window as any).opera;
      // Détection basique mobile - On ne redirige pas si on est sur la page de reset password
      if (
        /android|iPad|iPhone|iPod/i.test(userAgent) &&
        !pathname.startsWith("/update-password")
      ) {
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
  if (!hasInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ClapLoading size={50} color={colors.primary} />
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
          backgroundColor: colors.background,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            marginBottom: 20,
            textAlign: "center",
            color: colors.text,
          }}
        >
          Tita Mobile
        </Text>
        <Text
          style={{
            fontSize: 16,
            textAlign: "center",
            marginBottom: 40,
            color: isDark ? "#9CA3AF" : "#666",
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
            backgroundColor: colors.primary,
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
    <>
      <RootLayoutContent
        session={session}
        isProfileComplete={isProfileComplete}
        isWebLarge={isWebLarge}
        pathname={pathname}
      />
      <FilmStripTransition
        isVisible={showFilmTransition}
        onScreenCovered={onFilmScreenCovered}
        onAnimationComplete={onFilmAnimationComplete}
      />
      <TutorialOverlay />
    </>
  );
}
