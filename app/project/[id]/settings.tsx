import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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

export default function ProjectSettings() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ville, setVille] = useState("");
  const [pays, setPays] = useState("");

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: projectData, error: projectError } = await supabase
        .from("tournages")
        .select("*")
        .eq("id", id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);
      setTitle(projectData.title);
      setDescription(projectData.description || "");
      setVille(projectData.ville || "");
      setPays(projectData.pays || "");

      const { data: partsData, error: partsError } = await supabase
        .from("project_roles")
        .select(
          `
                    id,
                    title,
                    category,
                    assigned_profile_id,
                    profiles:assigned_profile_id (
                        id,
                        full_name,
                        username,
                        avatar_url
                    )
                `,
        )
        .eq("tournage_id", id)
        .not("assigned_profile_id", "is", null);

      if (partsError) throw partsError;
      setParticipants(partsData || []);
    } catch (error) {
      Alert.alert("Erreur", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateInfo() {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("tournages")
        .update({
          title,
          description,
          ville,
          pays,
        })
        .eq("id", id);

      if (error) throw error;
      Alert.alert("Succès", "Informations mises à jour");
    } catch (error) {
      Alert.alert("Erreur", (error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProject() {
    Alert.alert(
      "Supprimer le projet",
      "Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              // Delete roles first manually just in case, though cascade should handle it
              // but explicit is safer if no cascade.
              // We don't know if cascade is on.
              // Let's try deleting tournage directly.
              const { error } = await supabase
                .from("tournages")
                .delete()
                .eq("id", id);
              if (error) throw error;

              router.replace("/(tabs)/my-projects");
            } catch (error) {
              Alert.alert("Erreur", (error as Error).message);
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  }

  async function handleRemoveParticipant(roleId: string) {
    Alert.alert(
      "Retirer le participant",
      "Voulez-vous retirer ce participant du projet ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Retirer",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("project_roles")
                .update({ assigned_profile_id: null, status: "open" })
                .eq("id", roleId);

              if (error) throw error;
              fetchData();
            } catch (error) {
              Alert.alert("Erreur", (error as Error).message);
            }
          },
        },
      ],
    );
  }

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "white",
          paddingTop: 50,
          paddingBottom: 15,
          paddingHorizontal: 15,
          borderBottomWidth: 1,
          borderBottomColor: "#eee",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "bold" }}>
          Informations du projet
        </Text>
      </View>

      <ScrollView>
        <View style={styles.section}>
          <Text style={styles.label}>Titre</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Ville</Text>
              <TextInput
                style={styles.input}
                value={ville}
                onChangeText={setVille}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Pays</Text>
              <TextInput
                style={styles.input}
                value={pays}
                onChangeText={setPays}
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleUpdateInfo}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Participants</Text>
          {participants.length === 0 ? (
            <Text style={styles.emptyText}>Aucun participant</Text>
          ) : (
            participants.map((p) => (
              <View key={p.id} style={styles.participantRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.participantName}>
                    {p.profiles?.full_name || "Utilisateur inconnu"}
                  </Text>
                  <Text style={styles.participantRole}>
                    {p.title} • {p.category}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveParticipant(p.id)}
                  style={styles.removeButton}
                >
                  <Ionicons name="trash-outline" size={20} color="red" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={[styles.section, { borderBottomWidth: 0 }]}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteProject}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#d32f2f" />
            ) : (
              <Text style={styles.deleteButtonText}>Supprimer le projet</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  section: {
    backgroundColor: "white",
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  label: { fontSize: 14, color: "#666", marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: { height: 80, textAlignVertical: "top" },
  row: { flexDirection: "row" },
  saveButton: {
    backgroundColor: "#841584",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 10,
  },
  participantName: { fontWeight: "bold", fontSize: 16 },
  participantRole: { color: "#666", fontSize: 14, textTransform: "capitalize" },
  removeButton: { padding: 10 },
  emptyText: { color: "#999", fontStyle: "italic" },
  deleteButton: {
    backgroundColor: "#ffebee",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffcdd2",
  },
  deleteButtonText: { color: "#d32f2f", fontWeight: "bold", fontSize: 16 },
});
