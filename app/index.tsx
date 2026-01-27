import ClapLoading from "@/components/ClapLoading";
import { Hoverable } from "@/components/Hoverable";
import Colors from "@/constants/Colors"; // Import Colors
import { GlobalStyles } from "@/constants/Styles"; // Import GlobalStyles
import { JOB_TITLES } from "@/utils/roles";
import { Ionicons } from "@expo/vector-icons";
import { makeRedirectUri } from "expo-auth-session";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

WebBrowser.maybeCompleteAuthSession();

const ROLES = Object.keys(JOB_TITLES);

export default function AuthScreen() {
  // BASCULE : Par défaut on est sur l'écran de CONNEXION (true)
  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("acteur");
  const [loading, setLoading] = useState(false);

  // Fonction connexion
  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) Alert.alert("Erreur", error.message);
    // Pas besoin d'alert succès, si ça marche Supabase changera l'écran tout seul
    setLoading(false);
  }

  // Fonction inscription
  async function signUp() {
    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });

    if (error) Alert.alert("Erreur", error.message);
    else if (session)
      Alert.alert("Bienvenue !", `Compte créé en tant que ${role}`);

    setLoading(false);
  }

  // Fonction connexion Google
  async function signInWithGoogle() {
    setLoading(true);
    try {
      // Déterminer l'URL de redirection selon si on est sur Expo Go ou en natif
      const redirectTo = makeRedirectUri({
        scheme: "cinenetwork",
        preferLocalhost: true,
      });

      console.log("Redirect URI used:", redirectTo);

      // Sur le WEB, on laisse Supabase gérer la redirection normalement
      if (Platform.OS === "web") {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
            skipBrowserRedirect: false,
          },
        });
        if (error) throw error;
        return;
      }

      // Sur MOBILE (Expo Go ou Native)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // IMPORTANT: On utilise WebBrowser.openAuthSessionAsync pour capturer le retour
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

        console.log("WebBrowser Result:", res);

        if (res.type === "success" && res.url) {
          // Extraction des tokens
          const url = res.url.replace("#", "?");
          const { queryParams } = Linking.parse(url);

          const access_token =
            queryParams?.access_token || queryParams?.["#access_token"];
          const refresh_token = queryParams?.refresh_token;

          if (access_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: access_token as string,
              refresh_token: (refresh_token as string) || "",
            });
            if (sessionError) throw sessionError;
            console.log("Session set successfully via Google");
          }
        } else if (res.type === "cancel") {
          console.log("Login cancelled by user");
        }
      }
    } catch (error: any) {
      Alert.alert("Erreur Google", error.message);
      console.error("Google Auth Error:", error);
    } finally {
      if (Platform.OS !== "web") setLoading(false);
    }
  }

  // Fonction invité
  async function signInAsGuest() {
    setLoading(true);
    const { data, error } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          full_name: "Invité",
          avatar_url:
            "https://ui-avatars.com/api/?name=Invité&background=random&color=fff",
        },
      },
    });

    if (error) {
      Alert.alert(
        "Erreur",
        "La connexion invité n'est pas activée ou a échoué.",
      );
      console.error(error);
    } else if (data?.session) {
      // Force update profile just in case trigger didn't catch metadata
      await supabase
        .from("profiles")
        .update({
          full_name: "Invité",
          avatar_url:
            "https://ui-avatars.com/api/?name=Invité&background=random&color=fff",
        })
        .eq("id", data.session.user.id);
    }
    setLoading(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text
        style={[GlobalStyles.title1, { textAlign: "center", marginBottom: 30 }]}
      >
        {isLogin ? "Connexion 🎬" : "Rejoindre le Cast 📝"}
      </Text>

      {/* --- CHAMPS VISIBLES UNIQUEMENT SI INSCRIPTION --- */}
      {!isLogin && (
        <TextInput
          placeholder="Nom complet"
          value={fullName}
          onChangeText={setFullName}
          style={[GlobalStyles.input, styles.inputMargin]}
          placeholderTextColor="#9CA3AF"
        />
      )}

      {/* --- CHAMPS COMMUNS --- */}
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={[GlobalStyles.input, styles.inputMargin]}
        placeholderTextColor="#9CA3AF"
      />
      <TextInput
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={[GlobalStyles.input, styles.inputMargin]}
        placeholderTextColor="#9CA3AF"
      />

      {/* --- SÉLECTEUR DE RÔLE (UNIQUEMENT SI INSCRIPTION) --- */}
      {!isLogin && (
        <>
          <Text style={GlobalStyles.title2}>Je suis :</Text>
          <View style={styles.rolesContainer}>
            {ROLES.map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setRole(item)}
                style={[
                  styles.roleButton,
                  role === item && styles.roleButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.roleText,
                    role === item && styles.roleTextSelected,
                  ]}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <View style={styles.spacer} />

      {/* --- BOUTON D'ACTION PRINCIPAL --- */}
      {loading ? (
        <ClapLoading size={40} color={Colors.light.primary} />
      ) : (
        <Hoverable
          style={GlobalStyles.primaryButton}
          hoverStyle={{ opacity: 0.9, transform: [{ scale: 1.02 }] }}
          onPress={isLogin ? signIn : signUp}
        >
          <Text style={GlobalStyles.buttonText}>
            {isLogin ? "Se connecter" : "S'inscrire"}
          </Text>
        </Hoverable>
      )}

      {/* --- SEPARATOR --- */}
      <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>OU</Text>
        <View style={styles.divider} />
      </View>

      {/* --- BOUTON GOOGLE --- */}
      <TouchableOpacity
        style={styles.googleButton}
        onPress={signInWithGoogle}
        disabled={loading}
      >
        <Ionicons name="logo-google" size={20} color="#EA4335" />
        <Text style={styles.googleButtonText}>Continuer avec Google</Text>
      </TouchableOpacity>

      {/* --- BOUTON INVITE --- */}
      <TouchableOpacity
        style={[styles.googleButton, { marginTop: 10 }]}
        onPress={signInAsGuest}
        disabled={loading}
      >
        <Ionicons name="person-outline" size={20} color="#374151" />
        <Text style={styles.googleButtonText}>Continuer en tant qu'invité</Text>
      </TouchableOpacity>

      {/* --- BOUTON POUR CHANGER DE MODE --- */}
      <Hoverable
        onPress={() => setIsLogin(!isLogin)}
        style={styles.switchButton}
        hoverStyle={{ opacity: 0.6 }}
      >
        <Text style={styles.switchText}>
          {isLogin
            ? "Pas encore de compte ? Créer un profil"
            : "J'ai déjà un compte ? Me connecter"}
        </Text>
      </Hoverable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: Colors.light.background,
  },
  inputMargin: {
    marginBottom: 12,
  },
  spacer: { height: 20 },
  rolesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  roleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderRadius: 20, // Keep rounded for chips
    marginBottom: 5,
  },
  roleButtonSelected: { backgroundColor: Colors.light.primary },
  roleText: { color: Colors.light.primary },
  roleTextSelected: { color: "white", fontWeight: "bold" },

  // Style du lien en bas
  switchButton: { marginTop: 20, alignItems: "center" },
  switchText: { color: Colors.light.primary, fontWeight: "bold" },

  // Styles pour Google et Séparateur
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "600",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
});
