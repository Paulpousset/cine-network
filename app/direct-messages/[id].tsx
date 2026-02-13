import ClapLoading from "@/components/ClapLoading";
import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";
import { NotificationService } from "@/services/NotificationService";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image"; // Better image component
import {
  Stack,
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DirectMessageChat() {
  const { id } = useLocalSearchParams(); // Other user ID
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const { user, profile: currentUser } = useUser();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setTextInput] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const currentUserId = user?.id;
  const currentUserProfile = currentUser;

  const isFocusedRef = useRef(false);

  // Mark messages as read when focusing this screen
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      markAllAsRead();

      return () => {
        isFocusedRef.current = false;
      };
    }, [id, currentUserId]),
  );

  async function markAllAsRead() {
    const myId = currentUserId;

    if (!myId || !id) {
      console.log("markAllAsRead: Missing IDs", { myId, id });
      return;
    }

    try {
      // TRIGGER REFRESH IMMEDIATELY to clear notifications
      // This is crucial for UI responsiveness
      appEvents.emit(EVENTS.MESSAGES_READ);

      // First, check how many unread messages we have (optional check)
      const { data: unreadBefore } = await supabase
        .from("direct_messages")
        .select("id")
        .eq("sender_id", id)
        .eq("receiver_id", myId)
        .eq("is_read", false);

      if (!unreadBefore || unreadBefore.length === 0) {
        return; // Nothing to update
      }

      // Try using the robust RPC function first (server-side logic)
      const { error: rpcError } = await supabase.rpc("mark_messages_read", {
        target_sender_id: id,
      });

      if (rpcError) {
        console.log(
          "RPC mark_messages_read failed, falling back to direct update",
          rpcError,
        );

        // Fallback to direct update (which should now work thanks to RLS fix)
        const { error } = await supabase
          .from("direct_messages")
          .update({ is_read: true } as any)
          .eq("sender_id", id)
          .eq("receiver_id", myId)
          .eq("is_read", false);

        if (error) throw error;
      }

      // Emit again to be sure final state is synced
      appEvents.emit(EVENTS.MESSAGES_READ);
    } catch (e) {
      console.log("Error marking messages as read:", e);
    }
  }

  useEffect(() => {
    setup();

    // Refresh when app comes back to foreground (especially important on Web)
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        markAllAsRead();
        if (currentUserId) fetchMessages(currentUserId);
      }
    });

    // Special handling for Web focus
    const onWebFocus = () => {
      if (Platform.OS === "web") {
        markAllAsRead();
        if (currentUserId) fetchMessages(currentUserId);
      }
    };
    if (Platform.OS === "web") {
      window.addEventListener("focus", onWebFocus);
    }

    return () => {
      subscription.remove();
      if (Platform.OS === "web") {
        window.removeEventListener("focus", onWebFocus);
      }
    };
  }, [id]); // Only depend on id to avoid infinite loops with setup()

  useEffect(() => {
    if (!id || !currentUserId) return;

    // Listen for new messages via GlobalRealtimeListener
    const unsubscribeNew = appEvents.on(EVENTS.NEW_MESSAGE, (newMsg: any) => {
      // If we didn't receive the payload (legacy event call), we can't do smart update
      if (!newMsg) return;

      // Check if this message belongs to this conversation
      const isRelevant =
        (newMsg.sender_id === currentUserId && newMsg.receiver_id === id) ||
        (newMsg.sender_id === id && newMsg.receiver_id === currentUserId);

      if (!isRelevant) return;

      console.log("[Chat] Message event received:", newMsg.id);

      setMessages((prev) => {
        // If it exists, update it (e.g. read status change)
        if (prev.some((m) => m.id === newMsg.id)) {
          return prev.map((m) => (m.id === newMsg.id ? newMsg : m));
        }
        // If not, insert it
        return [newMsg, ...prev];
      });

      // Mark as read immediately if it's a new incoming message and focused
      if (
        newMsg.sender_id === id &&
        isFocusedRef.current &&
        newMsg.is_read === false
      ) {
        console.log("[Chat] Marking incoming message as read immediately");
        supabase
          .rpc("mark_messages_read", { target_sender_id: id })
          .then(() => {
            appEvents.emit(EVENTS.MESSAGES_READ);
          });
      }
    });

    return () => {
      unsubscribeNew();
    };
  }, [id, currentUserId]);

  useEffect(() => {
    if (currentUserId && id) {
      setup();
    }
  }, [currentUserId, id]);
currentUserId
  async function setup() {
    if (!currentUserId) return;

    // Fetch other user details
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();
    setOtherUser(profile);

    await fetchMessages(currentUserId);
  }

  async function fetchMessages(myId: string) {
    try {
      if (messages.length === 0) {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${myId},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${myId})`,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);

      // Mark as read - use a more direct approach
      markAllAsRead();
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!inputText.trim() || !currentUserId) return;

    const content = inputText.trim();
    setTextInput("");

    // Optimistic Update
    const tempId = Math.random().toString(36).substring(7);
    const tempMsg = {
      id: tempId,
      sender_id: currentUserId,
      receiver_id: id,
      content: content,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setMessages((prev) => [tempMsg, ...prev]);

    try {
      const { data, error } = await supabase
        .from("direct_messages")
        .insert({
          sender_id: currentUserId,
          receiver_id: id,
          content: content,
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp message with real one to get correct ID and DB state
      if (data) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));

        // Send push notification to recipient
        NotificationService.sendDirectMessageNotification({
          receiverId: id as string,
          senderName:
            currentUserProfile?.full_name ||
            currentUserProfile?.username ||
            "Nouveau message",
          content: content,
          chatId: currentUserId!,
        });
      }

      // En répondant, on marque forcément tout comme lu
      markAllAsRead();
    } catch (e) {
      console.error(e);
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      Alert.alert("Erreur", "Impossible d'envoyer le message");
    }
  }

  // Helper to render the custom header on Web
  const CustomWebHeader = () => {
    if (Platform.OS !== "web") return null;

    return (
      <View style={styles.webHeader}>
        {otherUser?.avatar_url ? (
          <Image
            source={{ uri: otherUser.avatar_url }}
            style={styles.avatarLarge}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Ionicons
            name="person-circle-outline"
            size={40}
            color={colors.tabIconDefault}
          />
        )}
        <View>
          <Text style={styles.webHeaderText}>
            {otherUser?.full_name || otherUser?.username || "Chat"}
          </Text>
          {otherUser?.role && (
            <Text style={styles.webHeaderSubtitle}>
              {otherUser.role.toUpperCase()}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              {otherUser?.avatar_url ? (
                <Image
                  source={{ uri: otherUser.avatar_url }}
                  style={styles.avatarSmall}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <Ionicons
                  name="person-circle-outline"
                  size={35}
                  color={colors.tabIconDefault}
                />
              )}
              <View>
                <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>
                  {otherUser?.full_name || otherUser?.username || "Chat"}
                </Text>
                {otherUser?.role && (
                  <Text style={{ fontSize: 10, color: colors.text + "80" }}>
                    {otherUser.role.toUpperCase()}
                  </Text>
                )}
              </View>
            </View>
          ),
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/direct-messages");
                }
              }}
              style={{ padding: 10, marginLeft: -5 }}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
          headerTintColor: colors.primary,
          headerBackTitle: "", // Hide back title text on iOS
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { color: colors.text },
          // On Web, default header is often hidden or looks bad in this sidebar layout
          // We can force it shown, OR we can hide it and render our own View.
          // Given the user report "I don't see who I am writing to",
          // and app/_layout.tsx sets headerShown: false for web usually,
          // Let's force it hidden here for Web and use our CustomWebHeader.
          headerShown: Platform.OS !== "web",
        }}
      />

      <CustomWebHeader />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 90}
        style={{ flex: 1 }}
      >
        {loading ? (
          <ClapLoading
            style={{ flex: 1 }}
            color={colors.primary}
            size={50}
          />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            inverted
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 15 }}
            renderItem={({ item }) => {
              const isMe = item.sender_id === currentUserId;
              return (
                <View
                  style={[
                    styles.bubble,
                    isMe ? styles.bubbleMe : styles.bubbleOther,
                  ]}
                >
                  <Text
                    style={[
                      styles.msgText,
                      isMe ? { color: "white" } : { color: colors.text },
                    ]}
                  >
                    {item.content}
                  </Text>
                  <Text
                    style={[
                      styles.dateText,
                      isMe
                        ? { color: "rgba(255,255,255,0.7)" }
                        : { color: colors.text + "80" },
                    ]}
                  >
                    {new Date(item.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              );
            }}
          />
        )}

        <View
          style={[
            styles.inputContainer,
            { paddingBottom: insets.bottom || 10 },
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="Votre message..."
            placeholderTextColor={colors.text + "80"}
            value={inputText}
            onChangeText={setTextInput}
            multiline
            returnKeyType="send"
            blurOnSubmit={true}
            onSubmitEditing={() => {
              if (inputText.trim()) {
                sendMessage();
              }
            }}
            onKeyPress={(e) => {
              // Sur le WEB : "Entrée" envoie le message, "Shift+Entrée" fait un saut de ligne
              if (Platform.OS === "web") {
                // @ts-ignore: nativeEvent can correspond to web KeyboardEvent
                if (e.nativeEvent.key === "Enter" && !e.shiftKey) {
                  e.preventDefault(); // Empêcher le saut de ligne
                  if (inputText.trim()) {
                    sendMessage();
                  }
                }
              }
            }}
          />
          <TouchableOpacity
            onPress={sendMessage}
            style={{ marginLeft: 10 }}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={24}
              color={inputText.trim() ? colors.primary : colors.text + "40"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    bubble: {
      maxWidth: "80%",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 16,
      marginBottom: 4,
    },
    bubbleMe: {
      alignSelf: "flex-end",
      backgroundColor: colors.primary,
      borderBottomRightRadius: 2,
    },
    bubbleOther: {
      alignSelf: "flex-start",
      backgroundColor: isDark ? colors.backgroundSecondary : "#E5E5EA",
      borderBottomLeftRadius: 2,
    },
    msgText: {
      fontSize: 16,
    },
    dateText: {
      fontSize: 10,
      marginTop: 2,
      alignSelf: "flex-end",
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      padding: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    input: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 10,
      maxHeight: 100,
      minHeight: 40,
      color: colors.text,
    },
    webHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
      gap: 12,
    },
    webHeaderText: {
      fontSize: 17,
      fontWeight: "700",
      color: colors.text,
    },
    webHeaderSubtitle: {
      fontSize: 12,
      color: colors.text + "80",
      fontWeight: "500",
    },
    avatarLarge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.backgroundSecondary,
    },
    avatarSmall: {
      width: 35,
      height: 35,
      borderRadius: 17.5,
      backgroundColor: colors.backgroundSecondary,
    }
  });
}
