import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
// @ts-ignore

const PROJECT_TYPES = [
  { label: "Long-métrage", value: "long_metrage" },
  { label: "Court-métrage", value: "court_metrage" },
  { label: "Série", value: "serie" },
  { label: "Clip", value: "clip" },
  { label: "Publicité", value: "pub" },
  { label: "Documentaire", value: "documentaire" },
];

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
  const [isPublic, setIsPublic] = useState(false);
  // New fields
  const [type, setType] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  async function pickImage() {
      try {
          const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [16, 9],
              quality: 0.8,
          });

          if (!result.canceled) {
              await uploadImage(result.assets[0].uri);
          }
      } catch (e) {
          Alert.alert("Erreur", "Impossible d'ouvrir la galerie");
      }
  }

  async function uploadImage(uri: string) {
    try {
      setUploading(true);

      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();

      const fileName = `${id}/${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from("project-images")
        .upload(fileName, arrayBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (error) {
        // If bucket doesn't exist, we might need to create it manually in dashboard or use a public one.
        // For now assume project-images exists or user uses avatars bucket.
        // Fallback to 'avatars' if project-images fails? No, let's show error.
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from("project-images")
        .getPublicUrl(fileName);

      if (publicUrlData) {
        setImageUrl(publicUrlData.publicUrl);
      }
    } catch (e) {
      Alert.alert("Erreur Upload", (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

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
      setIsPublic(projectData.is_public || false);
      setType(projectData.type || "court_metrage");
      setImageUrl(projectData.image_url || "");
      setStartDate(projectData.start_date ? projectData.start_date.split('T')[0] : "");
      setEndDate(projectData.end_date ? projectData.end_date.split('T')[0] : "");

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
          is_public: isPublic,
          type,
          image_url: imageUrl,
          start_date: startDate || null,
          end_date: endDate || null
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
              
              // 1. Delete dependent data manually because foreign keys might not be set to CASCADE
              
              // Delete messages
              await supabase.from("project_messages" as any).delete().eq("project_id", id);
              
              // Delete events
              await supabase.from("project_events" as any).delete().eq("tournage_id", id);
              
              // Delete roles (and related applications if they don't cascade, but usually roles->tournage is cascade? 
              // If not, we delete applications first then roles)
              // Let's assume we need to be thorough.
              const { data: roles } = await supabase.from("project_roles").select("id").eq("tournage_id", id);
              if (roles && roles.length > 0) {
                  const roleIds = roles.map(r => r.id);
                  // Delete applications for these roles
                  await supabase.from("applications").delete().in("role_id", roleIds);
                  // Delete roles
                  await supabase.from("project_roles").delete().eq("tournage_id", id);
              }
              
              // Delete posts linked to project if any
              await supabase.from("posts").delete().eq("project_id", id);

              // 2. Finally delete the project
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
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: Colors.light.background,
          paddingTop: 50,
          paddingBottom: 15,
          paddingHorizontal: 15,
          borderBottomWidth: 1,
          borderBottomColor: Colors.light.border,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={GlobalStyles.title1}>
          Paramètres du projet
        </Text>
      </View>

      <ScrollView contentContainerStyle={{paddingBottom: 50}}>
        
        {/* --- SECTION 1: VISUELS --- */}
        <View style={GlobalStyles.card}>
            <Text style={GlobalStyles.title2}>Visuel</Text>
            <Text style={styles.label}>Importer une image</Text>
            <View style={{alignItems: 'center', marginBottom: 15}}>
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={{ width: '100%', height: 180, borderRadius: 12, marginBottom: 10, resizeMode: 'cover' }} />
                ) : (
                    <View style={{ width: '100%', height: 120, backgroundColor: '#eee', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                        <Ionicons name="image-outline" size={40} color="#999" />
                        <Text style={{color: '#999', marginTop: 5}}>Aucune image</Text>
                    </View>
                )}
                
                <TouchableOpacity 
                    onPress={pickImage}
                    disabled={uploading}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: Colors.light.tint,
                        paddingHorizontal: 15,
                        paddingVertical: 10,
                        borderRadius: 20,
                        marginTop: 5
                    }}
                >
                    {uploading ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <>
                            <Ionicons name="cloud-upload-outline" size={20} color="white" style={{marginRight: 8}} />
                            <Text style={{color: 'white', fontWeight: 'bold'}}>Importer depuis la galerie</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>

        {/* --- SECTION 2: INFOS GÉNÉRALES --- */}
        <View style={GlobalStyles.card}>
          <Text style={GlobalStyles.title2}>Informations Générales</Text>
          <Text style={styles.label}>Titre du projet</Text>
          <TextInput
            style={GlobalStyles.input}
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Type de projet</Text>
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15}}>
              {PROJECT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setType(t.value)}
                    style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: type === t.value ? Colors.light.primary : Colors.light.backgroundSecondary,
                        borderWidth: 1,
                        borderColor: type === t.value ? Colors.light.primary : Colors.light.border
                    }}
                  >
                      <Text style={{
                          color: type === t.value ? 'white' : Colors.light.text,
                          fontWeight: '600',
                          fontSize: 12
                      }}>{t.label}</Text>
                  </TouchableOpacity>
              ))}
          </View>

          <Text style={styles.label}>Synopsis / Description</Text>
          <TextInput
            style={[GlobalStyles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            multiline
            placeholderTextColor="#999"
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Ville</Text>
              <TextInput
                style={GlobalStyles.input}
                value={ville}
                onChangeText={setVille}
                placeholderTextColor="#999"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Pays</Text>
              <TextInput
                style={GlobalStyles.input}
                value={pays}
                onChangeText={setPays}
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </View>

        {/* --- SECTION 3: DATES --- */}
        <View style={GlobalStyles.card}>
            <Text style={GlobalStyles.title2}>Dates de tournage</Text>
            <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>Début (AAAA-MM-JJ)</Text>
                <TextInput
                    style={GlobalStyles.input}
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="2026-06-15"
                    placeholderTextColor="#999"
                />
                </View>
                <View style={{ flex: 1 }}>
                <Text style={styles.label}>Fin (AAAA-MM-JJ)</Text>
                <TextInput
                    style={GlobalStyles.input}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="2026-06-30"
                    placeholderTextColor="#999"
                />
                </View>
            </View>
        </View>

        {/* --- SECTION 4: VISIBILITÉ --- */}
        <View style={GlobalStyles.card}>
            <Text style={GlobalStyles.title2}>Confidentialité</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{flex: 1, paddingRight: 10}}>
                    <Text style={{fontWeight: 'bold', fontSize: 16, marginBottom: 4}}>Projet Public</Text>
                    <Text style={GlobalStyles.caption}>Si activé, le projet apparaît dans la recherche globale et les non-membres peuvent voir la page vitrine.</Text>
                </View>
                <TouchableOpacity 
                    onPress={() => setIsPublic(!isPublic)}
                    style={{
                        backgroundColor: isPublic ? Colors.light.success : '#ccc',
                        width: 50,
                        height: 30,
                        borderRadius: 15,
                        justifyContent: 'center',
                        alignItems: isPublic ? 'flex-end' : 'flex-start',
                        padding: 2
                    }}
                >
                    <View style={{width: 26, height: 26, borderRadius: 13, backgroundColor: 'white'}} />
                </TouchableOpacity>
            </View>
        </View>

        {/* --- SAVE BUTTON --- */}
        <View style={{paddingHorizontal: 15, marginBottom: 20}}>
            <TouchableOpacity
                style={GlobalStyles.primaryButton}
                onPress={handleUpdateInfo}
                disabled={saving}
            >
                {saving ? (
                <ActivityIndicator color="white" />
                ) : (
                <Text style={GlobalStyles.buttonText}>Enregistrer les modifications</Text>
                )}
            </TouchableOpacity>
        </View>

        {/* --- SECTION 5: PARTICIPANTS --- */}
        <View style={GlobalStyles.card}>
          <Text style={GlobalStyles.title2}>Participants ({participants.length})</Text>
          {participants.length === 0 ? (
            <Text style={styles.emptyText}>Aucun participant pour le moment.</Text>
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
                  <Ionicons name="trash-outline" size={20} color={Colors.light.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* --- SECTION 6: DANGER ZONE --- */}
        <View style={[GlobalStyles.card, { borderBottomWidth: 0, shadowOpacity: 0, backgroundColor: 'transparent' }]}>
            <Text style={{color: Colors.light.danger, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase', fontSize: 12}}>Zone de danger</Text>
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteProject}
                disabled={saving}
            >
                {saving ? (
                <ActivityIndicator color="#d32f2f" />
                ) : (
                <Text style={styles.deleteButtonText}>Supprimer définitivement ce projet</Text>
                )}
            </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundSecondary },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  label: { fontSize: 14, color: "#666", marginBottom: 5, fontWeight: '600' },
  textArea: { height: 80, textAlignVertical: "top" },
  row: { flexDirection: "row" },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 10,
  },
  participantName: { fontWeight: "bold", fontSize: 16, color: Colors.light.text },
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
