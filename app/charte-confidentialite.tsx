import Colors from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CharteConfidentialite() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Charte de Confidentialité",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ marginLeft: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Charte de Confidentialité - Tita</Text>

        <Text style={styles.sectionTitle}>A. Introduction</Text>
        <Text style={styles.text}>
          La confidentialité des utilisateurs de notre application Tita est très
          importante à nos yeux, et nous nous engageons à la protéger. Cette
          politique détaille ce que nous faisons de vos informations
          personnelles.
        </Text>
        <Text style={styles.text}>
          En utilisant Tita, vous consentez à la collecte et à l'utilisation de
          vos informations conformément à cette politique.
        </Text>

        <Text style={styles.sectionTitle}>
          B. Collecte d’informations personnelles
        </Text>
        <Text style={styles.text}>
          Les types d’informations personnelles suivants peuvent être collectés,
          stockés et utilisés :
        </Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>
            1. Informations sur votre appareil : y compris votre adresse IP,
            votre localisation géographique (si autorisée), le type et la
            version de votre système d'exploitation, et les identifiants uniques
            de l'appareil.
          </Text>
          <Text style={styles.listItem}>
            2. Utilisation de l’application : informations sur vos sessions, la
            durée d'utilisation, les fonctionnalités consultées et les parcours
            de navigation.
          </Text>
          <Text style={styles.listItem}>
            3. Informations d'inscription : votre adresse e-mail, que vous nous
            fournissez lors de l'inscription via Supabase Auth ou via des
            services tiers (Apple Authentication).
          </Text>
          <Text style={styles.listItem}>
            4. Profil professionnel : informations saisies pour créer un profil
            comme votre nom, nom d'utilisateur, photo de profil (avatar), bio,
            compétences, logiciels maîtrisés, spécialités, équipements possédés,
            lien vers site web et réseaux sociaux.
          </Text>
          <Text style={styles.listItem}>
            5. Caractéristiques physiques (Casting) : pour les profils
            d'acteurs/actrices, des informations telles que l'âge, la taille, la
            couleur des cheveux, la couleur des yeux et le genre.
          </Text>
          <Text style={styles.listItem}>
            6. Documents professionnels : CV, books photos, showreels
            (bandes-démo) et portfolios téléchargés sur nos serveurs.
          </Text>
          <Text style={styles.listItem}>
            7. Données de projet : informations relatives aux projets créés ou
            rejoints, y compris les budgets, les feuilles de service (call
            sheets) et les rôles associés.
          </Text>
          <Text style={styles.listItem}>
            8. Communications : messages envoyés via la messagerie privée de
            l'application, publications, commentaires, et mentions "popcorn"
            (likes).
          </Text>
          <Text style={styles.listItem}>
            9. Transactions : informations liées à votre niveau d'abonnement
            (subscription tier) et aux services utilisés.
          </Text>
          <Text style={styles.listItem}>
            10. Support : toute information contenue dans les communications que
            vous nous envoyez par e-mail (support@titapp.fr) ou via
            l'application.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          C. Utilisation de vos informations personnelles
        </Text>
        <Text style={styles.text}>
          Les informations personnelles fournies via Tita seront utilisées pour
          :
        </Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>
            • Administrer l'application et notre entreprise.
          </Text>
          <Text style={styles.listItem}>
            • Personnaliser votre expérience sur l'application.
          </Text>
          <Text style={styles.listItem}>
            • Faciliter la mise en réseau entre professionnels du cinéma
            (recherche de talents, scouting).
          </Text>
          <Text style={styles.listItem}>
            • Gérer le cycle de vie des projets (casting, recrutement, gestion
            d'équipe).
          </Text>
          <Text style={styles.listItem}>
            • Vous envoyer des notifications (push notifications) relatives à
            votre activité sur la plateforme.
          </Text>
          <Text style={styles.listItem}>
            • Gérer les abonnements et services premium.
          </Text>
          <Text style={styles.listItem}>
            • Maintenir la sécurité de l'application et empêcher la fraude.
          </Text>
          <Text style={styles.listItem}>
            • Vérifier le respect des conditions générales.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          D. Divulgation de vos informations personnelles
        </Text>
        <Text style={styles.text}>
          Nous pouvons divulguer vos informations personnelles :
        </Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>
            • Aux autres utilisateurs de la plateforme dans le but de faciliter
            les collaborations professionnelles.
          </Text>
          <Text style={styles.listItem}>
            • À nos employés, assureurs ou conseillers professionnels si
            nécessaire.
          </Text>
          <Text style={styles.listItem}>
            • À nos prestataires de services (notamment Supabase,
            Google/Firebase).
          </Text>
          <Text style={styles.listItem}>
            • Dans la mesure où nous sommes tenus de le faire par la loi.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          E. Transferts internationaux de données
        </Text>
        <Text style={styles.text}>
          Les informations que nous collectons sont stockées et traitées via nos
          serveurs partenaires (Supabase) qui peuvent être situés en dehors de
          l'Espace Économique Européen. Nous nous assurons que ces transferts
          respectent les cadres légaux de protection des données (RGPD).
        </Text>

        <Text style={styles.sectionTitle}>
          F. Conservation de vos informations personnelles
        </Text>
        <Text style={styles.text}>
          Les données personnelles ne sont pas conservées plus longtemps que
          nécessaire aux fins pour lesquelles elles sont collectées. Les données
          de compte sont conservées tant que votre compte est actif.
        </Text>

        <Text style={styles.sectionTitle}>
          G. Sécurité de vos informations personnelles
        </Text>
        <Text style={styles.text}>
          Nous prenons des précautions techniques pour empêcher la perte ou
          l'abus de vos informations. Vos données sont stockées sur les serveurs
          sécurisés de notre partenaire Supabase.
        </Text>

        <Text style={styles.sectionTitle}>H. Vos droits</Text>
        <Text style={styles.text}>
          Vous disposez des droits d'accès, de correction ou de suppression de
          vos données. Vous pouvez également retirer votre consentement à tout
          moment. Pour exercer ces droits, contactez-nous à : support@titapp.fr.
        </Text>

        <Text style={styles.sectionTitle}>I. Cookies et Stockage Local</Text>
        <Text style={styles.text}>
          Sur le web, nous utilisons des cookies. Sur l'application mobile, nous
          utilisons des technologies similaires pour mémoriser votre session et
          vos préférences.
        </Text>

        <Text style={styles.sectionTitle}>J. Mises à jour</Text>
        <Text style={styles.text}>
          Nous pouvons mettre à jour cette politique de temps à autre. Nous vous
          informerons des changements importants via l'application ou par
          e-mail.
        </Text>

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: Colors.light.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: "#333",
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: "#444",
    marginBottom: 10,
  },
  list: {
    marginLeft: 10,
    marginBottom: 10,
  },
  listItem: {
    fontSize: 16,
    lineHeight: 24,
    color: "#444",
    marginBottom: 8,
  },
});
