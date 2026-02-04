import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface TalentCardProps {
  item: any;
}

export const TalentCard = React.memo(({ item }: TalentCardProps) => {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={GlobalStyles.card}
      onPress={() =>
        router.push({ pathname: "/profile/[id]", params: { id: item.id } })
      }
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>
              {(item.full_name || item.username || "?").charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Text style={GlobalStyles.title2}>
            {item.full_name || item.username || "Profil"}
          </Text>
          <Text style={[styles.role, { color: Colors.light.primary }]}>
            {(item.role || "").toString().replace("_", " ")}
          </Text>
          {(item.city || item.ville || item.location) && (
            <Text style={GlobalStyles.caption}>
              📍 {item.city || item.ville || item.location}
            </Text>
          )}
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={Colors.light.tabIconDefault}
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
    backgroundColor: Colors.light.primary,
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
