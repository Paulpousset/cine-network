import { appEvents, EVENTS } from "@/lib/events";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PostShareModalProps {
  visible: boolean;
  onClose: () => void;
  post: any;
  userId: string | null;
}

export const PostShareModal = ({
  visible,
  onClose,
  post,
  userId,
}: PostShareModalProps) => {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const insets = useSafeAreaInsets();
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sharingTo, setSharingTo] = useState<string | null>(null);

  useEffect(() => {
    if (visible && userId) {
      fetchConnections();
    }
  }, [visible, userId]);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("connections")
        .select(`
          id,
          requester:profiles!requester_id(id, full_name, avatar_url),
          receiver:profiles!receiver_id(id, full_name, avatar_url)
        `)
        .eq("status", "accepted")
        .or(`receiver_id.eq.${userId},requester_id.eq.${userId}`);

      if (error) throw error;

      const friends = data?.map((c: any) =>
        c.requester.id === userId ? c.receiver : c.requester
      ) || [];
      
      setConnections(friends);
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setLoading(false);
    }
  };

  const shareTo = async (friendId: string) => {
    if (sharingTo) return;
    setSharingTo(friendId);
    
    try {
      const postLink = `https://titapp.fr/post/${post.id}`;
      const messageContent = `Regarde ce post de ${post.user?.full_name || "quelqu'un"} :\n\n"${post.content?.substring(0, 100)}${post.content?.length > 100 ? "..." : ""}"\n\n${postLink}`;

      const { error } = await supabase.from("direct_messages").insert({
        sender_id: userId,
        receiver_id: friendId,
        content: messageContent,
      });

      if (error) throw error;
      
      appEvents.emit(EVENTS.SHOW_NOTIFICATION, {
        title: "Partagé !",
        body: "Le post a été envoyé à votre relation.",
      });

      // Close after a short delay to show success state if needed
      setTimeout(onClose, 500);
    } catch (error) {
      console.error("Error sharing post:", error);
      setSharingTo(null);
    }
  };

  const filteredConnections = connections.filter(f => 
    f.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderFriend = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.friendItem} 
      onPress={() => shareTo(item.id)}
      disabled={sharingTo !== null}
    >
      <Image
        source={{
          uri: item.avatar_url || "https://randomuser.me/api/portraits/lego/1.jpg",
        }}
        style={styles.avatar}
      />
      <Text style={styles.friendName} numberOfLines={1}>{item.full_name}</Text>
      <View style={[
        styles.sendIcon, 
        sharingTo === item.id && styles.sendIconSuccess
      ]}>
        {sharingTo === item.id ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Ionicons name="paper-plane" size={16} color="white" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} />
        <View style={[styles.container, { paddingBottom: insets.bottom || 20 }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Partager à mes relations</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={28} color={colors.text + "40"} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.text + "60"} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher une relation..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.text + "60"}
            />
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={filteredConnections}
              keyExtractor={(item) => item.id}
              renderItem={renderFriend}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchQuery ? "Aucun résultat." : "Vous n'avez pas encore de relations."}
                  </Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  dismissArea: {
    flex: 1,
  },
  container: {
    backgroundColor: colors.background,
    height: "60%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: 20,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: colors.text,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    backgroundColor: colors.backgroundSecondary,
  },
  friendName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: colors.text,
  },
  sendIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sendIconSuccess: {
    backgroundColor: colors.success,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    color: colors.text + "80",
    fontSize: 14,
  },
});

