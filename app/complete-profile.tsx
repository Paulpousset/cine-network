import ClapLoading from "@/components/ClapLoading";
import Colors from "@/constants/Colors";
import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const ROLES = [
  { label: "Acteur", value: "acteur" },
  { label: "Réalisateur", value: "realisateur" },
  { label: "Agent", value: "agent" },
  { label: "Technicien", value: "technicien" },
  { label: "Production", value: "production" },
  { label: "Image", value: "image" },
  { label: "Son", value: "son" },
  { label: "HMC", value: "hmc" },
  { label: "Déco", value: "deco" },
  { label: "Post-prod", value: "post_prod" },
];

export default function CompleteProfileScreen() {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    if (!username || !role) {
      Alert.alert("Champs requis", "Veuillez choisir un pseudo et un rôle.");
      return;
    }

    if (username.length < 3) {
      Alert.alert(
        "Pseudo trop court",
        "Le pseudo doit faire au moins 3 caractères.",
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      // Check if username is already taken
      const { data: existingUser, error: searchError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username)
        .neq("id", user.id)
        .maybeSingle();

      if (existingUser) {
        Alert.alert("Pseudo déjà pris", "Veuillez en choisir un autre.");
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          role: role,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      // Déclencher l'événement de mise à jour du profil pour que le Layout rafraîchisse son état
      appEvents.emit(EVENTS.PROFILE_UPDATED);

      // On attend un tout petit peu que l'état soit mis à jour dans le Layout avant de rediriger
      // Bien que le Layout redirigera de toute façon une fois que isProfileComplete sera true
      setTimeout(() => {
        router.replace("/my-projects");
      }, 100);
    } catch (error: any) {
      Alert.alert("Erreur", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.light.tint, "#2c1a4d"]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <Text style={styles.title}>Bienvenue !</Text>
            <Text style={styles.subtitle}>
              Avant de commencer, nous avons besoin de deux informations
              importantes.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Choisissez un pseudo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: cineaste_du_92"
                placeholderTextColor="#999"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Quel est votre rôle principal ?</Text>
              <View style={styles.rolesGrid}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[
                      styles.roleButton,
                      role === r.value && styles.roleButtonActive,
                    ]}
                    onPress={() => setRole(r.value)}
                  >
                    <Text
                      style={[
                        styles.roleText,
                        role === r.value && styles.roleTextActive,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (loading || !username || !role) && styles.disabledButton,
              ]}
              onPress={handleSave}
              disabled={loading || !username || !role}
            >
              {loading ? (
                <ClapLoading size={24} color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>C'est parti !</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#eee",
  },
  rolesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  roleButton: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    margin: 5,
    borderWidth: 1,
    borderColor: "#eee",
  },
  roleButtonActive: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  roleText: {
    fontSize: 14,
    color: "#666",
  },
  roleTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: "center",
    marginTop: 10,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
});
