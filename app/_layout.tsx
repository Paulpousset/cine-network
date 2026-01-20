import { Session } from "@supabase/supabase-js";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);

  const segments = useSegments();
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

    // Vérifier si l'utilisateur est dans le groupe de routes (tabs)
    const inTabsGroup = segments[0] === "(tabs)";
    const inProjectPage = segments[0] === "project"; // Ajouter exception pour project/[id]

    console.log("Auth Check:", {
      hasSession: !!session,
      segments: segments,
      inTabsGroup,
    });

    // SCÉNARIO 1 : Pas connecté mais essaie d'aller ailleurs que la page de login
    if (!session && inTabsGroup) {
      router.replace("/"); // Hop, retour à l'accueil
    }
    // SCÉNARIO 2 : Connecté mais encore sur la page de login (SAUF si on est sur project/[id])
    else if (session && !inTabsGroup && !inProjectPage) {
      router.replace("/(tabs)/tournage"); // Hop, direction le feed
    }
  }, [session, initialized, segments]);

  // Petit écran de chargement au lancement de l'app
  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#841584" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="project" options={{ headerShown: false }} />
    </Stack>
  );
}
