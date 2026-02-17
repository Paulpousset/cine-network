import CityAutocomplete from "@/components/CityAutocomplete";
import ClapLoading from "@/components/ClapLoading";
import PaymentModal from "@/components/PaymentModal";
import { GlobalStyles } from "@/constants/Styles";
import { useUserMode } from "@/hooks/useUserMode";
import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";
import { JOB_TITLES } from "@/utils/roles";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

// --- CONSTANTS ---
const HAIR_COLORS = [
  "Brun",
  "Châtain",
  "Blond",
  "Roux",
  "Noir",
  "Gris",
  "Blanc",
  "Autre",
];
const EYE_COLORS = ["Marron", "Bleu", "Vert", "Noisette", "Gris", "Vairons"];

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

export default function Account() {
  const router = useRouter();
  const { mode, effectiveUserId, isImpersonating } = useUserMode(); // Mode is mostly visual/role based
  const { isGuest } = useUser();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [profile, setProfile] = useState<any>({});
  const [full_name, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [role, setRole] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [secondaryRole, setSecondaryRole] = useState("");
  const [secondaryJobTitle, setSecondaryJobTitle] = useState("");
  const [avatar_url, setAvatarUrl] = useState("");
  const [subscriptionTier, setSubscriptionTier] = useState("free");
  const [bio, setBio] = useState("");
  const [email_public, setEmailPublic] = useState("");
  const [phone, setPhone] = useState("");
  const [height, setHeight] = useState("");
  const [hair_color, setHairColor] = useState("");
  const [eye_color, setEyeColor] = useState("");
  const [equipment, setEquipment] = useState("");
  const [software, setSoftware] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillsInput, setSkillsInput] = useState("");
  const [cv_url, setCvUrl] = useState<string | null>(null);
  const [book_urls, setBookUrls] = useState<string[]>([]);
  const [showreel_url, setShowreelUrl] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [hiddenProjectIds, setHiddenProjectIds] = useState<string[]>([]);
  const [isContactVisible, setIsContactVisible] = useState(true);
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [myParticipations, setMyParticipations] = useState<any[]>([]);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [fullTextModal, setFullTextModal] = useState<{
    visible: boolean;
    title: string;
    text: string;
    onSave: (text: string) => void;
  }>({ visible: false, title: "", text: "", onSave: () => {} });

  const { colors, isDark } = useTheme();

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
      paddingTop: 50,
      paddingBottom: 15,
      paddingHorizontal: 15,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    scrollContent: { padding: 20 },
    avatar: { width: 100, height: 100, borderRadius: 50 },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: isDark ? "#374151" : "#eee",
      justifyContent: "center",
      alignItems: "center",
    },
    editBadge: {
      position: "absolute",
      right: 0,
      bottom: 0,
      backgroundColor: colors.primary,
      padding: 6,
      borderRadius: 15,
      borderWidth: 2,
      borderColor: colors.background,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "700",
      marginTop: 25,
      marginBottom: 15,
      color: colors.text,
      textTransform: "uppercase",
      letterSpacing: 1,
      opacity: 0.8,
    },
    label: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, fontWeight: "500" },
    textArea: { height: 100, textAlignVertical: "top" },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      borderRadius: 10,
      backgroundColor: colors.primary,
      marginTop: 5,
    },
    skillBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary + "15",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
    },
    skillText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
    docItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      backgroundColor: colors.background,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    radioGroup: { flexDirection: "row", gap: 10, marginTop: 5 },
    radioButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    radioButtonActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "10",
    },
    radioText: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    radioTextActive: { color: colors.primary, fontWeight: "700" },
    input: {
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 15,
    },
    saveButtonFloating: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    errorText: {
      color: colors.danger,
      fontSize: 12,
      marginBottom: 10,
      fontWeight: "500",
    },
    tag: {
      paddingVertical: 8,
      paddingHorizontal: 9,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: "transparent",
    },
    tagSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + "10",
    },
    tagText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    tagTextSelected: {
      color: colors.primary,
      fontWeight: "600",
    },
    tagsContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    skillTag: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.primary + "15",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
    },
    fileButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    card: {
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
  });

  useEffect(() => {
    fetchProfile();
  }, [effectiveUserId]);

  async function fetchProfile() {
    try {
      if (!effectiveUserId) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", effectiveUserId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setFullName(data.full_name || "");
        setUsername(data.username || "");
        setCity(data.ville || "");
        setWebsite(data.website || "");
        setRole(data.role || "");
        setJobTitle(data.job_title || "");
        setSecondaryRole(data.secondary_role || "");
        setSecondaryJobTitle(data.secondary_job_title || "");
        setAvatarUrl(data.avatar_url);
        setSubscriptionTier(data.subscription_tier || "free");

        // Nouveaux champs (si existants)
        setBio(data.bio || "");
        setEmailPublic(data.email_public || "");
        setPhone(data.phone || "");
        setHeight(data.height ? data.height.toString() : "");
        setHairColor(data.hair_color || "");
        setEyeColor(data.eye_color || "");
        setEquipment(data.equipment || "");
        setSoftware(data.software || "");
        setSpecialties(data.specialties || "");
        setSkills(data.skills || []);
        setCvUrl(data.cv_url || null);
        setBookUrls(data.book_urls || []);
        setShowreelUrl(data.showreel_url || "");
        setGender(data.gender || "");
        setAge(data.age ? data.age.toString() : "");
      }

      // Fetch visibility settings
      const { data: settings, error: settingsError } = await supabase
        .from("public_profile_settings")
        .select("*")
        .eq("id", effectiveUserId)
        .maybeSingle();

      if (!settingsError && settings) {
        setHiddenProjectIds(settings.hidden_project_ids || []);
        setIsContactVisible(settings.is_contact_visible ?? true);
      }

      // Fetch user's projects for visibility management
      const { data: projects } = await supabase
        .from("tournages")
        .select("id, title, type, created_at, status, image_url")
        .eq("owner_id", session?.user?.id || effectiveUserId)
        .order("created_at", { ascending: false });

      if (projects) {
        setMyProjects(projects);
      }

      // Fetch personal experience notes
      const { data: experienceNotes } = await supabase
        .from("profile_experience_notes")


        .select("project_id, note, image_url, image_urls, custom_title")
        .eq("profile_id", effectiveUserId);

      const notesMap = (experienceNotes || []).reduce((acc: any, curr: any) => {
        acc[curr.project_id] = {
            note: curr.note,
            image_url: curr.image_url,
            image_urls: curr.image_urls || [],
            custom_title: curr.custom_title
        };
        return acc;
      }, {});

      if (projects) {
        setMyProjects(projects.map((p: any) => ({
          ...p,
          personalNote: notesMap[p.id]?.note || "",
          personalImage: notesMap[p.id]?.image_url || null,
          personalImages: notesMap[p.id]?.image_urls || [],
          personalTitle: notesMap[p.id]?.custom_title || ""
        })));
      }

      // Fetch participations
      const { data: parts } = await supabase
        .from("project_roles")
        .select(
          `
          id,
          title,
          status,
          tournages (
            id,
            title,
            type,
            created_at,
            is_public,
            status,
            image_url
          )
        `,
        )
        .eq("assigned_profile_id", session?.user?.id || effectiveUserId);

      if (parts) {
        // Flatten structure
        const formattedParts = parts
          .map((p: any) => ({
            id: p.id,
            roleTitle: p.title,
            personalNote: notesMap[p.tournages?.id]?.note || "",
            personalImage: notesMap[p.tournages?.id]?.image_url || null,
            personalImages: notesMap[p.tournages?.id]?.image_urls || [],
            personalTitle: notesMap[p.tournages?.id]?.custom_title || "",
            projectId: p.tournages?.id,
            projectTime: p.tournages?.created_at,
            projectTitle: p.tournages?.title,
            projectType: p.tournages?.type,
            projectPublic: p.tournages?.is_public,
            projectStatus: p.tournages?.status,
            projectImage: p.tournages?.image_url
          }))
          .filter((p: any) => p.projectTitle);
        setMyParticipations(formattedParts);
      }
    } catch (e) {
      console.log("Erreur fetch:", e);
    } finally {
      setLoading(false);
    }
  }

  // --- UPLOAD HELPERS ---

  async function uploadImage(isAvatar: boolean = false) {
    if (isGuest) {
        Alert.alert("Invité", "Vous devez être connecté pour modifier votre profil.");
        return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0)
        return;

      setUploading(true);
      const image = result.assets[0];
      let fileExt = (image.uri.split(".").pop() || "jpg").split("?")[0];
      if (fileExt.includes(":") || fileExt.length > 5) {
        fileExt = image.mimeType?.split("/")[1] || "jpg";
      }
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = isAvatar ? `avatars/${fileName}` : `book/${fileName}`;

      const arrayBuffer = await fetch(image.uri).then((res) =>
        res.arrayBuffer(),
      );

      const { error: uploadError } = await supabase.storage
        .from("user_content") // We'll need this bucket
        .upload(filePath, arrayBuffer, {
          contentType: image.mimeType || "image/jpeg",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("user_content").getPublicUrl(filePath);

      if (isAvatar) {
        setAvatarUrl(publicUrl);
      } else {
        setBookUrls([...book_urls, publicUrl]);
      }
    } catch (e) {
      Alert.alert("Erreur upload", (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function uploadCV() {
    if (isGuest) {
        Alert.alert("Invité", "Vous devez être connecté pour modifier votre profil.");
        return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
      });

      if (result.canceled || !result.assets) return;
      setUploading(true);

      const file = result.assets[0];
      const fileName = `cvs/${Date.now()}_${file.name}`;

      const arrayBuffer = await fetch(file.uri).then((res) =>
        res.arrayBuffer(),
      );

      const { error } = await supabase.storage
        .from("user_content")
        .upload(fileName, arrayBuffer, {
          contentType: "application/pdf",
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("user_content").getPublicUrl(fileName);

      setCvUrl(publicUrl);
    } catch (e) {
      Alert.alert("Erreur upload CV", (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function toggleContactVisibility(value: boolean) {
    if (isGuest) {
        Alert.alert("Invité", "Vous devez être connecté pour modifier votre profil.");
        return;
    }
    try {
      setIsContactVisible(value); // Optimistic
      if (!effectiveUserId) return;

      const { error } = await supabase
        .from("public_profile_settings")
        .upsert({ id: effectiveUserId, is_contact_visible: value });

      if (error) throw error;
    } catch (e) {
      Alert.alert("Erreur", "Impossible de changer la visibilité du contact");
      setIsContactVisible(!value); // Revert
    }
  }

  async function toggleProjectVisibility(
    projectId: string,
    isVisible: boolean,
  ) {
    if (isGuest) {
        Alert.alert("Invité", "Vous devez être connecté pour modifier votre profil.");
        return;
    }
    try {
      let newHiddenIds = [...hiddenProjectIds];
      if (isVisible) {
        newHiddenIds = newHiddenIds.filter((id) => id !== projectId);
      } else {
        if (!newHiddenIds.includes(projectId)) {
          newHiddenIds.push(projectId);
        }
      }

      setHiddenProjectIds(newHiddenIds); // Optimistic

      if (!effectiveUserId) return;

      const { error } = await supabase.from("public_profile_settings").upsert({
        id: effectiveUserId,
        hidden_project_ids: newHiddenIds,
      });

      if (error) throw error;
    } catch (e) {
      Alert.alert("Erreur", "Impossible de changer la visibilité du projet");
    }
  }

  async function updateExperienceField(projectId: string, field: 'note' | 'image_url' | 'custom_title' | 'image_urls', value: string | string[] | null) {
    try {
      const keyMap = {
        note: 'personalNote',
        image_url: 'personalImage',
        image_urls: 'personalImages',
        custom_title: 'personalTitle'
      };
      
      const stateKey = keyMap[field];
      
      setMyProjects(prev => prev.map(p => p.id === projectId ? { ...p, [stateKey]: value } : p));
      setMyParticipations(prev => prev.map(p => p.projectId === projectId ? { ...p, [stateKey]: value } : p));
      
      if (!effectiveUserId) return;
      
      const { error } = await supabase
        .from("profile_experience_notes")
        .upsert({ 
          profile_id: effectiveUserId, 
          project_id: projectId,
          [field]: value,
          updated_at: new Date().toISOString()
        }, { onConflict: 'profile_id,project_id' });
      if (error) throw error;
    } catch (e) {
      console.error("Error updating experience field:", e);
    }
  }

  async function uploadExperienceImage(projectId: string) {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (result.canceled || !result.assets) return;
      setUploading(true);

      const image = result.assets[0];
      let fileExt = (image.uri.split(".").pop() || "jpg").split("?")[0];
      if (fileExt.includes(":") || fileExt.length > 5) {
        fileExt = image.mimeType?.split("/")[1] || "jpg";
      }
      const fileName = `experience/${effectiveUserId}/${projectId}_${Date.now()}.${fileExt}`;
      const response = await fetch(image.uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from("user_content")
        .upload(fileName, blob, {
          contentType: image.mimeType || blob.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("user_content").getPublicUrl(fileName);
      
      // Get current images
      const project = myProjects.find(p => p.id === projectId) || myParticipations.find(p => p.projectId === projectId);
      const currentImages = project?.personalImages || [];
      const newImages = [...currentImages, publicUrl];

      await updateExperienceField(projectId, 'image_urls', newImages);
      // For backward compatibility / main display
      if (!project?.personalImage) {
        await updateExperienceField(projectId, 'image_url', publicUrl);
      }
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'uploader l'image d'expérience");
    } finally {
      setUploading(false);
    }
  }

  async function removeExperienceImage(projectId: string, imageUrl: string) {
    try {
      const project = myProjects.find(p => p.id === projectId) || myParticipations.find(p => p.projectId === projectId);
      const currentImages = project?.personalImages || [];
      const newImages = currentImages.filter((img: string) => img !== imageUrl);
      
      await updateExperienceField(projectId, 'image_urls', newImages);
      
      // If we removed the main image, update it to the next one or null
      if (project?.personalImage === imageUrl) {
        await updateExperienceField(projectId, 'image_url', newImages.length > 0 ? newImages[0] : null);
      }
    } catch (e) {
      Alert.alert("Erreur", "Impossible de supprimer l'image");
    }
  }

  async function handleUpgradeSuccess() {
    try {
      if (!effectiveUserId) return;

      const { error } = await supabase
        .from("profiles")
        .update({ 
          subscription_tier: "studio",
          updated_at: new Date().toISOString()
        })
        .eq("id", effectiveUserId);

      if (error) throw error;
      setSubscriptionTier("studio");
      Alert.alert("Félicitations !", "Le compte est maintenant membre Studio.");
    } catch (e) {
      Alert.alert("Erreur", "Impossible de mettre à jour votre abonnement.");
    }
  }

  // --- SAVE ---

  async function saveProfile() {
    // 1. Validation des champs requis
    const newErrors: { [key: string]: string } = {};
    if (!full_name?.trim()) newErrors.full_name = "Le nom complet est requis";
    if (!username?.trim())
      newErrors.username = "Le nom d'utilisateur est requis";
    if (!role?.trim()) newErrors.role = "Le rôle principal est requis";
    if (!city?.trim()) newErrors.city = "La ville est requise";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      setLoading(true);
      if (!effectiveUserId) return;

      const updates = {
        full_name,
        username,
        ville: city,
        website,
        role,
        job_title: jobTitle,
        secondary_role: secondaryRole,
        secondary_job_title: secondaryJobTitle,
        bio,
        email_public,
        phone,
        height: height ? parseInt(height) : null,
        hair_color,
        eye_color,
        equipment,
        software,
        specialties,
        skills,
        cv_url,
        book_urls,
        showreel_url,
        avatar_url,
        gender,
        age: age ? parseInt(age) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", effectiveUserId);

      if (error) {
        // Gestion erreur contrainte d'unicité (ex: username déjà pris)
        if (error.code === "23505") {
          setErrors((prev) => ({
            ...prev,
            username: "Ce nom d'utilisateur est déjà utilisé",
          }));
          return;
        }
        throw error;
      }

      appEvents.emit(EVENTS.PROFILE_UPDATED);

      if (Platform.OS === "web") {
        window.alert("Succès\n\nVotre profil a été mis à jour !");
      } else {
        Alert.alert("Succès", "Votre profil a été mis à jour !");
      }
    } catch (e) {
      const message =
        "Une erreur est survenue lors de la sauvegarde.\n" +
        (e as Error).message;
      if (Platform.OS === "web") {
        window.alert(`Erreur de sauvegarde\n\n${message}`);
      } else {
        Alert.alert("Erreur de sauvegarde", message);
      }
    } finally {
      setLoading(false);
    }
  }

  // --- RENDER HELPERS ---

  const SectionTitle = ({ title }: { title: string }) => (
    <Text style={styles.sectionTitle}>{title}</Text>
  );

  if (loading && !profile.id)
    return (
      <View style={styles.center}>
        <ClapLoading size={50} color={colors.primary} />
      </View>
    );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[GlobalStyles.title2, { marginBottom: 0, color: colors.text }]}>
          {profile.full_name || "Mon Profil"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            style={{ padding: 5 }}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              if (isGuest) {
                Alert.alert("Invité", "Vous devez être connecté pour modifier votre profil.");
                return;
              }
              saveProfile();
            }}
            disabled={loading || uploading || isGuest}
            style={{ padding: 5, opacity: isGuest ? 0.5 : 1 }}
          >
            {loading || uploading ? (
              <ClapLoading size={24} color={colors.primary} />
            ) : (
              <Text style={{ color: colors.primary, fontWeight: "bold" }}>
                Enregistrer
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* AVATAR */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <TouchableOpacity onPress={() => uploadImage(true)}>
            {avatar_url ? (
              <Image source={{ uri: avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="camera" size={30} color={colors.textSecondary} />
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={12} color="white" />
            </View>
          </TouchableOpacity>
          <Text style={{ marginTop: 10, color: colors.textSecondary }}>
            Photo de profil principale
          </Text>

          <TouchableOpacity
            onPress={() => router.push(`/profile/${effectiveUserId}`)}
            style={{
              marginTop: 15,
              backgroundColor: colors.primary + "20",
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Ionicons
              name="person-circle-outline"
              size={20}
              color={colors.primary}
            />
            <Text style={{ color: colors.primary, fontWeight: "600" }}>
              Voir ma carte de profil
            </Text>
          </TouchableOpacity>
        </View>

        {/* ABONNEMENT */}
        <View
          style={[
            GlobalStyles.card,
            styles.card,
            { alignItems: "center", paddingVertical: 25 },
          ]}
        >
          <Text style={[GlobalStyles.title2, { color: colors.text }]}>Mon Abonnement</Text>
          <View
            style={{
              backgroundColor:
                subscriptionTier === "studio" ? colors.primary : colors.backgroundSecondary,
              paddingHorizontal: 15,
              paddingVertical: 8,
              borderRadius: 20,
              marginVertical: 10,
              borderWidth: subscriptionTier === "studio" ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                color: subscriptionTier === "studio" ? "white" : colors.textSecondary,
                fontWeight: "bold",
                textTransform: "uppercase",
              }}
            >
              {subscriptionTier === "studio" ? "Studio Pro" : "Gratuit"}
            </Text>
          </View>

          {subscriptionTier === "free" && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginTop: 10,
                width: "100%",
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  if (isGuest) {
                    Alert.alert("Invité", "Vous devez être connecté pour passer membre Studio.");
                    return;
                  }
                  setPaymentModalVisible(true);
                }}
                disabled={isGuest}
                style={[GlobalStyles.primaryButton, { flex: 1, backgroundColor: colors.primary, opacity: isGuest ? 0.5 : 1 }]}
              >
                <Text style={GlobalStyles.buttonText}>
                  Passer Pro (9€/mois)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    "Abonnement Studio",
                    "En passant Studio, vous pouvez créer un nombre illimité de projets, accéder aux statistiques avancées et bénéficier d'une meilleure visibilité.",
                  )
                }
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="information-circle-outline" size={24} color={colors.text + "80"} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 1. INFOS GENERALES */}
        <SectionTitle title="Informations Générales" />
        <View style={[GlobalStyles.card, styles.card]}>
          <Text style={styles.label}>Nom complet</Text>
          <TextInput
            style={styles.input}
            value={full_name || ""}
            onChangeText={setFullName}
            placeholder="Prénom Nom"
            placeholderTextColor={isDark ? "#6B7280" : "#999"}
          />
          {errors.full_name && (
            <Text style={styles.errorText}>{errors.full_name}</Text>
          )}

          <Text style={styles.label}>Nom d'utilisateur (Pseudo)</Text>
          <TextInput
            style={styles.input}
            value={username || ""}
            onChangeText={setUsername}
            placeholder="pseudo"
            autoCapitalize="none"
            placeholderTextColor={isDark ? "#6B7280" : "#999"}
          />
          {errors.username && (
            <Text style={styles.errorText}>{errors.username}</Text>
          )}

          <Text style={styles.label}>Rôle Principal</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 15 }}
          >
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                onPress={() => {
                  setRole(r.value);
                  setJobTitle(""); // Reset job title when category changes
                }}
                style={[
                  styles.tag,
                  role === r.value && styles.tagSelected,
                  { marginRight: 8 },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    role === r.value && styles.tagTextSelected,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}

          {role && (JOB_TITLES as any)[role] && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[styles.label, { marginBottom: 0 }]}>Intitulé de poste (Principal)</Text>
                
              </View>

              {/* Affichage des éléments sélectionnés sous forme de tags */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {jobTitle.split(',').map((t, i) => t.trim() ? (
                    <TouchableOpacity 
                        key={i} 
                        onPress={() => {
                            const tags = jobTitle.split(',').map(s => s.trim()).filter(s => s !== t.trim());
                            setJobTitle(tags.join(', '));
                        }}
                        style={[styles.tag, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30', flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                    >
                        <Text style={[styles.tagText, { color: colors.primary }]}>{t.trim()}</Text>
                        <Ionicons name="close-circle" size={14} color={colors.primary} />
                    </TouchableOpacity>
                ) : null)}
              </View>

              
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 15, marginTop: -5 }}
              >
                {(JOB_TITLES as any)[role].map((title: string) => (
                  <TouchableOpacity
                    key={title}
                    onPress={() => {
                        const currentTags = jobTitle.split(',').map(t => t.trim()).filter(t => t !== "");
                        if (!currentTags.includes(title)) {
                            setJobTitle([...currentTags, title].join(', '));
                        }
                    }}
                    style={[
                      styles.tag,
                      jobTitle.includes(title) && styles.tagSelected,
                      { marginRight: 8, paddingVertical: 4 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        jobTitle.includes(title) && styles.tagTextSelected,
                        { fontSize: 11 }
                      ]}
                    >
                      {title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={styles.label}>Rôle Secondaire (Optionnel)</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 15 }}
          >
            <TouchableOpacity
              onPress={() => {
                setSecondaryRole("");
                setSecondaryJobTitle("");
              }}
              style={[
                styles.tag,
                secondaryRole === "" && styles.tagSelected,
                { marginRight: 8 },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  secondaryRole === "" && styles.tagTextSelected,
                ]}
              >
                Aucun
              </Text>
            </TouchableOpacity>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                onPress={() => {
                  setSecondaryRole(r.value);
                }}
                style={[
                  styles.tag,
                  secondaryRole === r.value && styles.tagSelected,
                  { marginRight: 8 },
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    secondaryRole === r.value && styles.tagTextSelected,
                  ]}
                >
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {secondaryRole && (JOB_TITLES as any)[secondaryRole] && (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[styles.label, { marginBottom: 0 }]}>Intitulé de poste (Secondaire)</Text>
              </View>

              {/* Affichage des éléments sélectionnés sous forme de tags pour le rôle secondaire */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                {secondaryJobTitle.split(',').map((t, i) => t.trim() ? (
                    <TouchableOpacity 
                        key={i} 
                        onPress={() => {
                            const tags = secondaryJobTitle.split(',').map(s => s.trim()).filter(s => s !== t.trim());
                            setSecondaryJobTitle(tags.join(', '));
                        }}
                        style={[styles.tag, { backgroundColor: colors.textSecondary + '10', borderColor: colors.textSecondary + '30', flexDirection: 'row', alignItems: 'center', gap: 6 }]}
                    >
                        <Text style={[styles.tagText, { color: colors.textSecondary }]}>{t.trim()}</Text>
                        <Ionicons name="close-circle" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                ) : null)}
              </View>

              
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 15, marginTop: -5 }}
              >
                {(JOB_TITLES as any)[secondaryRole].map((title: string) => (
                  <TouchableOpacity
                    key={title}
                    onPress={() => {
                        const currentTags = secondaryJobTitle.split(',').map(t => t.trim()).filter(t => t !== "");
                        if (!currentTags.includes(title)) {
                            setSecondaryJobTitle([...currentTags, title].join(', '));
                        }
                    }}
                    style={[
                      styles.tag,
                      secondaryJobTitle.includes(title) && styles.tagSelected,
                      { marginRight: 8, paddingVertical: 4 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        secondaryJobTitle.includes(title) && styles.tagTextSelected,
                        { fontSize: 11 }
                      ]}
                    >
                      {title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <Text style={styles.label}>Ville de résidence</Text>
          <CityAutocomplete
            value={city}
            onSelect={(val) => setCity(val)}
            placeholder="Paris (75)"
          />
          {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 15 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Genre</Text>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {["Homme", "Femme", "Autre"].map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setGender(g)}
                    style={[
                      styles.tag,
                      gender === g && styles.tagSelected,
                      { flex: 1, justifyContent: "center" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tagText,
                        gender === g && styles.tagTextSelected,
                        { textAlign: "center" },
                      ]}
                    >
                      {g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={{ width: 80 }}>
              <Text style={styles.label}>Âge</Text>
              <TextInput
                style={styles.input}
                value={age || ""}
                onChangeText={setAge}
                placeholder="25"
                keyboardType="numeric"
                placeholderTextColor={isDark ? "#6B7280" : "#999"}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.label}>Bio / Présentation</Text>
            <TouchableOpacity 
              onPress={() => setFullTextModal({ 
                visible: true, 
                title: "Bio / Présentation", 
                text: bio, 
                onSave: setBio 
              })}
              style={{ paddingBottom: 6 }}
            >
              <Ionicons name="expand-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio || ""}
            onChangeText={setBio}
            placeholder="Décrivez votre parcours en quelques lignes..."
            multiline
            placeholderTextColor={isDark ? "#6B7280" : "#999"}
          />
        </View>

        {/* 2. CONTACT PUBLIC */}
        <SectionTitle title="Contact & Pro" />
        <View style={[GlobalStyles.card, styles.card]}>
          <Text style={styles.label}>Site web / Portfolio URL</Text>
          <TextInput
            style={styles.input}
            value={website || ""}
            onChangeText={setWebsite}
            placeholder="https://..."
            autoCapitalize="none"
            placeholderTextColor={isDark ? "#6B7280" : "#999"}
          />

          <Text style={styles.label}>Email Pro (Public)</Text>
          <TextInput
            style={styles.input}
            value={email_public || ""}
            onChangeText={setEmailPublic}
            placeholder="contact@exemple.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={isDark ? "#6B7280" : "#999"}
          />

          <Text style={styles.label}>Téléphone (Optionnel)</Text>
          <TextInput
            style={styles.input}
            value={phone || ""}
            onChangeText={setPhone}
            placeholder="+33 6..."
            keyboardType="phone-pad"
            placeholderTextColor={isDark ? "#6B7280" : "#999"}
          />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 10,
              paddingTop: 10,
              borderTopWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>
              Afficher mes contacts sur mon profil public ?
            </Text>
            <Switch
              value={isContactVisible}
              onValueChange={toggleContactVisibility}
              trackColor={{ false: "#767577", true: colors.primary }}
              thumbColor={isContactVisible ? colors.primary : (isDark ? "#374151" : "#f4f3f4")}
            />
          </View>
        </View>

        {/* 3. CATEGORY SPECIFIC FIELDS */}

        {/* PHYSICAL (Actors/Models) */}
        {role === "acteur" && (
          <>
            <SectionTitle title="Apparence & Caractéristiques" />
            <View style={[GlobalStyles.card, styles.card]}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Taille (cm)</Text>
                  <TextInput
                    style={styles.input}
                    value={height || ""}
                    onChangeText={setHeight}
                    placeholder="175"
                    keyboardType="numeric"
                    placeholderTextColor={isDark ? "#6B7280" : "#999"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Yeux</Text>
                  <View style={styles.tagsContainer}>
                    {EYE_COLORS.map((ec) => (
                      <TouchableOpacity
                        key={ec}
                        onPress={() => setEyeColor(ec)}
                        style={[
                          styles.tag,
                          eye_color === ec && styles.tagSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.tagText,
                            eye_color === ec && styles.tagTextSelected,
                          ]}
                        >
                          {ec}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              <View style={{ marginTop: 10 }}>
                <Text style={styles.label}>Cheveux</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {HAIR_COLORS.map((hc) => (
                    <TouchableOpacity
                      key={hc}
                      onPress={() => setHairColor(hc)}
                      style={[
                        styles.tag,
                        hair_color === hc && styles.tagSelected,
                        { marginRight: 8 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          hair_color === hc && styles.tagTextSelected,
                        ]}
                      >
                        {hc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </>
        )}

        {/* TECH (Equipment/Software) */}
        {[
          "technicien",
          "realisateur",
          "production",
          "image",
          "son",
          "deco",
          "post_prod",
        ].includes(role) && (
          <>
            <SectionTitle title="Matériel & Outils" />
            <View style={[GlobalStyles.card, styles.card]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[styles.label, { marginBottom: 0 }]}>
                    Matériel (Caméra, Son, Lumière...)
                </Text>
                
              </View>
              <Text style={{ fontSize: 8, color: colors.primary, fontWeight: '600',paddingBottom: 2 }}>
                    SÉPARER PAR DES VIRGULES
                </Text>
              <TextInput
                style={styles.input}
                value={equipment || ""}
                onChangeText={setEquipment}
                placeholder="Ex: Sony A7S III, Micro Zoom H6..."
                placeholderTextColor={isDark ? "#6B7280" : "#999"}
              />
              
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={[styles.label, { marginBottom: 0 }]}>Logiciels & Outils</Text>
                
              </View>
              <Text style={{ fontSize: 8, color: colors.primary, fontWeight: '600', paddingBottom: 2 }}>
                    SÉPARER PAR DES VIRGULES
              </Text>
              <TextInput
                style={styles.input}
                value={software || ""}
                onChangeText={setSoftware}
                placeholder="Premiere Pro, DaVinci, Final Draft..."
                placeholderTextColor={isDark ? "#6B7280" : "#999"}
              />
            </View>
          </>
        )}

        {/* HMC (Specialties) */}
        {role === "hmc" && (
          <>
            <SectionTitle title="Spécialités HMC" />
            <View style={[GlobalStyles.card, styles.card]}>
              <Text style={styles.label}>Spécialités</Text>
              <TextInput
                style={styles.input}
                value={specialties || ""}
                onChangeText={setSpecialties}
                placeholder="Maquillage SFX, Coiffure époque..."
                placeholderTextColor={isDark ? "#6B7280" : "#999"}
              />
            </View>
          </>
        )}

        {/* 4. SKILLS */}
        <SectionTitle title="Compétences & Tags" />
        <View style={[GlobalStyles.card, styles.card]}>
          <View style={{ flexDirection: "row", gap: 5 }}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={skillsInput}
              onChangeText={setSkillsInput}
              placeholder="Ajouter (ex: Piano, Permis B, Montage...)"
              placeholderTextColor={isDark ? "#6B7280" : "#999"}
              onSubmitEditing={() => {
                if (skillsInput.trim()) {
                  setSkills([...skills, skillsInput.trim()]);
                  setSkillsInput("");
                }
              }}
            />
            <TouchableOpacity
              onPress={() => {
                if (skillsInput.trim()) {
                  setSkills([...skills, skillsInput.trim()]);
                  setSkillsInput("");
                }
              }}
              style={styles.addButton}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <View style={[styles.tagsContainer, { marginTop: 10 }]}>
            {skills.map((s, i) => (
              <View key={i} style={styles.skillTag}>
                <Text style={{ color: colors.text, marginRight: 5 }}>{s}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setSkills(skills.filter((_, idx) => idx !== i))
                  }
                >
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* 5. DOCUMENTS & MEDIAS */}
        <SectionTitle title="Documents & Médias" />
        <View style={[GlobalStyles.card, styles.card]}>
          {/* CV */}
          <Text style={styles.label}>CV (PDF)</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            {cv_url ? (
              <TouchableOpacity
                style={styles.fileButton}
                onPress={() => Alert.alert("CV", "Fichier déjà uploadé")}
              >
                <Ionicons
                  name="document-text"
                  size={24}
                  color={colors.primary}
                />
                <Text
                  style={{
                    marginLeft: 10,
                    color: colors.primary,
                    fontWeight: "600",
                  }}
                >
                  CV Uploadé
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={uploadCV}
              style={[
                styles.fileButton,
                { backgroundColor: colors.backgroundSecondary, marginLeft: cv_url ? 10 : 0 },
              ]}
            >
              <Text style={{ color: colors.text }}>
                {uploading
                  ? "..."
                  : cv_url
                    ? "Mettre à jour"
                    : "Générer / Uploader"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* BOOK */}
          <Text style={styles.label}>Book Photos (Max 6)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {book_urls.map((url, i) => (
              <View key={i} style={{ marginRight: 10, position: "relative" }}>
                <Image
                  source={{ uri: url }}
                  style={{ width: 80, height: 80, borderRadius: 8 }}
                />
                <TouchableOpacity
                  onPress={() =>
                    setBookUrls(book_urls.filter((_, idx) => idx !== i))
                  }
                  style={{
                    position: "absolute",
                    top: -5,
                    right: -5,
                    backgroundColor: colors.card,
                    borderRadius: 10,
                  }}
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={colors.danger}
                  />
                </TouchableOpacity>
              </View>
            ))}
            {book_urls.length < 6 && (
              <TouchableOpacity
                onPress={() => uploadImage(false)}
                style={{
                  width: 80,
                  height: 80,
                  backgroundColor: colors.backgroundSecondary,
                  borderRadius: 8,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Ionicons name="add" size={30} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Showreel */}
          <Text style={[styles.label, { marginTop: 15 }]}>
            Bande Démo (Lien YouTube/Vimeo)
          </Text>
          <TextInput
            style={styles.input}
            value={showreel_url || ""}
            onChangeText={setShowreelUrl}
            placeholder="https://youtube.com/..."
            autoCapitalize="none"
            placeholderTextColor={isDark ? "#6B7280" : "#999"}
          />
        </View>

        {/* 6. VISIBILITÉ PROJETS */}
        <SectionTitle title="Mes Projets" />
        <View style={[GlobalStyles.card, styles.card]}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 15 }}>
            Cochez les projets que vous souhaitez rendre visibles sur votre
            profil public.
          </Text>

          {/* CREATOR PROJECTS */}
          <Text style={{ fontWeight: "bold", marginBottom: 10, color: colors.text }}>
            Projets créés ({myProjects.length})
          </Text>
          {myProjects.length === 0 ? (
            <Text
              style={{ fontStyle: "italic", color: colors.textSecondary, marginBottom: 15 }}
            >
              Aucun projet créé.
            </Text>
          ) : (
            myProjects.map((p) => {
              const isVisible = !hiddenProjectIds.includes(p.id);
              return (
                <View key={p.id} style={{ marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderColor: colors.border }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "600", color: colors.text }}>{p.title}</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                        {p.type} • {new Date(p.created_at).toLocaleDateString()}
                      </Text>
                      <TouchableOpacity 
                        onPress={() => {
                          if (p.status === "completed") {
                            router.push("/hall-of-fame");
                          } else {
                            router.push(`/project/${p.id}`);
                          }
                        }}
                        style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 }}
                      >
                        <Ionicons name={p.status === "completed" ? "trophy-outline" : "film-outline"} size={14} color={colors.primary} />
                        <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>
                          {p.status === "completed" ? "Voir au Hall of Fame" : "Accéder au projet"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Switch
                      value={isVisible}
                      onValueChange={(val) => toggleProjectVisibility(p.id, val)}
                      trackColor={{
                        false: "#767577",
                        true: colors.primary,
                      }}
                      thumbColor={isVisible ? colors.primary : (isDark ? "#374151" : "#f4f3f4")}
                    />
                  </View>

                  <View style={{ marginBottom: 10 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                        {p.personalImages && p.personalImages.map((img: string, i: number) => (
                            <View key={i} style={{ position: 'relative' }}>
                                <Image source={{ uri: img }} style={{ width: 100, height: 75, borderRadius: 8 }} />
                                <TouchableOpacity 
                                    onPress={() => removeExperienceImage(p.id, img)}
                                    style={{ position: 'absolute', top: -5, right: -5, backgroundColor: colors.card, borderRadius: 10 }}
                                >
                                    <Ionicons name="close-circle" size={20} color={colors.danger} />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity 
                            onPress={() => uploadExperienceImage(p.id)}
                            style={{ width: 100, height: 75, borderRadius: 8, backgroundColor: colors.backgroundSecondary, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border }}
                        >
                            <Ionicons name="camera" size={24} color={colors.textSecondary} />
                            <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4 }}>Ajouter</Text>
                        </TouchableOpacity>
                    </ScrollView>
                  </View>

                  <View style={{ marginBottom: 10 }}>
                    <TextInput
                        style={[styles.input, { fontSize: 13, paddingVertical: 8, marginBottom: 0 }]}
                        placeholder="Titre personnalisé (ex: Ma réalisation préférée)"
                        placeholderTextColor={isDark ? "#6B7280" : "#999"}
                        value={p.personalTitle || ""}
                        onChangeText={(val) => updateExperienceField(p.id, 'custom_title', val)}
                    />
                  </View>

                  <View style={{ position: 'relative' }}>
                    <TextInput
                        style={[styles.input, { fontSize: 13, paddingVertical: 8, height: 60, marginBottom: 0, paddingRight: 40 }]}
                        placeholder="Ajouter une description pour ce tournage (visible sur votre profil)..."
                        placeholderTextColor={isDark ? "#6B7280" : "#999"}
                        value={p.personalNote || ""}
                        onChangeText={(val) => updateExperienceField(p.id, 'note', val)}
                        multiline
                    />
                    <TouchableOpacity 
                        onPress={() => setFullTextModal({ 
                            visible: true, 
                            title: p.title, 
                            text: p.personalNote, 
                            onSave: (val) => updateExperienceField(p.id, 'note', val) 
                        })}
                        style={{ position: 'absolute', right: 12, top: 12 }}
                    >
                        <Ionicons name="expand-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          {/* PARTICIPATIONS */}
          <Text style={{ fontWeight: "bold", marginBottom: 10, marginTop: 10, color: colors.text }}>
            Participations ({myParticipations.length})
          </Text>
          {myParticipations.length === 0 ? (
            <Text style={{ fontStyle: "italic", color: colors.textSecondary }}>
              Aucune participation.
            </Text>
          ) : (
            myParticipations.map((p, idx) => {
              const isVisible = !hiddenProjectIds.includes(p.projectId);
              return (
                <View key={idx} style={{ marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderColor: colors.border }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "600", color: colors.text }}>{p.projectTitle}</Text>
                      <Text style={{ fontSize: 12, color: colors.primary }}>
                        Rôle : {p.roleTitle}
                      </Text>
                      <TouchableOpacity 
                        onPress={() => {
                          if (p.projectStatus === "completed") {
                            router.push("/hall-of-fame");
                          } else {
                            router.push(`/project/${p.projectId}`);
                          }
                        }}
                        style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 }}
                      >
                        <Ionicons name={p.projectStatus === "completed" ? "trophy-outline" : "film-outline"} size={14} color={colors.primary} />
                        <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>
                          {p.projectStatus === "completed" ? "Voir au Hall of Fame" : "Voir le projet"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Switch
                      value={isVisible}
                      onValueChange={(val) =>
                        toggleProjectVisibility(p.projectId, val)
                      }
                      trackColor={{
                        false: "#767577",
                        true: colors.primary,
                      }}
                      thumbColor={isVisible ? colors.primary : (isDark ? "#374151" : "#f4f3f4")}
                    />
                  </View>

                  <View style={{ marginBottom: 10 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                        {p.personalImages && p.personalImages.map((img: string, i: number) => (
                            <View key={i} style={{ position: 'relative' }}>
                                <Image source={{ uri: img }} style={{ width: 100, height: 75, borderRadius: 8 }} />
                                <TouchableOpacity 
                                    onPress={() => removeExperienceImage(p.projectId, img)}
                                    style={{ position: 'absolute', top: -5, right: -5, backgroundColor: colors.card, borderRadius: 10 }}
                                >
                                    <Ionicons name="close-circle" size={20} color={colors.danger} />
                                </TouchableOpacity>
                            </View>
                        ))}
                        <TouchableOpacity 
                            onPress={() => uploadExperienceImage(p.projectId)}
                            style={{ width: 100, height: 75, borderRadius: 8, backgroundColor: colors.backgroundSecondary, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border }}
                        >
                            <Ionicons name="camera" size={24} color={colors.textSecondary} />
                            <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4 }}>Ajouter</Text>
                        </TouchableOpacity>
                    </ScrollView>
                  </View>

                  <View style={{ marginBottom: 10 }}>
                    <TextInput
                        style={[styles.input, { fontSize: 13, paddingVertical: 8, marginBottom: 0 }]}
                        placeholder="Titre personnalisé (ex: Mon rôle préféré)"
                        placeholderTextColor={isDark ? "#6B7280" : "#999"}
                        value={p.personalTitle || ""}
                        onChangeText={(val) => updateExperienceField(p.projectId, 'custom_title', val)}
                    />
                  </View>

                  <View style={{ position: 'relative' }}>
                    <TextInput
                        style={[styles.input, { fontSize: 13, paddingVertical: 8, height: 60, marginBottom: 0, paddingRight: 40 }]}
                        placeholder="Racontez votre expérience sur ce projet..."
                        placeholderTextColor={isDark ? "#6B7280" : "#999"}
                        value={p.personalNote || ""}
                        onChangeText={(val) => updateExperienceField(p.projectId, 'note', val)}
                        multiline
                    />
                    <TouchableOpacity 
                        onPress={() => setFullTextModal({ 
                            visible: true, 
                            title: p.projectTitle, 
                            text: p.personalNote, 
                            onSave: (val) => updateExperienceField(p.projectId, 'note', val) 
                        })}
                        style={{ position: 'absolute', right: 12, top: 12 }}
                    >
                        <Ionicons name="expand-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 50 }} />

        <TouchableOpacity
          onPress={async () => {
            await supabase.auth.signOut();
            router.replace("/");
          }}
          style={{
            backgroundColor: colors.danger,
            padding: 15,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>
            Se déconnecter
          </Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>

      <PaymentModal
        visible={paymentModalVisible}
        amount={29.0}
        label="Abonnement Studio (1 mois)"
        onClose={() => setPaymentModalVisible(false)}
        onSuccess={handleUpgradeSuccess}
      />

      <Modal visible={fullTextModal.visible} animationType="slide">
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : 20, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setFullTextModal({ ...fullTextModal, visible: false })}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{fullTextModal.title}</Text>
            <TouchableOpacity onPress={() => {
              fullTextModal.onSave(fullTextModal.text);
              setFullTextModal({ ...fullTextModal, visible: false });
            }}>
              <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>Terminer</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={{ 
              flex: 1, 
              padding: 20, 
              fontSize: 16, 
              color: colors.text, 
              textAlignVertical: 'top',
              backgroundColor: colors.background
            }}
            multiline
            value={fullTextModal.text}
            onChangeText={(text) => setFullTextModal({ ...fullTextModal, text })}
            autoFocus
            placeholder="Écrivez ici..."
            placeholderTextColor={isDark ? "#6B7280" : "#999"}
          />
        </View>
      </Modal>
    </View>
  );
}
