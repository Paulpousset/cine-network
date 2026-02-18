import { useTheme } from "@/providers/ThemeProvider";
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

export default function PrivacyPolicy() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Privacy Policy",
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
        <Text style={styles.title}>Privacy Policy - Tita</Text>

        <Text style={styles.sectionTitle}>A. Introduction</Text>
        <Text style={styles.text}>
          The privacy of our Tita app users is very important to us, and we are committed to protecting it. This policy details what we do with your personal information.
        </Text>
        <Text style={styles.text}>
          By using Tita, you consent to the collection and use of your information in accordance with this policy.
        </Text>

        <Text style={styles.sectionTitle}>
          B. Collection of personal information
        </Text>
        <Text style={styles.text}>
          The following types of personal information may be collected, stored, and used:
        </Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>
            1. Device information: including your IP address, geographical location (if authorized), operating system type and version, and unique device identifiers.
          </Text>
          <Text style={styles.listItem}>
            2. App usage: information about your sessions, duration of use, features accessed, and navigation paths.
          </Text>
          <Text style={styles.listItem}>
            3. Registration information: your email address, provided during registration via Supabase Auth or third-party services (Apple Authentication).
          </Text>
          <Text style={styles.listItem}>
            4. Professional profile: information entered to create a profile such as your name, username, profile picture (avatar), bio, skills, software mastery, specialties, equipment owned, links to website and social media.
          </Text>
          <Text style={styles.listItem}>
            5. Physical characteristics (Casting): for actor/actress profiles, information such as age, height, hair color, eye color, and gender.
          </Text>
          <Text style={styles.listItem}>
            6. Professional documents: CV, photo books, showreels, and portfolios uploaded to our servers.
          </Text>
          <Text style={styles.listItem}>
            7. Project data: information related to projects created or joined, including budgets, call sheets, and associated roles.
          </Text>
          <Text style={styles.listItem}>
            8. Communications: messages sent via the app's private messaging, posts, comments, and "popcorn" (likes).
          </Text>
          <Text style={styles.listItem}>
            9. Transactions: information related to your subscription tier and services used.
          </Text>
          <Text style={styles.listItem}>
            10. Support: any information contained in communications you send us by email (support@titapp.fr) or via the app.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          C. Use of your personal information
        </Text>
        <Text style={styles.text}>
          Personal information provided via Tita will be used to:
        </Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>
            • Administer the app and our business.
          </Text>
          <Text style={styles.listItem}>
            • Personalize your experience on the app.
          </Text>
          <Text style={styles.listItem}>
            • Facilitate networking between film professionals (talent search, scouting).
          </Text>
          <Text style={styles.listItem}>
            • Manage project lifecycles (casting, recruitment, team management).
          </Text>
          <Text style={styles.listItem}>
            • Send you push notifications related to your activity on the platform.
          </Text>
          <Text style={styles.listItem}>
            • Manage subscriptions and premium services.
          </Text>
          <Text style={styles.listItem}>
            • Maintain app security and prevent fraud.
          </Text>
          <Text style={styles.listItem}>
            • Verify compliance with terms and conditions.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          D. Disclosure of your personal information
        </Text>
        <Text style={styles.text}>
          We may disclose your personal information:
        </Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>
            • To other users of the platform for the purpose of facilitating professional collaborations.
          </Text>
          <Text style={styles.listItem}>
            • To our employees, insurers, or professional advisors if necessary.
          </Text>
          <Text style={styles.listItem}>
            • To our service providers (notably Supabase, Google/Firebase).
          </Text>
          <Text style={styles.listItem}>
            • To the extent we are required to do so by law.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          E. International data transfers
        </Text>
        <Text style={styles.text}>
          The information we collect is stored and processed via our partner servers (Supabase) which may be located outside the European Economic Area. We ensure these transfers comply with legal data protection frameworks (GDPR).
        </Text>

        <Text style={styles.sectionTitle}>
          F. Retention of your personal information
        </Text>
        <Text style={styles.text}>
          Personal data is not kept longer than necessary for the purposes for which it is collected. Account data is kept as long as your account is active.
        </Text>

        <Text style={styles.sectionTitle}>
          G. Security of your personal information
        </Text>
        <Text style={styles.text}>
          We take technical precautions to prevent the loss or misuse of your information. Your data is stored on the secure servers of our partner Supabase.
        </Text>

        <Text style={styles.sectionTitle}>H. Your rights</Text>
        <Text style={styles.text}>
          You have the right to access, correct, or delete your data. You can also withdraw your consent at any time. To exercise these rights, contact us at: support@titapp.fr.
        </Text>

        <Text style={styles.sectionTitle}>I. Cookies and Local Storage</Text>
        <Text style={styles.text}>
          On the web, we use cookies. On the mobile app, we use similar technologies to remember your session and preferences.
        </Text>

        <Text style={styles.sectionTitle}>J. Updates</Text>
        <Text style={styles.text}>
          We may update this policy from time to time. We will inform you of major changes via the app or by email.
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
