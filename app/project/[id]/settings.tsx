import AddressAutocomplete from "@/app/components/AddressAutocomplete";
import CityPicker from "@/app/components/CityPicker";
import CountryPicker from "@/app/components/CountryPicker";
import WebDatePicker from "@/components/common/WebDatePicker";
import ClapLoading from "@/components/ui/ClapLoading";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { GlobalStyles } from "@/constants/Styles";
import { useUserMode } from "@/hooks/useUserMode";
import { supabase } from "@/lib/supabase";
import { useAlert } from "@/providers/ModalProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { NotificationService } from "@/services/NotificationService";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { Stack, useFocusEffect, useGlobalSearchParams, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
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

const PRODUCTION_TYPES = [
  { value: "recherche", label: "En recherche" },
  { value: "societe", label: "Oui (Société)" },
  { value: "non", label: "Non" },
];

const PROJECT_TYPES = [
  { value: "court_metrage", label: "Court-métrage" },
  { value: "long_metrage", label: "Long-métrage" },
  { value: "serie", label: "Série" },
  { value: "clip", label: "Clip" },
  { value: "publicite", label: "Pub" },
  { value: "documentaire", label: "Docu" },
  { value: "etudiant", label: "Étudiant" },
];

export default function ProjectSettings() {
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const idValue = localParams.id || globalParams.id;
  const projectId = Array.isArray(idValue) ? idValue[0] : idValue;

  const router = useRouter();
  const { mode } = useUserMode();
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();
  const styles = createStyles(colors, isDark);
  const [project, setProject] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isTrueOwner, setIsTrueOwner] = useState(false);
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

  const [productionType, setProductionType] = useState("recherche");
  const [productionCompany, setProductionCompany] = useState("");
  const [searchProductionQuery, setSearchProductionQuery] = useState("");
  const [productionSuggestions, setProductionSuggestions] = useState<any[]>([]);
  const [searchingProduction, setSearchingProduction] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState<any | null>(null);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Collaborators management
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [pendingCollaborators, setPendingCollaborators] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [uploading, setUploading] = useState(false);

  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
    confirmLabel?: string;
  }>({
    visible: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const hideModal = () => setModalConfig(prev => ({ ...prev, visible: false }));

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
      const isUserCollaborator = projectData.owner_id === userId || (projectData.collaborators || []).includes(userId);
      setIsOwner(isUserCollaborator);
      setIsTrueOwner(projectData.owner_id === userId);

      // Fetch collaborators profiles
      const collabIds = projectData.collaborators || [];
      const pendingIds = projectData.pending_collaborators || [];

      if (collabIds.length > 0 || pendingIds.length > 0) {
        const { data: collabProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .in("id", [...collabIds, ...pendingIds]);

        if (collabProfiles) {
          setCollaborators(collabProfiles.filter(p => collabIds.includes(p.id)));
          setPendingCollaborators(collabProfiles.filter(p => pendingIds.includes(p.id)));
        }
      } else {
        setCollaborators([]);
        setPendingCollaborators([]);
      }

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
      setProductionType(projectData.production_type || "recherche");
      setProductionCompany(projectData.production_company || "");

      setHasUnsavedChanges(false);

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
      setHasUnsavedChanges(false);

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
          production_type: productionType,
          production_company: productionCompany,
          collaborators: collaborators.map(c => c.id).length > 0 ? collaborators.map(c => c.id) : null,
          pending_collaborators: pendingCollaborators.map(c => c.id).length > 0 ? pendingCollaborators.map(c => c.id) : null,
        })
        .eq("id", projectId);

      if (error) throw error;

      // Update local project state to keep track of new IDs for next save
      setProject({
          ...project,
          collaborators: collaborators.map(c => c.id),
          pending_collaborators: pendingCollaborators.map(c => c.id)
      });

      // Handle newly added pending collaborators notifications
      const existingPendingIds = project?.pending_collaborators || [];
      const newPendingProfiles = pendingCollaborators.filter(p => !existingPendingIds.includes(p.id));
      
      const allNewInvites = selectedProduction ? [...newPendingProfiles, selectedProduction] : newPendingProfiles;

      if (allNewInvites.length > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, username")
          .eq("id", currentUserId)
          .single();
        
        const inviterName = profile?.full_name || profile?.username || "Le collaborateur";
        
        allNewInvites.forEach(collab => {
          NotificationService.sendCollaboratorInvitationNotification({
            receiverId: collab.id,
            projectTitle: title.trim(),
            projectId: projectId,
            inviterName: inviterName,
          });
        });
      }

      let successMsg = "Informations mises à jour !";
      if (address.trim() && (!lat || !lon)) {
        successMsg +=
          "\n\nNote: Nous n'avons pas pu localiser l'adresse précisément sur la carte. Vérifiez l'orthographe ou utilisez une ville connue.";
      }

      if (Platform.OS === "web") {
        window.alert(successMsg);
      } else {
        Alert.alert("Succès", successMsg);
      }
      setHasUnsavedChanges(false);
      fetchData();
    } catch (error) {
      Alert.alert("Erreur", (error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function searchProfiles(query: string) {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      // Filter out existing collaborators and pending
      const filtered = (data || []).filter(
        (p) => 
          !collaborators.find((c: any) => c.id === p.id) && 
          !pendingCollaborators.find((c: any) => c.id === p.id) &&
          p.id !== currentUserId &&
          p.id !== project?.owner_id
      );

      setSearchResults(filtered);
    } catch (error) {
      console.error("Search profiles error:", error);
    } finally {
      setIsSearching(false);
    }
  }

  function addCollaborator(profile: any) {
    // When adding post-creation, it goes to pending
    setPendingCollaborators([...pendingCollaborators, profile]);
    setHasUnsavedChanges(true);
    setSearchQuery("");
    setSearchResults([]);
  }

  function removeCollaborator(id: string, isPending: boolean) {
    if (isPending) {
      setPendingCollaborators(pendingCollaborators.filter((c: any) => c.id !== id));
      setHasUnsavedChanges(true);
    } else {
      setModalConfig({
        visible: true,
        title: "Supprimer le collaborateur",
        message: "Voulez-vous vraiment retirer les droits de collaborateur à cette personne ?",
        isDestructive: true,
        confirmLabel: "Supprimer",
        onConfirm: () => {
          setCollaborators(collaborators.filter((c: any) => c.id !== id));
          setHasUnsavedChanges(true);
          hideModal();
        }
      });
    }
  }

  async function searchProductions(text: string) {
    setSearchProductionQuery(text);
    if (text.length < 3) {
      setProductionSuggestions([]);
      return;
    }

    try {
      setSearchingProduction(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .eq("user_role", "societe_production")
        .or(`full_name.ilike.%${text}%,username.ilike.%${text}%`)
        .limit(5);

      if (error) throw error;
      setProductionSuggestions(data || []);
    } catch (e) {
      console.log("Search production error:", e);
    } finally {
      setSearchingProduction(false);
    }
  }

  function selectProduction(profile: any) {
    setSelectedProduction(profile);
    setProductionCompany(profile.full_name || profile.username || "");
    setProductionType("professionnelle");
    setHasUnsavedChanges(true);
    setSearchProductionQuery("");
    setProductionSuggestions([]);
    
    // Auto-add to pending collaborators if not already there
    if (!pendingCollaborators.find(p => p.id === profile.id) && !collaborators.find(p => p.id === profile.id)) {
      setPendingCollaborators(prev => [...prev, profile]);
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
      setModalConfig({
        visible: true,
        title: "Erreur",
        message: "Impossible de modifier la visibilité.",
        isDestructive: false,
        confirmLabel: "OK",
        onConfirm: hideModal
      });
    }
  }

  async function handleQuitProject(roleId: string) {
    setModalConfig({
      visible: true,
      title: "Quitter le projet",
      message: "Êtes-vous sûr de vouloir quitter ce projet ? Votre rôle sera à nouveau vacant.",
      isDestructive: true,
      confirmLabel: "Quitter",
      onConfirm: async () => {
        hideModal();
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
          setModalConfig({
            visible: true,
            title: "Erreur",
            message: (error as Error).message,
            isDestructive: false,
            confirmLabel: "OK",
            onConfirm: hideModal
          });
        } finally {
          setSaving(false);
        }
      }
    });
  }

  async function handleDeleteProject() {
    const performDelete = async () => {
      try {
        setSaving(true);

        // 1. Delete dependent data manually because foreign keys might not be set to CASCADE

        // Delete messages
        await supabase
          .from("project_messages" as any)
          .delete()
          .eq("project_id", projectId);

        // Delete events
        await supabase
          .from("project_events" as any)
          .delete()
          .eq("tournage_id", projectId);

        // Delete roles (and related applications if they don't cascade, but usually roles->tournage is cascade?
        // If not, we delete applications first then roles)
        // Let's assume we need to be thorough.
        const { data: roles } = await supabase
          .from("project_roles")
          .select("id")
          .eq("tournage_id", projectId);
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
            .eq("tournage_id", projectId);
        }

        // Delete posts linked to project if any
        await supabase.from("posts").delete().eq("project_id", projectId);

        // 2. Finally delete the project
        const { error } = await supabase
          .from("tournages")
          .delete()
          .eq("id", projectId);
        if (error) throw error;

        router.replace("/(tabs)/my-projects");
      } catch (error) {
        setModalConfig({
          visible: true,
          title: "Erreur",
          message: (error as Error).message,
          isDestructive: false,
          confirmLabel: "OK",
          onConfirm: hideModal
        });
      } finally {
        setSaving(false);
      }
    };

    setModalConfig({
      visible: true,
      title: "Supprimer le projet",
      message: "Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.",
      isDestructive: true,
      confirmLabel: "Supprimer",
      onConfirm: () => {
        hideModal();
        performDelete();
      }
    });
  }

  async function handleRemoveParticipant(roleId: string) {
    const performRemove = async () => {
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
        setModalConfig({
          visible: true,
          title: "Erreur",
          message: (error as Error).message,
          isDestructive: false,
          confirmLabel: "OK",
          onConfirm: hideModal
        });
      }
    };

    setModalConfig({
      visible: true,
      title: "Retirer le participant",
      message: "Voulez-vous retirer ce participant du projet ?",
      isDestructive: true,
      confirmLabel: "Retirer",
      onConfirm: () => {
        hideModal();
        performRemove();
      }
    });
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
            onPress={() => {
              const navigateBack = () => router.push(`/project/${projectId}` as any);
              
              if (hasUnsavedChanges) {
                showAlert({
                  title: "Modifications non enregistrées",
                  message: "Voulez-vous enregistrer avant de quitter ?",
                  confirmLabel: "Quitter",
                  onConfirm: navigateBack,
                  onSave: () => {
                    handleUpdateInfo();
                    navigateBack();
                  }
                });
              } else {
                navigateBack();
              }
            }}
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
                onChangeText={(val) => {
                  setTitle(val);
                  setHasUnsavedChanges(true);
                }}
                placeholderTextColor={colors.textSecondary + "80"}
              />

              <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Type de projet</Text>
              <View style={[styles.row, { flexWrap: "wrap", marginBottom: 15 }]}>
                {PROJECT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => {
                      setType(t.value);
                      setHasUnsavedChanges(true);
                    }}
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
                onChangeText={(val) => {
                  setDescription(val);
                  setHasUnsavedChanges(true);
                }}
                multiline
                placeholderTextColor={colors.textSecondary + "80"}
              />

              <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Avez-vous une société de production ?</Text>
              <View style={[styles.row, { flexWrap: "wrap", marginBottom: 15 }]}>
                {PRODUCTION_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => {
                      setProductionType(t.value);
                      setHasUnsavedChanges(true);
                      if (t.value !== "societe") {
                        setProductionCompany("");
                        setSelectedProduction(null);
                      }
                    }}
                    style={[
                      styles.typeButton,
                      productionType === t.value && styles.typeButtonSelected,
                      t.value === "recherche" && productionType === "recherche" && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                  >
                    <Text
                      style={{
                        color: productionType === t.value ? "white" : colors.text,
                        fontWeight: t.value === "recherche" ? "700" : "600",
                        fontSize: 13,
                      }}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {productionType === "societe" && (
                <View style={{ marginBottom: 15 }}>
                  <Text style={styles.fieldLabel}>Société de Production</Text>
                  {selectedProduction || (productionCompany && !productionSuggestions.length) ? (
                    <View style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: colors.background,
                      padding: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.primary,
                      marginBottom: 10
                    }}>
                      <Ionicons name="business-outline" size={24} color={colors.primary} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ color: colors.text, fontWeight: "600" }}>{productionCompany}</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          {selectedProduction ? "Société invitée" : "Saisie manuelle"}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => {
                        setSelectedProduction(null);
                        setProductionCompany("");
                        setHasUnsavedChanges(true);
                      }}>
                        <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ position: "relative", zIndex: 3000 }}>
                      <TextInput
                        placeholder="Rechercher une société existante..."
                        style={styles.formInput}
                        value={searchProductionQuery}
                        onChangeText={searchProductions}
                        placeholderTextColor={colors.textSecondary + "80"}
                      />
                      {searchingProduction && (
                        <ActivityIndicator 
                          size="small" 
                          color={colors.primary} 
                          style={{ position: "absolute", right: 10, top: 12 }} 
                        />
                      )}
                      
                      {productionSuggestions.length > 0 && (
                        <View style={{
                          position: "absolute",
                          top: 48,
                          left: 0,
                          right: 0,
                          backgroundColor: colors.backgroundSecondary,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: colors.border,
                          zIndex: 3001,
                          elevation: 5
                        }}>
                          {productionSuggestions.map((p) => (
                            <TouchableOpacity
                              key={p.id}
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                padding: 10,
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border
                              }}
                              onPress={() => selectProduction(p)}
                            >
                              <Image
                                source={p.avatar_url ? { uri: p.avatar_url } : {}}
                                style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.border }}
                              />
                              <Text style={{ marginLeft: 10, color: colors.text }}>{p.full_name || p.username}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      
                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, fontStyle: "italic" }}>
                        Ou renseignez le nom manuellement :
                      </Text>
                      <TextInput
                        placeholder="Nom de la société..."
                        style={[styles.formInput, { marginTop: 4 }]}
                        value={productionCompany}
                        onChangeText={(t) => {
                          setProductionCompany(t);
                          setHasUnsavedChanges(true);
                          if (selectedProduction) setSelectedProduction(null);
                        }}
                        placeholderTextColor={colors.textSecondary + "80"}
                      />
                    </View>
                  )}
                </View>
              )}

              <View style={[styles.row, { marginTop: 15 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Ville</Text>
                  <CityPicker
                    currentValue={ville}
                    onSelect={(val) => {
                      setVille(val);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Ex: Paris"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Pays</Text>
                  <CountryPicker
                    currentValue={pays}
                    onSelect={(val) => {
                      setPays(val);
                      setHasUnsavedChanges(true);
                    }}
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
                  setHasUnsavedChanges(true);
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
                    <WebDatePicker 
                      value={startDate} 
                      onChange={(val) => {
                        setStartDate(val);
                        setHasUnsavedChanges(true);
                      }} 
                    />
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
                            if (date) {
                              setStartDate(date.toISOString().split("T")[0]);
                              setHasUnsavedChanges(true);
                            }
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
                    <WebDatePicker 
                      value={endDate} 
                      onChange={(val) => {
                        setEndDate(val);
                        setHasUnsavedChanges(true);
                      }} 
                    />
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
                            if (date) {
                              setEndDate(date.toISOString().split("T")[0]);
                              setHasUnsavedChanges(true);
                            }
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
                  onPress={() => {
                    setIsPublic(!isPublic);
                    setHasUnsavedChanges(true);
                  }}
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

            {/* SECTION 6: COLLABORATEURS */}
            {isTrueOwner && (
              <View style={styles.formSection}>
                <View style={styles.formSectionHeader}>
                  <Ionicons name="people-outline" size={18} color={colors.primary} />
                  <Text style={styles.formSectionTitle}>Collaborateurs</Text>
                </View>
                
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 15 }}>
                  Les collaborateurs peuvent modifier les informations du projet et gérer l'équipe.
                </Text>

                {/* Liste des collaborateurs actuels */}
                <View style={{ marginBottom: 15 }}>
                  <Text style={styles.fieldLabel}>Collaborateurs actifs</Text>
                  {collaborators.length === 0 ? (
                    <Text style={{ fontSize: 13, color: colors.textSecondary + "90", fontStyle: "italic", marginVertical: 8 }}>
                      Aucun collaborateur supplémentaire.
                    </Text>
                  ) : (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                      {collaborators.map((c) => (
                        <View key={c.id} style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: colors.backgroundSecondary,
                          borderRadius: 20,
                          paddingLeft: 4,
                          paddingRight: 10,
                          paddingVertical: 4,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}>
                          <Image
                            source={c.avatar_url ? { uri: c.avatar_url } : {}}
                            style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.border }}
                          />
                          <Text style={{ marginLeft: 8, marginRight: 4, fontSize: 12, color: colors.text, fontWeight: "600" }}>
                            {c.full_name || c.username}
                          </Text>
                          <TouchableOpacity onPress={() => removeCollaborator(c.id, false)}>
                            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Liste des invitations en attente */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.fieldLabel}>Invitations en attente</Text>
                  {pendingCollaborators.length === 0 ? (
                    <Text style={{ fontSize: 13, color: colors.textSecondary + "90", fontStyle: "italic", marginVertical: 8 }}>
                      Aucune invitation en attente.
                    </Text>
                  ) : (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                      {pendingCollaborators.map((c) => (
                        <View key={c.id} style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: colors.primary + "10",
                          borderRadius: 20,
                          paddingLeft: 4,
                          paddingRight: 10,
                          paddingVertical: 4,
                          borderWidth: 1,
                          borderColor: colors.primary + "30",
                        }}>
                          <Image
                            source={c.avatar_url ? { uri: c.avatar_url } : {}}
                            style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.border }}
                          />
                          <Text style={{ marginLeft: 8, marginRight: 4, fontSize: 12, color: colors.primary, fontWeight: "600" }}>
                            {c.full_name || c.username}
                          </Text>
                          <TouchableOpacity onPress={() => removeCollaborator(c.id, true)}>
                            <Ionicons name="close-circle" size={18} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* Recherche pour ajouter */}
                <View style={{ position: "relative", zIndex: 100 }}>
                  <Text style={styles.fieldLabel}>Ajouter un collaborateur</Text>
                  <View style={[styles.formInput, { flexDirection: "row", alignItems: "center", paddingRight: 10 }]}>
                    <TextInput
                      style={{ flex: 1, color: colors.text, height: "100%" }}
                      value={searchQuery}
                      onChangeText={(val) => {
                        setSearchQuery(val);
                        searchProfiles(val);
                      }}
                      placeholder="Nom ou pseudo..."
                      placeholderTextColor={colors.textSecondary + "80"}
                    />
                    {isSearching ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="search" size={20} color={colors.textSecondary} />
                    )}
                  </View>

                  {searchResults.length > 0 && (
                    <View style={{
                      position: "absolute",
                      top: 75,
                      left: 0,
                      right: 0,
                      backgroundColor: colors.background,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      maxHeight: 200,
                      overflow: "hidden",
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 5,
                      zIndex: 1001,
                    }}>
                      <ScrollView>
                        {searchResults.map((p) => (
                          <TouchableOpacity
                            key={p.id}
                            onPress={() => addCollaborator(p)}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              padding: 12,
                              borderBottomWidth: 1,
                              borderBottomColor: colors.border,
                            }}
                          >
                            <Image
                              source={p.avatar_url ? { uri: p.avatar_url } : {}}
                              style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.border }}
                            />
                            <View style={{ marginLeft: 12 }}>
                              <Text style={{ color: colors.text, fontWeight: "600" }}>{p.full_name || "Sans nom"}</Text>
                              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>@{p.username}</Text>
                            </View>
                            <Ionicons name="add-circle-outline" size={24} color={colors.primary} style={{ marginLeft: "auto" }} />
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
            )}
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
            {/* SECTION 7: DANGER ZONE */}
            {isTrueOwner && (
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
            )}
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

      <ConfirmationModal
        visible={modalConfig.visible}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={modalConfig.onConfirm}
        onCancel={hideModal}
        confirmLabel={modalConfig.confirmLabel}
        isDestructive={modalConfig.isDestructive}
      />
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
