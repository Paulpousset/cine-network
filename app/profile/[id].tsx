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
import { GlobalStyles } from "@/constants/Styles";
import Colors from "@/constants/Colors";

export default function ProfileDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tournages, setTournages] = useState<any[]>([]);
  const [participations, setParticipations] = useState<any[]>([]);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [contactVisible, setContactVisible] = useState(true);

  // Connection State
  const [connectionStatus, setConnectionStatus] = useState<
    "pending" | "accepted" | "rejected" | null
  >(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [isRequester, setIsRequester] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const myId = session?.user?.id || null;
      setCurrentUserId(myId);

      const isOwner = myId === profileId;
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

      // Fetch connection status if not owner
      if (myId && !isOwner) {
        // On récupère TOUTES les connexions potentielles (doublons inclus)
        const { data: conns } = await supabase
          .from("connections")
          .select("*")
          .or(
            `and(requester_id.eq.${myId},receiver_id.eq.${profileId}),and(requester_id.eq.${profileId},receiver_id.eq.${myId})`,
          );

        if (conns && conns.length > 0) {
          // Priorité : 1. Accepted, 2. Pending, 3. Rejected
          const accepted = conns.find((c) => c.status === "accepted");
          const pending = conns.find((c) => c.status === "pending");
          const rejected = conns.find((c) => c.status === "rejected");

          const activeConn = accepted || pending || rejected || conns[0];

          setConnectionStatus(activeConn.status);
          setConnectionId(activeConn.id);
          setIsRequester(activeConn.requester_id === myId);
        } else {
          setConnectionStatus(null);
          setConnectionId(null);
        }
      }

      // Fetch public tournages
      let query = supabase
        .from("tournages")
        .select("id, title, type, created_at, is_public")
        .eq("owner_id", profileId)
        .order("created_at", { ascending: false });

      if (!isOwner) {
        query = query.eq("is_public", true);
      }

      const { data: tours, error: errTours } = await query;
      if (!errTours) {
        let filteredTours = tours || [];
        if (!isOwner) {
          filteredTours = filteredTours.filter(
            (t) => !hiddenIds.includes(t.id),
          );
        }
        setTournages(filteredTours);
      }

      // Fetch public participations
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
        if (!isOwner) {
          filteredParts = filteredParts.filter((p) => {
            const t = Array.isArray(p.tournages) ? p.tournages[0] : p.tournages;
            return t && !hiddenIds.includes(t.id);
          });
        }
        setParticipations(filteredParts);
      }
    } catch (e) {
      console.warn(e);
      Alert.alert("Ooops", "Impossible de charger le profil.");
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function handleClap() {
    if (!currentUserId || !profile) return;
    try {
      // 1. Check ALL connections to handle mutual/duplicates
      const { data: conns } = await supabase
        .from("connections")
        .select("*")
        .or(
          `and(requester_id.eq.${currentUserId},receiver_id.eq.${profile.id}),and(requester_id.eq.${profile.id},receiver_id.eq.${currentUserId})`,
        );

      const accepted = conns?.find((c) => c.status === "accepted");
      if (accepted) {
        setConnectionStatus("accepted");
        Alert.alert("Déjà connecté", "Vous êtes déjà connectés.");
        // Cleanup duplicates if any exist
        const duplicates = conns?.filter((c) => c.id !== accepted.id) || [];
        for (const dup of duplicates) {
          await supabase.from("connections").delete().eq("id", dup.id);
        }
        return;
      }

      const myPendingRequest = conns?.find(
        (c) => c.requester_id === currentUserId && c.status === "pending",
      );
      const receivedPendingRequest = conns?.find(
        (c) => c.receiver_id === currentUserId && c.status === "pending",
      );

      // CASE: I already asked
      if (myPendingRequest && !receivedPendingRequest) {
        Alert.alert("Patience", "Votre demande est en attente.");
        setConnectionStatus("pending");
        setIsRequester(true);
        setConnectionId(myPendingRequest.id);
        return;
      }

      // CASE: They asked me (Accept logic)
      if (receivedPendingRequest) {
        const { error } = await supabase
          .from("connections")
          .update({ status: "accepted" })
          .eq("id", receivedPendingRequest.id);

        if (error) throw error;

        // If I ALSO had a pending request to them, delete it now
        if (myPendingRequest) {
          await supabase
            .from("connections")
            .delete()
            .eq("id", myPendingRequest.id);
        }

        setConnectionStatus("accepted");
        setConnectionId(receivedPendingRequest.id);
        setIsRequester(false);
        Alert.alert("Bravo !", "Vous êtes maintenant connecté.");
        return;
      }

      // CASE: Revival (Rejected previously)
      const rejected = conns?.find((c) => c.status === "rejected");
      if (rejected) {
        // Relancer
        const { error } = await supabase
          .from("connections")
          .update({
            status: "pending",
            requester_id: currentUserId,
            receiver_id: profile.id,
            created_at: new Date().toISOString(),
          })
          .eq("id", rejected.id);

        if (error) throw error;
        setConnectionStatus("pending");
        setConnectionId(rejected.id);
        setIsRequester(true);
        Alert.alert("Clap !", "Nouvelle demande envoyée.");
        return;
      }

      // CASE: No connection exists -> Create New One
      const { data, error } = await supabase
        .from("connections")
        .insert({
          requester_id: currentUserId,
          receiver_id: profile.id,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      setConnectionStatus("pending");
      setConnectionId(data.id);
      setIsRequester(true);
      Alert.alert("Clap envoyé !", "Votre demande de connexion a été envoyée.");
    } catch (e) {
      Alert.alert("Erreur", "Action impossible.");
      console.error(e);
    }
  }

  function openLink(url: string) {
    if (!url) return;
    Linking.openURL(url).catch(() =>
      Alert.alert("Erreur", "Impossible d'ouvrir ce lien"),
    );
  }

  if (loading)
    return <ActivityIndicator style={{ marginTop: 50 }} color={Colors.light.primary} />;

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
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
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

          <Text style={GlobalStyles.title1}>
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

          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 15,
              flexWrap: "wrap",
              justifyContent: 'center'
            }}
          >
            {/* CLAP BUTTON */}
            {!isOwnProfile && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  connectionStatus === "accepted"
                    ? { backgroundColor: Colors.light.success }
                    : connectionStatus === "pending"
                      ? { backgroundColor: "#FF9800" }
                      : { backgroundColor: Colors.light.primary },
                ]}
                onPress={handleClap}
                disabled={connectionStatus === "pending" && isRequester}
              >
                <Ionicons
                  name={
                    connectionStatus === "accepted"
                      ? "checkmark-circle"
                      : connectionStatus === "pending"
                        ? "time"
                        : "hand-left-outline"
                  }
                  size={20}
                  color="white"
                />
                <Text style={styles.actionButtonText}>
                  {connectionStatus === "accepted"
                    ? "Connecté"
                    : connectionStatus === "pending"
                      ? isRequester
                        ? "En attente..."
                        : "Accepter Clap"
                      : "Clap !"}
                </Text>
              </TouchableOpacity>
            )}

            {(contactVisible || isOwnProfile) && profile?.website && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#333" }]}
                onPress={() => openLink(profile.website)}
              >
                <Ionicons name="globe-outline" size={20} color="white" />
                {/* <Text style={styles.actionButtonText}>Site</Text> */}
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

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: Colors.light.tint }]}
              onPress={() =>
                router.push({
                  pathname: "/profile/posts",
                  params: {
                    userId: profile.id,
                    userName: profile.full_name || profile.username,
                  },
                })
              }
            >
              <Ionicons name="newspaper-outline" size={20} color="white" />
              <Text style={styles.actionButtonText}>Voir posts</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PHYSIQUE section (conditional) */}
        {(profile?.height || profile?.hair_color || profile?.eye_color) && (
          <View style={styles.section}>
            <Text style={GlobalStyles.title2}>Caractéristiques</Text>
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
            <Text style={GlobalStyles.title2}>Matériel & Outils</Text>
            <View
              style={GlobalStyles.card}
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
            <Text style={GlobalStyles.title2}>Spécialités</Text>
            <View
              style={GlobalStyles.card}
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
            <Text style={GlobalStyles.title2}>Compétences</Text>
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
            <Text style={GlobalStyles.title2}>Bande Démo</Text>
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
            <Text style={GlobalStyles.title2}>Book Photo</Text>
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
          <Text style={GlobalStyles.title2}>Expérience (Projets)</Text>
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
    backgroundColor: Colors.light.backgroundSecondary,
    flexGrow: 1,
  },
  headerSection: {
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.light.background,
    borderBottomRightRadius: 30,
    borderBottomLeftRadius: 30,
    shadowColor: Colors.light.shadow,
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
  role: {
    fontSize: 14,
    color: Colors.light.primary,
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
    backgroundColor: Colors.light.primary,
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
  attributesGrid: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 15,
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: Colors.light.border
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
    backgroundColor: Colors.light.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border
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
    borderLeftColor: Colors.light.primary,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.light.border
  },
  participationCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#ccc",
    borderWidth: 1,
    borderColor: Colors.light.border
  },
  projectTitle: {
    fontWeight: "700",
    fontSize: 16,
    color: Colors.light.text,
  },
  projectMeta: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  participationRole: {
    color: Colors.light.primary,
    fontWeight: "600",
    fontSize: 14,
  },
});
