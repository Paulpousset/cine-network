import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function NetworkConnections() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      setCurrentUserId(session.user.id);

      // Fetch all connections where I am requester OR receiver
      const { data, error } = await supabase
        .from("connections")
        .select(
          `
          *,
          requester:profiles!requester_id(id, full_name, username, role, ville),
          receiver:profiles!receiver_id(id, full_name, username, role, ville)
        `,
        )
        .or(
          `requester_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`,
        )
        .eq("status", "accepted") // We only want accepted connections here
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Impossible de charger le réseau.");
    } finally {
      setLoading(false);
    }
  }

  const removeConnection = async (connectionId: string, name: string) => {
    Alert.alert(
      "Supprimer",
      `Voulez-vous vraiment retirer ${name} de votre réseau ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Retirer",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("connections")
                .delete()
                .eq("id", connectionId);
              if (error) throw error;
              setConnections((prev) =>
                prev.filter((c) => c.id !== connectionId),
              );
            } catch (e) {
              console.error(e);
              Alert.alert("Erreur", "Impossible de supprimer la connexion.");
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isMeRequester = item.requester_id === currentUserId;
    const otherUser = isMeRequester ? item.receiver : item.requester;

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.info}
          onPress={() =>
            router.push({
              pathname: "/profile/[id]",
              params: { id: otherUser.id },
            })
          }
        >
          <Text style={styles.name}>
            {otherUser.full_name || otherUser.username}
          </Text>
          <Text style={styles.subtext}>
            {otherUser.role ? otherUser.role.toUpperCase() : "Membre"} •{" "}
            {otherUser.ville || "N/A"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ padding: 10 }}
          onPress={() =>
            removeConnection(item.id, otherUser.full_name || otherUser.username)
          }
        >
          <Ionicons name="trash-outline" size={20} color="red" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: "Mes Relations",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginRight: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          ),
        }}
      />
      <FlatList
        data={connections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={{ textAlign: "center", marginTop: 50, color: "#999" }}>
              Votre réseau est vide.
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: "bold", color: "#333" },
  subtext: { fontSize: 12, color: "#666", marginTop: 2 },
});
