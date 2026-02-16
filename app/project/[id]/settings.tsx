import AddressAutocomplete from "@/app/components/AddressAutocomplete";
import CityPicker from "@/app/components/CityPicker";
import CountryPicker from "@/app/components/CountryPicker";
import ClapLoading from "@/components/ClapLoading";
import WebDatePicker from "@/components/WebDatePicker";
import { GlobalStyles } from "@/constants/Styles";
import { useUserMode } from "@/hooks/useUserMode";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Stack, useFocusEffect, useGlobalSearchParams, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { id } from "zod/v4/locales";
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
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const idValue = localParams.id || globalParams.id;
  const projectId = Array.isArray(idValue) ? idValue[0] : idValue;

  const router = useRouter();
  const { mode } = useUserMode();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const [project, setProject] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [userRoles, setUserRoles] = useState<any[]>([]);

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
          "User-Agent": "Tita/1.0",
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

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [projectId])
  );

  useEffect(() => {
    fetchData();
  }, [projectId]);

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

      const fileName = `${projectId}/${Date.now()}.jpg`;
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
    if (!projectId || projectId === "undefined") return;
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      setCurrentUserId(userId || null);
      
      console.log("Settings: projectId =", projectId, "userId =", userId);

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
      const isUserOwner = projectData.owner_id === userId;
      setIsOwner(isUserOwner);

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

      // Fetch all participants for this project
      const { data: partsData, error: partsError } = await supabase
        .from("project_roles")
        .select(
          `
                    id,
                    title,
                    category,
                    assigned_profile_id,
                    show_in_team,
                    profiles:assigned_profile_id (
                        id,
                        full_name,
                        username,
                        avatar_url
                    )
                `,
        )
        .eq("tournage_id", projectId)
        .not("assigned_profile_id", "is", null);

      if (partsError) throw partsError;
      setParticipants(partsData || []);

      if (userId) {
        const myRoles = (partsData || []).filter(p => p.assigned_profile_id === userId);
        setUserRoles(myRoles);
      }
    } catch (error) {
      console.error("fetchData error:", error);
      Alert.alert("Erreur", "Impossible de récupérer les données du projet.");
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
        .eq("id", projectId);

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

  async function handleToggleVisibility(roleId: string, currentVal: boolean) {
    try {
      const { error } = await supabase
        .from("project_roles")
        .update({ show_in_team: !currentVal })
        .eq("id", roleId);

      if (error) throw error;
      fetchData();
    } catch (e) {
      Alert.alert("Erreur", "Impossible de modifier la visibilité.");
    }
  }

  async function handleQuitProject(roleId: string) {
    Alert.alert(
      "Quitter le projet",
      "Êtes-vous sûr de vouloir quitter ce projet ? Votre rôle sera à nouveau vacant.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Quitter",
          style: "destructive",
          onPress: async () => {
            try {
              setSaving(true);
              // Remove accepted application
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
              
              // If last role, maybe go back
              if (userRoles.length <= 1) {
                router.replace("/(tabs)/my-projects");
              } else {
                fetchData();
              }
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
        <ClapLoading size={50} color={colors.primary} />
      </View>
    );

  if (loading && !project) {
    return (
      <View style={styles.center}>
        <ClapLoading color={colors.primary} size={40} />
      </View>
    );
  }

  if (!project && !loading) {
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.textSecondary }}>Projet non trouvé</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.background,
          paddingTop: 50,
          paddingBottom: 15,
          paddingHorizontal: 15,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {(Platform.OS !== "web" || mode !== "studio") && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[GlobalStyles.title1, { color: colors.text }]}>Paramètres du projet</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 50 }}
        keyboardShouldPersistTaps="handled"
      >
        {isOwner && (
          <>
            {/* SECTION 1: VISUELS */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <Ionicons name="image-outline" size={18} color={colors.primary} />
                <Text style={styles.formSectionTitle}>Visuel</Text>
              </View>

              <View style={{ alignItems: "center" }}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
                ) : (
                  <View style={[styles.imagePreview, { justifyContent: "center", alignItems: "center" }]}>
                    <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Aucune image</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={pickImage}
                  disabled={uploading}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.primary,
                    paddingHorizontal: 20,
                    paddingVertical: 12,
                    borderRadius: 24,
                    marginTop: 5,
                  }}
                >
                  {uploading ? (
                    <ClapLoading color="white" size={20} />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={18} color="white" style={{ marginRight: 8 }} />
                      <Text style={{ color: "white", fontWeight: "bold" }}>
                        Changer l'affiche
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* SECTION 2: INFOS GÉNÉRALES */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.formSectionTitle}>Général</Text>
              </View>

              <Text style={styles.fieldLabel}>Titre du projet</Text>
              <TextInput
                style={styles.formInput}
                value={title}
                onChangeText={setTitle}
                placeholderTextColor={colors.textSecondary + "80"}
              />

              <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Type de projet</Text>
              <View style={[styles.row, { flexWrap: "wrap", marginBottom: 15 }]}>
                {PROJECT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setType(t.value)}
                    style={[
                      styles.typeButton,
                      type === t.value && styles.typeButtonSelected,
                    ]}
                  >
                    <Text
                      style={{
                        color: type === t.value ? "white" : colors.text,
                        fontWeight: "600",
                        fontSize: 13,
                      }}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Synopsis / Description</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholderTextColor={colors.textSecondary + "80"}
              />

              <View style={[styles.row, { marginTop: 15 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Ville</Text>
                  <CityPicker
                    currentValue={ville}
                    onSelect={setVille}
                    placeholder="Ex: Paris"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Pays</Text>
                  <CountryPicker
                    currentValue={pays}
                    onSelect={setPays}
                    placeholder="Ex: France"
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Adresse exacte</Text>
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

            {/* SECTION 3: DATES */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={styles.formSectionTitle}>Calendrier</Text>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Date de début</Text>
                  {Platform.OS === "web" ? (
                    <WebDatePicker value={startDate} onChange={setStartDate} />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.formInput}
                        onPress={() => setShowStartPicker(true)}
                      >
                        <Text style={{ color: startDate ? colors.text : colors.textSecondary + "80" }}>
                          {startDate || "Choisir"}
                        </Text>
                      </TouchableOpacity>
                      {showStartPicker && (
                        <DateTimePicker
                          value={startDate ? new Date(startDate) : new Date()}
                          mode="date"
                          display="default"
                          onChange={(event, date) => {
                            if (Platform.OS === "android") setShowStartPicker(false);
                            if (date) setStartDate(date.toISOString().split("T")[0]);
                          }}
                        />
                      )}
                      {Platform.OS === "ios" && showStartPicker && (
                        <TouchableOpacity
                          onPress={() => setShowStartPicker(false)}
                          style={{ marginTop: 5, padding: 8, backgroundColor: colors.backgroundSecondary, borderRadius: 5, alignItems: "center" }}
                        >
                          <Text style={{ fontSize: 12, color: colors.textSecondary }}>OK</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Date de fin</Text>
                  {Platform.OS === "web" ? (
                    <WebDatePicker value={endDate} onChange={setEndDate} />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.formInput}
                        onPress={() => setShowEndPicker(true)}
                      >
                        <Text style={{ color: endDate ? colors.text : colors.textSecondary + "80" }}>
                          {endDate || "Choisir"}
                        </Text>
                      </TouchableOpacity>
                      {showEndPicker && (
                        <DateTimePicker
                          value={endDate ? new Date(endDate) : new Date()}
                          mode="date"
                          display="default"
                          onChange={(event, date) => {
                            if (Platform.OS === "android") setShowEndPicker(false);
                            if (date) setEndDate(date.toISOString().split("T")[0]);
                          }}
                        />
                      )}
                      {Platform.OS === "ios" && showEndPicker && (
                        <TouchableOpacity
                          onPress={() => setShowEndPicker(false)}
                          style={{ marginTop: 5, padding: 8, backgroundColor: colors.backgroundSecondary, borderRadius: 5, alignItems: "center" }}
                        >
                          <Text style={{ fontSize: 12, color: colors.textSecondary }}>OK</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </View>
            </View>

            {/* SECTION 4: VISIBILITÉ */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <Ionicons name="eye-outline" size={18} color={colors.primary} />
                <Text style={styles.formSectionTitle}>Confidentialité</Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontWeight: "700", fontSize: 15, color: colors.text, marginBottom: 4 }}>
                    Projet Public
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    Si activé, le projet apparaît dans la recherche globale.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsPublic(!isPublic)}
                  style={{
                    backgroundColor: isPublic ? colors.success : colors.border,
                    width: 48,
                    height: 28,
                    borderRadius: 14,
                    justifyContent: "center",
                    alignItems: isPublic ? "flex-end" : "flex-start",
                    padding: 2,
                  }}
                >
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "white" }} />
                </TouchableOpacity>
              </View>
            </View>

            {/* SAVE BUTTON */}
            <TouchableOpacity
              style={[ {backgroundColor: colors.primary, marginBottom: 25, borderRadius: 12, paddingVertical: 14, alignItems: "center" } ]}
              onPress={handleUpdateInfo}
              disabled={saving}
            >
              {saving ? (
                <ClapLoading color="white" size={24} />
              ) : (
                <Text style={GlobalStyles.buttonText}>Enregistrer les modifications</Text>
              )}
            </TouchableOpacity>

            {/* SECTION 5: PARTICIPANTS */}
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <Ionicons name="people-outline" size={18} color={colors.primary} />
                <Text style={styles.formSectionTitle}>Membres de l'équipe ({participants.length})</Text>
              </View>

              {participants.length === 0 ? (
                <Text style={styles.emptyText}>
                  Aucun participant pour le moment.
                </Text>
              ) : (
                participants.map((p) => (
                  <View key={p.id} style={styles.participantRow}>
                    <Image
                      source={p.profiles?.avatar_url ? { uri: p.profiles.avatar_url } : require("@/assets/images/icon.png")}
                      style={styles.participantAvatar}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.participantName}>
                        {p.profiles?.full_name || "Utilisateur inconnu"}
                      </Text>
                      <Text style={styles.participantRole}>
                        {p.title}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveParticipant(p.id)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            {/* SECTION 6: DANGER ZONE */}
            <View style={[styles.formSection, { borderColor: colors.danger + "40", backgroundColor: isDark ? 'transparent' : '#fff9f9' }]}>
              <View style={styles.formSectionHeader}>
                <Ionicons name="warning-outline" size={18} color={colors.danger} />
                <Text style={[styles.formSectionTitle, { color: colors.danger }]}>Zone de danger</Text>
              </View>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteProject}
                disabled={saving}
              >
                {saving ? (
                  <ClapLoading color={colors.danger} size={24} />
                ) : (
                  <Text style={styles.deleteButtonText}>
                    Supprimer définitivement ce projet
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {!isOwner && userRoles.length > 0 && (
          <>
            <View style={styles.formSection}>
              <View style={styles.formSectionHeader}>
                <Ionicons name="person-outline" size={18} color={colors.primary} />
                <Text style={styles.formSectionTitle}>Mes Rôles dans le projet</Text>
              </View>

              {userRoles.map((role) => (
                <View key={role.id} style={{ marginBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 15 }}>
                  <Text style={{ fontSize: 16, fontWeight: "bold", color: colors.text }}>{role.title}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>{role.category}</Text>

                  <View style={styles.visibilityToggle}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ fontWeight: "600", color: colors.text }}>Apparaître dans l'équipe</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>Si activé, vous serez visible dans la liste publique de l'équipe.</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleToggleVisibility(role.id, role.show_in_team)}
                      style={{
                        backgroundColor: role.show_in_team ? colors.success : colors.border,
                        width: 44,
                        height: 24,
                        borderRadius: 12,
                        justifyContent: "center",
                        alignItems: role.show_in_team ? "flex-end" : "flex-start",
                        padding: 2,
                      }}
                    >
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "white" }} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.quitButton}
                    onPress={() => handleQuitProject(role.id)}
                  >
                    <Ionicons name="exit-outline" size={20} color={colors.danger} />
                    <Text style={styles.quitButtonText}>Quitter ce poste</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={{ padding: 10, alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "center" }}>
                Vous ne pouvez modifier que vos propres paramètres de participation. Toute modification majeure du projet doit être effectuée par le propriétaire.
              </Text>
            </View>
          </>
        )}

        {!isOwner && userRoles.length === 0 && (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 50 }}>
            <Ionicons name="lock-closed-outline" size={64} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: 16, textAlign: "center", paddingHorizontal: 40 }}>
              Vous n'êtes pas autorisé à modifier les paramètres de ce projet.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
      textAlign: 'left',
    },
    formSection: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    formSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      gap: 8,
    },
    formSectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    formInput: {
      backgroundColor: colors.background,
      color: colors.text,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      fontSize: 15,
      minHeight: 44,
    },
    textArea: {
      minHeight: 100,
      textAlignVertical: "top",
      paddingTop: 12,
    },
    imagePreview: {
      width: "100%",
      maxWidth: 500,
      aspectRatio: 16 / 9,
      borderRadius: 12,
      marginBottom: 15,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      alignSelf: 'center',
    },
    participantAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.backgroundSecondary,
    },
    participantRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    participantName: {
      fontWeight: "bold",
      fontSize: 16,
      color: colors.text,
    },
    participantRole: { 
      color: colors.textSecondary, 
      fontSize: 13, 
      textTransform: "capitalize" 
    },
    removeButton: { 
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.backgroundSecondary,
    },
    emptyText: { 
      color: colors.textSecondary, 
      fontStyle: "italic",
      textAlign: 'center',
      paddingVertical: 20,
    },
    deleteButton: {
      backgroundColor: isDark ? "#300" : "#ffebee",
      padding: 15,
      borderRadius: 10,
      alignItems: "center",
      borderWidth: 1,
      borderColor: isDark ? "#500" : "#ffcdd2",
      marginTop: 10,
    },
    deleteButtonText: { color: colors.danger, fontWeight: "bold", fontSize: 16 },
    visibilityToggle: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 10,
      marginTop: 10,
    },
    quitButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.danger + "15",
      padding: 15,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger + "30",
      marginTop: 20,
    },
    quitButtonText: {
      color: colors.danger,
      fontWeight: "bold",
      marginLeft: 8,
    },
    typeButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    typeButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
  });
}
