import CityAutocomplete from "@/components/CityAutocomplete";
import ClapLoading from "@/components/ClapLoading";
import PaymentModal from "@/components/PaymentModal";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { useUserMode } from "@/hooks/useUserMode";
import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { ACCENT_COLORS, AccentColor, useTheme } from "@/providers/ThemeProvider";
import { useTutorial } from "@/providers/TutorialProvider";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [profile, setProfile] = useState<any>({});
  const [full_name, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [role, setRole] = useState("");
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
  const { startTutorial, isLoading: isTutorialLoading } = useTutorial();

  const { themeMode, setThemeMode, accentColor, setAccentColor, colors, isDark } = useTheme();

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
    label: { fontSize: 13, color: isDark ? "#9CA3AF" : "#666", marginBottom: 6, fontWeight: "500" },
    textArea: { height: 100, textAlignVertical: "top" },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
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
      color: isDark ? "#9CA3AF" : "#666",
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
      paddingHorizontal: 12,
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
      color: isDark ? "#9CA3AF" : "#666",
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
        .select("id, title, type, created_at")
        .eq("owner_id", session?.user?.id || effectiveUserId)
        .order("created_at", { ascending: false });

      if (projects) {
        setMyProjects(projects);
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
            is_public
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
            projectId: p.tournages?.id,
            projectTime: p.tournages?.created_at,
            projectTitle: p.tournages?.title,
            projectType: p.tournages?.type,
            projectPublic: p.tournages?.is_public,
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
      const fileExt = image.uri.split(".").pop();
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

  async function handleUpgradeSuccess() {
    try {
      if (!effectiveUserId) return;

      const { error } = await supabase
        .from("profiles")
        .update({ subscription_tier: "studio" })
        .eq("id", effectiveUserId);

      if (error) throw error;
      setSubscriptionTier("studio");
      Alert.alert("Félicitations !", "Le compte est maintenant membre Studio.");
    } catch (e) {
      Alert.alert("Erreur", "Impossible de mettre à jour votre abonnement.");
    }
  }

  const handleDeleteAccount = async () => {
    console.log("handleDeleteAccount called");

    const confirmDelete = async () => {
      console.log("Delete confirmed, starting process...");
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const userId = session.user.id;
          console.log("Deleting data for user:", userId);

          // 0. Delete public profile settings
          console.log("0. Deleting settings...");
          const { error: settingsError } = await supabase
            .from("public_profile_settings")
            .delete()
            .eq("id", userId);
          // Ignore error if not found or already deleted?
          // But strict error handling is better to catch constraints.
          if (settingsError && settingsError.code !== "PGRST116") {
            // Ignore if not found? No, delete doesn't error if not found.
            if (settingsError) throw settingsError;
          }

          // 1. Delete connections (requester or receiver)
          console.log("1. Deleting connections...");
          const { error: connectionsError } = await supabase
            .from("connections")
            .delete()
            .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);
          if (connectionsError) throw connectionsError;

          // 2. Delete applications made by user
          console.log("2. Deleting applications...");
          const { error: applicationsError } = await supabase
            .from("applications")
            .delete()
            .eq("candidate_id", userId);
          if (applicationsError) throw applicationsError;

          // 3. Delete posts
          console.log("3. Deleting posts...");
          const { error: postsError } = await supabase
            .from("posts")
            .delete()
            .eq("user_id", userId);
          if (postsError) throw postsError;

          // 4. Delete project likes
          console.log("4. Deleting likes...");
          const { error: likesError } = await supabase
            .from("project_likes")
            .delete()
            .eq("user_id", userId);
          if (likesError) throw likesError;

          // 5. Delete direct messages (sender or receiver)
          console.log("5. Deleting DMs...");
          const { error: dmError } = await supabase
            .from("direct_messages")
            .delete()
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
          if (dmError) throw dmError;

          // 6. Delete project messages
          console.log("6. Deleting project messages...");
          const { error: pmError } = await supabase
            .from("project_messages")
            .delete()
            .eq("sender_id", userId);
          if (pmError) throw pmError;

          // 7. Delete project files
          console.log("7. Deleting project files...");
          const { error: filesError } = await supabase
            .from("project_files")
            .delete()
            .eq("uploader_id", userId);
          if (filesError) throw filesError;

          // 7.5 Unassign from Project Roles & Inventory
          console.log("7.5 Unassigning roles & inventory...");
          const { error: rolesError } = await supabase
            .from("project_roles")
            .update({ assigned_profile_id: null })
            .eq("assigned_profile_id", userId);
          if (rolesError) throw rolesError;

          const { error: inventoryError } = await supabase
            .from("project_inventory")
            .update({ assigned_to: null })
            .eq("assigned_to", userId);
          if (inventoryError) throw inventoryError;

          // 8. Delete projects owned by user
          console.log("8. Deleting owned projects...");
          const { error: projectsError } = await supabase
            .from("tournages")
            .delete()
            .eq("owner_id", userId);
          if (projectsError) throw projectsError;

          // 9. Finally delete profile
          console.log("9. Deleting profile...");
          const { error } = await supabase
            .from("profiles")
            .delete()
            .eq("id", userId);

          if (error) {
            console.log("Delete profile error handled:", error);
            throw error;
          }

          // 10. Delete Auth User (requires delete_user RPC function)
          console.log("10. Deleting auth user...");
          const { error: rpcError } = await supabase.rpc("delete_user");

          if (rpcError) {
            console.log(
              "RPC delete_user failed (function might be missing), but profile is gone.",
            );
            // We don't throw here to avoid preventing the success UI
            // if the user hasn't set up the RPC yet, at least their data is gone.
            console.log("RPC error handled:", rpcError);
          }

          console.log("Delete success. Signing out.");

          const successTitle = "Compte supprimé";
          const successMsg =
            "Votre compte et vos données ont été supprimés avec succès.";

          if (Platform.OS === "web") {
            window.alert(`${successTitle}\n\n${successMsg}`);
          } else {
            // On mobile, alert might be interrupted by navigation/signout,
            // but usually ok.
            Alert.alert(successTitle, successMsg);
          }

          await supabase.auth.signOut();
          router.replace("/");
        }
      } catch (error: any) {
        console.log("Delete account error handled:", error);

        const errTitle = "Erreur";
        const errMsg =
          "Impossible de supprimer le compte: " +
          (error.message || JSON.stringify(error));

        if (Platform.OS === "web") {
          window.alert(`${errTitle}\n\n${errMsg}`);
        } else {
          Alert.alert(errTitle, errMsg);
        }
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.",
        )
      ) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        "Supprimer mon compte",
        "Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible et supprimera toutes vos données. (Note: Cette action ne supprime que votre profil public, pour une suppression complète des données d'authentification, contactez le support)",
        [
          {
            text: "Annuler",
            style: "cancel",
            onPress: () => console.log("Delete canceled"),
          },
          {
            text: "Supprimer",
            style: "destructive",
            onPress: confirmDelete,
          },
        ],
      );
    }
  };

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
        <Text style={[GlobalStyles.title2, { marginBottom: 0 }]}>
          {/* put the full name here  */}

          {profile.full_name || "Mon Profil"}
        </Text>
        <TouchableOpacity
          onPress={saveProfile}
          disabled={loading || uploading}
          style={{ padding: 5 }}
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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* AVATAR */}
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <TouchableOpacity onPress={() => uploadImage(true)}>
            {avatar_url ? (
              <Image source={{ uri: avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Ionicons name="camera" size={30} color="#999" />
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={12} color="white" />
            </View>
          </TouchableOpacity>
          <Text style={{ marginTop: 10, color: "#666" }}>
            Photo de profil principale
          </Text>
        </View>

        {/* ABONNEMENT */}
        <View
          style={[
            GlobalStyles.card,
            { alignItems: "center", paddingVertical: 25 },
          ]}
        >
          <Text style={GlobalStyles.title2}>Mon Abonnement</Text>
          <View
            style={{
              backgroundColor:
                subscriptionTier === "studio" ? colors.primary : "#eee",
              paddingHorizontal: 15,
              paddingVertical: 8,
              borderRadius: 20,
              marginVertical: 10,
            }}
          >
            <Text
              style={{
                color: subscriptionTier === "studio" ? "white" : "#666",
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
                onPress={() => setPaymentModalVisible(true)}
                style={[GlobalStyles.primaryButton, { flex: 1, backgroundColor: colors.primary }]}
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
                  backgroundColor: colors.backgroundSecondary,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="information-circle-outline" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* THEME SETTINGS */}
        <View style={GlobalStyles.card}>
          <Text style={[GlobalStyles.title2, { marginBottom: 15 }]}>Personnalisation</Text>
          
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 10 }}>Mode d'affichage</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            {(['light', 'dark', 'system'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setThemeMode(m)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: themeMode === m ? colors.primary : colors.border,
                  backgroundColor: themeMode === m ? colors.primary + '10' : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text style={{ 
                  color: themeMode === m ? colors.primary : '#666',
                  fontWeight: themeMode === m ? '700' : '500',
                  textTransform: 'capitalize'
                }}>
                  {m === 'light' ? 'Clair' : m === 'dark' ? 'Sombre' : 'Système'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 10 }}>Couleur d'accentuation</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setAccentColor(color)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: ACCENT_COLORS[color].light,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 3,
                  borderColor: accentColor === color ? colors.text : 'transparent'
                }}
              >
                {accentColor === color && (
                  <Ionicons name="checkmark" size={24} color="white" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 1. INFOS GENERALES */}
        <SectionTitle title="Informations Générales" />
        <View style={GlobalStyles.card}>
          <Text style={styles.label}>Nom complet</Text>
          <TextInput
            style={GlobalStyles.input}
            value={full_name}
            onChangeText={setFullName}
            placeholder="Prénom Nom"
            placeholderTextColor="#999"
          />
          {errors.full_name && (
            <Text style={styles.errorText}>{errors.full_name}</Text>
          )}

          <Text style={styles.label}>Nom d'utilisateur (Pseudo)</Text>
          <TextInput
            style={GlobalStyles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="pseudo"
            autoCapitalize="none"
            placeholderTextColor="#999"
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
                onPress={() => setRole(r.value)}
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
              <View style={{ flexDirection: "row", gap: 5 }}>
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
                style={GlobalStyles.input}
                value={age}
                onChangeText={setAge}
                placeholder="25"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          <Text style={styles.label}>Bio / Présentation</Text>
          <TextInput
            style={[GlobalStyles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Décrivez votre parcours en quelques lignes..."
            multiline
            placeholderTextColor="#999"
          />
        </View>

        {/* REGLAGES & ASSISTANCE */}
        <SectionTitle title="Réglages & Assistance" />
        <View style={GlobalStyles.card}>
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#eee",
            }}
            onPress={() =>
              router.push({
                pathname: "/profile/[id]",
                params: { id: effectiveUserId },
              })
            }
          >
            <Ionicons
              name="card-outline"
              size={24}
              color={colors.primary}
            />
            <Text style={{ marginLeft: 15, fontSize: 16, flex: 1 }}>
              Ma carte de profil
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 12,
            }}
            onPress={() => {
              Alert.alert(
                "Signaler un problème",
                "Souhaitez-vous contacter le support pour signaler un bug ou une suggestion ?",
                [
                  { text: "Annuler", style: "cancel" },
                  {
                    text: "Contacter",
                    onPress: () => {
                      const subject = `Support Tita : ${full_name} (${effectiveUserId})`;
                      const body = `Bonjour l'équipe Tita,\n\nJe souhaite vous signaler le problème suivant :\n\n- Ma version : ${Platform.OS}\n- Mon ID : ${effectiveUserId}\n\nDescription :\n`;
                      Linking.openURL(
                        `mailto:support@titapp.fr?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
                      );
                    },
                  },
                ],
              );
            }}
          >
            <Ionicons
              name="bug-outline"
              size={24}
              color={colors.danger}
            />
            <Text style={{ marginLeft: 15, fontSize: 16, flex: 1 }}>
              Signaler un problème
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* 2. CONTACT PUBLIC */}
        <SectionTitle title="Contact & Pro" />
        <View style={GlobalStyles.card}>
          <Text style={styles.label}>Site web / Portfolio URL</Text>
          <TextInput
            style={GlobalStyles.input}
            value={website}
            onChangeText={setWebsite}
            placeholder="https://..."
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Email Pro (Public)</Text>
          <TextInput
            style={GlobalStyles.input}
            value={email_public}
            onChangeText={setEmailPublic}
            placeholder="contact@exemple.com"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Téléphone (Optionnel)</Text>
          <TextInput
            style={GlobalStyles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+33 6..."
            keyboardType="phone-pad"
            placeholderTextColor="#999"
          />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 10,
              paddingTop: 10,
              borderTopWidth: 1,
              borderColor: "#eee",
            }}
          >
            <Text style={{ fontSize: 14, color: colors.text, flex: 1 }}>
              Afficher mes contacts sur mon profil public ?
            </Text>
            <Switch
              value={isContactVisible}
              onValueChange={toggleContactVisibility}
              trackColor={{ false: "#767577", true: colors.primary }}
              thumbColor={isContactVisible ? colors.primary : "#f4f3f4"}
            />
          </View>
        </View>

        {/* 3. CATEGORY SPECIFIC FIELDS */}

        {/* PHYSICAL (Actors/Models) */}
        {role === "acteur" && (
          <>
            <SectionTitle title="Apparence & Caractéristiques" />
            <View style={GlobalStyles.card}>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Taille (cm)</Text>
                  <TextInput
                    style={GlobalStyles.input}
                    value={height}
                    onChangeText={setHeight}
                    placeholder="175"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
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
            <View style={GlobalStyles.card}>
              <Text style={styles.label}>
                Matériel (Caméra, Son, Lumière...)
              </Text>
              <TextInput
                style={GlobalStyles.input}
                value={equipment}
                onChangeText={setEquipment}
                placeholder="Ex: Sony A7S III, Micro Zoom H6..."
                placeholderTextColor="#999"
              />
              <Text style={styles.label}>Logiciels & Outils</Text>
              <TextInput
                style={GlobalStyles.input}
                value={software}
                onChangeText={setSoftware}
                placeholder="Premiere Pro, DaVinci, Final Draft..."
                placeholderTextColor="#999"
              />
            </View>
          </>
        )}

        {/* HMC (Specialties) */}
        {role === "hmc" && (
          <>
            <SectionTitle title="Spécialités HMC" />
            <View style={GlobalStyles.card}>
              <Text style={styles.label}>Spécialités</Text>
              <TextInput
                style={GlobalStyles.input}
                value={specialties}
                onChangeText={setSpecialties}
                placeholder="Maquillage SFX, Coiffure époque..."
                placeholderTextColor="#999"
              />
            </View>
          </>
        )}

        {/* 4. SKILLS */}
        <SectionTitle title="Compétences & Tags" />
        <View style={GlobalStyles.card}>
          <View style={{ flexDirection: "row", gap: 5 }}>
            <TextInput
              style={[GlobalStyles.input, { flex: 1, marginBottom: 0 }]}
              value={skillsInput}
              onChangeText={setSkillsInput}
              placeholder="Ajouter (ex: Piano, Permis B, Montage...)"
              placeholderTextColor="#999"
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
                <Text style={{ color: "#333", marginRight: 5 }}>{s}</Text>
                <TouchableOpacity
                  onPress={() =>
                    setSkills(skills.filter((_, idx) => idx !== i))
                  }
                >
                  <Ionicons name="close-circle" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* 5. DOCUMENTS & MEDIAS */}
        <SectionTitle title="Documents & Médias" />
        <View style={GlobalStyles.card}>
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
                { backgroundColor: "#f0f0f0", marginLeft: cv_url ? 10 : 0 },
              ]}
            >
              <Text>
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
                    backgroundColor: "white",
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
                  backgroundColor: "#f0f0f0",
                  borderRadius: 8,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="add" size={30} color="#ccc" />
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Showreel */}
          <Text style={[styles.label, { marginTop: 15 }]}>
            Bande Démo (Lien YouTube/Vimeo)
          </Text>
          <TextInput
            style={GlobalStyles.input}
            value={showreel_url}
            onChangeText={setShowreelUrl}
            placeholder="https://youtube.com/..."
            autoCapitalize="none"
            placeholderTextColor="#999"
          />
        </View>

        {/* 6. VISIBILITÉ PROJETS */}
        <SectionTitle title="Confidentialité Projets" />
        <View style={GlobalStyles.card}>
          <Text style={{ fontSize: 13, color: "#666", marginBottom: 15 }}>
            Cochez les projets que vous souhaitez rendre visibles sur votre
            profil public.
          </Text>

          {/* CREATOR PROJECTS */}
          <Text style={{ fontWeight: "bold", marginBottom: 10 }}>
            Projets créés ({myProjects.length})
          </Text>
          {myProjects.length === 0 ? (
            <Text
              style={{ fontStyle: "italic", color: "#999", marginBottom: 15 }}
            >
              Aucun projet créé.
            </Text>
          ) : (
            myProjects.map((p) => {
              const isVisible = !hiddenProjectIds.includes(p.id);
              return (
                <View
                  key={p.id}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                    paddingBottom: 10,
                    borderBottomWidth: 1,
                    borderColor: "#f0f0f0",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "600" }}>{p.title}</Text>
                    <Text style={{ fontSize: 11, color: "#999" }}>
                      {p.type} • {new Date(p.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Switch
                    value={isVisible}
                    onValueChange={(val) => toggleProjectVisibility(p.id, val)}
                    trackColor={{
                      false: "#767577",
                      true: colors.primary,
                    }}
                    thumbColor={isVisible ? colors.primary : "#f4f3f4"}
                  />
                </View>
              );
            })
          )}

          {/* PARTICIPATIONS */}
          <Text style={{ fontWeight: "bold", marginBottom: 10, marginTop: 10 }}>
            Participations ({myParticipations.length})
          </Text>
          {myParticipations.length === 0 ? (
            <Text style={{ fontStyle: "italic", color: "#999" }}>
              Aucune participation.
            </Text>
          ) : (
            myParticipations.map((p, idx) => {
              const isVisible = !hiddenProjectIds.includes(p.projectId);
              return (
                <View
                  key={idx}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 10,
                    paddingBottom: 10,
                    borderBottomWidth: 1,
                    borderColor: "#f0f0f0",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "600" }}>{p.projectTitle}</Text>
                    <Text style={{ fontSize: 12, color: colors.primary }}>
                      Rôle : {p.roleTitle}
                    </Text>
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
                    thumbColor={isVisible ? colors.primary : "#f4f3f4"}
                  />
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 50 }} />

        <TouchableOpacity
          onPress={() => {
            startTutorial();
          }}
          disabled={isTutorialLoading}
          style={{
            backgroundColor: isTutorialLoading ? "#ccc" : colors.primary,
            padding: 15,
            borderRadius: 12,
            alignItems: "center",
            marginBottom: 15,
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>
            {isTutorialLoading ? "Préparation..." : "Revoir le tutoriel 👋"}
          </Text>
        </TouchableOpacity>

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

        {!isImpersonating && (
          <TouchableOpacity
            onPress={handleDeleteAccount}
            style={{
              marginTop: 15,
              padding: 15,
              borderRadius: 12,
              alignItems: "center",
              borderWidth: 1,
              borderColor: colors.danger,
            }}
          >
            <Text style={{ color: colors.danger, fontWeight: "bold" }}>
              Supprimer mon compte
            </Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 50 }} />
      </ScrollView>

      <PaymentModal
        visible={paymentModalVisible}
        amount={29.0}
        label="Abonnement Studio (1 mois)"
        onClose={() => setPaymentModalVisible(false)}
        onSuccess={handleUpgradeSuccess}
      />
    </View>
  );
}
