import ClapLoading from "@/components/ClapLoading";
import Colors from "@/constants/Colors";
import { ALL_TOOLS, getDefaultTools } from "@/constants/Tools";
import { useUserMode } from "@/hooks/useUserMode";
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

// --- Extracted Chat Component (Original Logic) ---
function ChatView({
  projectId,
  category,
  canWrite,
}: {
  projectId: string;
  category: string;
  canWrite: boolean;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    let channel: any = null;
    const channelId = `chat_space_${projectId}_${category}`;

    const setupChannel = () => {
      console.log(`[SpaceChat] (Re)subscribing to: ${channelId}`);
      channel = supabase
        .channel(channelId)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "project_messages",
            filter: `project_id=eq.${projectId}`,
          },
          (payload) => {
            const newMsg = payload.new as any;
            if (newMsg.category === category) {
              console.log(
                "[SpaceChat] New message received via realtime:",
                newMsg.id,
              );
              addNewMessage(newMsg.id);
            }
          },
        )
        .subscribe((status) => {
          console.log(
            `[SpaceChat] Subscription status for ${channelId}: ${status}`,
          );
          if (
            (status === "CHANNEL_ERROR" || status === "TIMED_OUT") &&
            Platform.OS === "web"
          ) {
            console.warn(`[SpaceChat] Channel ${status} on Web, recreating...`);
            setTimeout(() => {
              if (channel) supabase.removeChannel(channel);
              setupChannel();
            }, 5000);
          }
        });
    };

    const startSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
      }
      fetchMessages();

      // On Web, wait a bit before starting to ensure session is fully propagated
      if (Platform.OS === "web") {
        setTimeout(setupChannel, 1500);
      } else {
        setupChannel();
      }
    };

    startSession();

    // Special handling for Web focus to refresh list
    const onWebFocus = () => {
      if (Platform.OS === "web") {
        fetchMessages();
      }
    };
    if (Platform.OS === "web") {
      window.addEventListener("focus", onWebFocus);
    }

    return () => {
      if (channel) {
        console.log(`[SpaceChat] Unsubscribing from channel`);
        supabase.removeChannel(channel);
      }
      if (Platform.OS === "web") {
        window.removeEventListener("focus", onWebFocus);
      }
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
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    }
  }

  async function sendMessage() {
    if (!inputText.trim() || !userId) return;
    const text = inputText.trim();
    setInputText("");

    // Optimistic Update
    const tempId = Math.random().toString(36).substring(7);
    const tempMsg = {
      id: tempId,
      project_id: projectId,
      category: category,
      sender_id: userId,
      content: text,
      created_at: new Date().toISOString(),
      sender: null, // Will be loaded by addNewMessage
    };

    setMessages((prev) => [...prev, tempMsg]);

    const { error, data } = await supabase
      .from("project_messages")
      .insert({
        project_id: projectId,
        category: category,
        sender_id: userId,
        content: text,
      })
      .select()
      .single();

    if (error) {
      Alert.alert("Erreur", "Impossible d'envoyer le message");
      setInputText(text);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } else if (data) {
      // Replace temp message or just let the realtime handles it (deduped by flatlist key)
      // But since we want the sender info, calling addNewMessage(data.id) or replacing it is better
      addNewMessage(data.id);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f8f9fa" }}
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
      {canWrite ? (
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
      ) : (
        <View style={[styles.inputContainer, { justifyContent: "center" }]}>
          <Text style={{ color: "#999", fontStyle: "italic" }}>
            Seuls les admins peuvent écrire dans ce canal.
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function FilesView({
  projectId,
  category,
  canWrite,
}: {
  projectId: string;
  category: string;
  canWrite: boolean;
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

      let fileBody;
      if (Platform.OS === "web") {
        const res = await fetch(file.uri);
        fileBody = await res.blob();
      } else {
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: "base64",
        });
        fileBody = decode(base64);
      }

      const fileName = `${Date.now()}_${file.name.replace(/\s/g, "_")}`;
      const filePath = `${projectId}/${category}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("project_files")
        .upload(filePath, fileBody, {
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

      {canWrite && (
        <TouchableOpacity
          style={fileStyles.uploadButton}
          onPress={pickAndUploadFile}
        >
          <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
          <Text style={fileStyles.uploadButtonText}>Ajouter un fichier</Text>
        </TouchableOpacity>
      )}

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

// --- Main Dashboard Component ---

export default function ChannelSpace() {
  const local = useLocalSearchParams();
  const global = useGlobalSearchParams();
  const { mode } = useUserMode();
  // Robust ID retrieval
  const id = (local.id as string) || (global.id as string);
  const category = (local.category as string) || (global.category as string);

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"chat" | "files" | "tools">(
    (local.tab as any) || "chat",
  );

  const [canWrite, setCanWrite] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  // Tools state loaded from DB
  const [availableTools, setAvailableTools] = useState<
    (keyof typeof ALL_TOOLS)[]
  >([]);

  useEffect(() => {
    async function checkPermissionsAndTools() {
      // 1. Session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      // 2. Check Owner & Project
      const { data: project } = await supabase
        .from("tournages")
        .select("owner_id")
        .eq("id", id)
        .single();

      const owner = project?.owner_id === userId;
      setIsOwner(owner);

      // 3. Write Permissions (Chat)
      let write = false;
      if (category !== "general") {
        write = true;
      } else {
        if (owner) write = true;
        else {
          const { data: roles } = await supabase
            .from("project_roles")
            .select("is_category_admin")
            .eq("tournage_id", id)
            .eq("assigned_profile_id", userId);
          if (roles && roles.some((r) => r.is_category_admin)) write = true;
        }
      }
      setCanWrite(write);

      // 4. Fetch Allowed Tools for this Category
      await fetchToolsForCategory();
    }

    checkPermissionsAndTools();
  }, [id, category]);

  async function fetchToolsForCategory() {
    // First try to get custom permissions from DB
    const { data, error } = await supabase
      .from("project_category_permissions")
      .select("allowed_tools")
      .eq("project_id", id)
      // @ts-ignore
      .eq("category", category)
      .maybeSingle();

    if (data && data.allowed_tools) {
      setAvailableTools(data.allowed_tools as any);
    } else {
      // Fallback to coded defaults
      setAvailableTools(getDefaultTools(category) as any);
    }
  }

  const hasTools = availableTools.length > 0;

  useEffect(() => {
    if (local.tab) {
      setActiveTab(local.tab as any);
    }
  }, [local.tab]);

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
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: "#fff" },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace(`/project/${id}/spaces`);
                }
              }}
              style={{
                padding: 10,
                marginLeft: -5, // Optimisation pour la zone de contact iOS
                flexDirection: "row",
                alignItems: "center",
              }}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          ),
          headerTitle: `Espace ${(category || "").toUpperCase()}`,
        }}
      />

      {/* Tabs Switcher */}
      <View style={styles.tabsHeader}>
        {renderTabButton("chat", "Discussion", "chatbubbles-outline")}
        {renderTabButton("files", "Fichiers", "folder-open-outline")}
        {hasTools && renderTabButton("tools", "Outils", "construct-outline")}
      </View>

      {/* Content Area */}
      <View style={{ flex: 1 }}>
        {activeTab === "chat" && (
          <ChatView projectId={id} category={category} canWrite={canWrite} />
        )}

        {activeTab === "files" && (
          <FilesView projectId={id} category={category} canWrite={canWrite} />
        )}

        {activeTab === "tools" && hasTools && (
          <View style={styles.toolsContainer}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text style={styles.sectionTitle}>
                Outils pour {category.toUpperCase()}
              </Text>
            </View>

            <View style={styles.toolsGrid}>
              {availableTools.map((toolKey) => {
                const tool = ALL_TOOLS[toolKey];
                if (!tool) return null; // Safety check

                // Shorten some names for mobile grid
                let displayTitle = tool.title;
                if (Platform.OS !== "web") {
                  if (toolKey === "casting") displayTitle = "Casting";
                  if (toolKey === "sets") displayTitle = "Décors";
                }

                return (
                  <TouchableOpacity
                    key={toolKey}
                    style={styles.toolCard}
                    onPress={() => router.push(`/project/${id}/${tool.route}`)}
                  >
                    <View
                      style={[styles.iconBox, { backgroundColor: tool.bg }]}
                    >
                      <Ionicons name={tool.icon} size={30} color={tool.color} />
                    </View>
                    <View style={styles.toolTextContainer}>
                      <Text style={styles.toolTitle}>{displayTitle}</Text>
                      {Platform.OS === "web" && (
                        <Text style={styles.toolDesc}>{tool.desc}</Text>
                      )}
                    </View>
                    {Platform.OS === "web" && (
                      <Ionicons name="chevron-forward" size={20} color="#ccc" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabsHeader: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabButton: {
    borderBottomColor: Colors.light.tint,
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
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },
  toolCard: {
    width: Platform.OS === "web" ? "100%" : "48%",
    flexDirection: Platform.OS === "web" ? "row" : "column",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 16,
    marginBottom: Platform.OS === "web" ? 12 : 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Platform.OS === "web" ? 15 : 0,
    marginBottom: Platform.OS === "web" ? 0 : 12,
  },
  toolTextContainer: {
    flex: Platform.OS === "web" ? 1 : 0,
    alignItems: Platform.OS === "web" ? "flex-start" : "center",
  },
  toolTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
  toolDesc: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
