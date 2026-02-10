import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { appEvents, EVENTS } from "@/lib/events";
import { NotificationService } from "@/services/NotificationService";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Platform,
    RefreshControl,
    SectionList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function ConnectionRequests() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const SEEN_ACCEPTED_KEY = "seen_accepted_connections"; // Key for local storage

  useEffect(() => {
    fetchRequests();
  }, []);

  async function fetchRequests() {
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
          requester:profiles!requester_id(id, full_name, username, role, ville)
        `,
        )
        .eq("receiver_id", session.user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (errorReceived) throw errorReceived;

      // 2. Fetch sent requests (Pending)
      const { data: sent, error: errorSent } = await supabase
        .from("connections")
        .select(
          `
          *,
          receiver:profiles!receiver_id(id, full_name, username, role, ville)
        `,
        )
        .eq("requester_id", session.user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (errorSent) throw errorSent;

      // 3. Fetch Accepted Requests (My requests that were accepted)
      const { data: acceptedRaw, error: errorAccepted } = await supabase
        .from("connections")
        .select(
          `
          *,
          receiver:profiles!receiver_id(id, full_name, username, role, ville)
        `,
        )
        .eq("requester_id", session.user.id)
        .eq("status", "accepted")
        .order("created_at", { ascending: false }); // Best proxy for "recent" without updated_at

      if (errorAccepted) throw errorAccepted;

      // Filter out locally seen accepted requests
      const seenJson = await AsyncStorage.getItem(SEEN_ACCEPTED_KEY);
      const seenIds = seenJson ? JSON.parse(seenJson) : [];

      const accepted = (acceptedRaw || []).filter(
        (item: any) => !seenIds.includes(item.id),
      );

      setSections(
        [
          { title: "Nouveaux Contacts", data: accepted || [] },
          { title: "Invitations Reçues", data: received || [] },
          { title: "Invitations Envoyées", data: sent || [] },
        ].filter((s) => s.data.length > 0),
      ); // Only show non-empty sections
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Impossible de charger les demandes.");
    } finally {
      setLoading(false);
    }
  }

  async function dismissAccepted(id: string) {
    // Optimistic UI
    setSections((prev) =>
      prev
        .map((section) => ({
          ...section,
          data: section.data.filter((item: any) => item.id !== id),
        }))
        .filter((s) => s.data.length > 0),
    );

    try {
      const seenJson = await AsyncStorage.getItem(SEEN_ACCEPTED_KEY);
      const seenIds = seenJson ? JSON.parse(seenJson) : [];
      if (!seenIds.includes(id)) {
        seenIds.push(id);
        await AsyncStorage.setItem(SEEN_ACCEPTED_KEY, JSON.stringify(seenIds));
        appEvents.emit(EVENTS.CONNECTIONS_UPDATED);
      }
    } catch (e) {
      console.error("Failed to dismiss notification", e);
    }
  }

  async function handleMarkAllAcceptedAsSeen() {
    try {
      const seenJson = await AsyncStorage.getItem(SEEN_ACCEPTED_KEY);
      let seenIds = seenJson ? JSON.parse(seenJson) : [];
      if (!Array.isArray(seenIds)) seenIds = [];

      const acceptedSection = sections.find(
        (s) => s.title === "Nouveaux Contacts",
      );
      const newIdsToMark: string[] = [];
      if (acceptedSection) {
        acceptedSection.data.forEach((item: any) => {
          if (!seenIds.includes(item.id)) {
            newIdsToMark.push(item.id);
          }
        });
      }

      if (newIdsToMark.length > 0) {
        const updatedSeenIds = [...seenIds, ...newIdsToMark];
        await AsyncStorage.setItem(
          SEEN_ACCEPTED_KEY,
          JSON.stringify(updatedSeenIds),
        );
        fetchRequests();
        appEvents.emit(EVENTS.CONNECTIONS_UPDATED);
        if (Platform.OS !== "web") {
          Alert.alert("Succès", "Nouveaux contacts marqués comme vus.");
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleAction(
    id: string,
    action: "accept" | "reject" | "cancel",
  ) {
    // 1. Optimistic Update : on enlève l'item de l'interface immédiatement
    setSections((prev) =>
      prev.map((section) => ({
        ...section,
        data: section.data.filter((item: any) => item.id !== id),
      })),
    );

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const myId = session?.user.id;
      if (!myId) throw new Error("Non connecté");

      let error;
      if (action === "cancel") {
        // Suppression
        // On utilise delete({ count: 'exact' }) pour savoir si une ligne a vraiment été effacée
        const res = await supabase
          .from("connections")
          .delete({ count: "exact" })
          .eq("id", id);

        error = res.error;

        // Si aucune ligne n'a été affectée (count === 0), c'est souvent un problème de droits (RLS)
        if (!error && res.count === 0) {
          throw new Error(
            "Impossible de supprimer : Vous n'avez probablement pas la permission (RLS) ou l'élément n'existe plus.",
          );
        }
      } else {
        // Acceptation/Rejet : on s'assure que c'est bien POUR moi
        const newStatus = action === "accept" ? "accepted" : "rejected";
        const res = await supabase
          .from("connections")
          .update({ status: newStatus })
          .eq("id", id)
          .eq("receiver_id", myId) // Sécurité supplémentaire
          .select() // Retourne l'objet modifié
          .single();

        error = res.error;
        const updatedConn = res.data;

        // NETTOYAGE DES DOUBLONS (Mutual Request)
        // Si j'accepte une demande de Bob, et que j'avais AUSSI envoyé une demande à Bob...
        // ... je dois supprimer ma demande sortante pour éviter d'avoir 2 lignes actives.
        if (!error && action === "accept" && updatedConn) {
          const senderId = updatedConn.requester_id;

          // Send Push Notification
          supabase
            .from("profiles")
            .select("full_name, username")
            .eq("id", myId)
            .single()
            .then(({ data }) => {
              if (data) {
                NotificationService.sendConnectionAcceptedNotification({
                  receiverId: senderId,
                  accepterName: data.full_name || data.username,
                });
              }
            });

          // Clean up any pending request I sent to this user
          const { error: delError } = await supabase
            .from("connections")
            .delete()
            .eq("requester_id", myId)
            .eq("receiver_id", senderId)
            .eq("status", "pending");

          if (delError) console.log("Cleanup warning:", delError);
        }
      }

      if (error) throw error;
    } catch (e: any) {
      console.error("Action failed:", e);
      Alert.alert("Erreur", "La suppression a échoué : " + e.message);
      // En cas d'échec seulement, on recharge la liste pour faire réapparaître l'item
      fetchRequests();
    }
  }

  const renderItem = ({ item, section }: { item: any; section: any }) => {
    const isNewContact = section.title === "Nouveaux Contacts";
    const isReceived = section.title === "Invitations Reçues";

    // Determine which profile to show
    // New Contact -> Receiver (the one I asked)
    // Received -> Requester (the one who asked me)
    // Sent -> Receiver (the one I asked)
    const user = isReceived ? item.requester : item.receiver;

    return (
      <TouchableOpacity
        style={GlobalStyles.card}
        onPress={() =>
          router.push({
            pathname: "/profile/[id]",
            params: { id: user.id },
          })
        }
      >
        <View style={styles.info}>
          <Text style={GlobalStyles.title2}>
            {user.full_name || user.username}
          </Text>
          <Text style={GlobalStyles.caption}>
            {user.role ? user.role.toUpperCase() : "Membre"} •{" "}
            {user.ville || "N/A"}
          </Text>
          <Text style={[styles.date, { marginTop: 4 }]}>
            {isNewContact
              ? "Demande acceptée"
              : isReceived
                ? "Reçu le " + new Date(item.created_at).toLocaleDateString()
                : "Envoyé le " + new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        {/* ACTIONS */}
        <View style={styles.actions}>
          {isNewContact ? (
            <TouchableOpacity
              onPress={() => dismissAccepted(item.id)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#f0f0f0",
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 20,
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 10, color: "#666", fontWeight: "600" }}>
                Masquer la notif
              </Text>
              <Ionicons name="close" size={14} color="#666" />
            </TouchableOpacity>
          ) : isReceived ? (
            <>
              <TouchableOpacity
                onPress={() => handleAction(item.id, "accept")}
                style={[styles.btn, styles.btnAccept]}
              >
                <Ionicons name="checkmark" size={22} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleAction(item.id, "reject")}
                style={[styles.btn, styles.btnReject]}
              >
                <Ionicons name="close" size={22} color={Colors.light.danger} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => handleAction(item.id, "cancel")}
              style={[
                styles.btn,
                { backgroundColor: Colors.light.backgroundSecondary },
              ]}
            >
              <Ionicons name="trash-outline" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const hasAcceptedToDismiss = sections.some(
    (s) => s.title === "Nouveaux Contacts",
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: "Invitations",
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: Colors.light.background },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 10, marginLeft: -10 }}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          ),
          headerRight: () =>
            hasAcceptedToDismiss ? (
              <TouchableOpacity
                onPress={handleMarkAllAcceptedAsSeen}
                style={{ marginRight: 10 }}
              >
                <Text
                  style={{
                    color: Colors.light.tint,
                    fontWeight: "600",
                    fontSize: 13,
                  }}
                >
                  Tout voir
                </Text>
              </TouchableOpacity>
            ) : null,
        }}
      />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title, data } }) =>
          data.length > 0 ? (
            <Text style={styles.sectionHeader}>{title}</Text>
          ) : null
        }
        contentContainerStyle={{ padding: 15 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchRequests} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={{ alignItems: "center", marginTop: 50 }}>
              <Ionicons
                name="notifications-off-outline"
                size={50}
                color="#ccc"
              />
              <Text style={{ marginTop: 10, color: "#999" }}>
                Aucune nouvelle notification.
              </Text>
            </View>
          ) : null
        }
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundSecondary },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 10,
    marginTop: 15,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  info: { flex: 1, marginRight: 10 },
  date: { fontSize: 11, color: "#999" },
  actions: { flexDirection: "row", gap: 12 },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  btnAccept: { backgroundColor: Colors.light.success },
  btnReject: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ffebee",
  },
});
