import ClapLoading from "@/components/ClapLoading";
import PopcornLikeButton from "@/components/PopcornLikeButton";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { supabase } from "@/lib/supabase";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useState } from "react";

import {
    Alert,
    FlatList,
    Image,
    Linking,
    Modal,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";

export default function HallOfFameScreen({
  forceOnlyMine = false,
}: {
  forceOnlyMine?: boolean;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWebLarge = Platform.OS === "web" && width >= 768;

  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Edit Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Team Modal
  const [teamModalVisible, setTeamModalVisible] = useState(false);
  const [teamData, setTeamData] = useState<any[]>([]);
  const [selectedProjectTitle, setSelectedProjectTitle] = useState("");
  const [loadingTeam, setLoadingTeam] = useState(false);

  useEffect(() => {
    // 1. Get user first, then fetch projects with like status
    supabase.auth.getSession().then(({ data: { session } }) => {
      const userId = session?.user.id || null;
      setCurrentUserId(userId);
      fetchHallOfFame(userId);
    });
  }, []);

  // Removed separate fetchUser to avoid race conditions or double fetching

  async function fetchHallOfFame(userId: string | null = currentUserId) {
    try {
      // 1. Fetch Projects with their corresponding likes
      const { data: projectsData, error } = await supabase
        .from("tournages")
        .select(
          `
            *,
            project_likes(user_id)
        `,
        )
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const projects = projectsData || [];

      // 2. Fetch Owner Profiles manually because the join might fail if FK is missing
      const ownerIds = [...new Set(projects.map((p) => p.owner_id))].filter(
        Boolean,
      );
      let profilesMap: Record<string, any> = {};

      if (ownerIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", ownerIds);

        if (!profilesError && profilesData) {
          profilesData.forEach((p) => {
            profilesMap[p.id] = p;
          });
        }
      }

      const finalProjects = projects.map((p) => {
        const likes = p.project_likes || [];
        return {
          ...p,
          owner: profilesMap[p.owner_id] || null,
          likes_count: likes.length, // Accurate total count
          isLiked: userId
            ? likes.some((l: any) => l.user_id === userId)
            : false,
        };
      });

      setProjects(finalProjects);
    } catch (e) {
      console.error("Error fetching Hall of Fame", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchTeam(projectId: string, projectTitle: string) {
    try {
      setSelectedProjectTitle(projectTitle);
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

      // Group by category
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

  function handleEdit(item: any) {
    setEditingProject(item);
    setEditTitle(item.title);
    setEditDesc(item.description || "");
    setEditUrl(item.final_result_url || "");
    setEditModalVisible(true);
  }

  async function pickVideoForEdit() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];

        if (asset.fileSize && asset.fileSize > 31457280) {
          // 30MB
          Alert.alert("Trop volumineux", "La vidéo doit faire moins de 30 Mo.");
          return;
        }

        uploadVideoForEdit(asset.uri);
      }
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'ouvrir la galerie.");
    }
  }

  async function uploadVideoForEdit(uri: string) {
    try {
      setUploading(true);
      const response = await fetch(uri);
      const blob = await response.blob();

      const fileExt = uri.split(".").pop() || "mp4";
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${editingProject.id}/${fileName}`;

      const { error } = await supabase.storage
        .from("videos")
        .upload(filePath, blob);
      if (error) throw error;

      const { data } = supabase.storage.from("videos").getPublicUrl(filePath);
      setEditUrl(data.publicUrl); // Auto-fill the URL field
      Alert.alert(
        "Succès",
        "Vidéo téléchargée ! N'oubliez pas de sauvegarder.",
      );
    } catch (e: any) {
      console.error(e);
      Alert.alert("Erreur Upload", e.message || "Une erreur est survenue.");
    } finally {
      setUploading(false);
    }
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
        })
        .eq("id", editingProject.id);

      if (error) throw error;

      setEditModalVisible(false);
      fetchHallOfFame(); // Refresh list
      Alert.alert("Succès", "Projet mis à jour !");
    } catch (e) {
      Alert.alert("Erreur", "Impossible de sauvegarder.");
    } finally {
      setSaving(false);
    }
  }

  function isVideoFile(url: string) {
    if (!url) return false;
    return (
      url.match(/\.(mp4|mov|avi|wmv|flv|mkv)$/i) ||
      url.includes("/storage/v1/object/public/videos/") ||
      url.includes("youtu")
    );
  }

  async function toggleLike(project: any, isLikedNow: boolean) {
    if (!currentUserId) return;

    // 1. Optimistic Update in Local State
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === project.id) {
          return {
            ...p,
            isLiked: isLikedNow,
            likes_count: isLikedNow
              ? (p.likes_count || 0) + 1
              : (p.likes_count || 0) - 1,
          };
        }
        return p;
      }),
    );

    try {
      if (isLikedNow) {
        // Check first using a column we know exists to avoid 400 error
        const { data: existing } = await supabase
          .from("project_likes")
          .select("project_id")
          .eq("project_id", project.id)
          .eq("user_id", currentUserId)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase
            .from("project_likes")
            .insert({ project_id: project.id, user_id: currentUserId });
          if (error && error.code !== "23505") throw error;

          // NOTE: We don't update 'tournages.likes_count' manually because it usually fails due to RLS
          // The count is now fetched dynamically from the project_likes table.
        }
      } else {
        const { error } = await supabase
          .from("project_likes")
          .delete()
          .eq("project_id", project.id)
          .eq("user_id", currentUserId);
        if (error) throw error;

        // NOTE: Similar to increment, decrementing the column is skipped in favor of dynamic counting.
      }
    } catch (e: any) {
      console.error("Error toggling like", e);
      Alert.alert(
        "Erreur Like",
        e.message || "Impossible de mettre à jour le like.",
      );
      // Revert optimistic update
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === project.id) {
            return {
              ...p,
              isLiked: !isLikedNow,
              likes_count: !isLikedNow
                ? (p.likes_count || 0) + 1
                : (p.likes_count || 0) - 1,
            };
          }
          return p;
        }),
      );
    }
  }

  const renderItem = ({ item }: { item: any }) => (
    <ProjectCard
      item={item}
      currentUserId={currentUserId}
      onEdit={() => handleEdit(item)}
      onOpenLink={handleOpenLink}
      router={router}
      onToggleLike={(liked: boolean) => toggleLike(item, liked)}
      onViewTeam={() => fetchTeam(item.id, item.title)}
    />
  );

  const filteredProjects = forceOnlyMine
    ? projects.filter((p) => p.owner_id === currentUserId)
    : projects;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: forceOnlyMine ? "Mes Réalisations" : "Hall of Fame",
          headerShown: Platform.OS !== "web" && !forceOnlyMine,
          headerRight: () =>
            !forceOnlyMine ? (
              <TouchableOpacity
                onPress={() => router.push("/my-awards")}
                style={{
                  marginRight: 10,
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
            ) : null,
        }}
      />

      {/* HEADER MOBILE NATIVE (Spécifique Mes Réalisations sur App) */}
      {Platform.OS !== "web" && forceOnlyMine ? (
        <View style={styles.mobileHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.mobileBackButton}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
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
                  color={Colors.light.text}
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
          {!forceOnlyMine ? (
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
          ) : null}
        </View>
      ) : null}

      {loading ? (
        <ClapLoading />
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={{ width: "100%" }}
          contentContainerStyle={[
            { padding: 15, paddingBottom: 50 },
            isWebLarge && { maxWidth: 800, alignSelf: "center", width: "100%" },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchHallOfFame();
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
                  : "Soyez le premier à publier votre chef-d'œuvre !"}
              </Text>
            </View>
          }
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
              style={GlobalStyles.input}
              value={editTitle}
              onChangeText={setEditTitle}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[GlobalStyles.input, { height: 80 }]}
              multiline
              value={editDesc}
              onChangeText={setEditDesc}
            />

            <Text style={styles.label}>
              Lien Vidéo (YouTube/Vimeo) ou Upload
            </Text>

            <TouchableOpacity
              style={[
                GlobalStyles.secondaryButton,
                { marginBottom: 10, borderColor: Colors.light.primary },
              ]}
              onPress={pickVideoForEdit}
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
                    name="cloud-upload-outline"
                    size={20}
                    color={Colors.light.primary}
                  />
                  <Text
                    style={{ color: Colors.light.primary, fontWeight: "600" }}
                  >
                    Uploader une vidéo
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={GlobalStyles.input}
              value={editUrl}
              onChangeText={setEditUrl}
              placeholder="https://..."
              autoCapitalize="none"
            />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 15 }}>
              <TouchableOpacity
                style={[GlobalStyles.secondaryButton, { flex: 1 }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[GlobalStyles.primaryButton, { flex: 1 }]}
                onPress={saveEdit}
                disabled={saving || uploading}
              >
                {saving ? (
                  <ClapLoading color="white" />
                ) : (
                  <Text style={GlobalStyles.buttonText}>Sauvegarder</Text>
                )}
              </TouchableOpacity>
            </View>
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
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            {loadingTeam ? (
              <View style={{ padding: 40 }}>
                <ClapLoading />
              </View>
            ) : (
              <FlatList
                data={teamData}
                keyExtractor={(item) => item.title}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }) => (
                  <View style={{ marginBottom: 20 }}>
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryLine} />
                      <Text style={styles.categoryTitle}>
                        {item.title.toUpperCase()}
                      </Text>
                      <View style={styles.categoryLine} />
                    </View>
                    {item.data.map((role: any) => (
                      <TouchableOpacity
                        key={role.id}
                        style={styles.teamMemberRow}
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
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyTeamText}>
                    Aucun participant n'est encore listé pour ce projet.
                  </Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ProjectCard({
  item,
  currentUserId,
  onEdit,
  onOpenLink,
  router,
  onToggleLike,
  onViewTeam,
}: any) {
  const isDirectVideo =
    item.final_result_url &&
    (item.final_result_url.match(/\.(mp4|mov|avi|wmv|flv|mkv)$/i) ||
      item.final_result_url.includes("/storage/v1/object/public/videos/"));

  // NEW: expo-video player hook
  const player = useVideoPlayer(
    isDirectVideo ? item.final_result_url : null,
    (player) => {
      player.loop = false;
    },
  );

  return (
    <View style={styles.card}>
      {/* HEADER: User info */}
      <View style={styles.cardHeader}>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
          onPress={() =>
            router.push({
              pathname: "/profile/[id]",
              params: { id: item.owner_id },
            })
          }
        >
          <Image
            source={{
              uri:
                item.owner?.avatar_url ||
                "https://randomuser.me/api/portraits/lego/1.jpg",
            }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.ownerName}>
              {item.owner?.full_name || "Utilisateur"}
            </Text>
            <Text style={styles.date}>
              {item.type?.replace("_", " ").toUpperCase()} •{" "}
              {new Date(item.created_at).getFullYear()}
            </Text>
          </View>
        </TouchableOpacity>

        {/* EDIT BUTTON (Only for Owner) */}
        {currentUserId === item.owner_id && (
          <TouchableOpacity onPress={onEdit} style={styles.editButton}>
            <Ionicons name="pencil" size={18} color={Colors.light.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* MEDIA: VIDEO PLAYER OR POSTER */}
      {isDirectVideo ? (
        <View
          style={[
            styles.mediaContainer,
            { backgroundColor: "transparent", height: 220 },
          ]}
        >
          <VideoView
            player={player}
            style={{
              height: "100%",
              aspectRatio: 16 / 9,
              maxWidth: "100%",
            }}
            contentFit="contain"
            allowsFullscreen
            nativeControls
          />
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() =>
            item.final_result_url
              ? onOpenLink(item.final_result_url)
              : router.push(`/project/${item.id}`)
          }
          style={styles.mediaContainer}
        >
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.media}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.media, styles.placeholderMedia]}>
              <Ionicons name="film" size={50} color="white" opacity={0.5} />
            </View>
          )}

          {/* Play Button Overlay if link exists */}
          {item.final_result_url && (
            <View style={styles.playOverlay}>
              <Ionicons
                name="play"
                size={40}
                color="white"
                style={{ marginLeft: 4 }}
              />
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* CONTENT */}
      <View style={styles.cardContent}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={3}>
          {item.description}
        </Text>

        <View style={styles.actionsRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <PopcornLikeButton
              initialLikes={item.likes_count || 0}
              liked={item.isLiked} // Persisted state
              onLike={(liked) => {
                onToggleLike(liked);
              }}
            />

            <TouchableOpacity style={styles.teamButton} onPress={onViewTeam}>
              <Ionicons
                name="people-outline"
                size={18}
                color={Colors.light.primary}
              />
              <Text style={styles.teamButtonText}>Équipe</Text>
            </TouchableOpacity>
          </View>

          {item.final_result_url && !isDirectVideo && (
            <TouchableOpacity
              style={styles.watchButton}
              onPress={() => onOpenLink(item.final_result_url)}
            >
              <Text style={styles.watchButtonText}>Regarder le film</Text>
              <Ionicons name="open-outline" size={16} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  mobileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingBottom: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  mobileBackButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  mobileHeaderTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.light.text,
  },
  webHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#000",
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
    color: "#0F172A",
  },
  webHeaderSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  webBackButton: {
    padding: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
  },
  webFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DAA52015",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 8,
  },
  webFilterButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B8860B",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
    width: "100%",
    alignSelf: "stretch",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "#eee",
  },
  ownerName: {
    fontWeight: "bold",
    fontSize: 14,
    color: Colors.light.text,
  },
  date: {
    fontSize: 12,
    color: "#666",
  },
  editButton: {
    padding: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
  },
  mediaContainer: {
    width: "100%",
    height: 220, // GlobalStyles logic: fixed height so cards don't jump in size
    backgroundColor: "black",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  placeholderMedia: {
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  playOverlay: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  cardContent: {
    padding: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.light.text,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: "#444",
    lineHeight: 20,
    marginBottom: 15,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
    flexWrap: "wrap",
    gap: 10,
  },
  watchButton: {
    backgroundColor: Colors.light.tint,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 5,
  },
  watchButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 50,
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.light.text,
    marginBottom: 10,
  },
  emptySubtext: {
    color: "#666",
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
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: Colors.light.text,
  },
  label: {
    fontWeight: "600",
    marginBottom: 5,
    marginTop: 10,
    color: "#444",
  },
  // Team Modal Styles
  teamModalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  teamModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.light.text,
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
    backgroundColor: "#eee",
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: Colors.light.primary,
    letterSpacing: 1,
  },
  teamMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f9f9f9",
  },
  smallAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#eee",
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  memberRole: {
    fontSize: 13,
    color: "#666",
  },
  emptyTeamText: {
    textAlign: "center",
    color: "#999",
    marginTop: 20,
    fontStyle: "italic",
  },
  teamButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    gap: 5,
  },
  teamButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.light.primary,
  },
});
