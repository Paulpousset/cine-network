import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Button,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function ProfileDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tournages, setTournages] = useState<any[]>([]);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  async function fetchProfile() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setProfile(data);
      // fetch previous tournages for this user
      const { data: tours, error: errTours } = await supabase
        .from("tournages")
        .select("id, title, type, created_at")
        .eq("owner_id", id)
        .order("created_at", { ascending: false });
      if (!errTours) setTournages(tours || []);
    } catch (error) {
      Alert.alert("Erreur", (error as Error).message);
      router.back();
    } finally {
      setLoading(false);
    }
  }

  if (loading)
    return <ActivityIndicator style={{ marginTop: 50 }} color="#841584" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={{ marginBottom: 10 }}
      >
        <Text style={{ color: "#841584" }}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.name}>
        {profile?.full_name || profile?.username || "Profil"}
      </Text>
      <Text style={styles.role}>
        {(profile?.role || "").toString().replace("_", " ")}
      </Text>

      {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Ville :</Text>
        <Text style={styles.metaValue}>
          {profile?.city || profile?.ville || profile?.location || "—"}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Site / Contact :</Text>
        <Text style={styles.metaValue}>{profile?.website || "—"}</Text>
      </View>

      <View style={{ height: 30 }} />
      <Button
        title="Contacter"
        color="#841584"
        onPress={() => Alert.alert("Contact", "Fonction non implémentée")}
      />

      {tournages.length ? (
        <>
          <View style={{ height: 20 }} />
          <Text style={{ fontWeight: "700", marginBottom: 8 }}>
            Tournages précédents
          </Text>
          {tournages.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={{
                padding: 10,
                backgroundColor: "#fff",
                borderRadius: 8,
                marginBottom: 8,
              }}
              onPress={() =>
                router.push({ pathname: "/project/[id]", params: { id: t.id } })
              }
            >
              <Text style={{ fontWeight: "700" }}>{t.title}</Text>
              <Text style={{ color: "#666", fontSize: 12 }}>
                {t.type.replace("_", " ")} •{" "}
                {new Date(t.created_at).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 60 },
  name: { fontSize: 24, fontWeight: "bold", marginBottom: 6 },
  role: { color: "#841584", fontWeight: "700", marginBottom: 12 },
  bio: { color: "#444", marginBottom: 12 },
  metaRow: { flexDirection: "row", marginBottom: 8 },
  metaLabel: { fontWeight: "700", width: 110 },
  metaValue: { color: "#666", flex: 1 },
});
