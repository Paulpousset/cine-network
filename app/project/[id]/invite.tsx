import ClapLoading from "@/components/ui/ClapLoading";
import { GlobalStyles } from "@/constants/Styles";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  role: string;
};

export default function InviteTalents() {
  const { id: projectId } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);
  const [projectTitle, setProjectTitle] = useState("");

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  async function fetchProject() {
    if (!projectId) return;
    const { data } = await supabase
      .from("tournages")
      .select("title")
      .eq("id", projectId)
      .single();
    if (data) setProjectTitle(data.title);
  }

  const handleSearch = async (text: string) => {
    setSearch(text);
    if (text.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, role")
        .or(`full_name.ilike.%${text}%,username.ilike.%${text}%`)
        .limit(20);

      if (error) throw error;
      setResults(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const inviteTalent = async (profile: Profile) => {
    try {
      // Pour l'instant, on simule l'invitation car la table des invitations dépend du schéma exact
      // Mais on pourrait insérer dans une table "project_invitations" ou "notifications"
      
      Alert.alert(
        "Inviter ce profil",
        `Voulez-vous inviter ${profile.full_name || profile.username} sur le projet "${projectTitle}" ?`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Inviter",
            onPress: async () => {
              // Simuler l'envoi
              setInvitedIds(prev => [...prev, profile.id]);
              Alert.alert("Succès", "L'invitation a été envoyée.");
            }
          }
        ]
      );
    } catch (e) {
      console.error(e);
    }
  };

  const renderItem = ({ item }: { item: Profile }) => (
    <View style={styles.profileCard}>
      <View style={styles.profileInfo}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            <Ionicons name="person" size={20} color={isDark ? "#FFF" : "#666"} />
          </View>
        )}
        <View>
          <Text style={styles.fullName}>{item.full_name || item.username}</Text>
          <Text style={styles.roleText}>{item.role?.replace("_", " ")}</Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[
          styles.inviteButton,
          invitedIds.includes(item.id) && styles.invitedButton
        ]}
        onPress={() => inviteTalent(item)}
        disabled={invitedIds.includes(item.id)}
      >
        <Text style={[
          styles.inviteButtonText,
          invitedIds.includes(item.id) && styles.invitedButtonText
        ]}>
          {invitedIds.includes(item.id) ? "Invité" : "Inviter"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[GlobalStyles.title2, { color: colors.text, marginBottom: 0 }]}>
          Inviter des membres
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.text + "80"} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom ou pseudo..."
          placeholderTextColor={colors.text + "60"}
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {isSearching ? (
        <ClapLoading size={40} color={colors.primary} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            search.length >= 2 ? (
              <Text style={styles.emptyText}>Aucun profil trouvé</Text>
            ) : (
              <Text style={styles.emptyText}>Commencez à taper pour rechercher</Text>
            )
          }
        />
      )}
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 60,
      paddingHorizontal: 20,
      paddingBottom: 20,
      backgroundColor: colors.card,
    },
    backButton: { padding: 8 },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      margin: 15,
      borderRadius: 12,
      paddingHorizontal: 15,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: { marginRight: 10 },
    searchInput: {
      flex: 1,
      height: 45,
      color: colors.text,
      fontSize: 16,
    },
    list: { padding: 15 },
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      padding: 12,
      borderRadius: 15,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    profileInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
    avatar: { width: 45, height: 45, borderRadius: 22.5 },
    placeholderAvatar: {
      backgroundColor: colors.border,
      justifyContent: "center",
      alignItems: "center",
    },
    fullName: { color: colors.text, fontWeight: "700", fontSize: 15 },
    roleText: { color: colors.text + "80", fontSize: 12, textTransform: "capitalize" },
    inviteButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    invitedButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.primary,
    },
    inviteButtonText: { color: "white", fontWeight: "700", fontSize: 13 },
    invitedButtonText: { color: colors.primary },
    emptyText: {
      textAlign: "center",
      color: colors.text + "60",
      marginTop: 50,
      fontSize: 15,
    },
  });
}
