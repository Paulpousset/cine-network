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
    const inAccountPage = segments[0] === "account"; // Ajouter exception pour account page
    const inProfilePage = segments[0] === "profile"; // Ajouter exception pour profile/[id]

    console.log("Auth Check:", {
      hasSession: !!session,
      segments: segments,
      inTabsGroup,
    });

    // SCÉNARIO 1 : Pas connecté mais essaie d'aller ailleurs que la page de login
    if (
      !session &&
      (inTabsGroup || inProjectPage || inAccountPage || inProfilePage)
    ) {
      router.replace("/"); // Hop, retour à l'accueil
    }
    // SCÉNARIO 2 : Connecté mais encore sur la page de login (SAUF si on est sur project/[id] ou account)
    else if (
      session &&
      !inTabsGroup &&
      !inProjectPage &&
      !inAccountPage &&
      !inProfilePage
    ) {
      router.replace("/(tabs)/my-projects"); // Hop, direction le feed
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
      {/* 
        Si 'profile' est un dossier contenant [id].tsx sans _layout ni index, 
        il ne faut pas le déclarer comme screen ici, ou alors il faut qu'il ait un index.
        Expo Router gère souvent profile/[id] automatiquement si on ne le contraint pas.
        Mais pour éviter le warning, on peut cibler le fichier spécifique si on veut le styler ici,
        ou simplement laisser Expo Router faire.
        Cependant, dans votre cas, le warning dit 'No route named profile'.
        On va changer 'profile' par 'profile/[id]' pour matcher le fichier existant.
      */}
      <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
