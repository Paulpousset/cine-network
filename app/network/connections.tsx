import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { appEvents, EVENTS } from "@/lib/events";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Image,
    Platform,
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
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"connections" | "blocked">(
    "connections",
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const myId = session.user.id;
      setCurrentUserId(myId);

      // Fetch all connections
      const { data: conns, error: connError } = await supabase
        .from("connections")
        .select(
          `
          *,
          requester:profiles!requester_id(id, full_name, username, role, ville, avatar_url),
          receiver:profiles!receiver_id(id, full_name, username, role, ville, avatar_url)
        `,
        )
        .or(`requester_id.eq.${myId},receiver_id.eq.${myId}`)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });

      if (connError) throw connError;
      setConnections(conns || []);

      // Fetch all blocked users (where I am the blocker)
      const { data: blocks, error: blockError } = await supabase
        .from("user_blocks")
        .select(`*, blocked:profiles!blocked_id(*)`)
        .eq("blocker_id", myId);

      if (blockError) throw blockError;
      setBlockedUsers(blocks || []);
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  }

  const handleUnblock = async (blockedId: string) => {
    const doUnblock = async () => {
      try {
        const { error } = await supabase
          .from("user_blocks")
          .delete()
          .eq("blocker_id", currentUserId)
          .eq("blocked_id", blockedId);

        if (error) throw error;

        appEvents.emit(EVENTS.USER_BLOCKED, {
          userId: blockedId,
          blocked: false,
        });

        setBlockedUsers((prev) =>
          prev.filter((b) => b.blocked_id !== blockedId),
        );
        Alert.alert("Succès", "Utilisateur débloqué.");
      } catch (e) {
        console.error(e);
        Alert.alert("Erreur", "Impossible de débloquer cet utilisateur.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Voulez-vous débloquer cet utilisateur ?")) {
        doUnblock();
      }
    } else {
      Alert.alert("Débloquer", "Voulez-vous débloquer cet utilisateur ?", [
        { text: "Annuler", style: "cancel" },
        { text: "Débloquer", onPress: doUnblock },
      ]);
    }
  };

  const removeConnection = async (connectionId: string, name: string) => {
    const doDelete = async () => {
      try {
        const { error } = await supabase
          .from("connections")
          .delete()
          .eq("id", connectionId);
        if (error) throw error;
        setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      } catch (e) {
        console.error(e);
        Alert.alert("Erreur", "Impossible de supprimer la connexion.");
      }
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(`Voulez-vous vraiment retirer ${name} de votre réseau ?`)
      ) {
        doDelete();
      }
    } else {
      Alert.alert(
        "Supprimer",
        `Voulez-vous vraiment retirer ${name} de votre réseau ?`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Retirer",
            style: "destructive",
            onPress: doDelete,
          },
        ],
      );
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    if (activeTab === "connections") {
      const isMeRequester = item.requester_id === currentUserId;
      const otherUser = isMeRequester ? item.receiver : item.requester;

      return (
        <View style={GlobalStyles.card}>
          <TouchableOpacity
            style={styles.info}
            onPress={() =>
              router.push({
                pathname: "/profile/[id]",
                params: { id: otherUser.id },
              })
            }
          >
            {otherUser.avatar_url ? (
              <Image
                source={{ uri: otherUser.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: "#ccc",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: 10,
                  },
                ]}
              >
                <Ionicons name="person" size={24} color="#fff" />
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={GlobalStyles.title2}>
                {otherUser.full_name || otherUser.username}
              </Text>
              <Text style={GlobalStyles.caption}>
                {otherUser.role ? otherUser.role.toUpperCase() : "Membre"} •{" "}
                {otherUser.ville || "N/A"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ padding: 10 }}
            onPress={() =>
              removeConnection(
                item.id,
                otherUser.full_name || otherUser.username,
              )
            }
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color={Colors.light.danger}
            />
          </TouchableOpacity>
        </View>
      );
    } else {
      // RENDERING BLOCKED USERS
      const otherUser = item.blocked;
      if (!otherUser) return null;

      return (
        <View style={GlobalStyles.card}>
          <View style={styles.info}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: "#EEE",
                  justifyContent: "center",
                  alignItems: "center",
                  marginRight: 10,
                },
              ]}
            >
              <Ionicons name="person" size={24} color="#BBB" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={GlobalStyles.title2}>
                {otherUser.full_name || otherUser.username}
              </Text>
              <Text style={[GlobalStyles.caption, { color: Colors.light.red }]}>
                Bloqué
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.unblockButton]}
            onPress={() => handleUnblock(otherUser.id)}
          >
            <Text style={styles.unblockButtonText}>Débloquer</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: "Mon Réseau",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginRight: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "connections" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("connections")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "connections" && styles.tabTextActive,
            ]}
          >
            Relations ({connections.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "blocked" && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab("blocked")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "blocked" && styles.tabTextActive,
            ]}
          >
            Bloqués ({blockedUsers.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === "connections" ? connections : blockedUsers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={{ textAlign: "center", marginTop: 50, color: "#999" }}>
              {activeTab === "connections"
                ? "Votre réseau est vide."
                : "Aucun utilisateur bloqué."}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundSecondary },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: Colors.light.primary,
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  tabTextActive: {
    color: Colors.light.primary,
    fontWeight: "700",
  },
  info: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  unblockButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  unblockButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
