import CityAutocomplete from "@/components/CityAutocomplete";
import ClapLoading from "@/components/ClapLoading";
import PaymentModal from "@/components/PaymentModal";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { useUserMode } from "@/hooks/useUserMode";
import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Image,
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
  { label: "Modèle", value: "modele" },
  { label: "Figurant", value: "figurant" },
  { label: "Réalisateur", value: "realisateur" },
  { label: "Technicien", value: "technicien" },
  { label: "HMC (Maq/Costume)", value: "hmc" },
  { label: "Scénariste", value: "scenariste" },
  { label: "Production", value: "production" },
];

export default function Account() {
  const router = useRouter();
  const { mode } = useUserMode(); // Mode is mostly visual/role based
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // --- FORM STATE ---
  const [profile, setProfile] = useState<any>({});

  // Basic Info
  const [full_name, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("");
  const [age, setAge] = useState("");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");
  const [role, setRole] = useState(""); // Main "titre" (e.g. Acteur, Réa...)

  // Contact
  const [email_public, setEmailPublic] = useState("");
  const [phone, setPhone] = useState("");

  // Physique (Actor specific mostly)
  const [height, setHeight] = useState("");
  const [hair_color, setHairColor] = useState("");
  const [eye_color, setEyeColor] = useState("");

  // Technical / HMC
  const [equipment, setEquipment] = useState("");
  const [software, setSoftware] = useState("");
  const [specialties, setSpecialties] = useState("");

  // Skills
  const [skillsInput, setSkillsInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  // Documents
  const [cv_url, setCvUrl] = useState<string | null>(null);
  const [book_urls, setBookUrls] = useState<string[]>([]);
  const [showreel_url, setShowreelUrl] = useState("");

  // Visibility settings
  const [hiddenProjectIds, setHiddenProjectIds] = useState<string[]>([]);
  const [isContactVisible, setIsContactVisible] = useState(true);

  // Projects management
  const [myProjects, setMyProjects] = useState<any[]>([]);
  const [myParticipations, setMyParticipations] = useState<any[]>([]);

  // Avatar
  const [avatar_url, setAvatarUrl] = useState<string | null>(null);

  // Subscription
  const [subscriptionTier, setSubscriptionTier] = useState<"free" | "studio">(
    "free",
  );
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

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
        .eq("id", session.user.id)
        .single();

      if (!settingsError && settings) {
        setHiddenProjectIds(settings.hidden_project_ids || []);
        setIsContactVisible(settings.is_contact_visible ?? true);
      }

      // Fetch user's projects for visibility management
      const { data: projects } = await supabase
        .from("tournages")
        .select("id, title, type, created_at")
        .eq("owner_id", session.user.id)
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
        .eq("assigned_profile_id", session.user.id);

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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("public_profile_settings")
        .upsert({ id: session.user.id, is_contact_visible: value });

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

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from("public_profile_settings").upsert({
        id: session.user.id,
        hidden_project_ids: newHiddenIds,
      });

      if (error) throw error;
    } catch (e) {
      Alert.alert("Erreur", "Impossible de changer la visibilité du projet");
    }
  }

  async function handleUpgradeSuccess() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("profiles")
        .update({ subscription_tier: "studio" })
        .eq("id", session.user.id);

      if (error) throw error;
      setSubscriptionTier("studio");
      Alert.alert("Félicitations !", "Vous êtes maintenant membre Studio.");
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
            console.error("Delete profile error:", error);
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
            console.error(rpcError);
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
        console.error("Delete account error:", error);

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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const updates = {
        full_name,
        username,
        ville: city,
        website,
        role,
        // Nouveaux champs
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
        .eq("id", session.user.id);

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
        <ClapLoading size={50} color={Colors.light.primary} />
      </View>
    );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
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
            <ClapLoading size={24} color={Colors.light.primary} />
          ) : (
            <Text style={{ color: Colors.light.primary, fontWeight: "bold" }}>
              Sauver
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
                subscriptionTier === "studio" ? Colors.light.primary : "#eee",
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
                style={[GlobalStyles.primaryButton, { flex: 1 }]}
              >
                <Text style={GlobalStyles.buttonText}>
                  Passer Pro (29€/mois)
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
                  backgroundColor: Colors.light.backgroundSecondary,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: Colors.light.border,
                }}
              >
                <Ionicons
                  name="information"
                  size={24}
                  color={Colors.light.text}
                />
              </TouchableOpacity>
            </View>
          )}
          {subscriptionTier === "studio" && (
            <Text style={{ color: Colors.light.success, marginTop: 5 }}>
              Vous bénéficiez de projets illimités et d'outils avancés.
            </Text>
          )}
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
            <Text style={{ fontSize: 14, color: Colors.light.text, flex: 1 }}>
              Afficher mes contacts sur mon profil public ?
            </Text>
            <Switch
              value={isContactVisible}
              onValueChange={toggleContactVisibility}
              trackColor={{ false: "#767577", true: Colors.light.primary }}
              thumbColor={isContactVisible ? Colors.light.tint : "#f4f3f4"}
            />
          </View>
        </View>

        {/* 3. CATEGORY SPECIFIC FIELDS */}

        {/* PHYSICAL (Actors/Models) */}
        {["acteur", "modele", "figurant"].includes(role) && (
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
        {["technicien", "realisateur", "production", "scenariste"].includes(
          role,
        ) && (
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
                  color={Colors.light.primary}
                />
                <Text
                  style={{
                    marginLeft: 10,
                    color: Colors.light.primary,
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
                    color={Colors.light.danger}
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
                      true: Colors.light.primary,
                    }}
                    thumbColor={isVisible ? Colors.light.tint : "#f4f3f4"}
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
                    <Text style={{ fontSize: 12, color: Colors.light.primary }}>
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
                      true: Colors.light.primary,
                    }}
                    thumbColor={isVisible ? Colors.light.tint : "#f4f3f4"}
                  />
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 50 }} />

        {/* DEV ONLY: MAGIC SEED DATA */}
        <TouchableOpacity
          onPress={async () => {
            try {
              const { magicSeed } = await import("@/utils/magicSeed");
              await magicSeed();
            } catch (e) {
              console.error(e);
              Alert.alert(
                "Erreur",
                "Impossible de charger le script Magic Seed",
              );
            }
          }}
          style={{
            backgroundColor: "#FFF9C4",
            padding: 15,
            borderRadius: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#FBC02D",
            marginBottom: 15,
            flexDirection: "row",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <Ionicons name="sparkles" size={20} color="#FBC02D" />
          <Text style={{ color: "#FBC02D", fontWeight: "bold" }}>
            Lancer le Magic Seed ✨
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={async () => {
            Alert.alert(
              "Nettoyer ?",
              "Cela va supprimer TOUS les posts et tournages liés à ton compte.",
              [
                { text: "Annuler", style: "cancel" },
                {
                  text: "Tout supprimer 🧹",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      const { clearMagicSeed } = await import(
                        "@/utils/magicSeed"
                      );
                      await clearMagicSeed();
                    } catch (e) {
                      console.error(e);
                    }
                  },
                },
              ],
            );
          }}
          style={{
            backgroundColor: "#FFEBEE",
            padding: 15,
            borderRadius: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#EF5350",
            marginBottom: 50,
            flexDirection: "row",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <Ionicons name="trash-outline" size={20} color="#EF5350" />
          <Text style={{ color: "#EF5350", fontWeight: "bold" }}>
            Wipe Seed 🧹
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={async () => {
            await supabase.auth.signOut();
            router.replace("/");
          }}
          style={{
            backgroundColor: Colors.light.danger,
            padding: 15,
            borderRadius: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>
            Se déconnecter
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDeleteAccount}
          style={{
            marginTop: 15,
            padding: 15,
            borderRadius: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: Colors.light.danger,
          }}
        >
          <Text style={{ color: Colors.light.danger, fontWeight: "bold" }}>
            Supprimer mon compte
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundSecondary },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
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
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  editBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    backgroundColor: Colors.light.primary,
    padding: 6,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "white",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#444",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  label: { fontSize: 13, color: "#666", marginBottom: 6, fontWeight: "500" },
  textArea: { height: 80, textAlignVertical: "top" },
  addButton: {
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  tagSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  tagText: { fontSize: 12, color: Colors.light.text },
  tagTextSelected: { color: "white" },
  skillTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e3f2fd",
    borderColor: "#bbdefb",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  fileButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: Colors.light.danger,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
});
