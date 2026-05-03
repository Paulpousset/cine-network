import ClapLoading from "@/components/ui/ClapLoading";
import { GlobalStyles } from "@/constants/Styles";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
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

type Profile = {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  role: string;
  city?: string;
};

export default function FindProfiles() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);

  // Chargement initial des profils recommandés ou récents
  useEffect(() => {
    fetchInitialProfiles();
  }, []);

  async function fetchInitialProfiles() {
    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, role, city")
        .limit(10)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  }

  const handleSearch = async (text: string) => {
    setSearch(text);
    if (text.length === 0) {
      fetchInitialProfiles();
      return;
    }
    if (text.length < 2) return;

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, role, city")
        .or(`full_name.ilike.%${text}%,username.ilike.%${text}%`)
        .limit(30);

      if (error) throw error;
      setResults(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSearching(false);
    }
  };

  const inviteTalent = (profile: Profile) => {
    Alert.alert(
      "Inviter ce profil",
      `Voulez-vous envoyer une invitation à ${profile.full_name || profile.username} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Inviter",
          onPress: () => {
            setInvitedIds(prev => [...prev, profile.id]);
            Alert.alert("Succès", "L'invitation a été envoyée.");
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Profile }) => (
    <TouchableOpacity 
      style={styles.profileCard}
      onPress={() => router.push(`/profile/${item.id}`)}
    >
      <View style={styles.profileInfo}>
        {item.avatar_url ? (
          <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.placeholderAvatar]}>
            <Ionicons name="person" size={24} color={isDark ? "#FFF" : "#666"} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.fullName}>{item.full_name || item.username}</Text>
          <View style={styles.roleContainer}>
            <Text style={styles.roleText}>{item.role?.replace("_", " ")}</Text>
            {item.city && (
              <Text style={styles.locationText}> • {item.city}</Text>
            )}
          </View>
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
        <Ionicons 
            name={invitedIds.includes(item.id) ? "checkmark" : "person-add"} 
            size={18} 
            color={invitedIds.includes(item.id) ? colors.primary : "white"} 
        />
        <Text style={[
          styles.inviteButtonText,
          invitedIds.includes(item.id) && styles.invitedButtonText
        ]}>
          {invitedIds.includes(item.id) ? "Invité" : "Inviter"}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[GlobalStyles.title2, { color: colors.text, marginBottom: 5 }]}>
            Trouver des talents
          </Text>
          <Text style={styles.subtitle}>
            Recherchez et recrutez des profils pour vos productions
          </Text>
        </View>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={22} color={colors.text + "80"} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Nom, pseudo, métier..."
            placeholderTextColor={colors.text + "60"}
            value={search}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      {isSearching ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
            <ClapLoading size={50} color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          numColumns={1}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="person-outline" size={60} color={colors.text + "20"} />
              <Text style={styles.emptyText}>
                {search.length >= 2 ? "Aucun profil ne correspond à votre recherche" : "Commencez à taper pour rechercher des profils"}
              </Text>
            </View>
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
      paddingTop: 60,
      paddingHorizontal: 25,
      paddingBottom: 20,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    subtitle: {
      color: colors.text + "80",
      fontSize: 14,
    },
    searchSection: {
      backgroundColor: colors.card,
      paddingHorizontal: 20,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? colors.backgroundSecondary : "#F1F5F9",
      borderRadius: 15,
      paddingHorizontal: 15,
      height: 50,
    },
    searchIcon: { marginRight: 12 },
    searchInput: {
      flex: 1,
      height: "100%",
      color: colors.text,
      fontSize: 16,
      fontWeight: "500",
    },
    list: { padding: 20, paddingBottom: 100 },
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.card,
      padding: 15,
      borderRadius: 20,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
      elevation: 2,
    },
    profileInfo: { flexDirection: "row", alignItems: "center", gap: 15, flex: 1 },
    avatar: { width: 55, height: 55, borderRadius: 20 },
    placeholderAvatar: {
      backgroundColor: isDark ? colors.backgroundSecondary : "#E2E8F0",
      justifyContent: "center",
      alignItems: "center",
    },
    fullName: { color: colors.text, fontWeight: "700", fontSize: 17, marginBottom: 2 },
    roleContainer: { flexDirection: 'row', alignItems: 'center' },
    roleText: { 
        color: colors.primary, 
        fontSize: 13, 
        fontWeight: "600",
        textTransform: "capitalize" 
    },
    locationText: { color: colors.text + "60", fontSize: 13 },
    inviteButton: {
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderRadius: 12,
    },
    invitedButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.primary,
    },
    inviteButtonText: { color: "white", fontWeight: "700", fontSize: 13 },
    invitedButtonText: { color: colors.primary },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
        paddingHorizontal: 40,
    },
    emptyText: {
      textAlign: "center",
      color: colors.text + "40",
      marginTop: 20,
      fontSize: 16,
      lineHeight: 22,
    },
  });
}
