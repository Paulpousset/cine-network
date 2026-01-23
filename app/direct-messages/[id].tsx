import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function DirectMessageChat() {
  const { id } = useLocalSearchParams(); // Other user ID
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setTextInput] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setup();
    
    // Realtime subscription
    const channel = supabase
      .channel("dm_chat")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        (payload) => {
          const newMsg = payload.new;
          // Check if this message belongs to this conversation
          if (
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === id) ||
            (newMsg.sender_id === id && newMsg.receiver_id === currentUserId)
          ) {
            setMessages((prev) => [newMsg, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, currentUserId]);

  async function setup() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    setCurrentUserId(session.user.id);

    // Fetch other user details
    const { data: user } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();
    setOtherUser(user);

    await fetchMessages(session.user.id);
  }

  async function fetchMessages(myId: string) {
    try {
      const { data, error } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${myId},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${myId})`
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMessages(data || []);
      
      // Mark as read (optional, simplified)
      // await supabase.from('direct_messages').update({ is_read: true }).eq('sender_id', id).eq('receiver_id', myId);
      
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

    try {
      const { error } = await supabase.from("direct_messages").insert({
        sender_id: currentUserId,
        receiver_id: id,
        content: content,
      });

      if (error) throw error;
      // Realtime will handle the update, but for instant feedback we could optimistically add it
      // Actually, let's rely on realtime or fetch to avoid duplicates if we add logic for that.
      // For smoothness, we can optimistically add:
      /*
      const fakeMsg = {
          id: Date.now().toString(),
          sender_id: currentUserId,
          receiver_id: id,
          content: content,
          created_at: new Date().toISOString()
      };
      setMessages(prev => [fakeMsg, ...prev]);
      */
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }}>
      <Stack.Screen
        options={{
          headerTitle: otherUser?.full_name || otherUser?.username || "Chat",
          headerTintColor: Colors.light.tint,
          headerBackTitleVisible: false,
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={{ flex: 1 }}
      >
        {loading ? (
          <ActivityIndicator
            style={{ flex: 1 }}
            color={Colors.light.primary}
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
                      isMe ? { color: "white" } : { color: Colors.light.text },
                    ]}
                  >
                    {item.content}
                  </Text>
                  <Text
                    style={[
                      styles.dateText,
                      isMe ? { color: "rgba(255,255,255,0.7)" } : { color: "#999" },
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

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Votre message..."
            value={inputText}
            onChangeText={setTextInput}
            multiline
          />
          <TouchableOpacity
            onPress={sendMessage}
            style={{ marginLeft: 10 }}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={24}
              color={inputText.trim() ? Colors.light.primary : "#ccc"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  bubbleMe: {
    alignSelf: "flex-end",
    backgroundColor: Colors.light.primary,
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    alignSelf: "flex-start",
    backgroundColor: "#E5E5EA",
    borderBottomLeftRadius: 2,
  },
  msgText: {
    fontSize: 16,
  },
  dateText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    backgroundColor: "white",
  },
  input: {
    flex: 1,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
  },
});
