import AddressAutocomplete from "@/app/components/AddressAutocomplete";
import CityPicker from "@/app/components/CityPicker";
import CountryPicker from "@/app/components/CountryPicker";
import ClapLoading from "@/components/ClapLoading";
import WebDatePicker from "@/components/WebDatePicker";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { useUserMode } from "@/hooks/useUserMode";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Image,
    Platform,
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
  { label: "Publicité", value: "publicite" },
  { label: "Documentaire", value: "documentaire" },
];

export default function ProjectSettings() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { mode } = useUserMode();
  const [project, setProject] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ville, setVille] = useState("");
  const [pays, setPays] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  // New fields
  const [type, setType] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [uploading, setUploading] = useState(false);

  // Geocoding helper
  async function getCoordinates(fullAddress: string) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        fullAddress,
      )}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "CineNetwork/1.0",
        },
      });
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
        };
      }
    } catch (e) {
      console.log("Geocoding error:", e);
    }
    return null;
  }

  useEffect(() => {
    fetchData();
  }, [id]);

  async function pickImage() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
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
    const projectId = Array.isArray(id) ? id[0] : id;
    if (!projectId || projectId === "undefined") return;
    try {
      setLoading(true);
      const { data: projectData, error: projectError } = await supabase
        .from("tournages")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (projectError) throw projectError;
      if (!projectData) {
        setProject(null);
        setLoading(false);
        return;
      }
      setProject(projectData);
      setTitle(projectData.title);
      setDescription(projectData.description || "");
      setVille(projectData.ville || "");
      setPays(projectData.pays || "");
      setAddress(projectData.address || "");
      setLatitude(projectData.latitude || null);
      setLongitude(projectData.longitude || null);
      setIsPublic(projectData.is_public || false);
      setType(projectData.type || "court_metrage");
      setImageUrl(projectData.image_url || "");
      setStartDate(
        projectData.start_date ? projectData.start_date.split("T")[0] : "",
      );
      setEndDate(
        projectData.end_date ? projectData.end_date.split("T")[0] : "",
      );

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

      let lat = latitude;
      let lon = longitude;

      // Force geocoding if address is present but coords are missing
      // or if we want to refresh coords from the textual address
      if (address.trim() && (!lat || !lon)) {
        const searchParts = [];
        if (address.trim()) searchParts.push(address.trim());
        if (ville.trim()) searchParts.push(ville.trim());
        if (pays.trim()) searchParts.push(pays.trim());

        const searchAddr = searchParts.join(", ");

        if (searchAddr.trim()) {
          const c = await getCoordinates(searchAddr);
          if (c) {
            lat = c.lat;
            lon = c.lon;
          }
        }
      }

      const { error } = await supabase
        .from("tournages")
        .update({
          title,
          description,
          ville,
          pays,
          address,
          latitude: lat ? parseFloat(String(lat)) : null,
          longitude: lon ? parseFloat(String(lon)) : null,
          is_public: isPublic,
          type,
          image_url: imageUrl,
          start_date: startDate || null,
          end_date: endDate || null,
        })
        .eq("id", id);

      if (error) throw error;

      let successMsg = "Informations mises à jour !";
      if (address.trim() && (!lat || !lon)) {
        successMsg +=
          "\n\nNote: Nous n'avons pas pu localiser l'adresse précisément sur la carte. Vérifiez l'orthographe ou utilisez une ville connue.";
      }

      Alert.alert("Succès", successMsg);
      fetchData();
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
              await supabase
                .from("project_messages" as any)
                .delete()
                .eq("project_id", id);

              // Delete events
              await supabase
                .from("project_events" as any)
                .delete()
                .eq("tournage_id", id);

              // Delete roles (and related applications if they don't cascade, but usually roles->tournage is cascade?
              // If not, we delete applications first then roles)
              // Let's assume we need to be thorough.
              const { data: roles } = await supabase
                .from("project_roles")
                .select("id")
                .eq("tournage_id", id);
              if (roles && roles.length > 0) {
                const roleIds = roles.map((r) => r.id);
                // Delete applications for these roles
                await supabase
                  .from("applications")
                  .delete()
                  .in("role_id", roleIds);
                // Delete roles
                await supabase
                  .from("project_roles")
                  .delete()
                  .eq("tournage_id", id);
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
              // Remove accepted application to allow re-apply
              await supabase
                .from("applications")
                .delete()
                .eq("role_id", roleId)
                .eq("status", "accepted");

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
        <ClapLoading size={50} color={Colors.light.primary} />
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
        {mode !== "studio" && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
        )}
        <Text style={GlobalStyles.title1}>Paramètres du projet</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 50 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* --- SECTION 1: VISUELS --- */}
        <View style={GlobalStyles.card}>
          <Text style={GlobalStyles.title2}>Visuel</Text>
          <Text style={styles.label}>Importer une image</Text>
          <View style={{ alignItems: "center", marginBottom: 15 }}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={{
                  width: "100%",
                  height: 180,
                  borderRadius: 12,
                  marginBottom: 10,
                  resizeMode: "cover",
                }}
              />
            ) : (
              <View
                style={{
                  width: "100%",
                  height: 120,
                  backgroundColor: "#eee",
                  borderRadius: 12,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <Ionicons name="image-outline" size={40} color="#999" />
                <Text style={{ color: "#999", marginTop: 5 }}>
                  Aucune image
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={pickImage}
              disabled={uploading}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: Colors.light.tint,
                paddingHorizontal: 15,
                paddingVertical: 10,
                borderRadius: 20,
                marginTop: 5,
              }}
            >
              {uploading ? (
                <ClapLoading color="white" size={24} />
              ) : (
                <>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={20}
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{ color: "white", fontWeight: "bold" }}>
                    Importer depuis la galerie
                  </Text>
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
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 15,
            }}
          >
            {PROJECT_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                onPress={() => setType(t.value)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor:
                    type === t.value
                      ? Colors.light.primary
                      : Colors.light.backgroundSecondary,
                  borderWidth: 1,
                  borderColor:
                    type === t.value
                      ? Colors.light.primary
                      : Colors.light.border,
                }}
              >
                <Text
                  style={{
                    color: type === t.value ? "white" : Colors.light.text,
                    fontWeight: "600",
                    fontSize: 12,
                  }}
                >
                  {t.label}
                </Text>
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
              <CityPicker
                currentValue={ville}
                onSelect={setVille}
                placeholder="Ex: Paris"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Pays</Text>
              <CountryPicker
                currentValue={pays}
                onSelect={setPays}
                placeholder="Ex: France"
              />
            </View>
          </View>

          <Text style={[styles.label, { marginTop: 10 }]}>Adresse exacte</Text>
          <AddressAutocomplete
            currentValue={address}
            onSelect={(addr, lat, lon) => {
              setAddress(addr);
              setLatitude(lat || null);
              setLongitude(lon || null);
            }}
            placeholder="Rechercher une adresse..."
          />
        </View>

        {/* --- SECTION 3: DATES --- */}
        <View style={GlobalStyles.card}>
          <Text style={GlobalStyles.title2}>Dates de tournage</Text>
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.label}>Début</Text>
              {Platform.OS === "web" ? (
                <WebDatePicker value={startDate} onChange={setStartDate} />
              ) : (
                <>
                  <TouchableOpacity
                    style={GlobalStyles.input}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Text
                      style={{ color: startDate ? Colors.light.text : "#999" }}
                    >
                      {startDate || "Choisir une date"}
                    </Text>
                  </TouchableOpacity>
                  {showStartPicker && (
                    <DateTimePicker
                      value={startDate ? new Date(startDate) : new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        if (Platform.OS === "android") {
                          setShowStartPicker(false);
                        }
                        if (date) {
                          setStartDate(date.toISOString().split("T")[0]);
                        }
                      }}
                    />
                  )}
                  {Platform.OS === "ios" && showStartPicker && (
                    <TouchableOpacity
                      onPress={() => setShowStartPicker(false)}
                      style={{
                        marginTop: 5,
                        padding: 8,
                        backgroundColor: "#eee",
                        borderRadius: 5,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 12, color: "#666" }}>OK</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Fin</Text>
              {Platform.OS === "web" ? (
                <WebDatePicker value={endDate} onChange={setEndDate} />
              ) : (
                <>
                  <TouchableOpacity
                    style={GlobalStyles.input}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Text
                      style={{ color: endDate ? Colors.light.text : "#999" }}
                    >
                      {endDate || "Choisir une date"}
                    </Text>
                  </TouchableOpacity>
                  {showEndPicker && (
                    <DateTimePicker
                      value={endDate ? new Date(endDate) : new Date()}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        if (Platform.OS === "android") {
                          setShowEndPicker(false);
                        }
                        if (date) {
                          setEndDate(date.toISOString().split("T")[0]);
                        }
                      }}
                    />
                  )}
                  {Platform.OS === "ios" && showEndPicker && (
                    <TouchableOpacity
                      onPress={() => setShowEndPicker(false)}
                      style={{
                        marginTop: 5,
                        padding: 8,
                        backgroundColor: "#eee",
                        borderRadius: 5,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 12, color: "#666" }}>OK</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </View>

        {/* --- SECTION 4: VISIBILITÉ --- */}
        <View style={GlobalStyles.card}>
          <Text style={GlobalStyles.title2}>Confidentialité</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text
                style={{ fontWeight: "bold", fontSize: 16, marginBottom: 4 }}
              >
                Projet Public
              </Text>
              <Text style={GlobalStyles.caption}>
                Si activé, le projet apparaît dans la recherche globale et les
                non-membres peuvent voir la page vitrine.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsPublic(!isPublic)}
              style={{
                backgroundColor: isPublic ? Colors.light.success : "#ccc",
                width: 50,
                height: 30,
                borderRadius: 15,
                justifyContent: "center",
                alignItems: isPublic ? "flex-end" : "flex-start",
                padding: 2,
              }}
            >
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: "white",
                }}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- SAVE BUTTON --- */}
        <View style={{ paddingHorizontal: 15, marginBottom: 20 }}>
          <TouchableOpacity
            style={GlobalStyles.primaryButton}
            onPress={handleUpdateInfo}
            disabled={saving}
          >
            {saving ? (
              <ClapLoading color="white" size={24} />
            ) : (
              <Text style={GlobalStyles.buttonText}>
                Enregistrer les modifications
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* --- SECTION 5: PARTICIPANTS --- */}
        <View style={GlobalStyles.card}>
          <Text style={GlobalStyles.title2}>
            Participants ({participants.length})
          </Text>
          {participants.length === 0 ? (
            <Text style={styles.emptyText}>
              Aucun participant pour le moment.
            </Text>
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
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={Colors.light.danger}
                  />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* --- SECTION 6: DANGER ZONE --- */}
        <View
          style={[
            GlobalStyles.card,
            {
              borderBottomWidth: 0,
              shadowOpacity: 0,
              backgroundColor: "transparent",
            },
          ]}
        >
          <Text
            style={{
              color: Colors.light.danger,
              fontWeight: "bold",
              marginBottom: 10,
              textTransform: "uppercase",
              fontSize: 12,
            }}
          >
            Zone de danger
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteProject}
            disabled={saving}
          >
            {saving ? (
              <ClapLoading color="#d32f2f" size={24} />
            ) : (
              <Text style={styles.deleteButtonText}>
                Supprimer définitivement ce projet
              </Text>
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
  label: { fontSize: 14, color: "#666", marginBottom: 5, fontWeight: "600" },
  textArea: { height: 80, textAlignVertical: "top" },
  row: { flexDirection: "row" },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 10,
  },
  participantName: {
    fontWeight: "bold",
    fontSize: 16,
    color: Colors.light.text,
  },
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
