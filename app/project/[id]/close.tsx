import ClapLoading from "@/components/ClapLoading";
import { GlobalStyles } from "@/constants/Styles";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import * as ImagePicker from "expo-image-picker";

export default function ProjectSettingsActions() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Close Project Modal
  const [closeModalVisible, setCloseModalVisible] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [closing, setClosing] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  async function fetchProject() {
    if (!id) return;
    const { data } = await supabase
      .from("tournages")
      .select("*")
      .eq("id", id)
      .single();
    if (data) setProject(data);
    setLoading(false);
  }

  async function pickVideo() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
      });

      if (!result.canceled) {
        const asset = result.assets[0];

        // Check size (approximate using fileSize if available, usually bytes)
        // 30MB = 30 * 1024 * 1024 = 31,457,280 bytes
        if (asset.fileSize && asset.fileSize > 31457280) {
          Alert.alert(
            " Trop volumineux",
            "La vidéo doit faire moins de 30 Mo.",
          );
          return;
        }

        uploadVideo(asset.uri);
      }
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'ouvrir la galerie.");
    }
  }

  async function uploadVideo(uri: string) {
    try {
      setUploading(true);

      // 1. Create Blob (fetch local uri)
      const response = await fetch(uri);
      const blob = await response.blob();

      // 2. Generate path
      const fileExt = uri.split(".").pop() || "mp4";
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${id}/${fileName}`;

      // 3. Upload
      const { error } = await supabase.storage
        .from("videos")
        .upload(filePath, blob);
      if (error) throw error;

      // 4. Get Public URL
      const { data } = supabase.storage.from("videos").getPublicUrl(filePath);

      setVideoUrl(data.publicUrl);
      Alert.alert("Succès", "Vidéo téléchargée !");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Erreur Upload", e.message || "Une erreur est survenue.");
    } finally {
      setUploading(false);
    }
  }

  async function handleCloseProject() {
    if (!id) return;
    if (!videoUrl) {
      Alert.alert(
        "Lien manquant",
        "Veuillez ajouter un lien ou uploader une vidéo.",
      );
      return;
    }

    try {
      setClosing(true);
      const { error } = await supabase
        .from("tournages")
        .update({
          status: "completed",
          final_result_url: videoUrl,
          likes_count: 0, // Init
        })
        .eq("id", id);

      if (error) throw error;

      setCloseModalVisible(false);
      Alert.alert(
        "Félicitations 🎬",
        "Votre projet est maintenant dans le Hall of Fame !",
      );
      router.replace("/hall-of-fame");
    } catch (e) {
      Alert.alert("Erreur", "Impossible de clôturer le projet.");
    } finally {
      setClosing(false);
    }
  }

  if (loading) return <ClapLoading />;

  if (!project) return <Text>Projet introuvable</Text>;

  if (project.status === "completed") {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Paramètres" }} />
        <View
          style={[GlobalStyles.card, { alignItems: "center", marginTop: 50 }]}
        >
          <Text style={{ fontSize: 50 }}>🏆</Text>
          <Text
            style={[
              GlobalStyles.title2,
              { textAlign: "center", marginTop: 10 },
            ]}
          >
            Ce projet est terminé !
          </Text>
          <Text
            style={{
              textAlign: "center",
              color: colors.text,
              opacity: 0.6,
              marginTop: 5,
              marginBottom: 20,
            }}
          >
            Il est visible dans le Hall of Fame.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/hall-of-fame")}
            style={[GlobalStyles.primaryButton, { backgroundColor: colors.tint }]}
          >
            <Text style={GlobalStyles.buttonText}>Voir le Hall of Fame</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Clôturer le projet" }} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.warningCard}>
          <Ionicons
            name="warning"
            size={32}
            color={colors.danger}
            style={{ marginBottom: 10 }}
          />
          <Text style={styles.warningTitle}>Zone de Danger</Text>
          <Text style={styles.warningText}>
            Clôturer le projet marquera la fin du tournage et le rendra public
            dans le Hall of Fame. Vous ne pourrez plus publier d'annonces de
            casting pour ce projet.
          </Text>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => setCloseModalVisible(true)}
          >
            <Text style={styles.dangerButtonText}>
              Terminer et Clôturer le Projet
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* MODAL */}
      <Modal
        visible={closeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCloseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎬 C'est dans la boîte ?</Text>
            <Text style={{ marginBottom: 15, color: colors.text, opacity: 0.8 }}>
              Ajoutez le lien vers le résultat final ou uploadez votre bande
              annonce (max 30 Mo).
            </Text>

            <View style={{ gap: 10, marginBottom: 20 }}>
              <Text style={{ fontWeight: "600", color: colors.text }}>
                Option 1: Lien Externe
              </Text>
              <TextInput
                style={[GlobalStyles.input, { color: colors.text, borderColor: colors.border }]}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor={colors.text + "80"}
                value={videoUrl}
                onChangeText={setVideoUrl}
                autoCapitalize="none"
              />

              <Text style={{ fontWeight: "600", color: colors.text, marginTop: 10 }}>
                Option 2: Uploader une vidéo
              </Text>
              <TouchableOpacity
                style={[
                  GlobalStyles.secondaryButton,
                  { borderColor: colors.tint },
                ]}
                onPress={pickVideo}
                disabled={uploading}
              >
                {uploading ? (
                  <Text style={{ color: colors.text, opacity: 0.6 }}>Upload en cours...</Text>
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
                      color={colors.tint}
                    />
                    <Text
                      style={{ color: colors.tint, fontWeight: "600" }}
                    >
                      Choisir un fichier
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              {uploading && (
                <ClapLoading size={20} color={colors.tint} />
              )}
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={[GlobalStyles.secondaryButton, { flex: 1, borderColor: colors.border }]}
                onPress={() => setCloseModalVisible(false)}
              >
                <Text style={{ color: colors.text }}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  GlobalStyles.primaryButton,
                  { flex: 1, backgroundColor: colors.success },
                ]}
                onPress={handleCloseProject}
                disabled={closing || uploading || !videoUrl}
              >
                {closing ? (
                  <ClapLoading color="white" />
                ) : (
                  <Text style={GlobalStyles.buttonText}>Publier ! 🍿</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  warningCard: {
    backgroundColor: isDark ? colors.danger + "20" : "#FEF2F2",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: isDark ? colors.danger + "40" : "#FECACA",
    alignItems: "center",
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.danger,
    marginBottom: 5,
  },
  warningText: {
    color: isDark ? colors.text : "#7F1D1D",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  dangerButton: {
    backgroundColor: colors.danger,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  dangerButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
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
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: colors.text,
  },
  });
}
