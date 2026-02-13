import ClapLoading from "@/components/ClapLoading";
import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ConversationListProps {
  selectedUserId?: string;
  onSelect?: (userId: string) => void;
}

export default function ConversationList({ selectedUserId, onSelect }: ConversationListProps) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileResults, setProfileResults] = useState<any[]>([]);
  const [messageHistoryResults, setMessageHistoryResults] = useState<any[]>([]);

  useEffect(() => {
    fetchConversations();

    const unsubscribeNew = appEvents.on(EVENTS.NEW_MESSAGE, () => {
      fetchConversations();
    });

    const unsubscribeRead = appEvents.on(EVENTS.MESSAGES_READ, () => {
      fetchConversations();
    });

    const onWebFocus = () => {
      if (Platform.OS === "web") {
        fetchConversations();
      }
    };
    if (Platform.OS === "web") {
      window.addEventListener("focus", onWebFocus);
    }

    return () => {
      unsubscribeNew();
      unsubscribeRead();
      if (Platform.OS === "web") {
        window.removeEventListener("focus", onWebFocus);
      }
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const query = searchQuery.trim();
      if (query.length > 1) {
        searchProfiles(query);
        searchMessages(query);
      } else {
        setProfileResults([]);
        setMessageHistoryResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, conversations, currentUserId]);

  const searchProfiles = async (query: string) => {
    if (!currentUserId) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`)
        .neq("id", currentUserId)
        .limit(5);

      if (data) {
        const existingIds = new Set(conversations.map((c) => c.user.id));
        setProfileResults(data.filter((p) => !existingIds.has(p.id)));
      }
    } catch (err) {
      console.error("Error searching profiles:", err);
    }
  };

  const searchMessages = async (query: string) => {
    if (!currentUserId) return;
    try {
      const { data } = await supabase
        .from("direct_messages")
        .select(`
          id, 
          content, 
          created_at, 
          sender_id, 
          receiver_id
        `)
        .ilike("content", `%${query}%`)
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        // Find users for these messages
        const otherUserIds = data.map(m => m.sender_id === currentUserId ? m.receiver_id : m.sender_id);
        const { data: users } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, username")
          .in("id", Array.from(new Set(otherUserIds)));

        const results = data.map(m => {
          const otherId = m.sender_id === currentUserId ? m.receiver_id : m.sender_id;
          return {
            ...m,
            user: users?.find(u => u.id === otherId)
          };
        }).filter(r => r.user);

        setMessageHistoryResults(results);
      }
    } catch (err) {
      console.error("Error searching messages:", err);
    }
  };

  async function fetchConversations() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const userId = session.user.id;
      setCurrentUserId(userId);

      // Fetch conversations and blocks in parallel to speed up loading
      const [convsRes, blocksRes] = await Promise.all([
        supabase.rpc("get_conversations"),
        supabase
          .from("user_blocks")
          .select("blocker_id, blocked_id")
          .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)
      ]);

      if (convsRes.error) throw convsRes.error;

      const convs = convsRes.data || [];
      const blocks = blocksRes.data || [];

      const blockedIds = new Set(
        blocks.map((b: any) =>
          b.blocker_id === userId ? b.blocked_id : b.blocker_id,
        ),
      );

      const formattedConversations = convs
        .filter((c: any) => !blockedIds.has(c.conversation_user_id))
        .map((c: any) => ({
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

      setConversations(formattedConversations);
    } catch (e) {
      console.error("Error fetching conversations:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const renderItem = ({ item }: { item: any }) => {
    if (item.itemType === "header") {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{item.title}</Text>
        </View>
      );
    }

    const isSelected = selectedUserId === item.user.id;
    const isUnread =
      item.itemType === "conversation" &&
      !item.lastMessage?.is_read &&
      item.lastMessage?.receiver_id === currentUserId;

    const displayMessage =
      item.itemType === "message"
        ? item.content
        : item.itemType === "conversation"
        ? (item.lastMessage?.sender_id === currentUserId ? "Vous: " : "") + (item.lastMessage?.content || "")
        : "@" + (item.user.username || "user");

    const displayDate =
      item.itemType === "conversation"
        ? new Date(item.lastMessage.created_at).toLocaleDateString()
        : item.itemType === "message"
        ? new Date(item.created_at).toLocaleDateString()
        : null;

    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.selectedCard]}
        onPress={() => {
          if (onSelect) {
            onSelect(item.user.id);
          } else {
            router.push({
              pathname: "/direct-messages/[id]",
              params: { id: item.user.id },
            });
          }
        }}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri:
                item.user.avatar_url ||
                "https://ui-avatars.com/api/?name=" +
                  (item.user.full_name || item.user.username || "User"),
            }}
            style={styles.avatar}
          />
          {isUnread && <View style={styles.unreadBadge} />}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <Text
              style={[styles.name, isSelected && styles.selectedText]}
              numberOfLines={1}
            >
              {item.user.full_name || item.user.username}
            </Text>
            {displayDate && <Text style={[styles.date, isSelected && styles.selectedTextSub]}>{displayDate}</Text>}
          </View>
          <Text
            style={[
              styles.message,
              isUnread && styles.unreadMessage,
              isSelected && styles.selectedTextSub,
            ]}
            numberOfLines={1}
          >
            {displayMessage}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const nameMatch =
      (c.user.full_name || "").toLowerCase().includes(searchLower) ||
      (c.user.username || "").toLowerCase().includes(searchLower);
    const contentMatch = (c.lastMessage.content || "")
      .toLowerCase()
      .includes(searchLower);
    return nameMatch || contentMatch;
  });

  const listData = [
    ...filteredConversations.map((c) => ({ ...c, itemType: "conversation" })),
    ...(profileResults.length > 0
      ? [{ itemType: "header", title: "Nouveaux contacts" }]
      : []),
    ...profileResults.map((p) => ({ user: p, itemType: "profile" })),
    ...(messageHistoryResults.length > 0
      ? [{ itemType: "header", title: "Messages trouvés" }]
      : []),
    ...messageHistoryResults.map((m) => ({ ...m, itemType: "message" })),
  ];

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ClapLoading size={40} color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={18}
          color={colors.tabIconDefault}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une discussion ou un message..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.tabIconDefault}
          clearButtonMode="while-editing"
        />
      </View>
      <FlatList
        data={listData}
        keyExtractor={(item, index) =>
          item.itemType === "header"
            ? `header-${item.title}`
            : `${item.itemType}-${item.user?.id || item.id}-${index}`
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.primary}
            onRefresh={() => {
              setRefreshing(true);
              fetchConversations();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {searchQuery ? "Aucun résultat trouvé." : "Aucune conversation."}
            </Text>
          </View>
        }
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    searchContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    searchIcon: {
      marginRight: 10,
    },
    searchInput: {
      flex: 1,
      height: 36,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 14,
      color: colors.text,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    sectionHeader: {
      backgroundColor: colors.backgroundSecondary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sectionHeaderText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text + "80",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    listContent: {
      flexGrow: 1,
      paddingBottom: 20,
    },
    card: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    selectedCard: {
      backgroundColor: colors.primary,
      borderBottomColor: colors.primary,
    },
    avatarContainer: {
      position: "relative",
      marginRight: 12,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.backgroundSecondary,
    },
    unreadBadge: {
      position: "absolute",
      right: -2,
      top: -2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: colors.primary,
      borderWidth: 2,
      borderColor: colors.background,
      zIndex: 10,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    name: {
      fontWeight: "600",
      fontSize: 15,
      color: colors.text,
      flex: 1,
      marginRight: 8,
    },
    selectedText: {
      color: "white",
    },
    date: {
      fontSize: 11,
      color: colors.text + "80",
    },
    message: {
      fontSize: 13,
      color: colors.text + "99",
    },
    unreadMessage: {
      fontWeight: "700",
      color: colors.text,
    },
    selectedTextSub: {
      color: "rgba(255,255,255,0.8)",
    },
    emptyText: {
      fontSize: 14,
      color: colors.text + "80",
      textAlign: "center",
      marginTop: 40,
    },
  });
}
