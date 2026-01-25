import ClapLoading from "@/components/ClapLoading";
import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import {
    Stack,
    useGlobalSearchParams,
    useLocalSearchParams,
    useRouter,
} from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import {
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

// --- Extracted Chat Component (Original Logic) ---
function ChatView({
  projectId,
  category,
}: {
  projectId: string;
  category: string;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id);
    });
    fetchMessages();

    console.log(`Subscribing to chat:${projectId}:${category}`);
    const channel = supabase
      .channel(`chat:${projectId}:${category}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "project_messages",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.new.category === category) {
            addNewMessage(payload.new.id);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, category]);

  async function fetchMessages() {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_messages" as any)
      .select(`*, sender:profiles(id, full_name, avatar_url)`)
      .eq("project_id", projectId)
      .eq("category", category)
      .order("created_at", { ascending: true });

    if (error) console.error(error);
    else setMessages(data || []);
    setLoading(false);
  }

  async function addNewMessage(msgId: string) {
    const { data, error } = await supabase
      .from("project_messages" as any)
      .select(`*, sender:profiles(id, full_name, avatar_url)`)
      .eq("id", msgId)
      .single();

    if (!error && data) {
      setMessages((prev) => [...prev, data]);
    }
  }

  async function sendMessage() {
    if (!inputText.trim() || !userId) return;
    const text = inputText.trim();
    setInputText("");

    const { error } = await supabase.from("project_messages").insert({
      project_id: projectId,
      category: category,
      sender_id: userId,
      content: text,
    });

    if (error) {
      Alert.alert("Erreur", "Impossible d'envoyer le message");
      setInputText(text);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      {loading ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ClapLoading />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          renderItem={({ item }) => {
            const isMe = item.sender_id === userId;
            return (
              <View
                style={[
                  styles.messageBubble,
                  isMe ? styles.myMessage : styles.theirMessage,
                ]}
              >
                {!isMe && (
                  <Text style={styles.senderName}>
                    {item.sender?.full_name}
                  </Text>
                )}
                <Text style={isMe ? styles.myText : styles.theirText}>
                  {item.content}
                </Text>
              </View>
            );
          }}
        />
      )}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Écrivez un message..."
          placeholderTextColor="#999"
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function FilesView({
  projectId,
  category,
}: {
  projectId: string;
  category: string;
}) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, [projectId, category]);

  async function fetchFiles() {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_files" as any)
      .select("*")
      .eq("project_id", projectId)
      .eq("category", category)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching files:", error);
    } else {
      setFiles(data || []);
    }
    setLoading(false);
  }

  async function pickAndUploadFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: "*/*",
      });

      if (result.canceled) return;

      const file = result.assets[0];
      if (!file) return;

      setUploading(true);

      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: "base64",
      });

      const fileName = `${Date.now()}_${file.name.replace(/\s/g, "_")}`;
      const filePath = `${projectId}/${category}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("project_files")
        .upload(filePath, decode(base64), {
          contentType: file.mimeType || "application/octet-stream",
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: userData } = await supabase.auth.getSession();
      const userId = userData.session?.user.id;
      if (!userId) throw new Error("Not authenticated");

      const { error: dbError } = await supabase
        .from("project_files" as any)
        .insert({
          project_id: projectId,
          category,
          uploader_id: userId,
          name: file.name,
          file_path: filePath,
          file_type: file.mimeType,
          size: file.size,
        });

      if (dbError) throw dbError;

      Alert.alert("Succès", "Fichier ajouté");
      fetchFiles();
    } catch (err: any) {
      console.error(err);
      Alert.alert("Erreur", err.message);
    } finally {
      setUploading(false);
    }
  }

  async function openFile(file: any) {
    try {
      const { data } = await supabase.storage
        .from("project_files")
        .createSignedUrl(file.file_path, 3600);

      if (data?.signedUrl) {
        await WebBrowser.openBrowserAsync(data.signedUrl);
      } else {
        Alert.alert("Erreur", "Impossible d'ouvrir le fichier");
      }
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'ouvrir le fichier");
    }
  }

  function formatSize(bytes: number) {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  return (
    <View style={{ flex: 1, padding: 15 }}>
      {uploading && (
        <View style={fileStyles.uploadingOverlay}>
          <ClapLoading />
          <Text style={{ marginTop: 10 }}>Envoi en cours...</Text>
        </View>
      )}

      <TouchableOpacity
        style={fileStyles.uploadButton}
        onPress={pickAndUploadFile}
      >
        <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
        <Text style={fileStyles.uploadButtonText}>Ajouter un fichier</Text>
      </TouchableOpacity>

      {loading ? (
        <ClapLoading />
      ) : (
        <FlatList
          data={files}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 50 }}
          ListEmptyComponent={
            <Text style={styles.placeholderText}>Aucun fichier partagé</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={fileStyles.fileCard}
              onPress={() => openFile(item)}
            >
              <View style={fileStyles.fileIcon}>
                <Ionicons name="document-text" size={28} color="#666" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={fileStyles.fileName}>{item.name}</Text>
                <Text style={fileStyles.fileInfo}>
                  {formatSize(item.size)} •{" "}
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Ionicons name="eye-outline" size={24} color="#2196F3" />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// --- Main Dashboard Component ---

export default function ChannelSpace() {
  const local = useLocalSearchParams();
  const global = useGlobalSearchParams();
  // Robust ID retrieval
  const id = (local.id as string) || (global.id as string);
  const category = (local.category as string) || (global.category as string);

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"chat" | "files" | "tools">(
    (local.tab as any) || "chat",
  );

  useEffect(() => {
    if (local.tab) {
      setActiveTab(local.tab as any);
    }
  }, [local.tab]);

  const isProduction = category === "production";

  const renderTabButton = (
    tab: typeof activeTab,
    label: string,
    icon: keyof typeof Ionicons.glyphMap,
  ) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
      onPress={() => setActiveTab(tab)}
    >
      <Ionicons
        name={icon}
        size={20}
        color={activeTab === tab ? Colors.light.tint : "#666"}
      />
      <Text
        style={[styles.tabLabel, activeTab === tab && styles.activeTabLabel]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#f8f9fa" }}
      edges={["top"]}
    >
      <Stack.Screen
        options={{
          headerTitle: `Espace ${(category || "").toUpperCase()}`,
        }}
      />

      {/* Tabs Switcher */}
      <View style={styles.tabsHeader}>
        {renderTabButton("chat", "Discussion", "chatbubbles-outline")}
        {renderTabButton("files", "Fichiers", "folder-open-outline")}
        {isProduction &&
          renderTabButton("tools", "Outils", "construct-outline")}
      </View>

      {/* Content Area */}
      <View style={{ flex: 1 }}>
        {activeTab === "chat" && (
          <ChatView projectId={id} category={category} />
        )}

        {activeTab === "files" && (
          <FilesView projectId={id} category={category} />
        )}

        {activeTab === "tools" && isProduction && (
          <View style={styles.toolsContainer}>
            <Text style={styles.sectionTitle}>Gestion de la Production</Text>

            <TouchableOpacity
              style={styles.toolCard}
              onPress={() => router.push(`/project/${id}/breakdown`)}
            >
              <View style={[styles.iconBox, { backgroundColor: "#e3f2fd" }]}>
                <Ionicons name="list" size={32} color="#2196F3" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toolTitle}>Dépouillement</Text>
                <Text style={styles.toolDesc}>
                  Gérez les séquences et le scénario
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolCard}
              onPress={() => router.push(`/project/${id}/production`)}
            >
              <View style={[styles.iconBox, { backgroundColor: "#e8f5e9" }]}>
                <Ionicons name="videocam" size={32} color="#4CAF50" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toolTitle}>Plan de Travail</Text>
                <Text style={styles.toolDesc}>
                  Planning et feuilles de service
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#ccc" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabsHeader: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  activeTabButton: {
    backgroundColor: "#f0f2f5",
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  activeTabLabel: {
    color: Colors.light.tint,
  },

  // Chat Styles
  messageBubble: {
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: "80%",
  },
  myMessage: {
    alignSelf: "flex-end",
    backgroundColor: Colors.light.tint,
  },
  theirMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#e0e0e0",
  },
  senderName: {
    fontSize: 10,
    color: "#555",
    marginBottom: 2,
  },
  myText: { color: "white" },
  theirText: { color: "#333" },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: Colors.light.tint,
    padding: 10,
    borderRadius: 20,
  },

  // Placeholder Styles
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  placeholderText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
  },
  subText: {
    marginTop: 10,
    textAlign: "center",
    color: "#999",
  },

  // Tools Styles
  toolsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  toolCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  toolDesc: {
    fontSize: 13,
    color: "#666",
  },
});

const fileStyles = StyleSheet.create({
  uploadButton: {
    backgroundColor: Colors.light.tint,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  uploadButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  fileIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
  },
  fileName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  fileInfo: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.8)",
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
