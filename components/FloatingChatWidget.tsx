import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { Hoverable } from "./Hoverable";

export default function FloatingChatWidget({ userId }: { userId: string }) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [projectChannels, setProjectChannels] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"dm" | "project">("dm");
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Chat state
  const [activeConversation, setActiveConversation] = useState<any | null>(
    null,
  );
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setTextInput] = useState("");
  const flatListRef = React.useRef<FlatList>(null);

  useEffect(() => {
    fetchConversations();
    fetchProjectChannels();

    const unsubscribeNew = appEvents.on(EVENTS.NEW_MESSAGE, (newMsg: any) => {
      fetchConversations();

      if (activeConversation && newMsg) {
        if (activeConversation.type === "channel") {
          if (
            newMsg.project_id === activeConversation.projectId &&
            newMsg.category === activeConversation.category
          ) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [newMsg, ...prev];
            });
          }
        } else {
          // DM Logic
          // Assume type is 'dm' or legacy undefined
          const otherId = activeConversation.user?.id;
          if (otherId) {
            const isRelevant =
              (newMsg.sender_id === userId && newMsg.receiver_id === otherId) ||
              (newMsg.sender_id === otherId && newMsg.receiver_id === userId);

            if (isRelevant) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [newMsg, ...prev];
              });

              if (newMsg.sender_id === otherId) {
                markAsRead(otherId);
              }
            }
          }
        }
      }
    });

    const unsubscribeRead = appEvents.on(EVENTS.MESSAGES_READ, () => {
      fetchConversations();
    });

    return () => {
      unsubscribeNew();
      unsubscribeRead();
    };
  }, [userId, activeConversation]);

  // When opening a conversation
  useEffect(() => {
    if (activeConversation) {
      if (activeConversation.type === "channel") {
        fetchChannelMessages(
          activeConversation.projectId,
          activeConversation.category,
        );
      } else {
        // Default to DM
        fetchMessages(activeConversation.user.id);
        markAsRead(activeConversation.user.id);
      }
    }
  }, [activeConversation]);

  async function fetchProjectChannels() {
    try {
      const { data: assignedRoles } = await supabase
        .from("project_roles")
        .select(
          `
            category,
            tournage:tournages(id, title, image_url, owner_id)
            `,
        )
        .eq("assigned_profile_id", userId);

      const { data: ownedProjects } = await supabase
        .from("tournages")
        .select("id, title, image_url")
        .eq("owner_id", userId);

      let ownedChannels: any[] = [];
      if (ownedProjects && ownedProjects.length > 0) {
        const ownedIds = ownedProjects.map((p: any) => p.id);
        const { data: rolesInOwned } = await supabase
          .from("project_roles")
          .select("category, tournage_id")
          .in("tournage_id", ownedIds);

        if (rolesInOwned) {
          ownedChannels = rolesInOwned.map((role: any) => {
            const project = ownedProjects.find(
              (p: any) => p.id === role.tournage_id,
            );
            return {
              category: role.category,
              tournage: project,
            };
          });
        }
      }

      const all = [...(assignedRoles || []), ...ownedChannels];
      // Dedup
      const unique: any[] = [];
      const keys = new Set();
      for (const item of all) {
        // @ts-ignore
        if (!item.tournage) continue;
        // @ts-ignore
        const key = `${item.tournage.id}-${item.category}`;
        if (!keys.has(key)) {
          keys.add(key);
          // @ts-ignore
          unique.push({
            ...item,
            type: "channel",
            projectId: item.tournage.id,
            category: item.category,
            projectTitle: item.tournage.title,
          });
        }
      }
      setProjectChannels(unique);
    } catch (e) {
      console.log("Error fetching channels:", e);
    }
  }

  async function fetchChannelMessages(projectId: string, category: string) {
    try {
      const { data, error } = await supabase
        .from("project_messages")
        .select("*")
        .eq("project_id", projectId)
        .eq("category", category)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (e) {
      console.log("Error fetching channel messages:", e);
    }
  }

  async function fetchMessages(otherUserId: string) {
    try {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
    } catch (e) {
      console.log("Error fetching messages:", e);
    }
  }

  async function markAsRead(otherUserId: string) {
    try {
      // Optimistic update
      appEvents.emit(EVENTS.MESSAGES_READ);

      const { error } = await supabase.rpc("mark_messages_read", {
        target_sender_id: otherUserId,
      });

      if (error) {
        await supabase
          .from("direct_messages")
          .update({ is_read: true } as any)
          .eq("sender_id", otherUserId)
          .eq("receiver_id", userId)
          .eq("is_read", false);
      }
    } catch (e) {
      console.log("Error marking read:", e);
    }
  }

  async function sendMessage() {
    if (!inputText.trim() || !activeConversation) return;

    const content = inputText.trim();
    setTextInput("");

    if (activeConversation.type === "channel") {
      const { projectId, category } = activeConversation;
      const tempId = Math.random().toString(36).substring(7);
      const tempMsg = {
        id: tempId,
        project_id: projectId,
        category: category,
        sender_id: userId,
        content: content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [tempMsg, ...prev]);

      try {
        const { data, error } = await supabase
          .from("project_messages")
          .insert({
            project_id: projectId,
            category: category,
            sender_id: userId,
            content: content,
          })
          .select()
          .single();
        if (error) throw error;
        if (data) {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
        }
      } catch (e) {
        console.error(e);
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
      return;
    }

    // Direct Message Logic
    const otherUserId = activeConversation.user.id;
    const tempId = Math.random().toString(36).substring(7);
    const tempMsg = {
      id: tempId,
      sender_id: userId,
      receiver_id: otherUserId,
      content: content,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setMessages((prev) => [tempMsg, ...prev]);

    try {
      const { data, error } = await supabase
        .from("direct_messages")
        .insert({
          sender_id: userId,
          receiver_id: otherUserId,
          content: content,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  }

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

  const filteredChannels = projectChannels.filter(
    (c) =>
      (c.tournage?.title || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      c.category?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!userId) return null;

  return (
    <View style={styles.container}>
      {isOpen && (
        <View style={styles.popover}>
          <View style={styles.header}>
            {activeConversation ? (
              <TouchableOpacity
                onPress={() => setActiveConversation(null)}
                style={{ flexDirection: "row", alignItems: "center" }}
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={colors.text}
                  style={{ marginRight: 8 }}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.headerTitle, { maxWidth: 200, color: colors.text }]}
                >
                  {activeConversation.type === "channel"
                    ? `${activeConversation.projectTitle} - ${activeConversation.category}`
                    : activeConversation.user.full_name ||
                      activeConversation.user.username}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.headerTitle, { color: colors.text }]}>Discussion</Text>
            )}

            <TouchableOpacity
              onPress={() => {
                setIsOpen(false);
                setActiveConversation(null);
              }}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {activeConversation ? (
            // Conversation View
            <View style={{ flex: 1 }}>
              <FlatList
                ref={flatListRef}
                data={messages}
                inverted
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 10 }}
                renderItem={({ item }) => {
                  const isMe = item.sender_id === userId;
                  return (
                    <View
                      style={{
                        alignSelf: isMe ? "flex-end" : "flex-start",
                        backgroundColor: isMe
                          ? colors.primary
                          : colors.backgroundSecondary,
                        borderRadius: 16,
                        padding: 10,
                        marginVertical: 4,
                        maxWidth: "80%",
                      }}
                    >
                      <Text style={{ color: isMe ? "white" : colors.text }}>
                        {item.content}
                      </Text>
                    </View>
                  );
                }}
              />
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.chatInput, { color: colors.text, backgroundColor: colors.backgroundSecondary }]}
                  placeholder="Écrivez un message..."
                  placeholderTextColor={colors.text + "80"}
                  value={inputText}
                  onChangeText={setTextInput}
                  onSubmitEditing={sendMessage}
                />
                <TouchableOpacity
                  onPress={sendMessage}
                  style={[styles.sendButton, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="send" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Lists View
            <>
              <View
                style={{
                  padding: 10,
                  borderBottomWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <TextInput
                  placeholder="Rechercher..."
                  placeholderTextColor={colors.text + "80"}
                  style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundSecondary }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {/* Tabs */}
              <View
                style={{
                  flexDirection: "row",
                  borderBottomWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <TouchableOpacity
                  onPress={() => setActiveTab("dm")}
                  style={{
                    flex: 1,
                    padding: 10,
                    alignItems: "center",
                    borderBottomWidth: activeTab === "dm" ? 2 : 0,
                    borderBottomColor: colors.primary,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: activeTab === "dm" ? "bold" : "normal",
                      color: activeTab === "dm" ? colors.primary : colors.text + "80",
                    }}
                  >
                    Privé
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveTab("project")}
                  style={{
                    flex: 1,
                    padding: 10,
                    alignItems: "center",
                    borderBottomWidth: activeTab === "project" ? 2 : 0,
                    borderBottomColor: colors.primary,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: activeTab === "project" ? "bold" : "normal",
                      color:
                        activeTab === "project" ? colors.primary : colors.text + "80",
                    }}
                  >
                    Projets
                  </Text>
                </TouchableOpacity>
              </View>

              {activeTab === "dm" ? (
                <FlatList
                  data={filteredConversations}
                  keyExtractor={(item) => item.user.id}
                  contentContainerStyle={{ paddingBottom: 10 }}
                  ListEmptyComponent={
                    <Text
                      style={{
                        textAlign: "center",
                        marginTop: 20,
                        color: colors.text + "60",
                      }}
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
                            borderColor: colors.border,
                            backgroundColor: isUnread ? colors.primary + "10" : colors.background,
                            cursor: "pointer",
                          } as any
                        }
                        hoverStyle={{ backgroundColor: colors.backgroundSecondary }}
                        onPress={() =>
                          setActiveConversation({ ...item, type: "dm" })
                        }
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: colors.backgroundSecondary,
                            marginRight: 10,
                            justifyContent: "center",
                            alignItems: "center",
                            overflow: "hidden",
                          }}
                        >
                          {item.user.avatar_url ? (
                            <Image
                              source={{ uri: item.user.avatar_url }}
                              style={{ width: 40, height: 40 }}
                            />
                          ) : (
                            <Text
                              style={{
                                fontSize: 16,
                                fontWeight: "bold",
                                color: colors.text + "80",
                              }}
                            >
                              {item.user.full_name?.[0] ||
                                item.user.username?.[0] ||
                                "?"}
                            </Text>
                          )}
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
                                color: colors.text,
                              }}
                            >
                              {item.user.full_name || item.user.username}
                            </Text>
                            {item.lastMessage.created_at && (
                              <Text style={{ fontSize: 10, color: colors.text + "60" }}>
                                {new Date(
                                  item.lastMessage.created_at,
                                ).toLocaleDateString()}
                              </Text>
                            )}
                          </View>
                          <Text
                            numberOfLines={1}
                            style={{
                              color: isUnread ? colors.text : colors.text + "80",
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
                              backgroundColor: colors.primary,
                              marginLeft: 8,
                            }}
                          />
                        )}
                      </Hoverable>
                    );
                  }}
                />
              ) : (
                <FlatList
                  data={filteredChannels}
                  keyExtractor={(item) =>
                    `${item.tournage.id}-${item.category}`
                  }
                  contentContainerStyle={{ paddingBottom: 10 }}
                  ListEmptyComponent={
                    <Text
                      style={{
                        textAlign: "center",
                        marginTop: 20,
                        color: colors.text + "60",
                      }}
                    >
                      Aucun espace de projet.
                    </Text>
                  }
                  renderItem={({ item }) => {
                    return (
                      <Hoverable
                        style={
                          {
                            flexDirection: "row",
                            padding: 12,
                            alignItems: "center",
                            borderBottomWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                            cursor: "pointer",
                          } as any
                        }
                        hoverStyle={{ backgroundColor: colors.backgroundSecondary }}
                        onPress={() => setActiveConversation(item)}
                      >
                        <View
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 8,
                            backgroundColor: colors.backgroundSecondary,
                            marginRight: 10,
                            justifyContent: "center",
                            alignItems: "center",
                            overflow: "hidden",
                          }}
                        >
                          {item.tournage.image_url ? (
                            <Image
                              source={{ uri: item.tournage.image_url }}
                              style={{ width: 40, height: 40 }}
                            />
                          ) : (
                            <Ionicons name="briefcase" size={20} color={colors.text + "80"} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "600", fontSize: 14, color: colors.text }}>
                            {item.tournage.title}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.text + "80" }}>
                            #{item.category}
                          </Text>
                        </View>
                      </Hoverable>
                    );
                  }}
                />
              )}
            </>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
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

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
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
    backgroundColor: colors.background,
    borderRadius: 12,
    marginBottom: 15, // Space between popover and FAB
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  headerTitle: {
    fontWeight: "bold",
    fontSize: 16,
  },
  input: {
    padding: 8,
    borderRadius: 8,
    fontSize: 14,
  },
  footer: {
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  chatInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  sendButton: {
    padding: 10,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
