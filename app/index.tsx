import DynamicLogo from "@/components/DynamicLogo";
import FeatureDetailsModal from "@/components/FeatureDetailsModal";
import { Hoverable } from "@/components/Hoverable";
import { appEvents, EVENTS } from "@/lib/events";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

export default function LandingPage() {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  const router = useRouter();
  const floatingValue = useSharedValue(0);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  const FEATURES = [
    {
      title: "Gestion de Projets",
      description:
        "Suivez l'avancement de vos productions cinématographiques de l'écriture à la post-production.",
      icon: "film-outline",
      details:
        "Tita centralise tous vos besoins de production. Gérez vos feuilles de service, suivez le budget en temps réel et coordonnez vos équipes sur le terrain avec une synchronisation instantanée.",
      screens: [
        require("@/assets/images/screenshots/projects.png"),
        require("@/assets/images/screenshots/feed.png"),
      ],
    },
    {
      title: "Réseau de Talents",
      description:
        "Découvrez et recrutez les meilleurs techniciens et acteurs pour vos prochains tournages.",
      icon: "people-outline",
      details:
        "Notre puissant moteur de recherche vous permet de filtrer les talents par métier, expérience, localisation et disponibilité. Consultez les portfolios et contactez directement les profils qui vous intéressent.",
      screens: [
        require("@/assets/images/screenshots/network.png"),
        require("@/assets/images/screenshots/landing.png"),
      ],
    },
    {
      title: "Collaboration",
      description:
        "Échangez instantanément avec vos équipes grâce à notre messagerie temps réel intégrée.",
      icon: "chatbubbles-outline",
      details:
        "Fini les e-mails perdus. Créez des groupes par projet ou par département, partagez des documents sécurisés et recevez des notifications critiques pour ne jamais rater une mise à jour sur le plateau.",
      screens: [
        require("@/assets/images/screenshots/messages.png"),
        require("@/assets/images/screenshots/feed.png"),
      ],
    },
  ];

  useEffect(() => {
    floatingValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2500 }),
        withTiming(0, { duration: 2500 }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedHeroStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatingValue.value * 10 }],
  }));

  const handleSupport = () => {
    Linking.openURL("mailto:support@titapp.fr");
  };

  const handleStart = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    appEvents.emit(EVENTS.START_FILM_TRANSITION, { target: "/auth" });
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bgDecorCircle1} />
        <View style={styles.bgDecorCircle2} />

        <Animated.View entering={FadeIn.duration(800)} style={styles.header}>
          <DynamicLogo
            width={120}
            height={60}
          />
          <View style={styles.headerButtons}>
            <Hoverable
              style={styles.loginButton}
              hoverStyle={{
                backgroundColor: "#f3f0ff",
                transform: [{ scale: 1.05 }],
              }}
              onPress={handleStart}
            >
              <Text style={styles.loginButtonText}>Se connecter</Text>
            </Hoverable>
          </View>
        </Animated.View>

        <View style={styles.heroWrapper}>
          <LinearGradient
            colors={[colors.primary + "10", colors.background]}
            style={styles.heroGradient}
          />
          <View style={styles.heroSection}>
            <Animated.View entering={FadeInDown.delay(200).duration(800)}>
              <Animated.Text style={[styles.heroTitle, animatedHeroStyle]}>
                La plateforme ultime pour les{" "}
                <Text style={{ color: colors.primary }}>
                  professionnels ou passionnés
                </Text>{" "}
                du cinéma
              </Animated.Text>
            </Animated.View>

            <Animated.Text
              entering={FadeInDown.delay(400).duration(800)}
              style={styles.heroSubtitle}
            >
              Gérez vos projets, trouvez des talents et collaborez en temps réel
              sur une seule interface fluide et intuitive.
            </Animated.Text>

            <Animated.View
              entering={FadeIn.delay(600).duration(1000)}
              style={styles.statsContainer}
            >
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>2+</Text>
                <Text style={styles.statLabel}>Projets</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>2+</Text>
                <Text style={styles.statLabel}>Talents</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>24/7</Text>
                <Text style={styles.statLabel}>Support</Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(700).duration(800)}>
              <Hoverable
                style={styles.ctaButton}
                hoverStyle={{
                  backgroundColor: "#5849d1",
                  transform: [{ scale: 1.02 }],
                  shadowOpacity: 0.4,
                }}
                onPress={handleStart}
              >
                <Text style={styles.ctaButtonText}>Commencer gratuitement</Text>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="#fff"
                  style={{ marginLeft: 10 }}
                />
              </Hoverable>
            </Animated.View>
          </View>
        </View>

        <View style={styles.featuresSection}>
          {FEATURES.map((feature, index) => (
            <FeatureCard
              key={index}
              {...feature}
              index={index}
              onPress={() => setSelectedFeature(feature)}
            />
          ))}
        </View>

        <FeatureDetailsModal
          isVisible={selectedFeature !== null}
          onClose={() => setSelectedFeature(null)}
          feature={selectedFeature}
        />

        <Animated.View
          entering={FadeInUp.delay(1000).duration(800)}
          style={styles.supportContainer}
        >
          <LinearGradient
            colors={[colors.primary, isDark ? "#4834d4" : "#8E7CFE"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Text style={[styles.supportTitle, { color: "#fff" }]}>
            Besoin d'aide ?
          </Text>
          <Text
            style={[styles.supportText, { color: "rgba(255,255,255,0.9)" }]}
          >
            Notre équipe de support est là pour vous accompagner dans la prise
            en main de l'outil et répondre à toutes vos questions.
          </Text>
          <Hoverable
            style={styles.supportButton}
            hoverStyle={{
              backgroundColor: isDark ? "#1f1f1f" : "#f3f0ff",
              transform: [{ scale: 1.02 }],
              shadowOpacity: 0.3,
            }}
            onPress={handleSupport}
          >
            <Ionicons
              name="help-circle-outline"
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.supportButtonText, { color: colors.primary }]}>Contacter le support</Text>
          </Hoverable>
        </Animated.View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2026 Tita App. Tous droits réservés.
          </Text>
          <View style={styles.footerLinks}>
            <Text style={styles.footerLink}>Conditions</Text>
            <TouchableOpacity
              onPress={() => router.push("/charte-confidentialite")}
            >
              <Text style={styles.footerLink}>Confidentialité</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

interface FeatureCardProps {
  icon: any;
  title: string;
  description: string;
  index: number;
  onPress: () => void;
}

function FeatureCard({
  icon,
  title,
  description,
  index,
  onPress,
}: FeatureCardProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors, false); // and we don't care about isDark for these specific styles if they don't use it
  return (
    <Hoverable
      onPress={onPress}
      style={{ flex: 1, minWidth: width > 768 ? 300 : "100%" }}
      hoverStyle={{ transform: [{ translateY: -10 }] }}
    >
      <Animated.View
        entering={FadeInDown.delay(800 + index * 200).duration(600)}
        style={styles.featureCard}
      >
        <View style={styles.featureIconContainer}>
          <Ionicons name={icon as any} size={32} color={colors.primary} />
        </View>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
        <View style={styles.learnMoreContainer}>
          <Text style={styles.learnMoreText}>En savoir plus</Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.primary}
          />
        </View>
      </Animated.View>
    </Hoverable>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  bgDecorCircle1: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: colors.primary + "05",
  },
  bgDecorCircle2: {
    position: "absolute",
    top: 400,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: colors.primary + "03",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: width > 768 ? 60 : 20,
    paddingVertical: 20,
    zIndex: 10,
  },
  logo: {
    width: 120,
    height: 60,
  },
  headerButtons: {
    flexDirection: "row",
  },
  loginButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  loginButtonText: {
    color: colors.primary,
    fontWeight: "700",
  },
  heroWrapper: {
    position: "relative",
    paddingBottom: 40,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    height: "100%",
  },
  heroSection: {
    paddingTop: 40,
    paddingHorizontal: 20,
    alignItems: "center",
    textAlign: "center",
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 20,
    marginBottom: 40,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    alignItems: "center",
    paddingHorizontal: 15,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: isDark ? "#aaa" : "#6B7280",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  heroTitle: {
    fontSize: width > 768 ? 58 : 36,
    fontWeight: "900",
    color: colors.text,
    marginBottom: 24,
    textAlign: "center",
    maxWidth: 900,
    lineHeight: width > 768 ? 68 : 44,
  },
  heroSubtitle: {
    fontSize: width > 768 ? 20 : 16,
    color: isDark ? "#aaa" : "#4B5563",
    marginBottom: 40,
    textAlign: "center",
    maxWidth: 650,
    lineHeight: 28,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 36,
    paddingVertical: 18,
    borderRadius: 100,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  ctaButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  featuresSection: {
    flexDirection: width > 768 ? "row" : "column",
    justifyContent: "center",
    paddingHorizontal: width > 768 ? 60 : 20,
    paddingVertical: 60,
    gap: 30,
  },
  featureCard: {
    flex: 1,
    padding: 40,
    borderRadius: 32,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  featureIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  featureTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
    color: colors.text,
    textAlign: "center",
  },
  featureDescription: {
    color: isDark ? "#aaa" : "#6B7280",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 20,
  },
  learnMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: "auto",
  },
  learnMoreText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 14,
    marginRight: 4,
  },
  supportContainer: {
    marginHorizontal: width > 768 ? 60 : 20,
    marginVertical: 40,
    padding: width > 768 ? 60 : 40,
    borderRadius: 40,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 10,
  },
  supportTitle: {
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 16,
    zIndex: 1,
  },
  supportText: {
    fontSize: 18,
    marginBottom: 32,
    textAlign: "center",
    maxWidth: 600,
    zIndex: 1,
    lineHeight: 26,
  },
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    zIndex: 1,
  },
  supportButtonText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 16,
    marginLeft: 10,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 60,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginHorizontal: 40,
  },
  footerText: {
    color: "#9CA3AF",
    fontSize: 14,
    marginBottom: 12,
  },
  footerLinks: {
    flexDirection: "row",
    gap: 20,
  },
  footerLink: {
    color: "#9CA3AF",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});

