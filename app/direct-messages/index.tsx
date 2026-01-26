import ClapLoading from "@/components/ClapLoading";
import Colors from "@/constants/Colors";
import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function DirectMessagesList() {
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();

    // Realtime subscription for new messages
    const channel = supabase
      .channel("dm_list")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
        },
        async (payload) => {
          console.log("DM List: Realtime event", payload.eventType);
          // Refresh generally to cover all cases (new msg, read status, etc)
          fetchConversations();
        },
      )
      .subscribe();

    // Listen for read events to update badges instantly
    const unsubscribeRead = appEvents.on(EVENTS.MESSAGES_READ, () => {
      fetchConversations();
    });

    return () => {
      supabase.removeChannel(channel);
      unsubscribeRead();
    };
  }, []);

  async function fetchConversations() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      setCurrentUserId(session.user.id);

      // Use the efficient Database Function (RPC)
      const { data: convs, error } = await supabase
        .rpc("get_conversations");

      if (error) throw error;

      // Transform RPC result to match the expected state format
      // State expects: { user: { ...profile }, lastMessage: { ...msg } }
      const formattedConversations = convs.map((c: any) => ({
        user: {
          id: c.conversation_user_id,
          full_name: c.full_name,
          avatar_url: c.avatar_url,
        },
        lastMessage: {
          content: c.last_message_content,
          created_at: c.last_message_created_at,
          is_read: c.is_read,
          sender_id: c.sender_id,
          receiver_id: c.receiver_id,
        },
      }));

      setConversations(formattedConversations || []);
    } catch (e) {
      console.log("Error fetching conversations:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerTitle: "Messages",
          headerBackTitle: "Retour",
          headerTintColor: Colors.light.tint,
        }}
      />

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ClapLoading size={50} color={Colors.light.primary} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.user.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchConversations();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Aucune conversation.</Text>
              <Text style={styles.emptySubText}>
                Allez sur le profil d'un utilisateur pour démarrer un chat.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/direct-messages/[id]",
                  params: { id: item.user.id },
                })
              }
            >
              <Image
                source={{
                  uri: item.user.avatar_url || "https://ui-avatars.com/api/?name=" + (item.user.full_name || "User"),
                }}
                style={styles.avatar}
              />
              {!item.lastMessage.is_read &&
                item.lastMessage.receiver_id === currentUserId && (
                  <View
                    style={{
                      position: "absolute",
                      left: 55,
                      top: 15,
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: Colors.light.tint,
                      borderWidth: 2,
                      borderColor: "white",
                      zIndex: 10,
                    }}
                  />
                )}
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <Text style={styles.name}>
                    {item.user.full_name || item.user.username}
                  </Text>
                  <Text style={styles.date}>
                    {new Date(item.lastMessage.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.message,
                    !item.lastMessage.is_read &&
                      item.lastMessage.receiver_id === currentUserId && {
                        fontWeight: "bold",
                        color: Colors.light.text,
                      },
                  ]}
                  numberOfLines={1}
                >
                  {item.lastMessage.sender_id === currentUserId ? "Vous: " : ""}
                  {item.lastMessage.content}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors.light.tabIconDefault}
              />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: "white",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
    backgroundColor: "#eee",
  },
  name: {
    fontWeight: "bold",
    fontSize: 16,
    color: Colors.light.text,
  },
  date: {
    fontSize: 12,
    color: "#999",
  },
  message: {
    fontSize: 14,
    color: "#666",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.light.text,
    marginBottom: 10,
  },
  emptySubText: {
    textAlign: "center",
    color: "#666",
  },
});
