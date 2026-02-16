import { GlobalStyles } from "@/constants/Styles";
import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface TalentCardProps {
  item: any;
}

export const TalentCard = React.memo(({ item }: TalentCardProps) => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { user } = useUser();

  const isOwnProfile = user?.id === item.id;

  return (
    <TouchableOpacity
      style={[GlobalStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() =>
        router.push(isOwnProfile ? "/account" : { pathname: "/profile/[id]", params: { id: item.id } })
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatar,
              styles.avatarPlaceholder,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.avatarText}>
              {(item.full_name || item.username || "?").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={[GlobalStyles.title2, { color: colors.text }]}>
            {item.full_name || item.username || "Profil"}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {(item.job_title ? item.job_title.split(',') : [item.role || ""]).slice(0, 2).map((jt: string, idx: number) => !!jt.trim() && (
                <View key={idx} style={{ backgroundColor: colors.primary + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '800', textTransform: 'uppercase' }}>
                        {jt.trim().replace("_", " ")}
                    </Text>
                </View>
            ))}
            {(item.job_title?.split(',').length > 2) && (
                <Text style={{ fontSize: 10, color: colors.textSecondary }}>+ {item.job_title.split(',').length - 2}</Text>
            )}
          </View>
          {!!(item.city || item.ville || item.location) && (
            <Text style={[GlobalStyles.caption, { color: isDark ? "#FFFFFF" : "#9CA3AF", marginTop: 4 }]}>
              📍 {item.city || item.ville || item.location}
            </Text>
          )}
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={isDark ? "#FFFFFF" : colors.tabIconDefault}
        />
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#eee",
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
  role: {
    marginTop: 4,
    fontWeight: "600",
  },
});
