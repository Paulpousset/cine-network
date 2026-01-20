import { useEffect, useState } from "react";
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
import { supabase } from "../../lib/supabase";
import { useUserMode } from "../hooks/useUserMode";
import { JOB_TITLES } from "../utils/roles";

const ROLES = Object.keys(JOB_TITLES);

export default function Account() {
  const { mode, setUserMode } = useUserMode();
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [website, setWebsite] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    getProfile();
  }, []);

  // 1. Récupérer les infos actuelles
  async function getProfile() {
    try {
      setLoading(true);
      // On récupère l'ID de l'utilisateur connecté
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) throw new Error("Pas de session");

      const { data, error, status } = await supabase
        .from("profiles")
        .select(`username, website, full_name, role`)
        .eq("id", session.user.id)
        .single();

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setUsername(data.username || "");
        setWebsite(data.website || "");
        setFullName(data.full_name || "");
        setRole(data.role || "acteur");
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Erreur", error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  // 2. Mettre à jour les infos
  async function updateProfile() {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Pas de session");

      const updates = {
        id: session.user.id,
        username,
        website,
        full_name: fullName,
        role: role,
        updated_at: new Date(),
      };

      const { error } = await supabase.from("profiles").upsert(updates);

      if (error) {
        throw error;
      } else {
        Alert.alert("Succès", "Profil mis à jour !");
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Erreur", error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  // 3. Se déconnecter
  async function signOut() {
    await supabase.auth.signOut();
    // Le _layout.tsx te redirigera automatiquement vers le Login
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#841584" />
      ) : (
        <>
          <View style={styles.header}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {fullName ? fullName.charAt(0).toUpperCase() : "A"}
              </Text>
            </View>
            <Text style={styles.roleTag}>{role.toUpperCase()}</Text>
            <View style={{ marginTop: 16 }} />
            <Text style={styles.label}>Mode d'utilisation :</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <Button
                title={mode === "search" ? "✓ Chercheur" : "Chercheur"}
                onPress={() => setUserMode("search")}
                color={mode === "search" ? "#841584" : "#999"}
              />
              <Button
                title={mode === "creator" ? "✓ Créateur" : "Créateur"}
                onPress={() => setUserMode("creator")}
                color={mode === "creator" ? "#841584" : "#999"}
              />
            </View>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Email (non modifiable)</Text>
            {/* On ne stocke pas l'email dans l'état local pour éviter les bugs, on pourrait l'afficher via session.user.email */}
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value="Votre email sécurisé"
              editable={false}
            />

            <Text style={styles.label}>Nom complet</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={styles.label}>Nom d'utilisateur (Pseudo)</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
            />

            <Text style={styles.label}>Site Web / Portfolio</Text>
            <TextInput
              style={styles.input}
              value={website}
              onChangeText={setWebsite}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Mon métier principal :</Text>
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
                    {item.charAt(0).toUpperCase() +
                      item.slice(1).replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.spacer} />

            <Button
              title={loading ? "Chargement ..." : "Mettre à jour"}
              onPress={updateProfile}
              color="#841584"
            />

            <View style={styles.spacer} />

            <Button title="Se déconnecter" onPress={signOut} color="#ff3b30" />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 50 },
  header: { alignItems: "center", marginBottom: 30 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e1e1e1",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarText: { fontSize: 40, color: "#666", fontWeight: "bold" },
  roleTag: {
    backgroundColor: "#841584",
    color: "white",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 12,
    fontWeight: "bold",
    overflow: "hidden",
  },
  form: { width: "100%" },
  label: { fontSize: 14, color: "#666", marginBottom: 5, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "white",
    fontSize: 16,
  },
  disabledInput: { backgroundColor: "#f0f0f0", color: "#999" },
  spacer: { height: 20 },
  rolesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  roleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#841584",
    borderRadius: 20,
  },
  roleButtonSelected: { backgroundColor: "#841584" },
  roleText: { color: "#841584", fontSize: 12 },
  roleTextSelected: { color: "white", fontWeight: "bold" },
});
