import ClapLoading from "@/components/ClapLoading";
import { ALL_TOOLS, getDefaultTools } from "@/constants/Tools";
import { useUserMode } from "@/hooks/useUserMode";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { useTutorial } from "@/providers/TutorialProvider";
import { useUser } from "@/providers/UserProvider";
import { NotificationService } from "@/services/NotificationService";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const insets = useSafeAreaInsets();
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

  const { profile } = useUser();

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

      // Send push notifications to all project members
      NotificationService.sendProjectMessageNotification({
        projectId: projectId as string,
        senderName: profile?.full_name || profile?.username || "Quelqu'un",
        category: category as string,
        content: text,
        senderId: userId,
      });
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "padding"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 90}
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
        <View
          style={[
            styles.inputContainer,
            { paddingBottom: insets.bottom || 10 },
          ]}
        >
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Écrivez un message..."
            placeholderTextColor="#999"
            multiline
            returnKeyType="send"
            blurOnSubmit={true}
            onSubmitEditing={() => {
              if (inputText.trim()) {
                sendMessage();
              }
            }}
            onKeyPress={(e) => {
              if (Platform.OS === "web") {
                // @ts-ignore
                if (e.nativeEvent.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (inputText.trim()) {
                    sendMessage();
                  }
                }
              }
            }}
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
  fileStyles,
  styles,
}: {
  projectId: string;
  category: string;
  canWrite: boolean;
  fileStyles: any;
  styles: any;
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
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const fileStyles = createFileStyles(colors, isDark);
  const local = useLocalSearchParams();
  const global = useGlobalSearchParams();
  const { mode } = useUserMode();
  const { isTutorialActive, currentStep } = useTutorial();
  
  // Robust ID retrieval
  const rawId = local.id || global.id;
  const id = (Array.isArray(rawId) ? rawId[0] : rawId) as string;
  
  const rawCategory = local.category || global.category;
  const category = (Array.isArray(rawCategory) ? rawCategory[0] : rawCategory) as string;

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"chat" | "files" | "tools">(
    (local.tab as any) || "chat",
  );

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isMembersModalVisible, setIsMembersModalVisible] = useState(false);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  async function fetchMembersData() {
    setLoadingMembers(true);
    try {
        // 1. Fetch ALL project members
        const { data: allRoles } = await supabase.from("project_roles")
            .select("category, assigned_profile:profiles(id, full_name, avatar_url)")
            .eq("tournage_id", id)
            .not("assigned_profile_id", "is", null);

        if (allRoles) {
            const grouped: Record<string, any[]> = {};
            allRoles.forEach((r: any) => {
                const cat = r.category || "Autre";
                if (!grouped[cat]) grouped[cat] = [];
                if (!grouped[cat].some(m => m.id === r.assigned_profile.id)) {
                    grouped[cat].push(r.assigned_profile);
                }
            });
            setProjectMembers(Object.entries(grouped).map(([category, members]) => ({ category, members })));
        }

        // 2. Fetch current space members
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
        if (isUUID) {
            const { data } = await supabase.from("project_custom_space_members" as any)
                .select("profile_id")
                .eq("space_id", category);
            if (data) setSelectedProfileIds(data.map(m => m.profile_id));
        } else {
            // For native spaces, we combine role members and manual members
            const { data: manual } = await supabase.from("project_native_space_members" as any)
                .select("profile_id")
                .eq("project_id", id)
                .eq("category", category);
            
            const roleMembers = allRoles?.filter(r => r.category === category).map(r => r.assigned_profile.id) || [];
            const manualMembers = manual?.map(m => m.profile_id) || [];
            setSelectedProfileIds(Array.from(new Set([...roleMembers, ...manualMembers])));
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoadingMembers(false);
    }
  }

  async function toggleMember(profileId: string) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
      const isCurrentlySelected = selectedProfileIds.includes(profileId);

      try {
          if (isUUID) {
              if (isCurrentlySelected) {
                  await supabase.from("project_custom_space_members" as any).delete().eq("space_id", category).eq("profile_id", profileId);
                  setSelectedProfileIds(prev => prev.filter(id => id !== profileId));
              } else {
                  await supabase.from("project_custom_space_members" as any).insert({ space_id: category, profile_id: profileId });
                  setSelectedProfileIds(prev => [...prev, profileId]);
              }
          } else {
              // For native spaces, if we "unselect" someone who is there by ROLE, we might not be able to "remove" them truly
              // unless we also remove their role. But usually "adding participants" means adding EXTRA ones.
              // Let's assume we only manage the manual ones here.
              if (isCurrentlySelected) {
                  const { error } = await supabase.from("project_native_space_members" as any).delete().eq("project_id", id).eq("category", category).eq("profile_id", profileId);
                  if (!error) setSelectedProfileIds(prev => prev.filter(id => id !== profileId));
              } else {
                  const { error } = await supabase.from("project_native_space_members" as any).insert({ project_id: id, category, profile_id: profileId });
                  if (!error) setSelectedProfileIds(prev => [...prev, profileId]);
              }
          }
      } catch (e) {
          Alert.alert("Erreur", "Impossible de mettre à jour les membres");
      }
  }

  useEffect(() => {
    async function loadStatus() {
      if (id && category) {
        const key = `notifications_space_${id}_${category}`;
        const saved = await AsyncStorage.getItem(key);
        if (saved !== null) {
          setNotificationsEnabled(saved === "true");
        }
      }
    }
    loadStatus();
  }, [id, category]);

  const toggleNotifications = async () => {
    try {
      const nextStatus = !notificationsEnabled;
      const key = `notifications_space_${id}_${category}`;
      await AsyncStorage.setItem(key, nextStatus.toString());
      setNotificationsEnabled(nextStatus);
    } catch (e) {
      console.error(e);
    }
  };

  const [canWrite, setCanWrite] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [customSpace, setCustomSpace] = useState<any>(null);

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
        .select("owner_id, title")
        .eq("id", id)
        .single();

      const owner = project?.owner_id === userId || (isTutorialActive && project?.title?.includes("Vitrine") && currentStep?.id?.startsWith("admin"));
      
      console.log(`[SpacePerms] id: ${id}, user: ${userId}, ownerId: ${project?.owner_id}, isOwner: ${owner}`);
      setIsOwner(owner);

      // check if it's a custom space (category might be a UUID if it's a custom space)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category);
      let customS = null;
      if (isUUID) {
        const { data } = await supabase.from("project_custom_spaces" as any).select("*").eq("id", category).maybeSingle();
        if (data) {
          setCustomSpace(data);
          customS = data;
        }
      }

      // 3. Category Admin check
      let categoryAdmin = false;
      if (!isUUID && category !== "general") {
          const { data: roles } = await supabase
            .from("project_roles")
            .select("is_category_admin")
            .eq("tournage_id", id)
            .eq("category", category)
            .eq("assigned_profile_id", userId);
          if (roles && roles.some((r) => r.is_category_admin)) categoryAdmin = true;
      }
      setIsAdmin(categoryAdmin);

      // 4. Write Permissions (Chat)
      let write = false;
      if (customS) {
        // Custom Space: check membership
        if (owner) {
          write = true;
        } else {
            const { data: member } = await supabase.from("project_custom_space_members" as any)
                .select("id")
                .eq("space_id", category)
                .eq("profile_id", userId)
                .maybeSingle();
            if (member) write = true;
        }
      } else if (category !== "general") {
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

      // 5. Fetch Allowed Tools for this Category
      await fetchToolsForCategory(customS);
    }

    checkPermissionsAndTools();
  }, [id, category]);

  async function fetchToolsForCategory(customS?: any) {
    if (customS) {
        setAvailableTools(customS.allowed_tools || []);
        return;
    }
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
        color={activeTab === tab ? colors.tint : colors.textSecondary}
      />
      <Text
        style={[styles.tabLabel, activeTab === tab && styles.activeTabLabel]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackVisible: false, // Prevents showing default iOS back button alongside custom one
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerLeft: () => (
            <View style={{ marginLeft: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace(`/project/${id}/spaces`);
                  }
                }}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name="arrow-back" 
                  size={20} 
                  color={colors.text} 
                  style={{ marginLeft: -2 }} // Compensation visuelle
                />
              </TouchableOpacity>
            </View>
          ),
          headerRight: () => (
            <View style={{ marginRight: 10, flexDirection: 'row', gap: 8 }}>
              {(isOwner || isAdmin) && (
                <TouchableOpacity
                  onPress={() => {
                    fetchMembersData();
                    setIsMembersModalVisible(true);
                  }}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="people-outline" size={20} color={colors.text} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={toggleNotifications}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={notificationsEnabled ? "notifications-outline" : "notifications-off-outline"}
                  size={20}
                  color={notificationsEnabled ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          ),
          headerTitle: customSpace ? customSpace.name : `Espace ${(category || "").toUpperCase()}`,
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
          <FilesView projectId={id} category={category} canWrite={canWrite} fileStyles={fileStyles} styles={styles} />
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
                Outils pour {customSpace ? customSpace.name : category.toUpperCase()}
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

      <Modal
        visible={isMembersModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsMembersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Membres de l'espace</Text>
                    <TouchableOpacity onPress={() => setIsMembersModalVisible(false)}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {loadingMembers ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ClapLoading />
                    </View>
                ) : (
                    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                        <Text style={styles.label}>Gérer les participants</Text>
                        <View style={styles.membersList}>
                            {projectMembers.map(section => (
                                <View key={section.category} style={{ width: '100%', marginBottom: 15 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.tint, textTransform: 'uppercase', marginBottom: 8, opacity: 0.8 }}>
                                        {section.category}
                                    </Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                        {section.members.map((member: any) => (
                                            <TouchableOpacity 
                                                key={member.id} 
                                                style={[
                                                    styles.memberItem, 
                                                    selectedProfileIds.includes(member.id) && { backgroundColor: colors.tint + "20", borderColor: colors.tint }
                                                ]}
                                                onPress={() => toggleMember(member.id)}
                                            >
                                                <Text style={[styles.memberName, { color: colors.text }]}>{member.full_name || member.username}</Text>
                                                {selectedProfileIds.includes(member.id) && <Ionicons name="checkmark-circle" size={16} color={colors.tint} />}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                )}
                
                <TouchableOpacity 
                    style={[styles.closeButton, { backgroundColor: colors.tint }]}
                    onPress={() => setIsMembersModalVisible(false)}
                >
                    <Text style={styles.closeButtonText}>Terminer</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    tabsHeader: {
      flexDirection: "row",
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
      borderBottomColor: colors.tint,
    },
    tabLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    activeTabLabel: {
      color: colors.tint,
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
      backgroundColor: colors.tint,
    },
    theirMessage: {
      alignSelf: "flex-start",
      backgroundColor: isDark ? colors.card : "#e0e0e0",
    },
    senderName: {
      fontSize: 10,
      color: colors.textSecondary,
      marginBottom: 2,
    },
    myText: { color: "#fff" },
    theirText: { color: colors.text },
    inputContainer: {
      flexDirection: "row",
      padding: 10,
      backgroundColor: colors.background,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: "center",
    },
    input: {
      flex: 1,
      backgroundColor: isDark ? colors.card : "#f0f2f5",
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 10,
      marginRight: 10,
      maxHeight: 100,
      minHeight: 40,
      color: colors.text,
    },
    sendButton: {
      backgroundColor: colors.tint,
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
      color: colors.textSecondary,
    },
    subText: {
      marginTop: 10,
      textAlign: "center",
      color: colors.textSecondary,
      opacity: 0.7,
    },

    // Tools Styles
    toolsContainer: {
      padding: 15,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 5,
      color: colors.text,
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
      backgroundColor: colors.card,
      padding: 15,
      borderRadius: 16,
      marginBottom: Platform.OS === "web" ? 12 : 0,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.text,
      textAlign: "center",
    },
    toolDesc: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: "center",
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 10,
      color: colors.text,
    },
    membersList: {
      marginBottom: 20,
    },
    memberItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
    },
    memberName: {
      fontSize: 14,
    },
    closeButton: {
      padding: 15,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 10,
    },
    closeButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
    },
  });

const createFileStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    uploadButton: {
      backgroundColor: colors.tint,
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
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 12,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fileIcon: {
      width: 48,
      height: 48,
      borderRadius: 8,
      backgroundColor: isDark ? colors.backgroundSecondary : "#f5f5f5",
      alignItems: "center",
      justifyContent: "center",
    },
    fileName: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
    },
    fileInfo: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    uploadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: isDark ? "rgba(0, 0, 0, 0.7)" : "rgba(255, 255, 255, 0.8)",
      zIndex: 10,
      justifyContent: "center",
      alignItems: "center",
    },
  });
