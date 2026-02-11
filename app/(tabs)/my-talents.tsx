import ClapLoading from "@/components/ClapLoading";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { useUserMode } from "@/hooks/useUserMode";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function MyTalents() {
  const router = useRouter();
  const { setImpersonatedUser, effectiveUserId } = useUserMode();
  const [loading, setLoading] = useState(true);
  const [talents, setTalents] = useState<any[]>([]);
  const [pendingMandates, setPendingMandates] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAgent, setIsAgent] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await checkRole();
      await fetchTalents();
      setLoading(false);
    };
    init();
  }, []);

  async function checkRole() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (profile?.role === "agent") {
      setIsAgent(true);
    }
  }

  async function fetchTalents() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;

      // Accepted mandates
      const { data: accepted } = await supabase
        .from("agent_mandates")
        .select("id, status, talent:profiles!talent_id(*)")
        .eq("agent_id", userId)
        .eq("status", "accepted");

      // Pending mandates (sent by me)
      const { data: pending } = await supabase
        .from("agent_mandates")
        .select("id, status, created_at, talent:profiles!talent_id(*)")
        .eq("agent_id", userId)
        .eq("status", "pending");

      if (accepted) setTalents(accepted.map((m) => m.talent));
      if (pending) setPendingMandates(pending);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchTalents();
  };

  function handleSelectTalent(talent: any) {
    setImpersonatedUser(talent);
    Alert.alert(
      "Mode gestion activé",
      `Vous agissez maintenant en tant que ${talent.full_name || talent.username}.`,
      [{ text: "OK", onPress: () => router.push("/(tabs)/jobs") }],
    );
  }

  if (loading)
    return (
      <ClapLoading
        size={40}
        color={Colors.light.primary}
        style={{ marginTop: 50 }}
      />
    );

  if (!isAgent) {
    return <Redirect href="/my-projects" />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={talents}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={() => (
          <View style={{ padding: 20 }}>
            <Text style={GlobalStyles.title1}>Mes Talents</Text>
            <Text style={styles.subtitle}>
              Sélectionnez un talent pour agir en son nom.
            </Text>

            {pendingMandates.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <Text style={styles.sectionTitle}>
                  Demandes en attente ({pendingMandates.length})
                </Text>
                {pendingMandates.map((m) => (
                  <View key={m.id} style={styles.pendingCard}>
                    <Image
                      source={{ uri: m.talent.avatar_url }}
                      style={styles.avatarSmall}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.talentName}>
                        {m.talent.full_name || m.talent.username}
                      </Text>
                      <Text style={styles.pendingStatus}>
                        En attente d'acceptation
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {talents.length === 0 && pendingMandates.length === 0 && (
              <View
                style={[
                  GlobalStyles.card,
                  { marginTop: 20, alignItems: "center" },
                ]}
              >
                <Ionicons name="people-outline" size={48} color="#999" />
                <Text
                  style={{ marginTop: 10, textAlign: "center", color: "#666" }}
                >
                  Vous ne gérez aucun talent pour le moment.
                  {"\n"}Rendez-vous sur les profils des acteurs pour demander un
                  mandat de gestion.
                </Text>
              </View>
            )}

            {talents.length > 0 && (
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                Talents sous mandat
              </Text>
            )}
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.talentCard}
            onPress={() => handleSelectTalent(item)}
          >
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.talentName}>
                {item.full_name || item.username}
              </Text>
              <Text style={styles.talentRole}>{item.role}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 20,
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
  },
  talentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    borderStyle: "dashed",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  talentName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  talentRole: {
    fontSize: 12,
    color: Colors.light.primary,
    marginTop: 2,
  },
  pendingStatus: {
    fontSize: 11,
    color: "#FF9800",
    fontWeight: "500",
  },
});
