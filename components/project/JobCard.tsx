import { GlobalStyles } from "@/constants/Styles";
import { useTheme } from "@/providers/ThemeProvider";
import { useUser } from "@/providers/UserProvider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface JobCardProps {
  item: any;
  isSaved?: boolean;
  onSaveToggle?: (id: string) => void;
  applicationStatus?: string;
  onApplicationAction?: () => void;
}

export const JobCard = React.memo(({ item, isSaved, onSaveToggle, applicationStatus, onApplicationAction }: JobCardProps) => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { isGuest } = useUser();
  const styles = createStyles(colors, isDark);
  const isBoosted = item.is_boosted;

  const handlePress = () => {
    if ((applicationStatus === 'accepted' || applicationStatus === 'rejected' || applicationStatus === 'refused') && onApplicationAction) {
      onApplicationAction();
    } else {
      router.push(`/project/role/${item.id}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return '#10B981';
      case 'rejected':
      case 'refused': return '#EF4444';
      case 'pending': return '#F59E0B';
      default: return isDark ? '#A0A0A0' : '#666';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'accepted': return 'Accepté';
      case 'rejected':
      case 'refused': return 'Refusé';
      case 'pending': return 'En attente';
      default: return status;
    }
  };

  return (
    <TouchableOpacity
      style={[
        GlobalStyles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        isBoosted && {
          borderColor: "#FFD700",
          borderWidth: 1.5,
          backgroundColor: isDark ? "rgba(255, 215, 0, 0.05)" : "#FFFBE6",
        },
      ]}
      onPress={handlePress}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.projectTitle}>
              {item.tournages?.title || "Projet Inconnu"}
            </Text>
            {isBoosted && (
              <View
                style={{
                  backgroundColor: "#FFD700",
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{ fontSize: 8, fontWeight: "bold", color: "#000" }}
                >
                  SPONSORISÉ
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.projectSubtitle}>
            {item.tournages?.type?.replace("_", " ")} •{" "}
            {item.tournages?.pays || "Pays ?"}{" "}
            {item.tournages?.ville ? `• ${item.tournages.ville}` : ""}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            {!!item.matchScore && (
              <View style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>{item.matchScore}% Match</Text>
              </View>
            )}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.category?.toUpperCase()}</Text>
            </View>
          </View>

          {applicationStatus && (
            <View style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(applicationStatus) + "20" }
            ]}>
              <Text style={[
                styles.statusBadgeText,
                { color: getStatusColor(applicationStatus) }
              ]}>
                {formatStatus(applicationStatus)}
              </Text>
            </View>
          )}

          {onSaveToggle && !isGuest && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onSaveToggle(item.id);
              }}
              style={styles.saveButton}
            >
              <Ionicons
                name={isSaved ? "bookmark" : "bookmark-outline"}
                size={22}
                color={isSaved ? colors.primary : colors.text + "66"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={[GlobalStyles.title2, { color: colors.text }]}>
        {item.title}
      </Text>

      {item.description ? (
        <Text style={[GlobalStyles.body, { color: colors.text }]} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <Text style={[styles.ctaText, { color: colors.primary }]}>
        {(applicationStatus === 'accepted' || applicationStatus === 'rejected' || applicationStatus === 'refused') ? "Retirer de mes candidatures ×" : "Voir l'annonce →"}
      </Text>
    </TouchableOpacity>
  );
});

export const ProjectJobCard = React.memo(({ item }: { item: any }) => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  return (
    <TouchableOpacity
      style={[GlobalStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/project/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.projectTitle, { fontSize: 18, marginBottom: 4 }]}
          >
            {item.title || "Projet Inconnu"}
          </Text>
          <Text style={styles.projectSubtitle}>
            {item.type?.replace("_", " ")} • {item.ville || "Lieu N/C"}
          </Text>
        </View>
        <View
          style={[styles.badge, { backgroundColor: colors.primary + "20" }]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: colors.primary, fontSize: 12 },
            ]}
          >
            {item.roleCount} OFFRE{item.roleCount > 1 ? "S" : ""}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {item.roles.slice(0, 3).map((r: any) => (
          <View
            key={r.id}
            style={{
              backgroundColor: colors.backgroundSecondary,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
            }}
          >
            <Text style={{ fontSize: 10, color: colors.text + "99" }}>{r.title}</Text>
          </View>
        ))}
        {item.roles.length > 3 && (
          <Text style={{ fontSize: 10, color: colors.text + "66", alignSelf: "center" }}>
            +{item.roles.length - 3} autres
          </Text>
        )}
      </View>

      <Text style={[styles.ctaText, { color: colors.primary }]}>Voir le projet →</Text>
    </TouchableOpacity>
  );
});

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    projectTitle: { fontSize: 16, fontWeight: "bold", color: colors.text },
    projectSubtitle: { fontSize: 12, color: isDark ? "#bbb" : colors.text + "80", marginTop: 2 },
    badge: {
      backgroundColor: colors.primary + "20",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    badgeText: { fontSize: 10, color: colors.primary, fontWeight: "bold" },
    saveButton: {
      padding: 4,
      marginLeft: 4,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginLeft: 4,
      height: 24,
      justifyContent: 'center',
    },
    statusBadgeText: {
      fontSize: 10,
      fontWeight: 'bold',
    },
    matchBadge: {
      backgroundColor: isDark ? "#2d1a4d" : "#e0e7ff",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    matchBadgeText: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.primary,
    },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
    ctaText: {
      fontWeight: "bold",
      textAlign: "right",
      fontSize: 12,
      marginTop: 5,
    },
  });
}
