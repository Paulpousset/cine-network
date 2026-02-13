import PopcornLikeButton from "@/components/PopcornLikeButton";
import { HallOfFameProject } from "@/hooks/useHallOfFame";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface HallOfFameCardProps {
  item: HallOfFameProject;
  currentUserId: string | null;
  onEdit: () => void;
  onOpenLink: (url: string) => void;
  router: any;
  onToggleLike: (liked: boolean) => void;
  onViewTeam: () => void;
}

export default function HallOfFameCard({
  item,
  currentUserId,
  onEdit,
  onOpenLink,
  router,
  onToggleLike,
  onViewTeam,
}: HallOfFameCardProps) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const isDirectVideo =
    item.final_result_url &&
    (item.final_result_url.match(/\.(mp4|mov|avi|wmv|flv|mkv)$/i) ||
      item.final_result_url.includes("/storage/v1/object/public/videos/"));

  const player = useVideoPlayer(
    isDirectVideo ? item.final_result_url : null,
    (player) => {
      player.loop = false;
    },
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
          onPress={() =>
            router.push({
              pathname: "/profile/[id]",
              params: { id: item.owner_id },
            })
          }
        >
          <Image
            source={{
              uri:
                item.owner?.avatar_url ||
                "https://randomuser.me/api/portraits/lego/1.jpg",
            }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.ownerName}>
              {item.owner?.full_name || "Utilisateur"}
            </Text>
            <Text style={styles.date}>
              {item.type?.replace("_", " ").toUpperCase()} •{" "}
              {new Date(item.created_at).getFullYear()}
            </Text>
          </View>
        </TouchableOpacity>

        {currentUserId === item.owner_id && (
          <TouchableOpacity onPress={onEdit} style={styles.editButton}>
            <Ionicons name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {isDirectVideo ? (
        <View
          style={[styles.mediaContainer, { backgroundColor: "transparent" }]}
        >
          <VideoView
            player={player}
            style={{
              height: "100%",
              aspectRatio: 16 / 9,
              maxWidth: "100%",
            }}
            contentFit="contain"
            allowsFullscreen
            nativeControls
          />
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() =>
            item.final_result_url
              ? onOpenLink(item.final_result_url)
              : router.push(`/project/${item.id}`)
          }
          style={styles.mediaContainer}
        >
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.media}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.media, styles.placeholderMedia]}>
              <Ionicons name="film" size={50} color="white" opacity={0.5} />
            </View>
          )}

          {item.final_result_url && (
            <View style={styles.playOverlay}>
              <Ionicons
                name="play"
                size={40}
                color="white"
                style={{ marginLeft: 4 }}
              />
            </View>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.cardContent}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description} numberOfLines={3}>
          {item.description}
        </Text>

        <View style={styles.actionsRow}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <PopcornLikeButton
              initialLikes={item.likes_count || 0}
              liked={item.isLiked}
              onLike={(liked) => {
                onToggleLike(liked);
              }}
            />

            <TouchableOpacity style={styles.teamButton} onPress={onViewTeam}>
              <Ionicons
                name="people-outline"
                size={18}
                color={colors.primary}
              />
              <Text style={styles.teamButtonText}>Équipe</Text>
            </TouchableOpacity>
          </View>

          {item.final_result_url && !isDirectVideo && (
            <TouchableOpacity
              style={styles.watchButton}
              onPress={() => onOpenLink(item.final_result_url!)}
            >
              <Text style={styles.watchButtonText}>Regarder le film</Text>
              <Ionicons name="open-outline" size={16} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
    width: "100%",
    alignSelf: "stretch",
    borderWidth: isDark ? 1 : 0,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: colors.backgroundSecondary,
  },
  ownerName: {
    fontWeight: "bold",
    fontSize: 14,
    color: colors.text,
  },
  date: {
    fontSize: 12,
    color: colors.text + "99",
  },
  editButton: {
    padding: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 20,
  },
  mediaContainer: {
    width: "100%",
    height: 220,
    backgroundColor: "black",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  media: {
    width: "100%",
    height: "100%",
  },
  placeholderMedia: {
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  playOverlay: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  cardContent: {
    padding: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: colors.text + "CC",
    lineHeight: 20,
    marginBottom: 15,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
    flexWrap: "wrap",
    gap: 10,
  },
  watchButton: {
    backgroundColor: colors.accentColor || colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 5,
  },
  watchButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  teamButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    gap: 5,
  },
  teamButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
});
