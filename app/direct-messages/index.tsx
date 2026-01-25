import ClapLoading from "@/components/ClapLoading";
import Colors from "@/constants/Colors";
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
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        async (payload) => {
          const newMsg = payload.new;
          // Check if this message involves me
          const {
            data: { session },
          } = await supabase.auth.getSession();
          const myId = session?.user?.id;

          if (
            myId &&
            (newMsg.sender_id === myId || newMsg.receiver_id === myId)
          ) {
            // It's for me! Refresh the list to be safe and simple, or manually update state.
            // Manual update is better for UX but complex because we need the other user profile.
            // Let's re-fetch for now to ensure data consistency, it's fast enough.
            fetchConversations();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchConversations() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;
      setCurrentUserId(userId);

      // Fetch all messages where I am sender or receiver
      // This is a naive approach. Ideally we use a 'conversations' view or distinct query.
      // Since Supabase doesn't support DISTINCT ON in JS client easily for this complex join,
      // we'll fetch latest messages and process in JS or use a stored procedure.
      // Let's try to fetch unique interlocutors from connections first? No, we want existing chats.

      // Better approach:
      // 1. Get all messages involving me
      // 2. Group by the OTHER user_id
      // 3. Sort by latest message

      const { data: messages, error } = await supabase
        .from("direct_messages")
        .select("*") // Get raw messages without join first
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Process messages to get unique conversations
      // Fetch user details manually for safety
      const interlocutorIds = new Set();
      messages?.forEach((msg) => {
        interlocutorIds.add(
          msg.sender_id === userId ? msg.receiver_id : msg.sender_id,
        );
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", Array.from(interlocutorIds));
      const profileMap = new Map();
      profiles?.forEach((p) => profileMap.set(p.id, p));

      const convMap = new Map();
      messages?.forEach((msg) => {
        const isMeSender = msg.sender_id === userId;
        const otherUserId = isMeSender ? msg.receiver_id : msg.sender_id; // Use raw ID

        // Retrieve profile from manual fetch
        const otherUser = profileMap.get(otherUserId);

        // Skip if user data is missing (e.g. deleted user)
        if (!otherUser) return;

        if (!convMap.has(otherUserId)) {
          convMap.set(otherUserId, {
            user: otherUser,
            lastMessage: msg,
          });
        }
      });

      setConversations(Array.from(convMap.values()));
    } catch (e) {
      console.log(e);
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
                  uri: item.user.avatar_url || "https://via.placeholder.com/50",
                }}
                style={styles.avatar}
              />
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
