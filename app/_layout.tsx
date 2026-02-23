import FilmStripTransition from "@/components/common/FilmStripTransition";
import { TutorialOverlay } from "@/components/common/TutorialOverlay";

import { AppInitializer } from "@/components/layout/AppInitializer";
import { Shell } from "@/components/layout/Shell";
import ClapLoading from "@/components/ui/ClapLoading";
import { appEvents, EVENTS } from "@/lib/events";
import { AppProviders } from "@/providers/AppProviders";
import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";
import { usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Platform, Text, TouchableOpacity, View } from "react-native";

export default function RootLayout() {
  return (
    <AppProviders>
      <AppInitializer>
        <RootLayoutInner />
      </AppInitializer>
    </AppProviders>
  );
}

function RootLayoutInner() {
  const { colors, isDark } = useTheme();
  const { isLoading: userLoading } = useUser();
  const [isMobileWeb, setIsMobileWeb] = useState(false);
  const [showFilmTransition, setShowFilmTransition] = useState(false);
  const [filmTransitionTarget, setFilmTransitionTarget] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const pathname = usePathname() as string;
  const router = useRouter();

  useEffect(() => {
    if (!userLoading) {
      setHasInitialized(true);
    }
  }, [userLoading]);

  // Film Strip Transition Logic
  useEffect(() => {
    let fallbackTimer: ReturnType<typeof setTimeout>;
    const unsubTransition = appEvents.on(EVENTS.START_FILM_TRANSITION, (data) => {
      setFilmTransitionTarget(data?.target || "/auth");
      setShowFilmTransition(true);

      if (fallbackTimer) clearTimeout(fallbackTimer);
      fallbackTimer = setTimeout(() => {
        setShowFilmTransition(false);
      }, 4000);
    });

    return () => {
      unsubTransition();
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

  // Web Mobile Guard Logic
  useEffect(() => {
    if (Platform.OS === "web") {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      if (/android|iPad|iPhone|iPod/i.test(userAgent) && !pathname.startsWith("/update-password")) {
        setIsMobileWeb(true);
        const hasRedirected = sessionStorage.getItem("deepLinkRedirected");
        if (!hasRedirected) {
          sessionStorage.setItem("deepLinkRedirected", "true");
          const deepLink = `tita://${pathname.startsWith("/") ? pathname.slice(1) : pathname}${window.location.search}`;
          window.location.href = deepLink;
        }
      }
    }
  }, [pathname]);

  if (!hasInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ClapLoading size={50} color={colors.primary} />
      </View>
    );
  }

  if (isMobileWeb) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: colors.background }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20, textAlign: "center", color: colors.text }}>Tita Mobile</Text>
        <Text style={{ fontSize: 16, textAlign: "center", marginBottom: 40, color: isDark ? "#9CA3AF" : "#666", lineHeight: 24 }}>
          L'expérience web n'est pas disponible sur mobile. Veuillez utiliser notre application dédiée pour une meilleure expérience.
        </Text>
        <TouchableOpacity
          onPress={() => {
            const deepLink = `tita://${pathname.startsWith("/") ? pathname.slice(1) : pathname}${window.location.search}`;
            window.location.href = deepLink;
          }}
          style={{ backgroundColor: colors.primary, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25, marginBottom: 20 }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Ouvrir l'application</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Shell />
      <FilmStripTransition
        isVisible={showFilmTransition}
        onScreenCovered={onFilmScreenCovered}
        onAnimationComplete={onFilmAnimationComplete}
      />
      <TutorialOverlay />
    </>
  );
}

