import ClapLoading from "@/components/ClapLoading";
import { GlobalStyles } from "@/constants/Styles";
import { appEvents, EVENTS } from "@/lib/events";
import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AppState,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function ProfileDetail() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, profile: myProfile } = useUser();
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
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [mandateStatus, setMandateStatus] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const isFetchingRef = React.useRef(false);

  // Experience Editing State
  const [editingExp, setEditingExp] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [savingExp, setSavingExp] = useState(false);
  const [uploadingExp, setUploadingExp] = useState(false);

  // Experience Viewing State
  const [viewingExp, setViewingExp] = useState<any>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (isFetchingRef.current) return;
    try {
      const profileId = Array.isArray(id) ? id[0] : id;
      if (!profileId) {
        setLoading(false);
        return;
      }

      isFetchingRef.current = true;
      if (!profile) {
        setLoading(true);
      }
      console.log("[Profile] Start fetching profile for", profileId);

      const myId = user?.id || null;
      setCurrentUserRole(myProfile?.role || null);

      const isOwner = myId === profileId;
      setIsOwnProfile(isOwner);

      // Check if blocked (mutual)
      if (myId && !isOwner) {
        const { data: blocks } = await supabase
          .from("user_blocks")
          .select("blocker_id, blocked_id")
          .or(`blocker_id.eq.${myId},blocked_id.eq.${profileId}`);
        // Note: Simple OR is enough if we filter correctly in JS
        // PostgREST complex OR with AND might be failing on some versions

        const blockedByMe = blocks?.some(
          (b) => b.blocker_id === myId && b.blocked_id === profileId,
        );
        const blockingMe = blocks?.some(
          (b) => b.blocker_id === profileId && b.blocked_id === myId,
        );

        if (blockingMe) {
          setLoading(false);
          Alert.alert("Accès refusé", "Cet utilisateur vous a bloqué.");
          router.back();
          return;
        }

        setIsBlocked(!!blockedByMe);
      }

      // Fetch Profile Data
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profileId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        throw new Error("Profil introuvable");
      }
      setProfile(data);

      // Fetch Mandate status
      if (myId && !isOwner) {
        const { data: mandate } = await supabase
          .from("agent_mandates")
          .select("status")
          .eq("agent_id", myId)
          .eq("talent_id", profileId)
          .maybeSingle();
        setMandateStatus(mandate?.status || null);
      }

      // Fetch Visibility Settings
      let hiddenIds: string[] = [];
      let isContactVisibleInSettings = true;

      const { data: settings } = await supabase
        .from("public_profile_settings")
        .select("*")
        .eq("id", profileId)
        .maybeSingle();

      if (settings) {
        hiddenIds = settings.hidden_project_ids || [];
        isContactVisibleInSettings = settings.is_contact_visible ?? true;
      }
      setContactVisible(isContactVisibleInSettings);

      // Fetch connection status if not owner
      if (myId && !isOwner) {
        // On récupère les connexions entre ces deux utilisateurs
        const { data: relevantConns } = await supabase
          .from("connections")
          .select("*")
          .or(
            `and(requester_id.eq.${myId},receiver_id.eq.${profileId}),and(requester_id.eq.${profileId},receiver_id.eq.${myId})`,
          );

        if (relevantConns && relevantConns.length > 0) {
          // Priorité : 1. Accepted, 2. Pending, 3. Rejected
          const accepted = relevantConns.find((c) => c.status === "accepted");
          const pending = relevantConns.find((c) => c.status === "pending");
          const rejected = relevantConns.find((c) => c.status === "rejected");

          const activeConn =
            accepted || pending || rejected || relevantConns[0];

          setConnectionStatus(activeConn.status);
          setConnectionId(activeConn.id);
          setIsRequester(activeConn.requester_id === myId);
        } else {
          setConnectionStatus(null);
          setConnectionId(null);
        }
      }

      // Fetch experience notes for this profile
      const { data: experienceNotes } = await supabase
        .from("profile_experience_notes")
        .select("project_id, note, image_url, custom_title")
        .eq("profile_id", profileId);
        
      const notesMap = (experienceNotes || []).reduce((acc: any, curr: any) => {
        acc[curr.project_id] = {
            note: curr.note,
            image_url: curr.image_url,
            custom_title: curr.custom_title
        };
        return acc;
      }, {});

      // Fetch public tournages
      let query = supabase
        .from("tournages")
        .select("id, title, type, created_at, is_public, description, status, image_url")
        .eq("owner_id", profileId)
        .order("created_at", { ascending: false });

      if (!isOwner) {
        query = query.or("is_public.eq.true,status.eq.completed");
      }

      const { data: tours, error: errTours } = await query;
      if (!errTours) {
        let filteredTours = tours || [];
        if (!isOwner) {
          filteredTours = filteredTours.filter(
            (t) => !hiddenIds.includes(t.id),
          );
        }
        setTournages(filteredTours.map((t: any) => ({
            ...t,
            projectId: t.id,
            personalNote: notesMap[t.id]?.note || "",
            personalImage: notesMap[t.id]?.image_url || null,
            personalTitle: notesMap[t.id]?.custom_title || null
        })));
      }

      // Fetch public participations
      let pQuery = supabase
        .from("project_roles")
        .select(
          `
            id,
            title,
            description,
            tournages!inner (
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
        .eq("assigned_profile_id", profileId);

      if (!isOwner) {
        pQuery = pQuery.or("is_public.eq.true,status.eq.completed", { foreignTable: 'tournages' });
      }

      const { data: parts, error: partError } = await pQuery;

      if (!partError && parts) {
        let filteredParts = parts || [];
        if (!isOwner) {
          filteredParts = filteredParts.filter((p: any) => {
            const t = Array.isArray(p.tournages) ? p.tournages[0] : p.tournages;
            return t && !hiddenIds.includes(t.id);
          });
        }
        setParticipations(filteredParts.map((p: any) => {
            const t = Array.isArray(p.tournages) ? p.tournages[0] : p.tournages;
            return {
                ...p,
                projectId: t?.id,
                personalNote: notesMap[t?.id]?.note || "",
                personalImage: notesMap[t?.id]?.image_url || null,
                personalTitle: notesMap[t?.id]?.custom_title || null,
                image_url: t?.image_url
            };
        }));
      }
    } catch (e) {
      console.warn("[Profile] Error:", e);
      Alert.alert("Ooops", "Impossible de charger le profil.");
      router.back();
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      console.log("[Profile] Fetching profile finished");
    }
  }, [user, profile, myProfile, id, router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        fetchProfile();
      }
    });
    return () => subscription.remove();
  }, [fetchProfile]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile]),
  );

  async function handleClap() {
    const currentUserId = user?.id;
    if (!currentUserId || !profile) return;
    try {
      // 1. Check connections between these two users
      const { data: relevantConns } = await supabase
        .from("connections")
        .select("*")
        .or(
          `and(requester_id.eq.${currentUserId},receiver_id.eq.${profile.id}),and(requester_id.eq.${profile.id},receiver_id.eq.${currentUserId})`,
        );

      const accepted = relevantConns?.find((c) => c.status === "accepted");
      if (accepted) {
        setConnectionStatus("accepted");
        Alert.alert("Déjà connecté", "Vous êtes déjà connectés.");
        // Cleanup duplicates if any exist
        const duplicates =
          relevantConns?.filter((c) => c.id !== accepted.id) || [];
        for (const dup of duplicates) {
          await supabase.from("connections").delete().eq("id", dup.id);
        }
        return;
      }

      const myPendingRequest = relevantConns?.find(
        (c) => c.requester_id === currentUserId && c.status === "pending",
      );
      const receivedPendingRequest = relevantConns?.find(
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
      const rejected = relevantConns?.find((c) => c.status === "rejected");
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

  async function handleRequestManagement() {
    const currentUserId = user?.id;
    if (!currentUserId) {
      Alert.alert("Erreur", "Vous devez être connecté.");
      return;
    }

    try {
      const { error } = await supabase.from("agent_mandates").insert({
        agent_id: currentUserId,
        talent_id: profile.id,
        status: "pending",
      });

      if (error) throw error;
      setMandateStatus("pending");
      Alert.alert(
        "Succès",
        "Votre demande de gestion a été envoyée au talent.",
      );
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    }
  }

  async function handleBlock() {
    const profileId = Array.isArray(id) ? id[0] : id;
    const currentUserId = user?.id;
    if (!currentUserId) {
      const msg = "Vous devez être connecté pour bloquer un utilisateur.";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("Action impossible", msg);
      return;
    }
    if (!profileId) return;

    try {
      // Create block
      const { error: blockError } = await supabase.from("user_blocks").insert({
        blocker_id: currentUserId,
        blocked_id: profileId,
      });

      if (blockError) {
        // If already blocked, just ignore the error and proceed
        if (blockError.code !== "23505") throw blockError;
      }

      // Delete any existing connections
      await supabase
        .from("connections")
        .delete()
        .or(
          `and(requester_id.eq.${currentUserId},receiver_id.eq.${profileId}),and(requester_id.eq.${profileId},receiver_id.eq.${currentUserId})`,
        );

      setIsBlocked(true);
      appEvents.emit(EVENTS.USER_BLOCKED, { userId: profileId, blocked: true });

      const msg = "Utilisateur bloqué. Vous ne verrez plus ses contenus.";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Utilisateur bloqué", msg);
      }

      // Force a small delay for state update before going back
      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/");
        }
      }, 100);
    } catch (e) {
      console.error(e);
      const errorMsg = "Impossible de bloquer cet utilisateur.";
      if (Platform.OS === "web") {
        alert(errorMsg);
      } else {
        Alert.alert("Erreur", errorMsg);
      }
    }
  }

  async function handleUnblock() {
    const profileId = Array.isArray(id) ? id[0] : id;
    const currentUserId = user?.id;
    if (!currentUserId || !profileId) return;

    try {
      const { error } = await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", currentUserId)
        .eq("blocked_id", profileId);

      if (error) throw error;
      setIsBlocked(false);
      appEvents.emit(EVENTS.USER_BLOCKED, {
        userId: profileId,
        blocked: false,
      });

      const msg =
        "Utilisateur débloqué. Vous pouvez de nouveau voir ses contenus.";
      if (Platform.OS === "web") {
        alert(msg);
      } else {
        Alert.alert("Utilisateur débloqué", msg);
      }
    } catch (e) {
      console.error(e);
      const errorMsg = "Impossible de débloquer cet utilisateur.";
      if (Platform.OS === "web") {
        alert(errorMsg);
      } else {
        Alert.alert("Erreur", errorMsg);
      }
    }
  }

  function openLink(url: string) {
    if (!url) return;
    Linking.openURL(url).catch(() =>
      Alert.alert("Erreur", "Impossible d'ouvrir ce lien"),
    );
  }

  const handleEditExp = (exp: any) => {
    if (!isOwnProfile) return;
    setEditingExp({
      ...exp,
      projectId: exp.id || exp.projectId,
      title: exp.custom_title || exp.personalTitle || "",
      note: exp.personalNote || "",
      imageUrl: exp.personalImage || null,
      projectImage: exp.image_url || null, // fallback
    });
    setEditModalVisible(true);
  };

  const handleUploadExpImage = async () => {
    try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });
  
        if (result.canceled || !result.assets) return;
        setUploadingExp(true);
  
        const image = result.assets[0];
        const fileExt = image.uri.split(".").pop();
        const fileName = `experience/${user?.id}/${editingExp.projectId}_${Date.now()}.${fileExt}`;
  
        const arrayBuffer = await fetch(image.uri).then((res) => res.arrayBuffer());
        const { error: uploadError } = await supabase.storage
          .from("user_content")
          .upload(fileName, arrayBuffer, {
            contentType: image.mimeType || "image/jpeg",
            upsert: true,
          });
  
        if (uploadError) throw uploadError;
  
        const { data: { publicUrl } } = supabase.storage.from("user_content").getPublicUrl(fileName);
        
        setEditingExp((prev: any) => ({ ...prev, imageUrl: publicUrl }));
      } catch (e) {
        Alert.alert("Erreur", "Impossible d'uploader l'image d'expérience");
      } finally {
        setUploadingExp(false);
      }
  };

  const handleSaveExpChanges = async () => {
    if (!editingExp) return;
    try {
        setSavingExp(true);
        const { error } = await supabase
            .from("profile_experience_notes")
            .upsert({ 
                profile_id: user?.id, 
                project_id: editingExp.projectId,
                note: editingExp.note,
                custom_title: editingExp.title,
                image_url: editingExp.imageUrl,
                updated_at: new Date().toISOString()
            }, { onConflict: 'profile_id,project_id' });

        if (error) throw error;
        
        // Refresh profile data locally
        setTournages(prev => prev.map(t => (t.id === editingExp.projectId) ? { 
            ...t, 
            personalNote: editingExp.note, 
            personalTitle: editingExp.title, 
            personalImage: editingExp.imageUrl 
        } : t));
        
        setParticipations(prev => prev.map(p => {
            const tid = Array.isArray(p.tournages) ? p.tournages[0]?.id : p.tournages?.id;
            return (tid === editingExp.projectId) ? { 
                ...p, 
                personalNote: editingExp.note, 
                personalTitle: editingExp.title, 
                personalImage: editingExp.imageUrl 
            } : p;
        }));

        setEditModalVisible(false);
    } catch (e) {
        Alert.alert("Erreur", "Impossible d'enregistrer les modifications.");
    } finally {
        setSavingExp(false);
    }
  };

  if (loading)
    return (
      <ClapLoading
        style={{ marginTop: 50 }}
        color={colors.primary}
        size={50}
      />
    );

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
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          {!isOwnProfile && (
            <TouchableOpacity
              onPress={() => {
                const signalUser = () => {
                  if (!profile) return;
                  const subject = `Signalement d'utilisateur : ${profile.id}`;
                  const body = `Je souhaite signaler l'utilisateur suivant :\n\nNom : ${profile.full_name}\nID : ${profile.id}\n\nRaison du signalement : `;
                  Linking.openURL(
                    `mailto:support@titapp.fr?subject=${encodeURIComponent(
                      subject,
                    )}&body=${encodeURIComponent(body)}`,
                  );
                };

                if (Platform.OS === "web") {
                  const action = window.confirm(
                    `Souhaitez-vous ${isBlocked ? "débloquer" : "bloquer"} cet utilisateur ?\n\n(Annuler pour voir l'option de signalement)`,
                  );
                  if (action) {
                    isBlocked ? handleUnblock() : handleBlock();
                  } else {
                    if (
                      window.confirm(
                        "Souhaitez-vous signaler cet utilisateur ?",
                      )
                    ) {
                      signalUser();
                    }
                  }
                  return;
                }

                Alert.alert("Options", "Que souhaitez-vous faire ?", [
                  { text: "Annuler", style: "cancel" },
                  {
                    text: "Signaler l'utilisateur",
                    style: "destructive",
                    onPress: signalUser,
                  },
                  {
                    text: isBlocked
                      ? "Débloquer l'utilisateur"
                      : "Bloquer l'utilisateur",
                    style: "destructive",
                    onPress: isBlocked ? handleUnblock : handleBlock,
                  },
                ]);
              }}
              style={styles.reportHeaderButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="ellipsis-vertical"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          )}

          {isOwnProfile && (
            <View style={{ position: 'absolute', top: 55, right: 20, flexDirection: 'row', gap: 10, zIndex: 10 }}>
              <TouchableOpacity
                onPress={() => router.push("/settings")}
                style={styles.headerButton}
              >
                <Ionicons
                  name="settings-outline"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
          )}

          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={{ fontSize: 40, color: colors.text + "80" }}>
                {profile?.full_name?.charAt(0) || "?"}
              </Text>
            </View>
          )}

          <Text style={[GlobalStyles.title1, { color: colors.text }]}>
            {profile?.full_name || profile?.username || "Profil"}
          </Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12, paddingHorizontal: 20 }}>
            {/* Badges Titres Principaux */}
            {(profile?.job_title ? profile.job_title.split(',') : [profile?.role || ""]).map((jt: string, idx: number) => !!jt.trim() && (
                <View key={`main-${idx}`} style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>
                      {jt.trim().replace("_", " ").toUpperCase()}
                  </Text>
                </View>
            ))}

            {/* Badges Titres Secondaires */}
            {(profile?.secondary_job_title ? profile.secondary_job_title.split(',') : (profile?.secondary_role ? [profile.secondary_role] : [])).map((jt: string, idx: number) => !!jt.trim() && (
                <View key={`sec-${idx}`} style={[styles.roleBadge, { backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border }]}>
                    <Text style={[styles.roleBadgeText, { color: colors.textSecondary, fontSize: 11 }]}>
                        {jt.trim().replace("_", " ").toUpperCase()}
                    </Text>
                </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 15, marginTop: 12 }}>
            {!!profile?.ville && (
              <View style={styles.iconRow}>
                <Ionicons name="location" size={14} color={colors.primary} />
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{profile.ville}</Text>
              </View>
            )}
            {(contactVisible || isOwnProfile) && !!profile?.email_public && (
              <View style={styles.iconRow}>
                <Ionicons name="mail" size={14} color={colors.primary} />
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{profile.email_public}</Text>
              </View>
            )}
          </View>

          {!!profile?.bio && (
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
              justifyContent: "center",
            }}
          >
            {/* CLAP BUTTON */}
            {!isOwnProfile && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  connectionStatus === "accepted"
                    ? { backgroundColor: colors.success }
                    : connectionStatus === "pending"
                      ? { backgroundColor: "#FF9800" }
                      : { backgroundColor: colors.primary },
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

            {/* MANDATE BUTTON - Only for Agents */}
            {!isOwnProfile && currentUserRole === "agent" && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  mandateStatus === "accepted"
                    ? { backgroundColor: colors.success }
                    : mandateStatus === "pending"
                      ? { backgroundColor: "#FF9800" }
                      : { backgroundColor: "#673AB7" },
                ]}
                onPress={handleRequestManagement}
                disabled={mandateStatus !== null}
              >
                <Ionicons
                  name={
                    mandateStatus === "accepted"
                      ? "key"
                      : mandateStatus === "pending"
                        ? "time"
                        : "briefcase-outline"
                  }
                  size={20}
                  color="white"
                />
                <Text style={styles.actionButtonText}>
                  {mandateStatus === "accepted"
                    ? "Gestion active"
                    : mandateStatus === "pending"
                      ? "En attente..."
                      : "Gérer ce talent"}
                </Text>
              </TouchableOpacity>
            )}

            {(contactVisible || isOwnProfile) && !!profile?.website && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: "#333" }]}
                onPress={() => openLink(profile.website)}
              >
                <Ionicons name="globe-outline" size={20} color="white" />
                {/* <Text style={styles.actionButtonText}>Site</Text> */}
              </TouchableOpacity>
            )}

            {!!profile?.cv_url && (
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
              style={[
                styles.actionButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() =>
                router.push({
                  pathname: "/direct-messages/[id]",
                  params: { id: profile.id },
                })
              }
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={20}
                color="white"
              />
              <Text style={styles.actionButtonText}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.primary },
              ]}
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

        {/* PROJETS (MISE EN AVANT) */}
        <View style={[styles.section, { marginTop: 10 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={[GlobalStyles.title2, { color: colors.text, marginBottom: 0 }]}>Expérience (Projets)</Text>
            {(tournages.length + participations.length) > 0 && (
                <View style={[styles.miniTag, { backgroundColor: colors.primary + '10', borderColor: 'transparent' }]}>
                    <Text style={[styles.miniTagText, { color: colors.primary }]}>{tournages.length + participations.length}</Text>
                </View>
            )}
          </View>
          
          {tournages.length === 0 && participations.length === 0 ? (
            <Text style={styles.emptyText}>Aucun projet visible.</Text>
          ) : (
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 15, paddingRight: 20 }}
            >
              {tournages.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={styles.experienceCardLarge}
                  onPress={() => {
                    if (isOwnProfile) {
                        handleEditExp(t);
                    } else {
                        setViewingExp({
                            ...t,
                            projectTitle: t.title,
                            projectType: t.type,
                            roleTitle: 'CRÉATEUR'
                        });
                        setViewModalVisible(true);
                    }
                  }}
                >
                  {(t.image_url) ? (
                    <Image source={{ uri: t.image_url }} style={styles.experienceImage} />
                  ) : (
                    <View style={[styles.experienceImage, { backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="film-outline" size={40} color={colors.primary + '40'} />
                    </View>
                  )}
                  {isOwnProfile && (
                    <View style={styles.editExpBadge}>
                        <Ionicons name="pencil" size={14} color="white" />
                    </View>
                  )}
                  <View style={styles.experienceOverlay}>
                    <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{t.status === 'completed' ? '🏁 Terminé' : '🎥 En cours'}</Text>
                    </View>
                    <View>
                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                            <View style={{ backgroundColor: colors.primary, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                <Text style={{ color: 'white', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }}>Créateur</Text>
                            </View>
                            {t.personalTitle && (
                                <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                    <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{t.personalTitle}</Text>
                                </View>
                            )}
                        </View>
                        <Text style={styles.experienceTitle} numberOfLines={2}>{t.title}</Text>
                        <Text style={styles.experienceSubtitle}>
                            {t.type?.replace("_", " ")}
                        </Text>
                    </View>

                    {(t.personalNote || t.personalTitle || t.personalImage) && (
                        <TouchableOpacity 
                            style={{ marginTop: 15, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
                            onPress={(e) => {
                                e.stopPropagation();
                                setViewingExp({
                                    ...t,
                                    projectTitle: t.title,
                                    projectType: t.type,
                                    roleTitle: 'CRÉATEUR'
                                });
                                setViewModalVisible(true);
                            }}
                        >
                            <Ionicons name="information-circle-outline" size={18} color="white" />
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Voir détails</Text>
                        </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
              {participations.map((p) => {
                const t = Array.isArray(p.tournages)
                  ? p.tournages[0]
                  : p.tournages;
                if (!t) return null;
                return (
                  <TouchableOpacity 
                    key={p.id} 
                    style={styles.experienceCardLarge}
                    onPress={() => {
                        if (isOwnProfile) {
                            handleEditExp(p);
                        } else {
                            setViewingExp({ 
                                ...p, 
                                projectTitle: t.title, 
                                projectType: t.type,
                                roleTitle: p.title,
                                id: t.id
                            });
                            setViewModalVisible(true);
                        }
                    }}
                  >
                    { (t.image_url) ? (
                        <Image source={{ uri: t.image_url }} style={styles.experienceImage} />
                    ) : (
                        <View style={[styles.experienceImage, { backgroundColor: colors.backgroundSecondary, justifyContent: 'center', alignItems: 'center' }]}>
                            <Ionicons name="person-outline" size={40} color={colors.textSecondary + '40'} />
                        </View>
                    )}
                    {isOwnProfile && (
                        <View style={styles.editExpBadge}>
                            <Ionicons name="pencil" size={14} color="white" />
                        </View>
                    )}
                    <View style={styles.experienceOverlay}>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>{t.status === 'completed' ? '🏁 Terminé' : '🎥 En cours'}</Text>
                        </View>
                        <View>
                            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                                <View style={{ backgroundColor: colors.primary, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                    <Text style={{ color: 'white', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }}>{p.title}</Text>
                                </View>
                                {p.personalTitle && (
                                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                        <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{p.personalTitle}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.experienceTitle} numberOfLines={2}>{t.title}</Text>
                            <Text style={styles.experienceSubtitle}>
                                {t.type?.replace("_", " ")}
                            </Text>
                        </View>

                        {(p.personalNote || p.personalTitle || p.personalImage) && (
                            <TouchableOpacity 
                                style={{ marginTop: 15, backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    setViewingExp({ 
                                        ...p, 
                                        projectTitle: t.title, 
                                        projectType: t.type,
                                        roleTitle: p.title,
                                        id: t.id
                                    });
                                    setViewModalVisible(true);
                                }}
                            >
                                <Ionicons name="information-circle-outline" size={18} color="white" />
                                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Voir détails</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* PHYSIQUE section (conditional) */}
        {(profile?.height || profile?.hair_color || profile?.eye_color) && (
          <View style={styles.section}>
            <Text style={[GlobalStyles.title2, { color: colors.text }]}>Caractéristiques</Text>
            <View style={styles.attributesGrid}>
              {!!profile.height && (
                <View style={styles.attributeItem}>
                  <Text style={styles.attrLabel}>Taille</Text>
                  <Text style={styles.attrValue}>{profile.height} cm</Text>
                </View>
              )}
              {!!profile.hair_color && (
                <View style={styles.attributeItem}>
                  <Text style={styles.attrLabel}>Cheveux</Text>
                  <Text style={styles.attrValue}>{profile.hair_color}</Text>
                </View>
              )}
              {!!profile.eye_color && (
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
            <Text style={[GlobalStyles.title2, { color: colors.text, marginBottom: 15 }]}>Matériel & Outils</Text>
            <View style={[GlobalStyles.card, { backgroundColor: colors.background, borderColor: colors.border, padding: 12 }]}>
              {!!profile.equipment && (
                <View style={{ marginBottom: 15 }}>
                  <Text style={[styles.attrLabel, { marginBottom: 8 }]}>Matériel</Text>
                  <View style={styles.tagCloud}>
                    {profile.equipment.split(',').map((item: string, index: number) => (
                      <View key={index} style={styles.miniTag}>
                        <Text style={styles.miniTagText}>{item.trim()}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {!!profile.software && (
                <View>
                  <Text style={[styles.attrLabel, { marginBottom: 8 }]}>Logiciels</Text>
                  <View style={styles.tagCloud}>
                    {profile.software.split(',').map((item: string, index: number) => (
                      <View key={index} style={[styles.miniTag, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
                        <Text style={[styles.miniTagText, { color: colors.primary }]}>{item.trim()}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* HMC section */}
        {!!profile?.specialties && (
          <View style={styles.section}>
            <Text style={[GlobalStyles.title2, { color: colors.text }]}>Spécialités</Text>
            <View style={[GlobalStyles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.attrValue, { fontWeight: "400" }]}>
                {profile.specialties}
              </Text>
            </View>
          </View>
        )}

        {/* SKILLS */}
        {profile?.skills && profile.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={[GlobalStyles.title2, { color: colors.text }]}>Compétences</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {profile.skills.map((s: string, i: number) => (
                <View key={i} style={styles.skillTag}>
                  <Text style={{ color: colors.text }}>{s}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* SHOWREEL */}
        {!!profile?.showreel_url && (
          <View style={styles.section}>
            <Text style={[GlobalStyles.title2, { color: colors.text }]}>Bande Démo</Text>
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
            <Text style={[GlobalStyles.title2, { color: colors.text }]}>Book Photo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {profile.book_urls.map((url: string, i: number) => (
                <TouchableOpacity key={i} onPress={() => {}}>
                  <Image source={{ uri: url }} style={styles.bookImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Experience Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: 'flex-end' }}
        >
          <View style={{ backgroundColor: colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '90%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={[GlobalStyles.title2, { color: colors.text, marginBottom: 0 }]}>Modifier l'expérience</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                    <Ionicons name="close-circle" size={28} color={colors.text + "40"} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ marginBottom: 20 }}>
                    <Text style={[styles.attrLabel, { marginBottom: 8 }]}>Image de couverture</Text>
                    <TouchableOpacity 
                        onPress={handleUploadExpImage}
                        style={{ height: 180, borderRadius: 15, backgroundColor: colors.backgroundSecondary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderStyle: 'dashed', borderWidth: 2, borderColor: colors.border }}
                    >
                        {(editingExp?.imageUrl || editingExp?.projectImage) ? (
                            <Image source={{ uri: editingExp.imageUrl || editingExp.projectImage }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                            <View style={{ alignItems: 'center' }}>
                                <Ionicons name="camera-outline" size={40} color={colors.textSecondary} />
                                <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Ajouter une photo</Text>
                            </View>
                        )}
                        {uploadingExp && (
                            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
                                <ClapLoading size={30} color="white" />
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={{ marginBottom: 20 }}>
                    <Text style={[styles.attrLabel, { marginBottom: 8 }]}>Titre personnalisé</Text>
                    <TextInput
                        style={[styles.experienceInput, { color: colors.text }]}
                        value={editingExp?.title}
                        onChangeText={(val: string) => setEditingExp((prev: any) => ({ ...prev, title: val }))}
                        placeholder="ex: Mon premier grand tournage..."
                        placeholderTextColor={colors.textSecondary}
                    />
                </View>

                <View style={{ marginBottom: 25 }}>
                    <Text style={[styles.attrLabel, { marginBottom: 8 }]}>Votre expérience / Note</Text>
                    <TextInput
                        style={[styles.experienceInput, { height: 120, textAlignVertical: 'top', color: colors.text }]}
                        value={editingExp?.note}
                        onChangeText={(val: string) => setEditingExp((prev: any) => ({ ...prev, note: val }))}
                        placeholder="Racontez votre expérience sur ce projet..."
                        placeholderTextColor={colors.textSecondary}
                        multiline
                    />
                </View>

                <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: colors.primary, paddingVertical: 15, borderRadius: 15, marginBottom: 10 }]}
                    onPress={handleSaveExpChanges}
                    disabled={savingExp}
                >
                    {savingExp ? (
                        <ClapLoading size={24} color="white" />
                    ) : (
                        <Text style={[styles.actionButtonText, { fontSize: 16 }]}>Enregistrer les modifications</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={() => {
                        setEditModalVisible(false);
                        router.push({
                            pathname: "/project/[id]",
                            params: { id: editingExp.projectId },
                        });
                    }}
                    style={{ padding: 15, alignItems: 'center' }}
                >
                    <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Voir la fiche complète du projet</Text>
                </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Experience Viewing Modal */}
      <Modal
        visible={viewModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 }}>
            <View style={{ backgroundColor: colors.background, borderRadius: 25, overflow: 'hidden' }}>
                <View style={{ height: 200, backgroundColor: colors.backgroundSecondary }}>
                    {(viewingExp?.personalImage || viewingExp?.image_url) ? (
                        <Image source={{ uri: viewingExp.personalImage || viewingExp.image_url }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="film-outline" size={50} color={colors.textSecondary + '40'} />
                        </View>
                    )}
                    <TouchableOpacity 
                        onPress={() => setViewModalVisible(false)}
                        style={{ position: 'absolute', top: 15, right: 15, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 }}
                    >
                        <Ionicons name="close" size={20} color="white" />
                    </TouchableOpacity>
                </View>

                <View style={{ padding: 20 }}>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                        <View style={{ backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                                {viewingExp?.roleTitle}
                            </Text>
                        </View>
                        {viewingExp?.personalTitle && (
                             <View style={{ backgroundColor: colors.text + '05', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                                <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>{viewingExp.personalTitle}</Text>
                             </View>
                        )}
                    </View>

                    <Text style={[GlobalStyles.title2, { color: colors.text, marginBottom: 5 }]}>
                        {viewingExp?.projectTitle}
                    </Text>
                    <Text style={{ color: colors.textSecondary, marginBottom: 20, textTransform: 'capitalize' }}>
                        {viewingExp?.projectType?.replace('_', ' ')}
                    </Text>

                    {viewingExp?.personalNote ? (
                        <View style={{ backgroundColor: colors.backgroundSecondary, padding: 15, borderRadius: 15, marginBottom: 20 }}>
                                <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} style={{ marginBottom: 10 }} />
                                <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22, fontStyle: 'italic' }}>
                                    "{viewingExp.personalNote}"
                                </Text>
                        </View>
                    ) : (
                        <View style={{ height: 20 }} />
                    )}

                    <TouchableOpacity 
                        onPress={() => {
                            setViewModalVisible(false);
                            router.push({
                                pathname: "/project/[id]",
                                params: { id: viewingExp.id || viewingExp.projectId },
                            });
                        }}
                        style={[styles.actionButton, { justifyContent: 'center', paddingVertical: 14 }]}
                    >
                        <Text style={styles.actionButtonText}>Voir la fiche du projet</Text>
                        <Ionicons name="arrow-forward" size={18} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>
    </>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundSecondary,
    flexGrow: 1,
  },
  headerSection: {
    alignItems: "center",
    padding: 24,
    paddingTop: 70,
    backgroundColor: colors.background,
    borderBottomRightRadius: 40,
    borderBottomLeftRadius: 40,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 25,
  },
  backButton: {
    position: "absolute",
    top: 55,
    left: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: colors.background + '80',
    borderRadius: 20,
  } as any,
  reportHeaderButton: {
    position: "absolute",
    top: 55,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: colors.background + '80',
    borderRadius: 20,
  } as any,
  headerButton: {
    padding: 8,
    backgroundColor: colors.background + '80',
    borderRadius: 20,
  } as any,
  avatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    marginBottom: 18,
    borderWidth: 5,
    borderColor: colors.background,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  avatarPlaceholder: {
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  roleBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  roleBadgeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bioContainer: {
    marginTop: 20,
    paddingHorizontal: 10,
  },
  bio: {
    textAlign: "center",
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.9,
    fontStyle: 'italic',
  },
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniTag: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  miniTagText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: "row",
    backgroundColor: colors.primary,
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
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 15,
    justifyContent: "space-around",
    shadowColor: colors.shadow,
    shadowOpacity: 0.03,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attributeItem: {
    alignItems: "center",
  },
  attrLabel: {
    fontSize: 12,
    color: colors.text + "80",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  attrValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  skillTag: {
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: colors.backgroundSecondary,
  },
  experienceCardLarge: {
    width: 280,
    height: 380,
    backgroundColor: colors.background,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  experienceImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  experienceOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 20,
    justifyContent: 'flex-end',
  },
  experienceTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  experienceSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  statusBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    zIndex: 2,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  videoCard: {
    height: 150,
    backgroundColor: "#000",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: colors.text + "80",
    fontStyle: "italic",
    textAlign: "center",
    padding: 10,
  },
  projectCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOpacity: 0.03,
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  participationCard: {
    backgroundColor: colors.background,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
    borderWidth: 1,
    borderColor: colors.border,
  },
  projectTitle: {
    fontWeight: "700",
    fontSize: 16,
    color: colors.text,
  },
  projectMeta: {
    fontSize: 12,
    color: colors.text + "80",
    marginTop: 2,
  },
  participationRole: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  experienceInput: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editExpBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
});

