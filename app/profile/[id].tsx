import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function ProfileDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tournages, setTournages] = useState<any[]>([]);
  const [participations, setParticipations] = useState<any[]>([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [contactVisible, setContactVisible] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  async function fetchProfile() {
    try {
      const profileId = Array.isArray(id) ? id[0] : id;
      if (!profileId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // Check current user
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      const isOwner = currentUserId === profileId;
      setIsOwnProfile(isOwner);

      // Fetch Profile Data
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .single();
      if (error) throw error;
      setProfile(data);

      // Fetch Visibility Settings
      let hiddenIds: string[] = [];
      let isContactVisibleInSettings = true;

      const { data: settings } = await supabase
        .from("public_profile_settings")
        .select("*")
        .eq("id", profileId)
        .single();

      if (settings) {
        hiddenIds = settings.hidden_project_ids || [];
        isContactVisibleInSettings = settings.is_contact_visible ?? true;
      }
      setContactVisible(isContactVisibleInSettings);

      // fetch public tournages for this user
      let query = supabase
        .from("tournages")
        .select("id, title, type, created_at, is_public")
        .eq("owner_id", profileId)
        .order("created_at", { ascending: false });

      // If not owner, filter by global public flag (optional, but good practice)
      if (!isOwner) {
        query = query.eq("is_public", true);
      }

      const { data: tours, error: errTours } = await query;
      if (!errTours) {
        let filteredTours = tours || [];
        // Apply Profile Settings Filter (Hidden Projects)
        if (!isOwner) {
          filteredTours = filteredTours.filter(
            (t) => !hiddenIds.includes(t.id),
          );
        }
        setTournages(filteredTours);
      }

      // Fetch visible participations
      let pQuery = supabase
        .from("project_roles")
        .select(
          `
            id,
            title,
            tournages!inner (
                id,
                title,
                type,
                created_at,
                is_public
            )
        `,
        )
        .eq("assigned_profile_id", profileId);

      if (!isOwner) {
        pQuery = pQuery.eq("tournages.is_public", true);
      }

      const { data: parts, error: partError } = await pQuery;

      if (!partError && parts) {
        let filteredParts = parts || [];
        // Apply Profile Settings Filter (Hidden Projects)
        if (!isOwner) {
          filteredParts = filteredParts.filter((p) => {
            const t = Array.isArray(p.tournages) ? p.tournages[0] : p.tournages;
            return t && !hiddenIds.includes(t.id);
          });
        }
        setParticipations(filteredParts);
      }
    } catch (error) {
      console.log("Fetch error on profile:", error);
      Alert.alert("Erreur", (error as Error).message);
      router.back();
    } finally {
      setLoading(false);
    }
  }

  const openLink = (url: string) => {
    if (!url) return;
    Linking.openURL(url).catch((err) =>
      Alert.alert("Erreur", "Impossible d'ouvrir le lien"),
    );
  };

  if (loading)
    return <ActivityIndicator style={{ marginTop: 50 }} color="#841584" />;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* HEADER & AVATAR */}
        <View style={styles.headerSection}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>

          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={{ fontSize: 40, color: "#888" }}>
                {profile?.full_name?.charAt(0) || "?"}
              </Text>
            </View>
          )}

          <Text style={styles.name}>
            {profile?.full_name || profile?.username || "Profil"}
          </Text>
          <Text style={styles.role}>
            {(profile?.role || "").toString().replace("_", " ")}
          </Text>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 5 }}>
            {profile?.ville && (
              <View style={styles.iconRow}>
                <Ionicons name="location-outline" size={16} color="#666" />
                <Text style={{ color: "#666" }}>{profile.ville}</Text>
              </View>
            )}
            {(contactVisible || isOwnProfile) && profile?.email_public && (
              <View style={styles.iconRow}>
                <Ionicons name="mail-outline" size={16} color="#666" />
                <Text style={{ color: "#666" }}>{profile.email_public}</Text>
              </View>
            )}
          </View>

          {profile?.bio && (
            <View style={styles.bioContainer}>
              <Text style={styles.bio}>{profile.bio}</Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 15 }}>
            {(contactVisible || isOwnProfile) && profile?.website && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openLink(profile.website)}
              >
                <Ionicons name="globe-outline" size={20} color="white" />
                <Text style={styles.actionButtonText}>Site Web</Text>
              </TouchableOpacity>
            )}

            {profile?.cv_url && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#333" }]}
                onPress={() => openLink(profile.cv_url)}
              >
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color="white"
                />
                <Text style={styles.actionButtonText}>Voir CV</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* PHYSIQUE section (conditional) */}
        {(profile?.height || profile?.hair_color || profile?.eye_color) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Caractéristiques</Text>
            <View style={styles.attributesGrid}>
              {profile.height && (
                <View style={styles.attributeItem}>
                  <Text style={styles.attrLabel}>Taille</Text>
                  <Text style={styles.attrValue}>{profile.height} cm</Text>
                </View>
              )}
              {profile.hair_color && (
                <View style={styles.attributeItem}>
                  <Text style={styles.attrLabel}>Cheveux</Text>
                  <Text style={styles.attrValue}>{profile.hair_color}</Text>
                </View>
              )}
              {profile.eye_color && (
                <View style={styles.attributeItem}>
                  <Text style={styles.attrLabel}>Yeux</Text>
                  <Text style={styles.attrValue}>{profile.eye_color}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* TECH section */}
        {(profile?.equipment || profile?.software) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Matériel & Outils</Text>
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 12,
                padding: 15,
              }}
            >
              {profile.equipment && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={styles.attrLabel}>Matériel</Text>
                  <Text style={[styles.attrValue, { fontWeight: "400" }]}>
                    {profile.equipment}
                  </Text>
                </View>
              )}
              {profile.software && (
                <View>
                  <Text style={styles.attrLabel}>Logiciels</Text>
                  <Text style={[styles.attrValue, { fontWeight: "400" }]}>
                    {profile.software}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* HMC section */}
        {profile?.specialties && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spécialités</Text>
            <View
              style={{
                backgroundColor: "white",
                borderRadius: 12,
                padding: 15,
              }}
            >
              <Text style={[styles.attrValue, { fontWeight: "400" }]}>
                {profile.specialties}
              </Text>
            </View>
          </View>
        )}

        {/* SKILLS */}
        {profile?.skills && profile.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Compétences</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {profile.skills.map((s: string, i: number) => (
                <View key={i} style={styles.skillTag}>
                  <Text style={{ color: "#333" }}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* SHOWREEL */}
        {profile?.showreel_url && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bande Démo</Text>
            <TouchableOpacity
              onPress={() => openLink(profile.showreel_url)}
              style={styles.videoCard}
            >
              <Ionicons name="play-circle" size={40} color="white" />
              <Text
                style={{ color: "white", fontWeight: "bold", marginTop: 5 }}
              >
                Regarder la vidéo
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* BOOK PHOTOS */}
        {profile?.book_urls && profile.book_urls.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Book Photo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {profile.book_urls.map((url: string, i: number) => (
                <TouchableOpacity key={i} onPress={() => {}}>
                  <Image source={{ uri: url }} style={styles.bookImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* PROJETS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expérience (Projets)</Text>
          {tournages.length === 0 && participations.length === 0 ? (
            <Text style={styles.emptyText}>Aucun projet visible.</Text>
          ) : (
            <>
              {tournages.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.projectCard}
                  onPress={() =>
                    router.push({
                      pathname: "/project/[id]",
                      params: { id: t.id },
                    })
                  }
                >
                  <View>
                    <Text style={styles.projectTitle}>{t.title}</Text>
                    <Text style={styles.projectMeta}>
                      Créateur • {t.type?.replace("_", " ")}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
              ))}
              {participations.map((p) => {
                const t = Array.isArray(p.tournages)
                  ? p.tournages[0]
                  : p.tournages;
                if (!t) return null;
                return (
                  <View key={p.id} style={styles.participationCard}>
                    <Text style={styles.projectTitle}>{t.title}</Text>
                    <Text style={styles.participationRole}>{p.title}</Text>
                    <Text style={styles.projectMeta}>
                      {t.type?.replace("_", " ")}
                    </Text>
                  </View>
                );
              })}
            </>
          )}
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8f9fa",
    flexGrow: 1,
  },
  headerSection: {
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: "white",
    borderBottomRightRadius: 30,
    borderBottomLeftRadius: 30,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    borderWidth: 4,
    borderColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  avatarPlaceholder: {
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 5,
    textAlign: "center",
  },
  role: {
    fontSize: 14,
    color: "#841584",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 5,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bioContainer: {
    marginTop: 15,
    paddingHorizontal: 20,
  },
  bio: {
    textAlign: "center",
    color: "#555",
    fontStyle: "italic",
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: "row",
    backgroundColor: "#841584",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    gap: 8,
    alignItems: "center",
  },
  actionButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#333",
  },
  attributesGrid: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  attributeItem: {
    alignItems: "center",
  },
  attrLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  attrValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  skillTag: {
    backgroundColor: "#e8eaf6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bookImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: "#ddd",
  },
  videoCard: {
    height: 150,
    backgroundColor: "#000",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    padding: 10,
  },
  projectCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#841584",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    elevation: 1,
  },
  participationCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#ccc",
  },
  projectTitle: {
    fontWeight: "700",
    fontSize: 16,
    color: "#333",
  },
  projectMeta: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  participationRole: {
    color: "#841584",
    fontWeight: "600",
    fontSize: 14,
  },
});
