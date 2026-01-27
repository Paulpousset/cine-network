import ClapLoading from "@/components/ClapLoading";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { useUserMode } from "@/hooks/useUserMode";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

type Project = {
  id: string;
  title: string;
  description: string;
  type: string;
  created_at: string;
  owner_id: string;
  image_url?: string;
  has_notifications?: boolean;
  city?: string;
  is_paid?: boolean;
};

export default function MyProjects() {
  const router = useRouter(); // <--- Hook de navigation
  const { width } = useWindowDimensions();
  const isWebLarge = Platform.OS === "web" && width >= 768;
  const [sections, setSections] = useState<
    { title: string; data: Project[] }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchMyProjects();
    }, []),
  );

  // Mode control: hide FAB if in search mode
  const { mode } = useUserMode();

  async function fetchMyProjects() {
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setCurrentUserId(session.user.id);
      } else {
        return;
      }

      // 1. Fetch Owned Projects (Excluding completed ones)
      const { data: ownedData, error: ownedError } = await supabase
        .from("tournages")
        .select("*")
        .eq("owner_id", session.user.id)
        .neq("status", "completed")
        .order("created_at", { ascending: false });

      if (ownedError) throw ownedError;

      // Check notifications for owned
      let ownedProjects = ownedData || [];
      if (ownedProjects.length > 0) {
        const tournageIds = ownedProjects.map((p) => p.id);
        const { data: pendingApps } = await supabase
          .from("applications" as any)
          .select(
            `
          role_id,
          project_roles!inner (
            tournage_id
          )
        `,
          )
          .eq("status", "pending")
          .in("project_roles.tournage_id", tournageIds);

        ownedProjects = ownedProjects.map((p) => ({
          ...p,
          has_notifications: pendingApps?.some(
            (app: any) => app.project_roles?.tournage_id === p.id,
          ),
        }));
      }

      // 2. Fetch Participating Projects (Excluding completed ones)
      // user is participating if they are 'assigned_profile_id' in a role
      const { data: participations, error: partError } = await supabase
        .from("project_roles")
        .select(
          `
          tournage_id,
          tournages (*)
        `,
        )
        .eq("assigned_profile_id", session.user.id);

      if (partError) throw partError;

      // Extract unique tournages from participations, avoiding duplicates if multiple roles
      const participatingMap = new Map();
      participations?.forEach((p: any) => {
        if (p.tournages && p.tournages.status !== "completed") {
          participatingMap.set(p.tournages.id, p.tournages);
        }
      });
      const participatingProjects = Array.from(participatingMap.values());

      setSections([
        { title: "Mes Créations", data: ownedProjects },
        { title: "Mes Participations", data: participatingProjects as any },
      ]);
    } catch (error) {
      Alert.alert("Erreur", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const renderProjectItem = ({ item }: { item: Project }) => (
    <TouchableOpacity
      style={[GlobalStyles.card, isWebLarge && styles.webProjectCard]}
      onPress={() =>
        router.push({ pathname: "/project/[id]", params: { id: item.id } })
      }
    >
      {item.has_notifications && <View style={styles.notificationDot} />}
      <View style={{ flexDirection: "row", gap: 15, flex: 1 }}>
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={[styles.projectImage, isWebLarge && styles.webProjectImage]}
          />
        ) : (
          <View
            style={[
              styles.projectImage,
              isWebLarge && styles.webProjectImage,
              styles.projectImagePlaceholder,
            ]}
          >
            <Ionicons
              name="film-outline"
              size={isWebLarge ? 32 : 24}
              color="#999"
            />
          </View>
        )}
        <View
          style={{
            flex: 1,
            justifyContent: isWebLarge ? "space-between" : "flex-start",
          }}
        >
          <View>
            <View style={styles.cardHeader}>
              <Text style={styles.projectTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                <Text style={styles.cardType}>
                  {item.type.replace("_", " ")}
                </Text>
                {item.is_paid && <Text style={styles.paidBadge}>PAYÉ</Text>}
              </View>
            </View>

            {item.city && (
              <View style={styles.cardLocation}>
                <Ionicons name="location-outline" size={14} color="#666" />
                <Text style={styles.cardLocationText}>{item.city}</Text>
              </View>
            )}

            <Text
              numberOfLines={2}
              style={[
                GlobalStyles.body,
                {
                  marginTop: item.city ? 4 : 8,
                  fontSize: 13,
                  color: "#4A5568",
                },
              ]}
            >
              {item.description || "Pas de description"}
            </Text>
          </View>

          {isWebLarge ? (
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.cardAction}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(`/project/${item.id}/calendar` as any);
                }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={Colors.light.primary}
                />
                <Text style={styles.cardActionText}>Calendrier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardAction}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(`/project/${item.id}/team` as any);
                }}
              >
                <Ionicons
                  name="people-outline"
                  size={14}
                  color={Colors.light.primary}
                />
                <Text style={styles.cardActionText}>Équipe</Text>
              </TouchableOpacity>
              {item.owner_id === currentUserId && (
                <TouchableOpacity
                  style={styles.cardAction}
                  onPress={(e) => {
                    e.stopPropagation();
                    router.push(`/project/${item.id}/admin` as any);
                  }}
                >
                  <Ionicons
                    name="settings-outline"
                    size={14}
                    color={Colors.light.primary}
                  />
                  <Text style={styles.cardActionText}>Gérer</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <Text
              style={[
                GlobalStyles.caption,
                { textAlign: "right", marginTop: 8 },
              ]}
            >
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* En-tête spécifique au Web */}
      {isWebLarge && (
        <View style={styles.webHeader}>
          <Text style={styles.webHeaderTitle}>Mes Projets en cours</Text>
          <TouchableOpacity
            onPress={() => router.push("/project/new")}
            style={styles.webHeaderButton}
          >
            <Ionicons name="add-circle" size={24} color="white" />
            <Text style={styles.webHeaderButtonText}>Nouveau tournage</Text>
          </TouchableOpacity>
        </View>
      )}

      {isWebLarge && !loading && (
        <View style={styles.webStatsContainer}>
          <View style={styles.webStatCard}>
            <View
              style={[
                styles.webStatIconContainer,
                { backgroundColor: Colors.light.primary + "15" },
              ]}
            >
              <Ionicons name="film" size={24} color={Colors.light.primary} />
            </View>
            <View>
              <Text style={styles.webStatValue}>
                {sections[0]?.data.length || 0}
              </Text>
              <Text style={styles.webStatLabel}>Mes Créations</Text>
            </View>
          </View>

          <View style={styles.webStatCard}>
            <View
              style={[
                styles.webStatIconContainer,
                { backgroundColor: "#4CAF5015" },
              ]}
            >
              <Ionicons name="people" size={24} color="#4CAF50" />
            </View>
            <View>
              <Text style={styles.webStatValue}>
                {sections[1]?.data.length || 0}
              </Text>
              <Text style={styles.webStatLabel}>Participations</Text>
            </View>
          </View>

          <View style={styles.webStatCard}>
            <View
              style={[
                styles.webStatIconContainer,
                { backgroundColor: "#FFAB0015" },
              ]}
            >
              <Ionicons name="notifications" size={24} color="#FFAB00" />
            </View>
            <View>
              <Text style={styles.webStatValue}>
                {sections[0]?.data.filter((p) => (p as any).has_notifications)
                  .length || 0}
              </Text>
              <Text style={styles.webStatLabel}>Alertes</Text>
            </View>
          </View>
        </View>
      )}

      {loading ? (
        <ClapLoading
          size={50}
          color={Colors.light.primary}
          style={{ marginTop: 50 }}
        />
      ) : isWebLarge ? (
        /* Layout Web avec ScrollView pour un contrôle total de la grille */
        <ScrollView contentContainerStyle={styles.webScrollViewContent}>
          {sections.map((section, sIndex) => (
            <View key={section.title + sIndex} style={styles.webSectionWrapper}>
              <View style={styles.webSectionHeaderContainer}>
                <Text style={styles.webSectionHeader}>{section.title}</Text>
                <View style={styles.webSectionUnderline} />
              </View>

              <View style={styles.webGridContainer}>
                {section.data.length > 0 ? (
                  section.data.map((item) => (
                    <View key={item.id} style={styles.webGridItem}>
                      {renderProjectItem({ item })}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>
                    Aucun projet dans cette catégorie.
                  </Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        /* Layout Mobile avec SectionList standard */
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item.id + index}
          renderItem={renderProjectItem}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucun projet pour l'instant.</Text>
          }
          stickySectionHeadersEnabled={false}
        />
      )}

      {/* FAB uniquement sur mobile car on a le bouton dans le header sur Web */}
      {!isWebLarge ? (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/project/new")}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  webHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    zIndex: 10,
  },
  webHeaderTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  webHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 8,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  webHeaderButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "white",
  },
  webStatsContainer: {
    flexDirection: "row",
    gap: 20,
    paddingHorizontal: 40,
    paddingTop: 30,
    maxWidth: 1000,
    alignSelf: "center",
    width: "100%",
  },
  webStatCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
  },
  webStatIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  webStatValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0F172A",
  },
  webStatLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    color: Colors.light.text,
    backgroundColor: "transparent",
  },
  webSectionHeaderContainer: {
    marginTop: 40,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  webSectionHeader: {
    fontSize: 22,
    color: "#0F172A",
    backgroundColor: "transparent",
    marginTop: 0,
    marginBottom: 5,
  },
  webSectionUnderline: {
    width: 30,
    height: 4,
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
    marginLeft: 2,
  },
  webScrollViewContent: {
    paddingBottom: 100,
    flexDirection: "column",
  },
  webSectionWrapper: {
    maxWidth: 1000,
    alignSelf: "center",
    width: "100%",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  webGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20, // Espacement entre les cartes
    marginTop: 10,
    alignItems: "stretch", // Aligne les hauteurs des cartes dans une même ligne
  },
  webGridItem: {
    width: "48.5%", // Deux colonnes parfaites
    display: "flex",
  },
  webProjectCard: {
    borderRadius: 24,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 0,
    marginBottom: 20,
    padding: 24,
    width: "100%", // Prend toute la largeur de son conteneur webGridItem
    minHeight: 220, // Taille minimale pour harmoniser
    flex: 1,
    justifyContent: "space-between",
  },
  notificationDot: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.danger,
    zIndex: 1,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    flexShrink: 1,
    marginRight: 10,
  },
  listContent: { padding: 15, paddingBottom: 100 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    alignItems: "flex-start",
  },
  cardType: {
    fontSize: 10,
    color: Colors.light.primary,
    backgroundColor: Colors.light.primary + "10",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    overflow: "hidden",
    fontWeight: "800",
    textTransform: "uppercase",
  },
  cardLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  cardLocationText: {
    fontSize: 13,
    color: "#64748B",
  },
  paidBadge: {
    fontSize: 10,
    color: "#10B981",
    backgroundColor: "#10B98115",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    fontWeight: "800",
    marginLeft: 8,
    overflow: "hidden",
  },
  cardActions: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    justifyContent: "space-between",
  },
  cardAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 4,
  },
  cardActionText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  projectImage: {
    width: 90,
    height: 90,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  webProjectImage: {
    width: 110,
    height: 110,
    borderRadius: 20,
  },
  projectImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    color: "#999",
    fontSize: 16,
  },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: Colors.light.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
