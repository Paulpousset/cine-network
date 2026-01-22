import { Ionicons } from "@expo/vector-icons";
import { Stack, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../../lib/supabase";

const CATEGORY_COLORS: Record<string, string> = {
  realisateur: "#E91E63",
  acteur: "#9C27B0",
  image: "#2196F3",
  son: "#FF9800",
  production: "#4CAF50",
  hmc: "#E91E63",
  deco: "#795548",
  post_prod: "#607D8B",
  technicien: "#607D8B",
};

export default function ChannelChat() {
  const { id, category } = useGlobalSearchParams(); // Changed to Global
  const router = useRouter();

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [keyboardVerticalOffset, setKeyboardVerticalOffset] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  // Pour Android, ajuster le offset si header natif
  useEffect(() => {
    if (Platform.OS === "ios") {
      setKeyboardVerticalOffset(90);
    } else {
      setKeyboardVerticalOffset(0); // Android gère souvent mieux le resize seul
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id);
    });
    fetchMessages();

    // Fix potential ID array issue
    const projectId = Array.isArray(id) ? id[0] : id;
    const catStr = Array.isArray(category) ? category[0] : category;

    console.log(`Subscribing to chat:${projectId}:${catStr}`);

    // Realtime subscription
    const channel = supabase
      .channel(`chat:${projectId}:${catStr}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_messages",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          console.log("New message received!", payload);
          // Verify category match just in case
          if (payload.new.category === catStr) {
            addNewMessage(payload.new.id);
          }
        },
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, category]);

  async function fetchMessages() {
    if (!id || !category) return;
    setLoading(true);
    // Note: Assuming 'project_messages' table exists
    const { data, error } = await supabase
      .from("project_messages" as any)
      .select(
        `
        *,
        sender:profiles (
          id,
          full_name,
          username,
          avatar_url
        )
      `,
      )
      .eq("project_id", id)
      .eq("category", category)
      .order("created_at", { ascending: false });

    if (error) {
      console.log("Chat fetch error:", error);
      // Alert.alert("Info", "La messagerie n'est pas encore active (Table manquante ?)");
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  }

  async function addNewMessage(msgId: string) {
    // Fetch the full message with profile
    const { data } = await supabase
      .from("project_messages" as any)
      .select(
        `
            *,
            sender:profiles (
            id,
            full_name,
            username,
            avatar_url
            )
        `,
      )
      .eq("id", msgId)
      .single();

    if (data) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev;
        return [data, ...prev];
      });
    }
  }

  async function sendMessage() {
    if (!inputText.trim() || !userId) return;
    setSending(true);
    const content = inputText.trim();
    setInputText(""); // Optimistic clear

    const { error } = await supabase.from("project_messages" as any).insert({
      project_id: id,
      category: category,
      sender_id: userId,
      content: content,
    });

    if (error) {
      Alert.alert("Erreur", error.message);
      setInputText(content); // Restore if failed
    }
    setSending(false);
  }

  const categoryStr = Array.isArray(category) ? category[0] : category;
  if (!categoryStr) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "white",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#841584" />
      </SafeAreaView>
    );
  }

  const categoryName = categoryStr.toUpperCase();
  const themeColor = CATEGORY_COLORS[categoryStr] || "#666";

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "white" }}
      edges={["bottom", "left", "right"]}
    >
      <Stack.Screen
        options={{
          headerTitle: `Équipe ${categoryName}`,
          headerTintColor: themeColor,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "white" },
          headerLeft: (props) => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginRight: 15, padding: 5 }}
            >
              <Ionicons name="arrow-back" size={24} color={themeColor} />
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        {loading ? (
          <ActivityIndicator style={{ marginTop: 50 }} color={themeColor} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            // To have latest at bottom: inverted true, data ordered desc
            inverted
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 15, paddingBottom: 20 }}
            renderItem={({ item }) => {
              const isMe = item.sender_id === userId;
              return (
                <View
                  style={[
                    styles.msgRow,
                    isMe ? styles.msgRowMe : styles.msgRowOther,
                  ]}
                >
                  {!isMe && (
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: themeColor + "40" },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "bold",
                          color: themeColor,
                        }}
                      >
                        {item.sender?.full_name?.charAt(0) || "?"}
                      </Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      isMe
                        ? { backgroundColor: themeColor }
                        : { backgroundColor: "#f0f0f0" },
                    ]}
                  >
                    {!isMe && (
                      <Text
                        style={{ fontSize: 10, color: "#666", marginBottom: 2 }}
                      >
                        {item.sender?.full_name || "Inconnu"}
                      </Text>
                    )}
                    <Text
                      style={[
                        styles.msgText,
                        isMe ? { color: "white" } : { color: "#333" },
                      ]}
                    >
                      {item.content}
                    </Text>
                    <Text
                      style={[
                        styles.dateText,
                        isMe
                          ? { color: "rgba(255,255,255,0.7)" }
                          : { color: "#999" },
                      ]}
                    >
                      {new Date(item.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text
                style={{
                  textAlign: "center",
                  color: "#ccc",
                  marginTop: 50,
                  transform: [{ scaleY: -1 }],
                }}
              >
                Début de la conversation...
              </Text>
            }
          />
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Votre message..."
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            disabled={sending || !inputText.trim()}
            onPress={sendMessage}
            style={[styles.sendButton, { backgroundColor: themeColor }]}
          >
            {sending ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // header removed
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "white",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  msgRow: {
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  msgRowMe: {
    justifyContent: "flex-end",
  },
  msgRowOther: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  bubble: {
    padding: 10,
    borderRadius: 16,
    maxWidth: "75%",
  },
  msgText: {
    fontSize: 16,
  },
  dateText: {
    fontSize: 10,
    alignSelf: "flex-end",
    marginTop: 4,
  },
});
