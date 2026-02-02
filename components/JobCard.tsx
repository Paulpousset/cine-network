import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface JobCardProps {
  item: any;
}

export const JobCard = React.memo(({ item }: JobCardProps) => {
  const router = useRouter();
  const isBoosted = item.is_boosted;

  return (
    <TouchableOpacity
      style={[
        GlobalStyles.card,
        isBoosted && {
          borderColor: "#FFD700",
          borderWidth: 1,
          backgroundColor: "#FFFBE6",
        },
      ]}
      onPress={() => router.push(`/project/role/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View>
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
                  style={{ fontSize: 8, fontWeight: "bold", color: "white" }}
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
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.category.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <Text style={[GlobalStyles.title2, { color: Colors.light.primary }]}>
        {item.title}
      </Text>

      {item.description ? (
        <Text style={GlobalStyles.body} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <Text style={styles.ctaText}>Voir l'annonce →</Text>
    </TouchableOpacity>
  );
});

export const ProjectJobCard = React.memo(({ item }: { item: any }) => {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={GlobalStyles.card}
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
          style={[styles.badge, { backgroundColor: Colors.light.tint + "20" }]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: Colors.light.tint, fontSize: 12 },
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
              backgroundColor: "#f5f5f5",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
            }}
          >
            <Text style={{ fontSize: 10, color: "#666" }}>{r.title}</Text>
          </View>
        ))}
        {item.roles.length > 3 && (
          <Text style={{ fontSize: 10, color: "#999", alignSelf: "center" }}>
            +{item.roles.length - 3} autres
          </Text>
        )}
      </View>

      <Text style={styles.ctaText}>Voir le projet →</Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  projectTitle: { fontSize: 16, fontWeight: "bold", color: "#333" },
  projectSubtitle: { fontSize: 12, color: "#999", marginTop: 2 },
  badge: {
    backgroundColor: "#f3e5f5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, color: Colors.light.primary, fontWeight: "bold" },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 12 },
  ctaText: {
    color: Colors.light.primary,
    fontWeight: "bold",
    textAlign: "right",
    fontSize: 12,
    marginTop: 5,
  },
});
