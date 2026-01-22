import { JOB_TITLES } from "@/utils/roles";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { GlobalStyles } from "@/constants/Styles"; // Import GlobalStyles
import Colors from "@/constants/Colors"; // Import Colors

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[GlobalStyles.title1, { textAlign: 'center', marginBottom: 30 }]}>
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
        <ActivityIndicator size="large" color={Colors.light.primary} />
      ) : (
        <TouchableOpacity
            style={GlobalStyles.primaryButton}
          onPress={isLogin ? signIn : signUp}
        >
            <Text style={GlobalStyles.buttonText}>
                {isLogin ? "Se connecter" : "S'inscrire"}
            </Text>
        </TouchableOpacity>
      )}

      {/* --- BOUTON POUR CHANGER DE MODE --- */}
      <TouchableOpacity
        onPress={() => setIsLogin(!isLogin)}
        style={styles.switchButton}
      >
        <Text style={styles.switchText}>
          {isLogin
            ? "Pas encore de compte ? Créer un profil"
            : "J'ai déjà un compte ? Me connecter"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 20, backgroundColor: Colors.light.background },
  inputMargin: {
      marginBottom: 12
  },
  spacer: { height: 20 },
  rolesContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
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
});
