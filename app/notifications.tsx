import Colors from "@/constants/Colors";
import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const SEEN_ACCEPTED_KEY = "seen_accepted_connections"; // Key for local storage

  useEffect(() => {
    fetchNotifications();

    // Listen for updates
    const unsub = appEvents.on(EVENTS.CONNECTIONS_UPDATED, fetchNotifications);
    return unsub;
  }, []);

  async function fetchNotifications() {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      setCurrentUserId(session.user.id);

      // 1. Fetch received requests (Pending)
      const { data: received, error: errorReceived } = await supabase
        .from("connections")
        .select(
          `
          *,
          requester:profiles!requester_id(id, full_name, username, role, ville, avatar_url)
        `,
        )
        .eq("receiver_id", session.user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (errorReceived) throw errorReceived;

      // 2. Fetch Accepted Requests (My requests that were accepted)
      const { data: acceptedRaw, error: errorAccepted } = await supabase
        .from("connections")
        .select(
          `
          *,
          receiver:profiles!receiver_id(id, full_name, username, role, ville, avatar_url)
        `,
        )
        .eq("requester_id", session.user.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false })
        .limit(20);

      if (errorAccepted) throw errorAccepted;

      // 3. Fetch Project Assignments
      const { data: assignments, error: errorAssignments } = await supabase
        .from("project_roles")
        .select("*, tournage:tournages(id, title, image_url)")
        .eq("assigned_profile_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (errorAssignments) throw errorAssignments;

      // 4. Fetch Accepted Applications
      const { data: applications, error: errorApps } = await supabase
        .from("applications")
        .select(
          "*, role:project_roles(id, title, status, tournage:tournages(id, title, image_url))",
        )
        .eq("candidate_id", session.user.id)
        .or("status.eq.accepted,status.eq.invitation_pending")
        .order("created_at", { ascending: false })
        .limit(20);

      if (errorApps) throw errorApps;

      // 5. Fetch Sent Pending Requests
      const { data: sentPending, error: errorSent } = await supabase
        .from("connections")
        .select(
          `
          *,
          receiver:profiles!receiver_id(id, full_name, username, role, ville, avatar_url)
        `,
        )
        .eq("requester_id", session.user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (errorSent) throw errorSent;

      const seenJson = await AsyncStorage.getItem(SEEN_ACCEPTED_KEY);
      let seenIds: string[] = [];
      try {
        seenIds = seenJson ? JSON.parse(seenJson) : [];
      } catch (e) {
        console.error("Error parsing seenIds", e);
        seenIds = [];
      }

      // Filter and deduplicate
      const accepted = (acceptedRaw || []).filter(
        (item: any) => !seenIds.includes(item.id),
      );

      // Collect accepted application role IDs to prevent duplicates
      const appRoleIds = new Set(
        (applications || []).map((app: any) => app.role?.id).filter(Boolean),
      );

      // Split assignments: Invitations are any assigned roles that are NOT yet 'assigned' (confirmed)
      const invitations = (assignments || []).filter((item: any) => {
        // Invitations are status !== 'assigned'
        const isInvitation = item.status !== "assigned";
        if (!isInvitation) return false;

        // If this role assignment came from an application, show it in the application section instead
        if (appRoleIds.has(item.id)) return false;

        // NEVER filter out invitations unless they change status in DB
        return true;
      });

      const newAssignments = (assignments || []).filter((item: any) => {
        // Skip if it's an invitation (handled above),
        // or if this assignment corresponds to an accepted application,
        // or if it's already seen
        if (item.status !== "assigned") return false;
        if (appRoleIds.has(item.id)) return false;
        return !seenIds.includes(item.id);
      });

      const newApplications = (applications || []).filter((item: any) => {
        // Always show if it's an invitation (not yet definitively assigned)
        const isInvitation =
          item.role?.status && item.role.status !== "assigned";
        if (isInvitation) return true;

        // Otherwise filter by seenIds
        return !seenIds.includes(item.id);
      });

      const newSections = [];
      if (received && received.length > 0) {
        newSections.push({
          title: "Invitations Réçues (Réseau)",
          data: received,
          type: "request",
        });
      }

      if (invitations.length > 0) {
        newSections.push({
          title: "Invitations de Projets",
          data: invitations.map((a: any) => ({ ...a, type: "assignment" })),
          type: "project_invitation",
        });
      }

      // New Section: Accepted Applications
      if (newApplications.length > 0) {
        newSections.push({
          title: "Candidatures Acceptées",
          data: newApplications.map((a: any) => ({
            ...a,
            type: "application",
          })),
          type: "application_accepted",
        });
      }

      if (sentPending && sentPending.length > 0) {
        newSections.push({
          title: "Invitations Envoyées",
          data: sentPending,
          type: "sent",
        });
      }
      if (accepted && accepted.length > 0) {
        newSections.push({
          title: "Nouveaux Contacts",
          data: accepted,
          type: "accepted",
        });
      }
      if (newAssignments.length > 0) {
        newSections.push({
          title: "Mises à jour Projets",
          data: newAssignments.map((a: any) => ({ ...a, type: "assignment" })),
          type: "project_update",
        });
      }

      setSections(newSections);
    } catch (e) {
      console.error(e);
      // Alert.alert("Erreur", "Impossible de charger les notifications.");
    } finally {
      setLoading(false);
    }
  }

  const handleAccept = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from("connections")
        .update({ status: "accepted" })
        .eq("id", connectionId);

      if (error) throw error;
      appEvents.emit(EVENTS.CONNECTIONS_UPDATED);
      Alert.alert("Succès", "Demande acceptée !");
    } catch (e) {
      Alert.alert("Erreur", "Une erreur est survenue.");
    }
  };

  const handleDecline = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;
      appEvents.emit(EVENTS.CONNECTIONS_UPDATED);
    } catch (e) {
      Alert.alert("Erreur", "Une erreur est survenue.");
    }
  };

  const handleAcceptAssignment = async (assignmentId: string) => {
    try {
      const { data, error } = await supabase
        .from("project_roles")
        .update({ status: "assigned" })
        .eq("id", assignmentId)
        .select();

      if (error) throw error;

      // If RLS blocked the update, data will be empty
      if (!data || data.length === 0) {
        throw new Error(
          "Impossible d'accepter l'invitation. (Permissions insuffisantes)",
        );
      }

      fetchNotifications();
      appEvents.emit(EVENTS.CONNECTIONS_UPDATED);
      Alert.alert("Bienvenue !", "Vous avez accepté ce rôle.");
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message || "Une erreur est survenue.");
    }
  };

  const handleMarkSeen = async (connectionId: string) => {
    // Mark accepted connection as seen
    const seenJson = await AsyncStorage.getItem(SEEN_ACCEPTED_KEY);
    let seenIds = seenJson ? JSON.parse(seenJson) : [];
    if (!Array.isArray(seenIds)) seenIds = [];

    if (!seenIds.includes(connectionId)) {
      seenIds.push(connectionId);
      await AsyncStorage.setItem(SEEN_ACCEPTED_KEY, JSON.stringify(seenIds));

      // Update local state immediately
      setSections((prev) =>
        prev
          .map((section) => ({
            ...section,
            data: section.data.filter((item: any) => item.id !== connectionId),
          }))
          .filter((section) => section.data.length > 0),
      );

      // Emit event to update bell badge across the app
      appEvents.emit(EVENTS.CONNECTIONS_UPDATED);
    }
  };

  const handleDeclineAssignment = async (
    assignmentId: string,
    notificationId: string,
  ) => {
    try {
      // 1. If this was an accepted application, we should also update/remove it
      // so it doesn't keep appearing as "Accepted" in notifications
      await supabase
        .from("applications")
        .update({ status: "rejected" })
        .eq("role_id", assignmentId)
        .eq("candidate_id", currentUserId)
        .or("status.eq.accepted,status.eq.invitation_pending");

      // 2. Reset the role (actually unassign the user)
      const { error } = await supabase
        .from("project_roles")
        .update({
          status: "published",
          assigned_profile_id: null,
        })
        .eq("id", assignmentId);

      if (error) throw error;

      // Hide the notification locally
      handleMarkSeen(notificationId);

      fetchNotifications();
      appEvents.emit(EVENTS.CONNECTIONS_UPDATED);
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message || "Une erreur est survenue.");
    }
  };

  const handleMarkAllAsSeen = async () => {
    const seenJson = await AsyncStorage.getItem(SEEN_ACCEPTED_KEY);
    let seenIds = seenJson ? JSON.parse(seenJson) : [];
    if (!Array.isArray(seenIds)) seenIds = [];

    const newIdsToMark: any[] = [];
    sections.forEach((section) => {
      // Don't mark pending requests or invitations as seen, they must be acted upon
      if (section.type === "request") return;

      section.data.forEach((item: any) => {
        const isApp = item.type === "application";
        const isInvitation = isApp
          ? item.role?.status !== "assigned"
          : item.status !== "assigned" || section.type === "project_invitation";

        if (!isInvitation && !seenIds.includes(item.id)) {
          newIdsToMark.push(item.id);
        }
      });
    });

    if (newIdsToMark.length > 0) {
      const updatedSeenIds = [...seenIds, ...newIdsToMark];
      await AsyncStorage.setItem(
        SEEN_ACCEPTED_KEY,
        JSON.stringify(updatedSeenIds),
      );

      // Refresh notifications to clear the UI
      fetchNotifications();
      // Emit event to update bell badge
      appEvents.emit(EVENTS.CONNECTIONS_UPDATED);

      if (Platform.OS !== "web") {
        Alert.alert(
          "Succès",
          "Toutes les notifications ont été marquées comme vues.",
        );
      }
    }
  };

  const renderItem = ({ item, section }: { item: any; section: any }) => {
    // 1. PROJECT UPDATES & ACCEPTED APPLICATIONS
    if (
      section.type === "project_update" ||
      section.type === "project_invitation" ||
      section.type === "application_accepted"
    ) {
      const isApp = item.type === "application";
      const project = isApp ? item.role?.tournage : item.tournage;
      const roleTitle = isApp ? item.role?.title : item.title;

      // Robust invitation check:
      // - For direct assignments: if status is not 'assigned'
      // - For applications: if the underlying role status is not 'assigned'
      const isInvitation = isApp
        ? item.role?.status !== "assigned"
        : item.status !== "assigned" || section.type === "project_invitation";

      const targetId = isApp ? item.role?.id : item.id;

      return (
        <TouchableOpacity
          style={styles.card}
          onPress={() => {
            // For invitations, we don't auto-mark as seen on click to keep buttons visible
            if (!isInvitation) handleMarkSeen(item.id);
            if (project?.id) {
              router.push(`/project/${project.id}`);
            }
          }}
        >
          <View style={styles.userInfo}>
            {project?.image_url ? (
              <Image
                source={{ uri: project.image_url }}
                style={styles.avatar}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: Colors.light.tint,
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Ionicons name="film" size={24} color="#fff" />
              </View>
            )}
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.name}>
                {project?.title || "Projet inconnu"}
              </Text>
              <Text style={styles.subtitle}>
                {isApp
                  ? `Votre candidature pour "${roleTitle}" a été acceptée !`
                  : isInvitation
                    ? `Proposition de rôle : "${roleTitle}"`
                    : `Vous avez été ajouté au projet : "${roleTitle}"`}
              </Text>
            </View>
          </View>

          {isInvitation && targetId ? (
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.acceptButton]}
                onPress={() => handleAcceptAssignment(targetId)}
              >
                <Text style={styles.buttonText}>Accepter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.declineButton]}
                onPress={() => handleDeclineAssignment(targetId, item.id)}
              >
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={() => handleMarkSeen(item.id)}
                style={{ padding: 8 }}
              >
                <Ionicons
                  name="checkmark-done"
                  size={20}
                  color={Colors.light.tint}
                />
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    // 2. NETWORK UPDATES (Existing logic)
    // Determine profile to show
    // For received requests: requester
    // For accepted requests: receiver (since I was the requester)
    const profile = item.requester || item.receiver;
    if (!profile) return null;

    const isRequest = section.type === "request";
    const isSent = section.type === "sent";

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          if (!isRequest && !isSent) handleMarkSeen(item.id);
          router.push(`/profile/${profile.id}`);
        }}
      >
        <View style={styles.userInfo}>
          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: "#ccc",
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <Ionicons name="person" size={24} color="#fff" />
            </View>
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.name}>
              {profile.full_name || profile.username || "Utilisateur"}
            </Text>
            <Text style={styles.subtitle}>
              {isRequest
                ? "Souhaite rejoindre votre réseau"
                : isSent
                  ? "Invitation envoyée"
                  : "A accepté votre demande"}
            </Text>
            {profile.role && <Text style={styles.role}>{profile.role}</Text>}
          </View>
        </View>

        {isRequest && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={() => handleAccept(item.id)}
            >
              <Text style={styles.buttonText}>Accepter</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={() => handleDecline(item.id)}
            >
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}
        {isSent && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={() => handleDecline(item.id)}
            >
              <Text style={[styles.buttonText, { color: "#666" }]}>
                Annuler
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {!isRequest && !isSent && (
          <TouchableOpacity onPress={() => handleMarkSeen(item.id)}>
            <Ionicons
              name="checkmark-done"
              size={20}
              color={Colors.light.tint}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const hasUnseenNotifications = sections.some((s) => s.type !== "request");

  return (
    <>
      <Stack.Screen
        options={{
          title: "Notifications",
          headerBackTitle: "Retour",
          headerRight: () =>
            hasUnseenNotifications ? (
              <TouchableOpacity
                onPress={handleMarkAllAsSeen}
                style={{ marginRight: 10 }}
              >
                <Text
                  style={{
                    color: Colors.light.tint,
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  Marquer comme vues
                </Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <View
        style={[styles.container, { backgroundColor: Colors.light.background }]}
      >
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section: { title } }) => (
            <View
              style={[
                styles.headerContainer,
                { backgroundColor: Colors.light.background },
              ]}
            >
              <Text style={[styles.headerTitle, { color: Colors.light.text }]}>
                {title}
              </Text>
            </View>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchNotifications}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="notifications-off-outline"
                  size={48}
                  color="#ccc"
                />
                <Text style={styles.emptyText}>
                  Aucune notification pour le moment
                </Text>
              </View>
            ) : null
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: Colors.light.card, // Force white background
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  name: {
    fontWeight: "bold",
    fontSize: 16,
    color: Colors.light.text, // Force dark text
  },
  subtitle: {
    color: "#666",
    fontSize: 12,
    marginTop: 2,
  },
  role: {
    color: Colors.light.tint,
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: Colors.light.tint,
    marginRight: 8,
  },
  declineButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: {
    color: "#999",
    marginTop: 16,
  },
});
function handleMarkSeen(notificationId: string) {
  throw new Error("Function not implemented.");
}
