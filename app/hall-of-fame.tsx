import ClapLoading from "@/components/ClapLoading";
import HallOfFameCard from "@/components/HallOfFameCard";
import ProjectTeamManager from "@/components/ProjectTeamManager";
import { HallOfFameProject, useHallOfFame } from "@/hooks/useHallOfFame";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

export default function HallOfFameScreen({
  forceOnlyMine = false,
  hideHeader = false,
}: {
  forceOnlyMine?: boolean;
  hideHeader?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const themedGlobalStyles = useThemedStyles();
  const styles = getStyles(colors, isDark);
  const router = useRouter();
  const { isGuest } = useUser();
  const { width } = useWindowDimensions();
  const isWebLarge = Platform.OS === "web" && width >= 768;

  const {
    projects,
    loading,
    refreshing,
    onRefresh,
    currentUserId,
    toggleLike,
    fetchHallOfFame,
  } = useHallOfFame(null);

  const handleToggleLike = (item: HallOfFameProject, liked: boolean) => {
    if (isGuest) {
      Alert.alert(
        "Invité",
        "Vous devez être connecté pour aimer un projet."
      );
      return;
    }
    toggleLike(item, liked);
  };

  // Edit Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProject, setEditingProject] =
    useState<HallOfFameProject | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Quick Add Modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addType, setAddType] = useState("court_metrage");
  const [addImageUrl, setAddImageUrl] = useState("");

  // Team Modal
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [manageTeamVisible, setManageTeamVisible] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [teamData, setTeamData] = useState<any[]>([]);
  const [selectedTeamCategory, setSelectedTeamCategory] = useState<string | null>(null);
  const [selectedProjectTitle, setSelectedProjectTitle] = useState("");
  const [loadingTeam, setLoadingTeam] = useState(false);

  const categoryLabels: Record<string, string> = {
    acteur: "Acteurs",
    realisation: "Réalisation",
    image: "Image",
    son: "Son",
    production: "Production",
    deco: "Décors & Costumes",
    technique: "Technique",
    postprod: "Post-Production",
    HMC: "HMC",
    regie: "Régie",
  };

  async function fetchTeam(projectId: string, projectTitle: string) {
    try {
      setSelectedProjectTitle(projectTitle);
      setSelectedTeamCategory(null);
      setTeamModalVisible(true);
      setLoadingTeam(true);

      const { data, error } = await supabase
        .from("project_roles")
        .select(
          `
          id,
          title,
          category,
          assigned_profile:profiles (
            id,
            full_name,
            avatar_url
          )
        `,
        )
        .eq("tournage_id", projectId)
        .not("assigned_profile_id", "is", null);

      if (error) throw error;

      const grouped = (data || []).reduce((acc: any, role: any) => {
        const cat = role.category || "Autre";
        if (!acc[cat]) {
          acc[cat] = [];
        }
        acc[cat].push(role);
        return acc;
      }, {});

      const sectionData = Object.keys(grouped)
        .map((cat) => ({
          title: cat,
          data: grouped[cat],
        }))
        .sort((a, b) => a.title.localeCompare(b.title));

      setTeamData(sectionData);
    } catch (e) {
      console.error("Error fetching team", e);
    } finally {
      setLoadingTeam(false);
    }
  }

  function handleOpenLink(url: string | null) {
    if (url) {
      Linking.openURL(url).catch((err) =>
        console.error("Couldn't load page", err),
      );
    }
  }

  function handleEdit(item: HallOfFameProject) {
    setEditingProject(item);
    setEditTitle(item.title);
    setEditDesc(item.description || "");
    setEditUrl(item.final_result_url || "");
    setEditImageUrl(item.image_url || "");
    setEditModalVisible(true);
  }

  async function pickVideo(isEdit: boolean) {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        const limit = 5242880; // 5 MB

        if (asset.fileSize && asset.fileSize > limit) {
          Alert.alert("Trop volumineux", "La vidéo doit faire moins de 5 Mo.");
          return;
        }

        uploadVideo(asset.uri, isEdit);
      }
    } catch (e) {
      Alert.alert("Erreur", "Impossible d’ouvrir la galerie.");
    }
  }

  async function uploadVideo(uri: string, isEdit: boolean) {
    try {
      setUploading(true);
      const response = await fetch(uri);
      const blob = await response.blob();

      const fileExt = uri.split(".").pop() || "mp4";
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const folder = isEdit && editingProject ? editingProject.id : "hall-of-fame-quick";
      const filePath = `${folder}/${fileName}`;

      const { error } = await supabase.storage
        .from("videos")
        .upload(filePath, blob);
      if (error) throw error;

      const { data } = supabase.storage.from("videos").getPublicUrl(filePath);
      if (isEdit) {
        setEditUrl(data.publicUrl);
      } else {
        setAddUrl(data.publicUrl);
      }
      Alert.alert(
        "Succès",
        "Vidéo téléchargée ! N’oubliez pas de sauvegarder / publier.",
      );
    } catch (e: any) {
      console.error(e);
      Alert.alert("Erreur Upload", e.message || "Une erreur est survenue.");
    } finally {
      setUploading(false);
    }
  }

  async function pickImage(isEdit: boolean) {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        uploadImage(asset.uri, isEdit);
      }
    } catch (e) {
      Alert.alert("Erreur", "Impossible d’ouvrir la galerie.");
    }
  }

  async function uploadImage(uri: string, isEdit: boolean) {
    try {
      setUploading(true);
      const response = await fetch(uri);
      const blob = await response.blob();

      const fileExt = uri.split(".").pop() || "jpg";
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `posters/${fileName}`;

      const { error } = await supabase.storage
        .from("images")
        .upload(filePath, blob);
      if (error) throw error;

      const { data } = supabase.storage.from("images").getPublicUrl(filePath);
      if (isEdit) {
        setEditImageUrl(data.publicUrl);
      } else {
        setAddImageUrl(data.publicUrl);
      }
    } catch (e: any) {
      console.error(e);
      Alert.alert("Erreur", "Échec de l'upload de l'affiche.");
    } finally {
      setUploading(false);
    }
  }

  async function saveNewProject() {
    if (!addTitle.trim()) {
      Alert.alert("Erreur", "Le titre est obligatoire.");
      return;
    }
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from("tournages")
        .insert({
          owner_id: currentUserId,
          title: addTitle.trim(),
          description: addDesc.trim(),
          final_result_url: addUrl.trim(),
          image_url: addImageUrl,
          type: addType,
          status: "completed",
        })
        .select()
        .single();

      if (error) throw error;

      setAddModalVisible(false);
      resetAddForm();
      fetchHallOfFame();
      
      Alert.alert(
        "Succès", 
        "Projet ajouté ! Souhaitez-vous ajouter les membres de l'équipe ?",
        [
          { text: "Plus tard", style: "cancel" },
          { 
            text: "Gérer l'équipe", 
            onPress: () => {
              setSelectedProjectId(data.id);
              setSelectedProjectTitle(data.title);
              setManageTeamVisible(true);
            } 
          }
        ]
      );
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible de créer le projet.");
    } finally {
      setSaving(false);
    }
  }

  function resetAddForm() {
    setAddTitle("");
    setAddDesc("");
    setAddUrl("");
    setAddImageUrl("");
    setAddType("court_metrage");
  }

  async function saveEdit() {
    if (!editingProject) return;
    try {
      setSaving(true);
      const { error } = await supabase
        .from("tournages")
        .update({
          title: editTitle,
          description: editDesc,
          final_result_url: editUrl,
          image_url: editImageUrl,
        })
        .eq("id", editingProject.id);

      if (error) throw error;

      setEditModalVisible(false);
      fetchHallOfFame();
      Alert.alert("Succès", "Projet mis à jour !");
    } catch (e) {
      Alert.alert("Erreur", "Impossible de sauvegarder.");
    } finally {
      setSaving(false);
    }
  }

  const renderItem = ({ item }: { item: HallOfFameProject }) => (
    <HallOfFameCard
      item={item}
      currentUserId={currentUserId}
      onEdit={() => handleEdit(item)}
      onOpenLink={handleOpenLink}
      router={router}
      onToggleLike={(liked: boolean) => handleToggleLike(item, liked)}
      onViewTeam={() => fetchTeam(item.id, item.title)}
      onManageTeam={() => {
        setSelectedProjectId(item.id);
        setSelectedProjectTitle(item.title);
        setManageTeamVisible(true);
      }}
    />
  );

  const filteredProjects = forceOnlyMine
    ? projects.filter((p) => p.owner_id === currentUserId)
    : projects;

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <Stack.Screen
          options={{
            title: forceOnlyMine ? "Mes Réalisations" : "Hall of Fame",
            headerShown: Platform.OS !== "web" && !forceOnlyMine,
            headerRight: () => (
              <View style={{ flexDirection: "row", gap: 10 }}>
                {!forceOnlyMine && (
                  <TouchableOpacity
                    onPress={() => router.push("/my-awards")}
                    style={{
                      backgroundColor: "#f0f0f0",
                      padding: 8,
                      borderRadius: 20,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="trophy-award"
                      size={22}
                      color="#DAA520"
                    />
                  </TouchableOpacity>
                )}
                {currentUserId && !isGuest && (
                  <TouchableOpacity
                    onPress={() => setAddModalVisible(true)}
                    style={{
                      backgroundColor: colors.primary,
                      padding: 8,
                      borderRadius: 20,
                      marginRight: 10,
                    }}
                  >
                    <Ionicons
                      name="add"
                      size={22}
                      color="white"
                    />
                  </TouchableOpacity>
                )}
              </View>
            ),
          }}
        />
      )}

      {/* HEADER MOBILE NATIVE (Spécifique Mes Réalisations sur App) */}
      {Platform.OS !== "web" && forceOnlyMine ? (
        <View style={styles.mobileHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.mobileBackButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.mobileHeaderTitle}>Mes Réalisations</Text>
          <View style={{ width: 40 }} />
        </View>
      ) : null}

      {Platform.OS === "web" ? (
        <View style={[styles.webHeader, !isWebLarge && styles.webHeaderSmall]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
            {forceOnlyMine ? (
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.webBackButton}
              >
                <Ionicons
                  name="arrow-back"
                  size={isWebLarge ? 24 : 20}
                  color={colors.text}
                />
              </TouchableOpacity>
            ) : null}
            <View>
              <Text
                style={[styles.webHeaderTitle, !isWebLarge && { fontSize: 20 }]}
              >
                {forceOnlyMine ? "Mes Réalisations" : "Hall of Fame"}
              </Text>
              {isWebLarge && (
                <Text style={styles.webHeaderSubtitle}>
                  {forceOnlyMine
                    ? "Retrouvez tous vos films terminés."
                    : "Découvrez les chefs-d'œuvre de la communauté."}
                </Text>
              )}
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {!forceOnlyMine && (
              <TouchableOpacity
                onPress={() => router.push("/my-awards")}
                style={[
                  styles.webFilterButton,
                  !isWebLarge && { paddingHorizontal: 10 },
                ]}
              >
                <MaterialCommunityIcons
                  name="trophy-award"
                  size={isWebLarge ? 22 : 18}
                  color="#DAA520"
                />
                <Text
                  style={[
                    styles.webFilterButtonText,
                    !isWebLarge && { fontSize: 12 },
                  ]}
                >
                  {isWebLarge ? "Mes Réalisations" : "Distinctions"}
                </Text>
              </TouchableOpacity>
            )}

            {currentUserId && !isGuest && (
              <TouchableOpacity
                onPress={() => setAddModalVisible(true)}
                style={[
                  styles.webFilterButton,
                  { backgroundColor: colors.primary },
                  !isWebLarge && { paddingHorizontal: 10 },
                ]}
              >
                <Ionicons
                  name="add"
                  size={isWebLarge ? 22 : 18}
                  color="white"
                />
                <Text
                  style={[
                    styles.webFilterButtonText,
                    { color: "white" },
                    !isWebLarge && { fontSize: 12 },
                  ]}
                >
                  {isWebLarge ? "Ajouter un projet" : "Ajouter"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : null}

      {loading ? (
        <ClapLoading />
      ) : (
        <FlashList
          data={filteredProjects}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          estimatedItemSize={450}
          style={{ width: "100%" }}
          contentContainerStyle={[
            { padding: 15, paddingBottom: 50 },
            isWebLarge && { maxWidth: 800, alignSelf: "center", width: "100%" },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                onRefresh();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {forceOnlyMine
                  ? "Vous n'avez pas encore de projet dans le Hall of Fame."
                  : "Aucun projet terminé pour le moment."}
              </Text>
              <Text style={styles.emptySubtext}>
                {forceOnlyMine
                  ? "Terminez l'un de vos tournages pour le voir apparaître ici !"
                  : "Soyez le premier à publier votre chef-d’œuvre !"}
              </Text>
            </View>
          }
          {...({} as any)}
        />
      )}

      {/* EDIT MODAL */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier le projet</Text>

            <Text style={styles.label}>Titre</Text>
            <TextInput
              style={styles.textInput}
              value={editTitle}
              onChangeText={setEditTitle}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.textInput, { height: 80 }]}
              multiline
              value={editDesc}
              onChangeText={setEditDesc}
            />

            <Text style={styles.label}>
              Lien Vidéo (YouTube/Vimeo) ou Upload
            </Text>

            <TouchableOpacity
              style={[
                styles.uploadButton,
                { marginBottom: 10, borderColor: colors.primary },
              ]}
              onPress={() => pickVideo(true)}
              disabled={uploading}
            >
              {uploading ? (
                <Text style={{ color: "#666" }}>Upload en cours...</Text>
              ) : (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons
                    name="videocam-outline"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={{ color: colors.primary, fontWeight: "600" }}
                  >
                    Uploader une vidéo (max 5 Mo)
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.urlInput}
              value={editUrl}
              onChangeText={setEditUrl}
              placeholder="Lien vidéo (YouTube, Vimeo...)"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Affiche / Image de présentation</Text>
            <TouchableOpacity
              style={[
                styles.uploadButton,
                { marginBottom: 10, borderColor: colors.primary },
              ]}
              onPress={() => pickImage(true)}
              disabled={uploading}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <Ionicons
                  name="image-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text style={{ color: colors.primary, fontWeight: "600" }}>
                  {editImageUrl ? "Changer l'affiche" : "Uploader une affiche"}
                </Text>
              </View>
            </TouchableOpacity>

            {editImageUrl ? (
              <Image source={{ uri: editImageUrl }} style={{ width: '100%', height: 100, borderRadius: 8, marginBottom: 10 }} resizeMode="cover" />
            ) : null}

            <View style={{ flexDirection: "row", gap: 10, marginTop: 15 }}>
              <TouchableOpacity
                style={[styles.cancelButton, { flex: 1 }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { flex: 1 }]}
                onPress={saveEdit}
                disabled={saving || uploading}
              >
                {saving ? (
                  <ClapLoading color="white" />
                ) : (
                  <Text style={{ color: "white", fontWeight: "600" }}>Sauvegarder</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={[styles.teamButton, { marginTop: 15, justifyContent: 'center', paddingVertical: 12 }]}
              onPress={() => {
                if (editingProject) {
                  setEditModalVisible(false);
                  setSelectedProjectId(editingProject.id);
                  setSelectedProjectTitle(editingProject.title);
                  setManageTeamVisible(true);
                }
              }}
            >
              <Ionicons name="people-outline" size={20} color={colors.primary} />
              <Text style={styles.teamButtonText}>Gérer l'équipe du projet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* QUICK ADD MODAL */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ justifyContent: 'center', paddingVertical: 50 }}>
            <View style={styles.modalContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Ajouter au Hall of Fame</Text>
                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Titre du film</Text>
              <TextInput
                style={styles.textInput}
                value={addTitle}
                onChangeText={setAddTitle}
                placeholder="Ex: Mon Chef-d'œuvre"
              />

              <Text style={styles.label}>Type de projet</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                {[
                  { value: "court_metrage", label: "Court" },
                  { value: "long_metrage", label: "Long" },
                  { value: "serie", label: "Série" },
                  { value: "clip", label: "Clip" },
                  { value: "publicite", label: "Pub" },
                  { value: "documentaire", label: "Docu" },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
                      addType === t.value && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setAddType(t.value)}
                  >
                    <Text style={[{ fontSize: 12, color: colors.text }, addType === t.value && { color: 'white' }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Description (optionnel)</Text>
              <TextInput
                style={[styles.textInput, { height: 80 }]}
                multiline
                value={addDesc}
                onChangeText={setAddDesc}
                placeholder="Racontez-nous l'histoire du film..."
              />

              <Text style={styles.label}>Lien Vidéo ou Upload (max 5 Mo)</Text>
              <TouchableOpacity
                style={[styles.uploadButton, { marginBottom: 10, borderColor: colors.primary }]}
                onPress={() => pickVideo(false)}
                disabled={uploading}
              >
                {uploading ? (
                  <Text style={{ color: "#666" }}>Upload en cours...</Text>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="videocam-outline" size={20} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontWeight: "600" }}>
                      {addUrl ? "Vidéo ajoutée" : "Uploader une vidéo"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                style={styles.urlInput}
                value={addUrl}
                onChangeText={setAddUrl}
                placeholder="Ou collez un lien (YouTube, Vimeo...)"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Affiche du film</Text>
              <TouchableOpacity
                style={[styles.uploadButton, { marginBottom: 10, borderColor: colors.primary }]}
                onPress={() => pickImage(false)}
                disabled={uploading}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="image-outline" size={20} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontWeight: "600" }}>
                    {addImageUrl ? "Affiche ajoutée" : "Uploader l'affiche"}
                  </Text>
                </View>
              </TouchableOpacity>
              
              {addImageUrl ? (
                <Image source={{ uri: addImageUrl }} style={{ width: '100%', height: 120, borderRadius: 8, marginBottom: 15 }} resizeMode="cover" />
              ) : null}

              <TouchableOpacity
                style={[styles.saveButton, { marginTop: 10 }]}
                onPress={saveNewProject}
                disabled={saving || uploading}
              >
                {saving ? (
                  <ClapLoading color="white" />
                ) : (
                  <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>Publier dans le Hall of Fame</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* MANAGE TEAM MODAL */}
      <Modal
        visible={manageTeamVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setManageTeamVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '85%', padding: 0 }]}>
            <View style={styles.teamModalHeader}>
              <Text style={styles.teamModalTitle} numberOfLines={1}>
                Équipe : {selectedProjectTitle}
              </Text>
              <TouchableOpacity onPress={() => setManageTeamVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            {selectedProjectId && (
              <ProjectTeamManager 
                projectId={selectedProjectId} 
                projectTitle={selectedProjectTitle}
                onClose={() => setManageTeamVisible(false)}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* TEAM MODAL */}
      <Modal
        visible={teamModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTeamModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "80%", padding: 0 }]}>
            <View style={styles.teamModalHeader}>
              <Text style={styles.teamModalTitle} numberOfLines={1}>
                Équipe : {selectedProjectTitle}
              </Text>
              <TouchableOpacity onPress={() => setTeamModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {loadingTeam ? (
              <View style={{ padding: 40 }}>
                <ClapLoading />
              </View>
            ) : (
              <>
                {teamData.length > 0 && (
                  <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
                    >
                      <TouchableOpacity
                        style={[
                          styles.categoryChip,
                          selectedTeamCategory === null && styles.categoryChipActive
                        ]}
                        onPress={() => setSelectedTeamCategory(null)}
                      >
                        <Text style={[
                          styles.categoryChipText,
                          selectedTeamCategory === null && styles.categoryChipTextActive
                        ]}>TOUT</Text>
                      </TouchableOpacity>
                      {teamData.map((section) => (
                        <TouchableOpacity
                          key={section.title}
                          style={[
                            styles.categoryChip,
                            selectedTeamCategory === section.title && styles.categoryChipActive
                          ]}
                          onPress={() => setSelectedTeamCategory(section.title)}
                        >
                          <Text style={[
                            styles.categoryChipText,
                            selectedTeamCategory === section.title && styles.categoryChipTextActive
                          ]}>
                            {(categoryLabels[section.title] || section.title).toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <FlatList
                  data={selectedTeamCategory 
                    ? teamData.filter(s => s.title === selectedTeamCategory)
                    : teamData
                  }
                  keyExtractor={(item) => item.title}
                  contentContainerStyle={{ padding: 20 }}
                  renderItem={({ item }) => (
                    <View style={{ marginBottom: 20 }}>
                      <View style={styles.categoryHeader}>
                        <View style={styles.categoryLine} />
                        <Text style={styles.categoryTitle}>
                          {(categoryLabels[item.title] || item.title).toUpperCase()}
                        </Text>
                        <View style={styles.categoryLine} />
                      </View>
                      <View style={Platform.OS === 'web' ? { flexDirection: 'row', flexWrap: 'wrap', gap: 15 } : {}}>
                        {item.data.map((role: any) => (
                          <TouchableOpacity
                            key={role.id}
                            style={[
                              styles.teamMemberRow,
                              Platform.OS === 'web' && { width: '48%', minWidth: 250, borderBottomWidth: 0, backgroundColor: colors.backgroundSecondary, borderRadius: 12, padding: 12 }
                            ]}
                            onPress={() => {
                              setTeamModalVisible(false);
                              router.push({
                                pathname: "/profile/[id]",
                                params: { id: role.assigned_profile.id },
                              });
                            }}
                          >
                            <Image
                              source={{
                                uri:
                                  role.assigned_profile.avatar_url ||
                                  "https://randomuser.me/api/portraits/lego/1.jpg",
                              }}
                              style={styles.smallAvatar}
                            />
                            <View>
                              <Text style={styles.memberName}>
                                {role.assigned_profile.full_name}
                              </Text>
                              <Text style={styles.memberRole}>{role.title}</Text>
                            </View>
                            <Ionicons
                              name="chevron-forward"
                              size={16}
                              color="#ccc"
                              style={{ marginLeft: "auto" }}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyTeamText}>
                      Aucun participant n'est encore listé pour ce projet.
                    </Text>
                  }
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  mobileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 15,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mobileBackButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
  },
  mobileHeaderTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
  },
  webHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    zIndex: 10,
    marginBottom: 10,
  },
  webHeaderSmall: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginBottom: 5,
  },
  webHeaderTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
  },
  webHeaderSubtitle: {
    fontSize: 14,
    color: isDark ? "#94A3B8" : "#64748B",
    marginTop: 2,
  },
  webBackButton: {
    padding: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
  },
  webFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: isDark ? "#DAA52030" : "#DAA52015",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 8,
  },
  webFilterButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: isDark ? "#FFD700" : "#B8860B",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 50,
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 10,
  },
  emptySubtext: {
    color: isDark ? "#9CA3AF" : "#666",
    textAlign: "center",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: colors.text,
  },
  label: {
    fontWeight: "600",
    marginBottom: 5,
    marginTop: 10,
    color: isDark ? "#CCC" : "#444",
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: colors.text,
    backgroundColor: colors.backgroundSecondary,
  },
  uploadButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  urlInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: colors.text,
    backgroundColor: colors.backgroundSecondary,
  },
  // Team Modal Styles
  teamModalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
    flex: 1,
    marginRight: 10,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    gap: 10,
  },
  categoryLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: colors.primary,
    letterSpacing: 1,
  },
  categoryChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: "bold",
    color: colors.text,
  },
  categoryChipTextActive: {
    color: "white",
  },
  teamMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  smallAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: colors.backgroundSecondary,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  memberRole: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyTeamText: {
    textAlign: "center",
    color: colors.textSecondary,
    marginTop: 20,
    fontStyle: "italic",
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.backgroundSecondary,
  },
  saveButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  teamButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    gap: 8,
  },
  teamButtonText: {
    color: colors.primary,
    fontWeight: "600",
  },
});
