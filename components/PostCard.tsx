import AutoHeightImage from "@/components/AutoHeightImage";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { Ionicons } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import React from "react";
import {
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export interface FeedPost {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  user_id: string;
  user: {
    full_name: string;
    avatar_url: string | null;
    job_title?: string;
  };
  project?: {
    id: string;
    title: string;
    image_url?: string | null;
    type?: string;
    ville?: string;
    start_date?: string;
    end_date?: string;
  };
}

interface PostCardProps {
  item: FeedPost;
  onImagePress: (imageUrl: string) => void;
}

const PostCard = ({ item, onImagePress }: PostCardProps) => {
  const renderContent = (content: string) => {
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    return (
      <View style={styles.contentBlock}>
        {lines.map((line, index) => {
          const hasKeyValue = line.includes(":");
          if (hasKeyValue) {
            const [rawKey, ...rest] = line.split(":");
            const key = rawKey.trim();
            const value = rest.join(":").trim();
            const keyLower = key.toLowerCase();

            // If it's a link line, render as a tappable link
            if (keyLower === "lien" && value.length > 0) {
              return (
                <View
                  key={`${index}-${line}`}
                  style={styles.linkButtonContainer}
                >
                  <TouchableOpacity
                    onPress={() => {
                      try {
                        router.push(value as Href);
                      } catch (e) {
                        // noop
                      }
                    }}
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkButtonText}>Voir l'offre</Text>
                  </TouchableOpacity>
                </View>
              );
            }

            return (
              <Text key={`${index}-${line}`} style={GlobalStyles.body}>
                <Text style={styles.kvKey}>{key}:</Text>
                {value ? ` ${value}` : ""}
              </Text>
            );
          }

          return (
            <Text key={`${index}-${line}`} style={GlobalStyles.body}>
              {line}
            </Text>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.postCard}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/profile/[id]",
              params: { id: item.user_id },
            })
          }
          style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
        >
          <Image
            source={{
              uri:
                item.user?.avatar_url ||
                "https://randomuser.me/api/portraits/lego/1.jpg",
            }}
            style={styles.avatar}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>
              {item.user?.full_name || "Utilisateur"}
            </Text>
            <Text style={styles.date}>
              {new Date(item.created_at).toLocaleDateString()}{" "}
              {new Date(item.created_at).getHours()}:
              {new Date(item.created_at)
                .getMinutes()
                .toString()
                .padStart(2, "0")}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Ajout de la photo du tournage dans le header sur Web */}
        {Platform.OS === "web" && item.project && (
          <TouchableOpacity
            onPress={() => router.push(`/project/${item.project!.id}`)}
            style={styles.webProjectHeaderInfo}
          >
            {item.project.image_url ? (
              <Image
                source={{ uri: item.project.image_url }}
                style={styles.webProjectHeaderImage}
              />
            ) : (
              <View style={styles.webProjectHeaderPlaceholder}>
                <Ionicons name="film" size={14} color="#999" />
              </View>
            )}
            <Text style={styles.webProjectHeaderText} numberOfLines={1}>
              {item.project.title}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.postContentContainer}>
        {item.content && renderContent(item.content)}

        {item.image_url && (
          <AutoHeightImage
            uri={item.image_url}
            onPress={() => onImagePress(item.image_url!)}
          />
        )}
      </View>

      {item.project && (
        <TouchableOpacity
          onPress={() => router.push(`/project/${item.project!.id}`)}
          style={styles.projectCard}
          activeOpacity={0.9}
        >
          {item.project.image_url ? (
            <Image
              source={{ uri: item.project.image_url }}
              style={styles.projectCardImage}
            />
          ) : (
            <View style={styles.projectCardPlaceholder}>
              <Ionicons
                name="film"
                size={24}
                color={Colors.light.tabIconDefault}
              />
            </View>
          )}

          <View style={styles.projectCardContent}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Text style={styles.projectCardType}>
                {item.project.type?.replace("_", " ").toUpperCase() || "PROJET"}
              </Text>
              {item.project.start_date && (
                <Text style={styles.projectCardDate}>
                  •{" "}
                  {new Date(item.project.start_date).toLocaleDateString(
                    undefined,
                    { month: "short", year: "numeric" },
                  )}
                </Text>
              )}
            </View>
            <Text style={styles.projectCardTitle} numberOfLines={1}>
              {item.project.title}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Ionicons name="location-outline" size={12} color="#666" />
              <Text style={styles.projectCardMeta}>
                {item.project.ville || "Lieu non défini"}
              </Text>
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors.light.border}
            style={{ marginRight: 5 }}
          />
        </TouchableOpacity>
      )}

      <View style={styles.footer}>
        {/* Actions like Like/Comment could go here */}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eee",
  },
  name: {
    fontWeight: "700",
    fontSize: 16,
    color: Colors.light.text,
  },
  date: {
    color: "#888",
    fontSize: 12,
    marginTop: 1,
  },
  postContentContainer: {
    marginBottom: 12,
  },
  contentBlock: {
    marginBottom: 10,
  },
  kvKey: {
    fontWeight: "700",
    color: Colors.light.primary,
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  linkButtonContainer: {
    alignItems: "flex-start",
    marginTop: 10,
    marginBottom: 5,
  },
  linkButton: {
    backgroundColor: Colors.light.tint,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: Colors.light.tint,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  linkButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },
  webProjectHeaderInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 4,
    paddingRight: 10,
    borderRadius: 20,
    maxWidth: 150,
  },
  webProjectHeaderImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  webProjectHeaderPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ddd",
    marginRight: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  webProjectHeaderText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#444",
  },
  projectCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    padding: 10,
    gap: 12,
  },
  projectCardImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#eee",
  },
  projectCardPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  projectCardContent: {
    flex: 1,
  },
  projectCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.light.text,
  },
  projectCardType: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.light.primary,
    backgroundColor: "#fff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.primary + "30",
    overflow: "hidden",
  },
  projectCardMeta: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
  },
  projectCardDate: {
    fontSize: 10,
    color: "#999",
  },
  footer: {
    marginTop: 5,
  },
});

export default PostCard;
