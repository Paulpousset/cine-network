import ClapLoading from "@/components/ClapLoading";
import { Hoverable } from "@/components/Hoverable";
import Colors from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { makeRedirectUri } from "expo-auth-session";
import { LinearGradient } from "expo-linear-gradient";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Image,
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

const ROLES = [
  "realisateur",
  "acteur",
  "production",
  "technique_image",
  "technique_son",
  "maquillage",
  "costume",
  "post_production",
  "scenariste",
  "compositeur",
  "cascadeur",
  "vfx",
  "photographe",
  "autre",
];

const DB_ROLE_MAPPING: Record<string, string> = {
  realisateur: "realisateur",
  acteur: "acteur",
  production: "production",
  technique_image: "image",
  technique_son: "son",
  maquillage: "hmc",
  costume: "hmc",
  post_production: "post_prod",
  scenariste: "realisateur",
  compositeur: "son",
  cascadeur: "acteur",
  vfx: "post_prod",
  photographe: "image",
  autre: "technicien",
};

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("acteur");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  async function resendConfirmation() {
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    setLoading(true);
    const redirectTo = makeRedirectUri({
      scheme: "tita",
    });
    console.log(
      "Resending confirmation to:",
      cleanEmail,
      "with redirect:",
      redirectTo,
    );

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert(
        "Erreur",
        "Impossible de renvoyer l'email : " + error.message,
      );
    } else {
      Alert.alert(
        "Email renvoyé",
        "Un nouvel email de confirmation a été envoyé. Pensez à vérifier vos spams !",
      );
    }
  }

  async function resetPassword() {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      Alert.alert("Erreur", "Veuillez entrer votre email.");
      return;
    }

    setLoading(true);
    setFormError("");
    setSuccessMessage("");

    const redirectTo =
      Platform.OS === "web"
        ? `${window.location.origin}/update-password`
        : makeRedirectUri({
            scheme: "tita",
            path: "update-password",
          });

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      setFormError(error.message);
      Alert.alert("Erreur", error.message);
    } else {
      const msg = "Un email de réinitialisation a été envoyé.";
      setSuccessMessage(msg);
      Alert.alert("Succès", msg);
      // Optional: switch back to login after success
      // setIsReset(false);
      // setIsLogin(true);
    }
  }

  async function signIn() {
    setLoading(true);
    setSuccessMessage("");
    setFormError("");
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFormError("Veuillez entrer votre email.");
      Alert.alert("Erreur", "Veuillez entrer votre email.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) {
      console.error("Sign In Error:", error);
      if (error.message.includes("Email not confirmed")) {
        setFormError("Email non confirmé. Vérifiez vos spams.");
        Alert.alert(
          "Email non confirmé",
          "Veuillez vérifier votre boîte de réception (et vos spams).",
          [
            { text: "Annuler", style: "cancel" },
            { text: "Renvoyer l'email", onPress: resendConfirmation },
          ],
        );
      } else if (error.message.includes("Invalid login credentials")) {
        setFormError("Identifiants incorrects ou email non validé.");
        Alert.alert(
          "Problème de connexion",
          "Identifiants incorrects ou email non validé.\n\nSi vous venez de créer votre compte, vérifiez vos emails pour le valider.",
          [
            { text: "Ok", style: "cancel" },
            { text: "Renvoyer l' email", onPress: resendConfirmation },
          ],
        );
      } else {
        setFormError(error.message);
        Alert.alert("Erreur de connexion", error.message);
      }
    }
    setLoading(false);
  }

  async function signUp() {
    setFormError("");
    setSuccessMessage("");

    if (!email || !password || !fullName) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Erreur", "Veuillez entrer une adresse email valide.");
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        "Erreur",
        "Le mot de passe doit contenir au moins 6 caractères.",
      );
      return;
    }

    setLoading(true);

    // Retour à la configuration automatique pour éviter le blocage de l'envoi
    const redirectTo = makeRedirectUri({
      scheme: "tita",
    });

    try {
      console.log("Calling supabase.auth.signUp with:", email, role);
      const {
        data: { session, user },
        error,
      } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            full_name: fullName,
            role: DB_ROLE_MAPPING[role] || "technicien",
          },
        },
      });

      console.log("Supabase response:", { session, user, error });

      if (error) {
        console.error("Signup Error Object:", error);
        if (error.message.includes("rate limit")) {
          Alert.alert(
            "Trop de tentatives",
            "Veuillez patienter un moment avant de réessayer (limite de sécurité atteinte).",
          );
        } else if (
          error.message.includes("User already registered") ||
          error.message.includes("already registered")
        ) {
          Alert.alert(
            "Compte existant",
            "Cette adresse email est déjà liée à un compte.\nVeuillez vous connecter.",
            [
              {
                text: "Se connecter",
                onPress: () => setIsLogin(true),
              },
            ],
          );
        } else {
          Alert.alert("Erreur Inscription", error.message);
        }
      } else if (!session && user) {
        const msg =
          "Un email de validation vous a été envoyé. Veuillez vérifier votre boîte mail (et vos spams) pour confirmer votre compte.";
        Alert.alert("Inscription réussie !", msg);
        setSuccessMessage(msg);
        setIsLogin(true); // Switch back to login
      } else if (session) {
        Alert.alert("Bienvenue !", `Compte créé en tant que ${role}`);
      }
    } catch (err: any) {
      console.error("Unexpected Signup Error:", err);
      Alert.alert(
        "Erreur Inattendue",
        err.message || "Une erreur technique est survenue",
      );
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setLoading(true);
    try {
      const redirectTo = makeRedirectUri({
        scheme: "tita",
      });

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

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (res.type === "success" && res.url) {
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
          }
        }
      }
    } catch (error: any) {
      Alert.alert("Erreur Google", error.message);
    } finally {
      if (Platform.OS !== "web") setLoading(false);
    }
  }

  async function signInAsGuest() {
    setLoading(true);
    setFormError("");
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
      Alert.alert("Erreur", "La connexion invité n'est pas activée.");
    } else if (data?.session) {
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

  // --- Render content based on mode ---

  const titleText = isReset
    ? "Mot de passe"
    : isLogin
      ? "Connexion"
      : "Rejoindre";
  const subtitleText = isReset
    ? "Entrez votre email pour réinitialiser."
    : isLogin
      ? "Heureux de vous revoir sur Tita"
      : "Créez votre compte et rejoignez le cast";

  const buttonAction = isReset ? resetPassword : isLogin ? signIn : signUp;
  const buttonText = isReset
    ? "Envoyer le lien"
    : isLogin
      ? "Se connecter"
      : "S'inscrire";

  return (
    <LinearGradient
      colors={[Colors.light.tint, "#2c1a4d"]} // Gradient violet/foncé
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.background}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.headerContainer}>
            <Image
              source={require("@/assets/images/logo.jpg")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={styles.title}>{titleText}</Text>
            <Text style={styles.subtitle}>{subtitleText}</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {successMessage ? (
              <View
                style={{
                  backgroundColor: "#e8f5e9",
                  padding: 10,
                  borderRadius: 8,
                  marginBottom: 15,
                  borderWidth: 1,
                  borderColor: "#c8e6c9",
                }}
              >
                <Text
                  style={{
                    color: "#2e7d32",
                    fontSize: 14,
                    textAlign: "center",
                  }}
                >
                  {successMessage}
                </Text>
              </View>
            ) : null}

            {formError ? (
              <Text style={styles.errorText}>{formError}</Text>
            ) : null}

            {!isLogin && !isReset && (
              <View style={styles.inputWrapper}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#666"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Nom complet"
                  value={fullName}
                  onChangeText={setFullName}
                  style={styles.input}
                  placeholderTextColor="#999"
                />
              </View>
            )}

            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.input}
                placeholderTextColor="#999"
              />
            </View>

            {!isReset && (
              <View>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#666"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Mot de passe"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    style={styles.input}
                    placeholderTextColor="#999"
                  />
                </View>
                {isLogin && (
                  <TouchableOpacity
                    onPress={() => {
                      setIsReset(true);
                      setSuccessMessage("");
                      setFormError("");
                    }}
                    style={{ alignSelf: "flex-end", marginBottom: 15 }}
                  >
                    <Text
                      style={{
                        color: Colors.light.tint,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      Mot de passe oublié ?
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!isLogin && !isReset && (
              <View style={styles.rolesSection}>
                <Text style={styles.roleTitle}>Je suis :</Text>
                <View style={styles.rolesContainer}>
                  {ROLES.map((item) => (
                    <TouchableOpacity
                      key={item}
                      onPress={() => setRole(item)}
                      style={[
                        styles.roleChip,
                        role === item && styles.roleChipSelected,
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
              </View>
            )}

            <View style={{ height: 20 }} />

            {loading ? (
              <ClapLoading size={40} color={Colors.light.tint} />
            ) : (
              <Hoverable
                style={styles.primaryButton}
                hoverStyle={{
                  opacity: 0.9,
                  transform: [{ scale: 1.02 }],
                  shadowOpacity: 0.4,
                }}
                onPress={buttonAction}
              >
                <Text style={styles.primaryButtonText}>{buttonText}</Text>
              </Hoverable>
            )}
          </View>

          {!isReset ? (
            <>
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OU</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtons}>
                <Hoverable
                  style={styles.socialButton}
                  hoverStyle={{ backgroundColor: "#f9f9f9" }}
                  onPress={signInWithGoogle}
                  disabled={loading}
                >
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </Hoverable>

                <Hoverable
                  style={styles.socialButton}
                  hoverStyle={{ backgroundColor: "#f9f9f9" }}
                  onPress={signInAsGuest}
                  disabled={loading}
                >
                  <Ionicons name="person-outline" size={20} color="#374151" />
                  <Text style={styles.socialButtonText}>Invité</Text>
                </Hoverable>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
                </Text>
                <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                  <Text style={styles.linkText}>
                    {isLogin ? "Créer un compte" : "Se connecter"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.footer}>
              <TouchableOpacity
                onPress={() => {
                  setIsReset(false);
                  setSuccessMessage("");
                  setFormError("");
                }}
              >
                <Text style={styles.linkText}>Retour à la connexion</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center", // Center vertically only if content is smaller
    alignItems: "center",
    padding: 20,
    minHeight: "100%", // Ensure full height availability
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    padding: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  emojiLogo: {
    fontSize: 48,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  errorText: {
    color: "#ff3b30",
    fontSize: 14,
    marginBottom: 12,
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 12, // Reduced padding to keep icon close
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#333",
    ...Platform.select({
      web: { outlineStyle: "none" } as any,
    }),
  },
  rolesSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 10,
  },
  rolesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  roleChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#eee",
    borderWidth: 1,
    borderColor: "transparent",
  },
  roleChipSelected: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  roleText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  roleTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: Colors.light.tint,
    borderRadius: 14,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#999",
    fontSize: 12,
    fontWeight: "600",
  },
  socialButtons: {
    flexDirection: "row",
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "white",
    gap: 8,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
    gap: 6,
  },
  footerText: {
    color: "#666",
    fontSize: 14,
  },
  linkText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: "bold",
  },
});
