import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";
import { JOB_TITLES } from "../utils/roles"; // Assure-toi que le chemin est bon

// On récupère les clés de ton fichier rolesList.ts
const ROLE_CATEGORIES = ["all", ...Object.keys(JOB_TITLES)];

// Type enrichi avec les infos du tournage
type RoleWithProject = {
  id: string;
  title: string;
  description?: string;
  category: string;
  quantity_needed: number;
  tournage_id: string;
  tournages: {
    title: string;
    type: string;
    pays?: string | null;
    ville?: string | null;
  };
};

export default function Discover() {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    fetchRoles();
  }, [selectedCategory]);

  async function fetchRoles() {
    try {
      setLoading(true);

      // 1. LA REQUÊTE MAGIQUE (JOINTURE)
      // On sélectionne les rôles ET les infos du tournage lié
      let query = supabase
        .from("project_roles")
        .select(
          `
          *,
          tournages ( title, type, pays, ville )
        `,
        )
        .order("created_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Filter out draft roles client-side to handle nulls gracefully
      const visible = ((data as any[]) || []).filter(
        (r) => r.status !== "draft",
      );
      setRoles(visible);
    } catch (error) {
      Alert.alert("Erreur", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function renderRole({ item }: { item: RoleWithProject }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/project/${item.tournage_id}`)}
      >
        {/* En-tête avec le nom du PROJET */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.projectTitle}>
              {item.tournages?.title || "Projet Inconnu"}
            </Text>
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

        {/* Corps avec le RÔLE recherché */}
        <Text style={styles.roleTitle}>{item.title}</Text>
        <Text style={styles.roleQty}>
          Recherche : {item.quantity_needed} personne(s)
        </Text>

        {item.description ? (
          <Text style={styles.roleDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <Text style={styles.ctaText}>Voir l'annonce →</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* FILTRES AVEC SCROLL HORIZONTAL */}
      <View style={{ height: 60 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {ROLE_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                selectedCategory === cat && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === cat && styles.filterChipTextSelected,
                ]}
              >
                {cat === "all"
                  ? "Tout"
                  : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#841584"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={roles}
          keyExtractor={(item) => item.id}
          renderItem={renderRole}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucun casting pour le moment.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 10,
    backgroundColor: "white",
  },

  filterContainer: { paddingHorizontal: 15, alignItems: "center", gap: 10 },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#eee",
    marginRight: 5,
  },
  filterChipSelected: { backgroundColor: "#841584" },
  filterChipText: { color: "#666", fontWeight: "600" },
  filterChipTextSelected: { color: "white" },

  listContent: { padding: 15, paddingBottom: 100 },
  emptyText: { textAlign: "center", marginTop: 50, color: "#999" },

  // CARD DESIGN
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
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
  badgeText: { fontSize: 10, color: "#841584", fontWeight: "bold" },

  divider: { height: 1, backgroundColor: "#eee", marginVertical: 12 },

  roleTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#841584",
    marginBottom: 4,
  },
  roleQty: { fontSize: 13, color: "#666", marginBottom: 8 },
  roleDesc: {
    fontSize: 13,
    color: "#444",
    fontStyle: "italic",
    marginBottom: 10,
  },
  ctaText: {
    color: "#841584",
    fontWeight: "bold",
    textAlign: "right",
    fontSize: 12,
    marginTop: 5,
  },
});
