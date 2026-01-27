import ClapLoading from "@/components/ClapLoading";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

export default function RoleDetails() {
  const { id: rawId } = useLocalSearchParams();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<any>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [applicationModalVisible, setApplicationModalVisible] = useState(false);

  useEffect(() => {
    fetchRoleDetails();
    checkUserSession();
  }, [id]);

  async function checkUserSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      setUserId(session.user.id);
      checkApplicationStatus(session.user.id);
    }
  }

  async function checkApplicationStatus(uid: string) {
    // Check if user has already applied (requires 'applications' table)
    const { data } = await supabase
      .from("applications" as any)
      .select("*")
      .eq("role_id", id)
      .eq("candidate_id", uid)
      .maybeSingle();

    if (data) {
      setHasApplied(true);
    }
  }

  function openApplicationModal() {
    if (!userId) {
      Alert.alert("Erreur", "Vous devez être connecté pour postuler.");
      return;
    }
    if (hasApplied) return;
    setApplicationModalVisible(true);
  }

  async function handleApply() {
    if (!userId) {
      Alert.alert("Erreur", "Vous devez être connecté pour postuler.");
      return;
    }

    try {
      setApplying(true);
      // Create application
      const { error } = await supabase.from("applications" as any).insert({
        role_id: id,
        candidate_id: userId,
        status: "pending",
        message: applicationMessage.trim() || null,
      });

      if (error) {
        // If duplicate (unique constraint), valid too
        if (error.code === "23505") {
          setHasApplied(true);
          Alert.alert("Info", "Vous avez déjà postulé.");
        } else {
          throw error;
        }
      } else {
        setHasApplied(true);
        Alert.alert("Succès", "Votre candidature a été envoyée !");
        setApplicationModalVisible(false);
      }
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setApplying(false);
    }
  }

  async function fetchRoleDetails() {
    if (!id || id === "undefined") return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("project_roles")
        .select(
          `
          *,
          tournages (
            *
          )
        `,
        )
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        Alert.alert("Erreur", "Offre introuvable.");
        router.back();
        return;
      }
      setRole(data);
    } catch (e) {
      console.error("fetchRoleDetails error:", e);
      Alert.alert("Erreur", (e as Error).message);
      router.back();
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ClapLoading size={50} color={Colors.light.primary} />
      </View>
    );
  }

  if (!role) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Offre introuvable</Text>
      </View>
    );
  }

  const project = role.tournages;

  function formatGender(g: string | null) {
    if (!g) return "Indifférent";
    return g.charAt(0).toUpperCase() + g.slice(1);
  }

  function formatExperience(e: string | null) {
    if (!e) return "Indifférent";
    const map: Record<string, string> = {
      debutant: "Débutant",
      intermediaire: "Intermédiaire",
      confirme: "Confirmé",
    };
    return map[e] || e;
  }

  function formatAge(min: number | null, max: number | null) {
    if (!min && !max) return "Indifférent";
    if (min && max) return `${min} - ${max} ans`;
    if (min) return `Dès ${min} ans`;
    if (max) return `Jusqu'à ${max} ans`;
    return "Indifférent";
  }
  // add the description in big in the bottom

  function formatDescription(desc: string | null) {
    if (!desc) return "Aucune description fournie.";
    return desc;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        bounces={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* HEADER IMAGE (Optional placeholder or project image) */}
        <View style={styles.imageHeader}>
          {project?.image_url ? (
            <Image
              source={{ uri: project.image_url }}
              style={styles.projectImage}
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="film-outline" size={60} color="white" />
            </View>
          )}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* ROLE HEADER */}
          <View style={styles.roleHeader}>
            <Text style={styles.roleTitle}>{role.title}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {role.category.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* PROJECT INFO CARD */}
          <View style={GlobalStyles.card}>
            <Text style={GlobalStyles.title2}>Le Projet</Text>
            <Text style={styles.projectTitle}>{project.title}</Text>
            <Text style={styles.projectMeta}>
              {project.type?.replace("_", " ")} • {project.ville || "Lieu N/C"}
            </Text>
            {project.description && (
              <Text style={styles.descriptionText}>{project.description}</Text>
            )}
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.dateText}>
                {project.start_date || "Dates à définir"}
                {project.end_date ? ` - ${project.end_date}` : ""}
              </Text>
            </View>
          </View>

          {/* ROLE DETAILS */}
          <View style={styles.detailsContainer}>
            <Text style={[GlobalStyles.title2, { marginTop: 20 }]}>
              Détails du poste
            </Text>

            {role.description && (
              <Text style={styles.descriptionText}>{role.description}</Text>
            )}

            <View style={styles.tagsContainer}>
              <View style={styles.tag}>
                <Text style={styles.tagLabel}>Sexe</Text>
                <Text style={styles.tagValue}>{formatGender(role.gender)}</Text>
              </View>

              <View style={styles.tag}>
                <Text style={styles.tagLabel}>Âge</Text>
                <Text style={styles.tagValue}>
                  {formatAge(role.age_min, role.age_max)}
                </Text>
              </View>

              <View style={styles.tag}>
                <Text style={styles.tagLabel}>Expérience</Text>
                <Text style={styles.tagValue}>
                  {formatExperience(role.experience_level)}
                </Text>
              </View>

              {role.height && (
                <View style={styles.tag}>
                  <Text style={styles.tagLabel}>Taille</Text>
                  <Text style={styles.tagValue}>{role.height} cm</Text>
                </View>
              )}

              {role.hair_color && (
                <View style={styles.tag}>
                  <Text style={styles.tagLabel}>Cheveux</Text>
                  <Text style={styles.tagValue}>{role.hair_color}</Text>
                </View>
              )}

              {role.eye_color && (
                <View style={styles.tag}>
                  <Text style={styles.tagLabel}>Yeux</Text>
                  <Text style={styles.tagValue}>{role.eye_color}</Text>
                </View>
              )}

              {/* Technical / Other Data */}
              {role.equipment && (
                <View style={styles.tagWide}>
                  <Text style={styles.tagLabel}>Matériel</Text>
                  <Text style={styles.tagValue}>{role.equipment}</Text>
                </View>
              )}

              {role.software && (
                <View style={styles.tagWide}>
                  <Text style={styles.tagLabel}>Logiciels</Text>
                  <Text style={styles.tagValue}>{role.software}</Text>
                </View>
              )}

              {role.specialties && (
                <View style={styles.tagWide}>
                  <Text style={styles.tagLabel}>Spécialités</Text>
                  <Text style={styles.tagValue}>{role.specialties}</Text>
                </View>
              )}

              {/* Check role level is_paid first, then project level fallback */}
              {(role.is_paid !== null || project.is_paid !== null) && (
                <View style={styles.tag}>
                  <Text style={styles.tagLabel}>Rémunération</Text>
                  <Text style={styles.tagValue}>
                    {role.is_paid !== null
                      ? role.is_paid
                        ? "Rémunéré"
                        : "Bénévole"
                      : project.is_paid
                        ? "Rémunéré"
                        : "Bénévole"}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.descriptionText}>
              {formatDescription(role.description)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* FOOTER ACTION */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            GlobalStyles.primaryButton,
            (hasApplied || applying) && { backgroundColor: "#ccc" },
          ]}
          onPress={openApplicationModal}
          disabled={hasApplied || applying}
        >
          {applying ? (
            <ClapLoading color="white" size={24} />
          ) : (
            <Text style={GlobalStyles.buttonText}>
              {hasApplied ? "Candidature envoyée" : "Postuler"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL APPLICATION */}
      <Modal
        visible={applicationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setApplicationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 15,
              }}
            >
              <Text style={GlobalStyles.title2}>Postuler</Text>
              <TouchableOpacity
                onPress={() => setApplicationModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={{ marginBottom: 10, color: "#666" }}>
              Vous pouvez ajouter un message personnel à votre candidature.
            </Text>

            <View
              style={{
                borderWidth: 1,
                borderColor: Colors.light.border,
                borderRadius: 8,
                padding: 10,
                backgroundColor: Colors.light.backgroundSecondary,
                height: 120,
                marginBottom: 20,
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  textAlignVertical: "top",
                  color: Colors.light.text,
                }}
                placeholder="Bonjour, je suis très intéressé par ce rôle..."
                multiline
                value={applicationMessage}
                onChangeText={setApplicationMessage}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={GlobalStyles.primaryButton}
              onPress={handleApply}
              disabled={applying}
            >
              {applying ? (
                <ClapLoading color="white" size={24} />
              ) : (
                <Text style={GlobalStyles.buttonText}>
                  Envoyer ma candidature
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundSecondary },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: {
    fontSize: 18,
    color: Colors.light.danger,
    textAlign: "center",
    marginTop: 50,
  },

  imageHeader: { height: 200, backgroundColor: "#333", position: "relative" },
  projectImage: { width: "100%", height: "100%", opacity: 0.8 },
  placeholderImage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.light.primary,
  },

  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "white",
    padding: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },

  content: {
    padding: 20,
    marginTop: -20,
    backgroundColor: Colors.light.backgroundSecondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  roleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  roleTitle: {
    fontSize: 24,
    fontWeight: "bold",
    flex: 1,
    marginRight: 10,
    color: Colors.light.text,
  },
  badge: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  badgeText: { color: Colors.light.primary, fontWeight: "bold", fontSize: 12 },

  projectTitle: { fontSize: 16, fontWeight: "600", color: Colors.light.text },
  projectMeta: { fontSize: 14, color: "#666", marginBottom: 8 },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  dateText: { fontSize: 12, color: "#666" },

  detailsContainer: {},
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.light.text,
    marginBottom: 15,
    textAlign: "justify",
    paddingVertical: 10,
  },

  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  tag: {
    backgroundColor: Colors.light.background,
    padding: 10,
    borderRadius: 8,
    minWidth: "45%",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  tagLabel: {
    fontSize: 10,
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  tagValue: { fontSize: 14, fontWeight: "600", color: Colors.light.text },
  tagWide: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    width: "100%",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.background,
    padding: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: Colors.light.border,
  },

  // Modal Styles (copied from other file for consistency)
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    maxHeight: "80%",
    width: "100%",
  },
});
