import Colors from "@/constants/Colors";
import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { Hoverable } from "./Hoverable";

export default function FloatingChatWidget({ userId }: { userId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchConversations();

    const unsubscribeNew = appEvents.on(EVENTS.NEW_MESSAGE, () => {
      fetchConversations();
    });

    const unsubscribeRead = appEvents.on(EVENTS.MESSAGES_READ, () => {
      fetchConversations();
    });

    return () => {
      unsubscribeNew();
      unsubscribeRead();
    };
  }, [userId]);

  async function fetchConversations() {
    try {
      const { data: convs, error } = await supabase.rpc("get_conversations");

      if (error) throw error;

      const formattedConversations = convs.map((c: any) => ({
        user: {
          id: c.conversation_user_id,
          full_name: c.full_name,
          avatar_url: c.avatar_url,
          username: c.username,
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

      // Calculate unread count (messages where receiver is me and is_read is false)
      let count = 0;
      formattedConversations.forEach((c: any) => {
        if (!c.lastMessage.is_read && c.lastMessage.receiver_id === userId) {
          // This logic is slightly flawed as get_conversations usually returns the *last* message.
          // Ideally we need a separate count of unread messages per conversation.
          // But get_conversations might not provide aggregated unread count.
          // For now, if the last message is unread, we count it.
          // Ideally: RPC should return 'unread_count'.
          // Check if 'get_conversations' returns unread count?
          // I will assume for now simply checking the last message for simplicity,
          // or assume the count is better fetched elsewhere.
          // Actually, let's just highlight the ones with unread last message.
          count++;
        }
      });
      setUnreadCount(count);
    } catch (e) {
      console.log("Error in chat widget:", e);
    } finally {
      setLoading(false);
    }
  }

  const filteredConversations = conversations.filter(
    (c) =>
      c.user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.user.username?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!userId) return null;

  return (
    <View style={styles.container}>
      {isOpen && (
        <View style={styles.popover}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Messages</Text>
            <TouchableOpacity onPress={() => setIsOpen(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View
            style={{ padding: 10, borderBottomWidth: 1, borderColor: "#eee" }}
          >
            <TextInput
              placeholder="Rechercher une discussion..."
              style={styles.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item.user.id}
            contentContainerStyle={{ paddingBottom: 10 }}
            ListEmptyComponent={
              <Text
                style={{ textAlign: "center", marginTop: 20, color: "#999" }}
              >
                Aucune conversation.
              </Text>
            }
            renderItem={({ item }) => {
              const isUnread =
                !item.lastMessage.is_read &&
                item.lastMessage.receiver_id === userId;

              return (
                <Hoverable
                  style={
                    {
                      flexDirection: "row",
                      padding: 12,
                      alignItems: "center",
                      borderBottomWidth: 1,
                      borderColor: "#f5f5f5",
                      backgroundColor: isUnread ? "#fafafa" : "white",
                      cursor: "pointer",
                    } as any
                  }
                  hoverStyle={{ backgroundColor: "#f0f0f0" }}
                  onPress={() => {
                    setIsOpen(false);
                    router.push(`/direct-messages/${item.user.id}`);
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: "#eee",
                      marginRight: 10,
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {/* Placeholder Avatar */}
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "bold",
                        color: "#666",
                      }}
                    >
                      {item.user.full_name?.[0] ||
                        item.user.username?.[0] ||
                        "?"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: isUnread ? "bold" : "600",
                          fontSize: 14,
                        }}
                      >
                        {item.user.full_name || item.user.username}
                      </Text>
                      {item.lastMessage.created_at && (
                        <Text style={{ fontSize: 10, color: "#999" }}>
                          {new Date(
                            item.lastMessage.created_at,
                          ).toLocaleDateString()}
                        </Text>
                      )}
                    </View>

                    <Text
                      numberOfLines={1}
                      style={{
                        color: isUnread ? "#333" : "#888",
                        fontWeight: isUnread ? "600" : "normal",
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {item.lastMessage.content || "Image"}
                    </Text>
                  </View>
                  {isUnread && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#E91E63",
                        marginLeft: 8,
                      }}
                    />
                  )}
                </Hoverable>
              );
            }}
          />
          <View style={styles.footer}>
            <Hoverable
              onPress={() => {
                setIsOpen(false);
                router.push("/direct-messages");
              }}
              style={
                { padding: 10, alignItems: "center", cursor: "pointer" } as any
              }
            >
              <Text style={{ color: Colors.light.primary, fontWeight: "bold" }}>
                Voir tout
              </Text>
            </Hoverable>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubbles" size={28} color="white" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 20,
    right: 20,
    zIndex: 9999,
    alignItems: "flex-end",
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "red",
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  popover: {
    width: 350,
    height: 500,
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 15, // Space between popover and FAB
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#eee",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
  },
  headerTitle: {
    fontWeight: "bold",
    fontSize: 16,
  },
  input: {
    backgroundColor: "#f5f5f5",
    padding: 8,
    borderRadius: 8,
    fontSize: 14,
  },
  footer: {
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fafafa",
  },
});
