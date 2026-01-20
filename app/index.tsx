import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { JOB_TITLES } from "./utils/roles";

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
      <Text style={styles.title}>
        {isLogin ? "Connexion 🎬" : "Rejoindre le Cast 📝"}
      </Text>

      {/* --- CHAMPS VISIBLES UNIQUEMENT SI INSCRIPTION --- */}
      {!isLogin && (
        <TextInput
          placeholder="Nom complet"
          value={fullName}
          onChangeText={setFullName}
          style={styles.input}
        />
      )}

      {/* --- CHAMPS COMMUNS --- */}
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        style={styles.input}
      />
      <TextInput
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />

      {/* --- SÉLECTEUR DE RÔLE (UNIQUEMENT SI INSCRIPTION) --- */}
      {!isLogin && (
        <>
          <Text style={styles.label}>Je suis :</Text>
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
        <ActivityIndicator size="large" color="#841584" />
      ) : (
        <Button
          title={isLogin ? "Se connecter" : "S'inscrire"}
          onPress={isLogin ? signIn : signUp}
          color="#841584"
        />
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
  container: { flexGrow: 1, justifyContent: "center", padding: 20 },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "white",
  },
  label: { marginTop: 10, marginBottom: 8, fontWeight: "600", fontSize: 16 },
  spacer: { height: 20 },
  rolesContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  roleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#841584",
    borderRadius: 20,
    marginBottom: 5,
  },
  roleButtonSelected: { backgroundColor: "#841584" },
  roleText: { color: "#841584" },
  roleTextSelected: { color: "white", fontWeight: "bold" },

  // Style du lien en bas
  switchButton: { marginTop: 20, alignItems: "center" },
  switchText: { color: "#841584", fontWeight: "bold" },
});
