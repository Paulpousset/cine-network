import Colors from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function LandingPage() {
  const router = useRouter();

  const handleSupport = () => {
    Linking.openURL("mailto:support@titapp.fr");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Navigation Header */}
      <View style={styles.header}>
        <Image
          source={require("@/assets/images/logo.jpg")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/auth")}
          >
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>
          La plateforme ultime pour les professionnels du cinéma
        </Text>
        <Text style={styles.heroSubtitle}>
          Gérez vos projets, trouvez des talents et collaborez en temps réel sur
          une seule interface.
        </Text>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push("/auth")}
        >
          <Text style={styles.ctaButtonText}>Commencer gratuitement</Text>
          <Ionicons
            name="arrow-forward"
            size={20}
            color="#fff"
            style={{ marginLeft: 10 }}
          />
        </TouchableOpacity>
      </View>

      {/* Features Showcase */}
      <View style={styles.featuresSection}>
        <View style={styles.featureCard}>
          <Ionicons
            name="film-outline"
            size={40}
            color={Colors.light.primary}
          />
          <Text style={styles.featureTitle}>Gestion de Projets</Text>
          <Text style={styles.featureDescription}>
            Suivez l'avancement de vos productions cinématographiques de
            l'écriture à la post-production.
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Ionicons
            name="people-outline"
            size={40}
            color={Colors.light.primary}
          />
          <Text style={styles.featureTitle}>Réseau de Talents</Text>
          <Text style={styles.featureDescription}>
            Découvrez et recrutez les meilleurs techniciens et acteurs pour vos
            prochains tournages.
          </Text>
        </View>

        <View style={styles.featureCard}>
          <Ionicons
            name="chatbubbles-outline"
            size={40}
            color={Colors.light.primary}
          />
          <Text style={styles.featureTitle}>Collaboration</Text>
          <Text style={styles.featureDescription}>
            Échangez instantanément avec vos équipes grâce à notre messagerie
            intégrée.
          </Text>
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.supportContainer}>
        <Text style={styles.supportTitle}>Besoin d'aide ?</Text>
        <Text style={styles.supportText}>
          Notre équipe de support est là pour vous accompagner dans la prise en
          main de l'outil.
        </Text>
        <TouchableOpacity style={styles.supportButton} onPress={handleSupport}>
          <Ionicons
            name="help-circle-outline"
            size={24}
            color={Colors.light.primary}
          />
          <Text style={styles.supportButtonText}>Contacter le support</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          © 2026 Tita App. Tous droits réservés.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  logo: {
    width: 140,
    height: 70,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerButtons: {
    flexDirection: "row",
  },
  loginButton: {
    backgroundColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  heroSection: {
    padding: 60,
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    textAlign: "center",
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: "900",
    color: "#1a1a1a",
    marginBottom: 20,
    textAlign: "center",
    maxWidth: 800,
  },
  heroSubtitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
    maxWidth: 600,
  },
  ctaButton: {
    backgroundColor: Colors.light.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  ctaButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  featuresSection: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    justifyContent: "space-around",
    padding: 40,
    gap: 20,
  },
  featureCard: {
    flex: 1,
    padding: 30,
    borderRadius: 15,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#eee",
    alignItems: "center",
    textAlign: "center",
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginVertical: 15,
    color: "#1a1a1a",
  },
  featureDescription: {
    color: "#666",
    lineHeight: 22,
    textAlign: "center",
  },
  supportContainer: {
    backgroundColor: "#F0F7FF",
    margin: 40,
    padding: 40,
    borderRadius: 20,
    alignItems: "center",
  },
  supportTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  supportText: {
    fontSize: 16,
    color: "#555",
    marginBottom: 25,
    textAlign: "center",
  },
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  supportButtonText: {
    color: Colors.light.primary,
    fontWeight: "bold",
    marginLeft: 10,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 40,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  footerText: {
    color: "#aaa",
  },
});
