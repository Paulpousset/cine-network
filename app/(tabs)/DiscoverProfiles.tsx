import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { supabase } from "../../lib/supabase";
import { JOB_TITLES } from "../utils/roles";

const ROLE_CATEGORIES = ["all", ...Object.keys(JOB_TITLES)];

export default function DiscoverProfiles() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [query, setQuery] = useState<string>(""); // recherche libre (ville / nom)

  useEffect(() => {
    fetchProfiles();
  }, [selectedRole, query]);

  async function fetchProfiles() {
    try {
      setLoading(true);

      // On récupère d'abord, avec filtre role côté serveur si possible
      let q = supabase.from("profiles").select("*");
      if (selectedRole !== "all") q = q.eq("role", selectedRole);

      const { data, error } = await q;
      if (error) throw error;

      const list = (data as any[]) || [];

      // Filtrage client-side pour la query (ville / nom / username)
      const normalized = query.trim().toLowerCase();
      const filtered = normalized
        ? list.filter((p) => {
            const name =
              `${p.full_name || ""} ${p.username || ""}`.toLowerCase();
            const city = (p.city || p.ville || p.location || p.website || "")
              .toString()
              .toLowerCase();
            return name.includes(normalized) || city.includes(normalized);
          })
        : list;

      setProfiles(filtered);
    } catch (error) {
      Alert.alert("Erreur", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function renderProfile({ item }: { item: any }) {
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>
            {item.full_name || item.username || "Profil"}
          </Text>
          <Text style={styles.role}>
            {(item.role || "").toString().replace("_", " ")}
          </Text>
          <Text style={styles.meta}>
            {item.city || item.ville || item.location || item.website || ""}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            router.push({ pathname: "/profile/[id]", params: { id: item.id } })
          }
        >
          <Text style={styles.cta}>Voir</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Découvrir des profils</Text>

      <View style={styles.filters}>
        <FlatList
          data={ROLE_CATEGORIES}
          keyExtractor={(cat) => cat}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item: cat }) => (
            <TouchableOpacity
              style={[styles.chip, selectedRole === cat && styles.chipSelected]}
              onPress={() => setSelectedRole(cat)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedRole === cat && styles.chipTextSelected,
                ]}
              >
                {cat === "all"
                  ? "Tous"
                  : cat.charAt(0).toUpperCase() +
                    cat.slice(1).replace("_", " ")}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.searchRow}>
        <TextInput
          placeholder="Recherche par ville, nom ou pseudo..."
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
        />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#841584"
          style={{ marginTop: 30 }}
        />
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          renderItem={renderProfile}
          contentContainerStyle={{ padding: 15, paddingBottom: 120 }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 50, color: "#999" }}>
              Aucun profil trouvé.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    padding: 20,
    paddingTop: 60,
    backgroundColor: "white",
  },
  filters: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: "white",
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#eee",
    marginRight: 8,
  },
  chipSelected: { backgroundColor: "#841584" },
  chipText: { color: "#666", fontWeight: "600" },
  chipTextSelected: { color: "white" },
  searchRow: { padding: 15, backgroundColor: "#f8f9fa" },
  searchInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "white",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  name: { fontSize: 16, fontWeight: "700" },
  role: { color: "#841584", marginTop: 4, fontWeight: "600" },
  meta: { color: "#666", marginTop: 6, fontSize: 12 },
  cta: { color: "#841584", fontWeight: "700" },
});
