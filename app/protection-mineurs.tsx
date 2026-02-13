import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProtectionMineurs() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  const handleReportPress = () => {
    Linking.openURL("mailto:support@titapp.fr?subject=Signalement - Protection des mineurs");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Protection des mineurs",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Politique de Protection des Mineurs</Text>

        <Text style={styles.sectionTitle}>
          Qu'entendez-vous par "exploitation et abus sexuels sur mineurs" ?
        </Text>
        <Text style={styles.text}>
          Cela renvoie à des pratiques ou contenus conçus pour ou consistant à exploiter sexuellement les mineurs, à abuser d'eux ou à les mettre en danger (par exemple, la sollicitation d'enfants à des fins d'exploitation sexuelle, la sextorsion, le trafic ou toute autre forme d'exploitation sexuelle des enfants).
        </Text>

        <Text style={styles.sectionTitle}>Engagement de Tita</Text>
        <Text style={styles.text}>
          La sécurité de notre communauté est notre priorité absolue. Tita applique une politique de tolérance zéro envers tout contenu ou comportement impliquant l'exploitation ou l'abus sexuel sur mineurs.
        </Text>

        <Text style={styles.sectionTitle}>Comment signaler ?</Text>
        <Text style={styles.text}>
          Si vous constatez un contenu ou un comportement suspect, nous vous prions de le signaler immédiatement via l'un des canaux suivants :
        </Text>
        
        <View style={styles.list}>
          <Text style={styles.listItem}>
            • Utilisez le bouton "Signaler" présent sur chaque publication ou profil d'utilisateur.
          </Text>
          <TouchableOpacity onPress={handleReportPress}>
            <Text style={[styles.listItem, { color: colors.primary, fontWeight: 'bold' }]}>
              • Envoyez un email à support@titapp.fr précisant l'objet : "Signalement - Protection des mineurs".
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.text}>
          Tous les signalements sont traités en priorité. Toute violation entraînera la suppression immédiate du compte et, le cas échéant, un signalement aux autorités compétentes.
        </Text>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 20,
      color: colors.primary,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginTop: 20,
      marginBottom: 10,
      color: colors.text,
    },
    text: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.text + "CC",
      marginBottom: 10,
    },
    list: {
      marginLeft: 10,
      marginBottom: 10,
    },
    listItem: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.text + "CC",
      marginBottom: 8,
    },
  });
}
