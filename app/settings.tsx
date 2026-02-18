import { useUserMode } from "@/hooks/useUserMode";
import { supabase } from "@/lib/supabase";
import { ACCENT_COLORS, AccentColor, useTheme } from "@/providers/ThemeProvider";
import { useTutorial } from "@/providers/TutorialProvider";
import { useUser } from "@/providers/UserProvider";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
    Alert,
    Linking,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

export default function Settings() {
  const router = useRouter();
  const { themeMode, setThemeMode, accentColor, setAccentColor, colors, isDark } = useTheme();
  const { startTutorial, isLoading: isTutorialLoading } = useTutorial();
  const { user, profile, refreshProfile } = useUser();
  const { effectiveUserId, isImpersonating } = useUserMode();
  const [deleting, setDeleting] = React.useState(false);

  const getActivationDate = () => {
    // Si une date spécifique d'activation existe, on l'utilise, sinon updated_at
    const dateStr = (profile as any)?.subscription_activated_at || profile?.updated_at;
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const getExpiryDate = () => {
    // Calcule +1 mois à partir de la date d'activation
    const dateStr = (profile as any)?.subscription_activated_at || profile?.updated_at;
    const startDate = dateStr ? new Date(dateStr) : new Date();
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + 1);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundSecondary },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    card: {
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    settingRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
    },
    settingInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    settingText: {
        fontSize: 16,
        color: colors.text,
        fontWeight: "500",
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: 4,
    }
  });

  const handleSupport = () => {
    const subject = `Support Tita : (${effectiveUserId})`;
    const body = `Bonjour l'équipe Tita,\n\nJe souhaite vous signaler le problème suivant :\n\n- Ma version : ${Platform.OS}\n- Mon ID : ${effectiveUserId}\n\nDescription :\n`;

    if (Platform.OS === "web") {
      Linking.openURL(
        `mailto:support@titapp.fr?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      );
    } else {
      Alert.alert(
        "Signaler un problème",
        "Souhaitez-vous contacter le support pour signaler un bug ou une suggestion ?",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Contacter",
            onPress: () => {
              Linking.openURL(
                `mailto:support@titapp.fr?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
              );
            },
          },
        ]
      );
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = async () => {
      setDeleting(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const userId = session.user.id;
          
          // 0. Delete public profile settings
          await supabase.from("public_profile_settings").delete().eq("id", userId);

          // 1. Delete connections
          await supabase.from("connections").delete().or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

          // 2. Delete applications
          await supabase.from("applications").delete().eq("candidate_id", userId);

          // 3. Delete posts
          await supabase.from("posts").delete().eq("user_id", userId);

          // 4. Delete project likes
          await supabase.from("project_likes").delete().eq("user_id", userId);

          // 5. Delete direct messages
          await supabase.from("direct_messages").delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

          // 6. Delete project messages
          await supabase.from("project_messages").delete().eq("sender_id", userId);

          // 7. Delete project files
          await supabase.from("project_files").delete().eq("uploader_id", userId);

          // 7.5 Unassign from Project Roles & Inventory
          await supabase.from("project_roles").update({ assigned_profile_id: null }).eq("assigned_profile_id", userId);
          await supabase.from("project_inventory").update({ assigned_to: null }).eq("assigned_to", userId);

          // 8. Delete projects owned by user
          await supabase.from("tournages").delete().eq("owner_id", userId);

          // 9. Finally delete profile
          const { error } = await supabase.from("profiles").delete().eq("id", userId);
          if (error) throw error;

          // 10. Delete Auth User (requires delete_user RPC function)
          await supabase.rpc("delete_user");

          const successTitle = "Compte supprimé";
          const successMsg = "Votre compte et vos données ont été supprimés avec succès.";

          if (Platform.OS === "web") {
            window.alert(`${successTitle}\n\n${successMsg}`);
          } else {
            Alert.alert(successTitle, successMsg);
          }

          await supabase.auth.signOut();
          router.replace("/");
        }
      } catch (error: any) {
        const errTitle = "Erreur";
        const errMsg = "Impossible de supprimer le compte: " + (error.message || JSON.stringify(error));
        if (Platform.OS === "web") {
          window.alert(`${errTitle}\n\n${errMsg}`);
        } else {
          Alert.alert(errTitle, errMsg);
        }
      } finally {
        setDeleting(false);
      }
    };

    if (Platform.OS === "web") {
      if (
        window.confirm(
          "ATTENTION : Cette action est IRREVERSIBLE. Toutes vos données, projets, messages et candidatures seront supprimés définitivement. Souhaitez-vous continuer ?",
        )
      ) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        "Zone de Danger : Suppression du compte",
        "ATTENTION : Cette action est IRREVERSIBLE. Toutes vos données (profil, projets créés, messages, participations) seront supprimées définitivement.\n\nSouhaitez-vous vraiment continuer ?",
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "SUPPRIMER DÉFINITIVEMENT",
            style: "destructive",
            onPress: confirmDelete,
          },
        ],
      );
    }
  };

  const handleCancelSubscription = async () => {
    const expiryDate = getExpiryDate();
    if (Platform.OS === "web") {
      const confirm = window.confirm(
        `Souhaitez-vous résilier votre abonnement Studio Pro ?\n\nNote : Vous conserverez tous vos avantages jusqu'au ${expiryDate}.`
      );
      if (confirm) {
        try {
          const { error } = await supabase
            .from("profiles")
            .update({ subscription_tier: "free" })
            .eq("id", effectiveUserId);

          if (error) throw error;
          window.alert(`Votre abonnement a été résilié. Vous conserverez vos accès Studio Pro jusqu'au ${expiryDate}.`);
          refreshProfile();
        } catch (e) {
          window.alert("Erreur lors de la résiliation.");
        }
      }
    } else {
      Alert.alert(
        "Résilier l'abonnement Studio Pro",
        `Êtes-vous sûr de vouloir résilier votre abonnement ? Vous conserverez tous vos avantages Studio Pro jusqu'au ${expiryDate}.`,
        [
          { text: "Garder mon abonnement", style: "cancel" },
          {
            text: "Confirmer la résiliation",
            style: "destructive",
            onPress: async () => {
              try {
                const { error } = await supabase
                  .from("profiles")
                  .update({ subscription_tier: "free" })
                  .eq("id", effectiveUserId);

                if (error) throw error;
                
                Alert.alert(
                  "Abonnement résilié",
                  `Votre abonnement a été résilié. Vous conserverez vos accès Studio Pro jusqu'au ${expiryDate}.`
                );
                refreshProfile(); 
              } catch (e) {
                Alert.alert("Erreur", "Impossible de résilier l'abonnement.");
              }
            },
          },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: "Réglages",
        headerShown: true,
        headerTintColor: colors.tint,
        headerStyle: { backgroundColor: colors.background }
      }} />

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* PROFIL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() =>
                router.push("/account")
              }
            >
              <View style={styles.settingInfo}>
                <Ionicons
                  name="person-outline"
                  size={22}
                  color={colors.primary}
                />
                <Text style={styles.settingText}>Modifier mon profil</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.settingRow}
              onPress={() =>
                router.push("/notification-settings")
              }
            >
              <View style={styles.settingInfo}>
                <Ionicons
                  name="notifications-outline"
                  size={22}
                  color={colors.primary}
                />
                <Text style={styles.settingText}>Notifications Push</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>


        {/* THÈME */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personnalisation</Text>
          <View style={styles.card}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 10 }}>Mode d'affichage</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                {(['light', 'dark', 'system'] as const).map((m) => (
                <TouchableOpacity
                    key={m}
                    onPress={() => setThemeMode(m)}
                    style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: themeMode === m ? colors.primary : colors.border,
                    backgroundColor: themeMode === m ? colors.primary + '10' : 'transparent',
                    alignItems: 'center',
                    }}
                >
                    <Text style={{ 
                        color: themeMode === m ? colors.primary : isDark ? '#AAA' : '#666',
                        fontWeight: themeMode === m ? '700' : '500',
                        textTransform: 'capitalize'
                    }}>
                    {m === 'light' ? 'Clair' : m === 'dark' ? 'Sombre' : 'Système'}
                    </Text>
                </TouchableOpacity>
                ))}
            </View>

            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 10 }}>Couleur d'accentuation</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((color) => (
                <TouchableOpacity
                    key={color}
                    onPress={() => setAccentColor(color)}
                    style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: ACCENT_COLORS[color].light,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 3,
                    borderColor: accentColor === color ? colors.text : 'transparent'
                    }}
                >
                    {accentColor === color && (
                    <Ionicons name="checkmark" size={24} color="white" />
                    )}
                </TouchableOpacity>
                ))}
            </View>
          </View>
        </View>

        {/* ASSISTANCE & AIDE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assistance & Aide</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRow} onPress={handleSupport}>
                <View style={styles.settingInfo}>
                    <Ionicons name="bug-outline" size={22} color={colors.danger} />
                    <Text style={styles.settingText}>Signaler un problème</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity style={styles.settingRow} onPress={() => startTutorial()}>
                <View style={styles.settingInfo}>
                    <Ionicons name="help-circle-outline" size={22} color={colors.primary} />
                    <Text style={styles.settingText}>Revoir le tutoriel</Text>
                </View>
                {isTutorialLoading && <Text style={{ fontSize: 12, color: colors.textSecondary }}>Chargement...</Text>}
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* LÉGAL */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Légal</Text>
          <View style={styles.card}>
            <TouchableOpacity 
                style={styles.settingRow} 
                onPress={() => router.push("/charte-confidentialite")}
            >
                <View style={styles.settingInfo}>
                    <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
                    <Text style={styles.settingText}>Charte de confidentialité</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity 
                style={styles.settingRow} 
                onPress={() => router.push("/privacy-policy")}
            >
                <View style={styles.settingInfo}>
                    <Ionicons name="shield-checkmark-outline" size={22} color={colors.primary} />
                    <Text style={styles.settingText}>Privacy Policy (En)</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
                style={styles.settingRow} 
                onPress={() => router.push("/protection-mineurs")}
            >
                <View style={styles.settingInfo}>
                    <Ionicons name="person-outline" size={22} color={colors.primary} />
                    <Text style={styles.settingText}>Protection des mineurs</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ZONE DE DANGER */}
        {!isImpersonating && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.danger }]}>Zone de Danger</Text>
            <View style={[styles.card, { borderColor: colors.danger, borderWidth: 1 }]}>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 15 }}>
                    La suppression du compte est définitive. Toutes vos données seront effacées de nos serveurs sans possibilité de récupération.
                </Text>
                <TouchableOpacity 
                    style={[styles.settingRow, { justifyContent: 'center', backgroundColor: colors.danger + '10', borderRadius: 10 }]} 
                    onPress={handleDeleteAccount}
                    disabled={deleting}
                >
                    <View style={styles.settingInfo}>
                        <Ionicons name="trash-outline" size={22} color={colors.danger} />
                        <Text style={[styles.settingText, { color: colors.danger, fontWeight: '700' }]}>
                            {deleting ? "Suppression en cours..." : "Supprimer toutes mes données"}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
          </View>
        )}

        {/* COMPTE */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>
          <View style={styles.card}>
            <TouchableOpacity 
                style={styles.settingRow} 
                onPress={async () => {
                    await supabase.auth.signOut();
                    router.replace("/");
                }}
            >
                <View style={styles.settingInfo}>
                    <Ionicons name="log-out-outline" size={22} color={colors.danger} />
                    <Text style={[styles.settingText, { color: colors.danger }]}>Se déconnecter</Text>
                </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 40 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Version 1.0.0</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>© 2026 Cine Network</Text>
        </View>

      </ScrollView>
    </View>
  );
}
