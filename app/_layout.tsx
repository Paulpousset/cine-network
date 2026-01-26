import ClapLoading from "@/components/ClapLoading";
import Sidebar from "@/components/Sidebar";
import { Session } from "@supabase/supabase-js";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { Platform, useWindowDimensions, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);

  const { width } = useWindowDimensions();
  const isWebLarge = Platform.OS === "web" && width >= 768;
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // 1. Écouter l'état de l'authentification (Connexion / Déconnexion)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setInitialized(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;

    // Définir la page de login comme étant la racine
    // On utilise pathname pour éviter les soucis avec segments vide lors des transitions
    const inLoginPage = pathname === "/" || pathname === "";

    console.log("Auth Check:", {
      hasSession: !!session,
      pathname,
      segments,
      inLoginPage,
    });

    // SCÉNARIO 1 : Pas connecté mais essaie d'aller ailleurs que la page de login
    if (!session && !inLoginPage) {
      router.replace("/"); // Hop, retour à l'accueil
    }
    // SCÉNARIO 2 : Connecté mais encore sur la page de login
    else if (session && inLoginPage) {
      router.replace("/my-projects"); // Hop, direction mes projets
    }
  }, [session, initialized, pathname]);

  // Petit écran de chargement au lancement de l'app
  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ClapLoading size={50} color="#841584" />
      </View>
    );
  }

  // Hide sidebar on landing/login page
  const showSidebar = isWebLarge && session && pathname !== "/";

  return (
    <View style={{ flex: 1, flexDirection: isWebLarge ? "row" : "column" }}>
      {showSidebar ? <Sidebar /> : null}
      <View
        style={{
          flex: 1,
          paddingLeft: showSidebar ? 250 : 0,
        }}
      >
        <Stack
          screenOptions={{
            // On web, we often want to hide the nested stack headers to let the browser or a custom web nav manage it
            headerShown: Platform.OS !== "web",
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="project" options={{ headerShown: false }} />
          <Stack.Screen name="network" options={{ headerShown: false }} />
          <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
        </Stack>
      </View>
    </View>
  );
}
