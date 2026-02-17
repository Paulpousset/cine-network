
import { useTheme } from "@/providers/ThemeProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";

const SETTINGS_KEY = "user_notification_preferences";

interface NotificationPreferences {
  messages: boolean;
  connections: boolean;
  project_invitations: boolean;
  applications: boolean;
  project_messages: boolean;
  likes: boolean;
  comments: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  messages: true,
  connections: true,
  project_invitations: true,
  applications: true,
  project_messages: true,
  likes: true,
  comments: true,
};

export default function NotificationSettings() {
  const { colors, isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        setPreferences({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.error("Error loading notification preferences", e);
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = async (key: keyof NotificationPreferences) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPrefs);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newPrefs));
    } catch (e) {
      console.error("Error saving notification preferences", e);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    section: {
      marginTop: 20,
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text + "80",
      marginBottom: 8,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    card: {
      backgroundColor: colors.background,
      borderRadius: 12,
      overflow: "hidden",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowInfo: {
      flex: 1,
      marginRight: 16,
    },
    rowLabel: {
      fontSize: 16,
      fontWeight: "500",
      color: colors.text,
      marginBottom: 2,
    },
    rowDescription: {
      fontSize: 13,
      color: colors.text + "60",
    },
  });

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "Notifications Push",
          headerTransparent: false,
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.backgroundSecondary },
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Communication</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>Messages Directs</Text>
                <Text style={styles.rowDescription}>
                  Recevoir une notification quand vous recevez un message.
                </Text>
              </View>
              <Switch
                value={preferences.messages}
                onValueChange={() => togglePreference("messages")}
                trackColor={{ true: colors.primary }}
              />
            </View>
            <View style={[styles.row, styles.rowLast]}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>Réseau</Text>
                <Text style={styles.rowDescription}>
                  Demandes de connexion et acceptations.
                </Text>
              </View>
              <Switch
                value={preferences.connections}
                onValueChange={() => togglePreference("connections")}
                trackColor={{ true: colors.primary }}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activités Professionnelles</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>Invitations aux Projets</Text>
                <Text style={styles.rowDescription}>
                  Quand un recruteur vous propose un rôle.
                </Text>
              </View>
              <Switch
                value={preferences.project_invitations}
                onValueChange={() => togglePreference("project_invitations")}
                trackColor={{ true: colors.primary }}
              />
            </View>
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>Conversations de Projet</Text>
                <Text style={styles.rowDescription}>
                  Messages dans les espaces de discussion des projets.
                </Text>
              </View>
              <Switch
                value={preferences.project_messages}
                onValueChange={() => togglePreference("project_messages")}
                trackColor={{ true: colors.primary }}
              />
            </View>
            <View style={[styles.row, styles.rowLast]}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>Candidatures</Text>
                <Text style={styles.rowDescription}>
                  Nouvelles candidatures et résultats.
                </Text>
              </View>
              <Switch
                value={preferences.applications}
                onValueChange={() => togglePreference("applications")}
                trackColor={{ true: colors.primary }}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Interactions Sociales</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>Mentions J'aime</Text>
                <Text style={styles.rowDescription}>
                  Quand quelqu'un aime l'un de vos posts.
                </Text>
              </View>
              <Switch
                value={preferences.likes}
                onValueChange={() => togglePreference("likes")}
                trackColor={{ true: colors.primary }}
              />
            </View>
            <View style={[styles.row, styles.rowLast]}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowLabel}>Commentaires</Text>
                <Text style={styles.rowDescription}>
                  Quand quelqu'un commente l'un de vos posts.
                </Text>
              </View>
              <Switch
                value={preferences.comments}
                onValueChange={() => togglePreference("comments")}
                trackColor={{ true: colors.primary }}
              />
            </View>
          </View>
        </View>
        
        <View style={{ padding: 20, marginTop: 10 }}>
          <Text style={{ fontSize: 12, color: colors.text + "40", textAlign: "center" }}>
            Note: Ces réglages sont sauvegardés localement sur cet appareil.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
