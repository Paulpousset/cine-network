import { GlobalStyles } from "@/constants/Styles";
import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Hoverable } from "./Hoverable";

interface TalentCardProps {
  item: any;
  myConnections?: any[];
  style?: any;
}

const styles = StyleSheet.create({
  avatar: {
    width: 65,
    height: 65,
    borderRadius: 12, // More modern look
    backgroundColor: "#eee",
  },
  tinyAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ccc',
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  tinyAvatarPopup: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  role: {
    marginTop: 4,
    fontWeight: "600",
  },
  popup: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    zIndex: 99999,
    ...Platform.select({
      web: {
        // @ts-ignore
        boxShadow: '0 30px 60px rgba(0,0,0,0.15), 0 10px 20px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(30px)',
      }
    })
  },
  popupTitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  popupBio: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  skillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  skillText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export const TalentCard = React.memo(({ item, myConnections = [], style }: TalentCardProps) => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useUser();

  const isOwnProfile = user?.id === item.id;
  const commonProjectsCount = item.common_projects_count || 0;

  return (
    <Hoverable
      onPress={() =>
        router.push(isOwnProfile ? "/account" : { pathname: "/profile/[id]", params: { id: item.id } })
      }
      style={({ hovered }) => [
        { zIndex: hovered && Platform.OS === 'web' ? 99999 : 1, overflow: 'visible' },
        style
      ]}
    >
      {({ hovered }) => (
        <View style={[
          GlobalStyles.card, 
          { 
            backgroundColor: colors.card, 
            borderColor: colors.border, 
            padding: 16,
            height: Platform.OS === 'web' ? 150 : 'auto',
            flex: 1,
            // Reset global web styles that center and restrict width
            ...(Platform.OS === 'web' ? { marginHorizontal: 0, maxWidth: '100%', alignSelf: 'auto' } : {})
          },
          hovered && Platform.OS === 'web' ? {
            borderColor: colors.primary + '50',
            ...Platform.select({
              web: {
                boxShadow: '0 15px 45px rgba(0,0,0,0.18)',
                transform: [{ translateY: -4 }]
              }
            })
          } : {}
        ]}>
          <View style={{ flex: 1 }}>
            <View style={[
              { flexDirection: "row", gap: 16, flex: 1 },
              (hovered && Platform.OS === 'web') ? { opacity: 0 } : { opacity: 1 }
            ]}>
              {item.avatar_url ? (
                <Image 
                  source={{ uri: item.avatar_url }} 
                  style={styles.avatar} 
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View
                  style={[
                    styles.avatar,
                    styles.avatarPlaceholder,
                    { backgroundColor: colors.backgroundSecondary },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: colors.textSecondary }]}>
                    {(item.full_name || item.username || "?").charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[GlobalStyles.title2, { color: colors.text, fontSize: 18, fontWeight: '700' }]} numberOfLines={1}>
                      {item.full_name || item.username || "Profil"}
                    </Text>
                    
                    {/* 1. Poste et intitulé */}
                    <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: '700', textTransform: 'capitalize', marginTop: 4 }}>
                      {item.role?.replace("_", " ")} {item.job_title ? `• ${item.job_title.split(',')[0]}` : ''}
                    </Text>
                  </View>
                </View>

                {!!(item.city || item.ville || item.location) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}>
                    <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {item.city || item.ville || item.location}
                    </Text>
                  </View>
                )}

                {/* 2. Projets en commun */}
                {commonProjectsCount > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6, backgroundColor: colors.backgroundSecondary, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Ionicons name="film-outline" size={12} color={colors.textSecondary} />
                    <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>
                      {commonProjectsCount} {commonProjectsCount > 1 ? 'projets en commun' : 'projet en commun'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Popup Hover Web - Mini Profil */}
          {hovered && Platform.OS === 'web' && (
            <View 
              style={[
                styles.popup, 
                { 
                  backgroundColor: colors.card, 
                  borderColor: colors.primary + '40',
                }
              ]}
            >
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.tinyAvatarPopup} />
                ) : (
                  <View style={[styles.tinyAvatarPopup, { backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>{(item.full_name || "?")[0]}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>{item.full_name || item.username}</Text>
                  <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700', textTransform: 'capitalize' }}>
                    {item.role?.replace("_", " ")}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>{item.job_title}</Text>
                </View>
              </View>

              {item.bio && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.popupTitle, { color: colors.textSecondary }]}>À PROPOS</Text>
                  <Text style={[styles.popupBio, { color: colors.text }]} numberOfLines={3}>{item.bio}</Text>
                </View>
              )}
              
              {item.project_roles && item.project_roles.length > 0 && (
                <View>
                  <Text style={[styles.popupTitle, { color: colors.textSecondary }]}>RÔLES SUR SES PROJETS</Text>
                  <View style={{ gap: 8, marginTop: 4 }}>
                    {item.project_roles.slice(0, 3).map((role: any, idx: number) => (
                      <View key={role.id || idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="videocam" size={12} color={colors.primary} />
                        <Text style={{ fontSize: 12, color: colors.text, fontWeight: '500' }} numberOfLines={1}>
                          <Text style={{ fontWeight: '700' }}>{role.title || "Poste inconnu"}</Text>
                          {role.tournages?.title ? ` sur ${role.tournages.title}` : ""}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              <View style={{ marginTop: 'auto', paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>Cliquez pour voir le profil complet</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </View>
            </View>
          )}
        </View>
      )}
    </Hoverable>
  );
});
