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
import { GlobalStyles } from "@/constants/Styles";
import Colors from "@/constants/Colors";

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
  const { id, category } = useGlobalSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [keyboardVerticalOffset, setKeyboardVerticalOffset] = useState(0);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (Platform.OS === "ios") {
      setKeyboardVerticalOffset(90);
    } else {
      setKeyboardVerticalOffset(0);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id);
    });
    fetchMessages();

    const projectId = Array.isArray(id) ? id[0] : id;
    const catStr = Array.isArray(category) ? category[0] : category;

    console.log(`Subscribing to chat:${projectId}:${catStr}`);

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
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  }

  async function addNewMessage(msgId: string) {
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
    setInputText("");

    const { error } = await supabase.from("project_messages" as any).insert({
      project_id: id,
      category: category,
      sender_id: userId,
      content: content,
    });

    if (error) {
      Alert.alert("Erreur", error.message);
      setInputText(content);
    }
    setSending(false);
  }

  const categoryStr = Array.isArray(category) ? category[0] : category;
  if (!categoryStr) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: Colors.light.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </SafeAreaView>
    );
  }

  const categoryName = categoryStr.toUpperCase();
  const themeColor = CATEGORY_COLORS[categoryStr] || Colors.light.tint;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: Colors.light.background }}
      edges={["bottom", "left", "right"]}
    >
      <Stack.Screen
        options={{
          headerTitle: `Équipe ${categoryName}`,
          headerTintColor: themeColor,
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: "System", fontWeight: "bold" },
          headerStyle: { backgroundColor: Colors.light.background },
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
                        : { backgroundColor: Colors.light.backgroundSecondary },
                    ]}
                  >
                    {!isMe && (
                      <Text
                        style={{ fontSize: 10, color: Colors.light.tabIconDefault, marginBottom: 2 }}
                      >
                        {item.sender?.full_name || "Inconnu"}
                      </Text>
                    )}
                    <Text
                      style={[
                        styles.msgText,
                        isMe ? { color: "white" } : { color: Colors.light.text },
                      ]}
                    >
                      {item.content}
                    </Text>
                    <Text
                      style={[
                        styles.dateText,
                        isMe
                          ? { color: "rgba(255,255,255,0.7)" }
                          : { color: Colors.light.tabIconDefault },
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
                  color: Colors.light.tabIconDefault,
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
            placeholderTextColor={Colors.light.tabIconDefault}
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
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100,
    color: Colors.light.text,
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
