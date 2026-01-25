import ClapLoading from "@/components/ClapLoading";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

export default function ProjectTeam() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [team, setTeam] = useState<any[]>([]);

  useEffect(() => {
    fetchTeam();
  }, [id]);

  async function fetchTeam() {
    if (!id || id === "undefined") return;
    try {
      setLoading(true);
      // Fetch roles that have an assigned profile
      const { data, error } = await supabase
        .from("project_roles")
        .select(
          `
          id,
          title,
          category,
          assigned_profile:profiles (
            id,
            full_name,
            username,
            avatar_url,
            role,
            ville
          )
        `,
        )
        .eq("tournage_id", id)
        .not("assigned_profile_id", "is", null);

      if (error) throw error;
      setTeam(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const renderItem = ({ item }: { item: any }) => {
    const profile = item.assigned_profile;
    const name = profile?.full_name || profile?.username || "Inconnu";
    const roleTitle = item.title;
    const category = item.category;

    return (
      <View style={GlobalStyles.card}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={GlobalStyles.title2}>{name}</Text>
          <Text style={styles.roleTitle}>{roleTitle}</Text>
          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{category}</Text>
            </View>
            {profile?.ville && (
              <Text style={styles.cityText}>📍 {profile.ville}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/profile/[id]",
              params: { id: profile.id },
            })
          }
        >
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={GlobalStyles.title1}>L'Équipe du Film</Text>
      </View>

      {loading ? (
        <ClapLoading
          size={50}
          color={Colors.light.primary}
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={team}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: "#666", marginTop: 50 }}>
              Aucun membre assigné pour le moment.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundSecondary },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.light.background,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
  },
  backButton: { marginRight: 15 },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.light.tint,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "bold", color: Colors.light.primary },
  roleTitle: { fontSize: 14, color: Colors.light.text, marginBottom: 5 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  badgeText: { fontSize: 10, color: Colors.light.text, fontWeight: "600" },
  cityText: { fontSize: 12, color: "#999" },
});
