import ClapLoading from "@/components/ClapLoading";
import { GlobalStyles } from "@/constants/Styles";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { generateContract } from "@/utils/pdfGenerator";
import { Ionicons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useGlobalSearchParams,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const idValue = localParams.id || globalParams.id;
  const projectId = Array.isArray(idValue) ? idValue[0] : idValue;

  const [members, setMembers] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("Admin: Param change", {
      local: localParams.id,
      global: globalParams.id,
    });
  }, [localParams.id, globalParams.id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [projectId]),
  );

  async function fetchData() {
    if (!projectId || projectId === "undefined") {
      console.warn("Admin: invalid projectId", projectId);
      return;
    }

    try {
      setLoading(true);
      console.log("Admin: Fetching for project ID:", projectId);

      const { data: proj, error: projError } = await supabase
        .from("tournages")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (projError) throw projError;

      if (!proj) {
        setProject(null);
      } else {
        setProject(proj);
        const { data: ownerProf } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", proj.owner_id)
          .maybeSingle();
        if (ownerProf) {
          setProject((prev: any) => ({ ...prev, owner: ownerProf }));
        }
      }

      const { data: roles, error: rolesError } = await supabase
        .from("project_roles")
        .select(
          `
          id,
          title,
          category,
          assigned_profile_id,
          assigned_profile:profiles!project_roles_assigned_profile_id_fkey (*)
        `,
        )
        .eq("tournage_id", projectId)
        .not("assigned_profile_id", "is", null);

      if (rolesError) throw rolesError;
      setMembers(roles || []);
    } catch (e) {
      console.error("Admin: Error", e);
      Alert.alert("Erreur", "Données non accessibles");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>
          {project?.title || "Administration"}
        </Text>
        {!projectId && (
          <Text style={{ fontSize: 10, color: "red" }}>CONNEXION PERDUE</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {loading && (
          <ClapLoading
            color={colors.primary}
            style={{ margin: 20 }}
            size={30}
          />
        )}

        {!loading && !project && (
          <View style={{ padding: 40, alignItems: "center" }}>
            <Ionicons name="cloud-offline-outline" size={48} color="#ccc" />
            <Text style={{ color: "#666", marginTop: 10, textAlign: "center" }}>
              Données du projet indisponibles.{"\n"}
              ID: {String(projectId)}
            </Text>
            <TouchableOpacity
              onPress={fetchData}
              style={{
                marginTop: 20,
                backgroundColor: colors.primary,
                padding: 12,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "white", fontWeight: "bold" }}>
                Actualiser
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {project && (
          <View
            style={{
              padding: 20,
              backgroundColor: "white",
              marginBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: "#eee",
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: "bold",
                color: "#1a1a1a",
                marginBottom: 4,
              }}
            >
              {project.title}
            </Text>
            <Text style={{ fontSize: 14, color: "#666", marginBottom: 15 }}>
              {project.type
                ? project.type.charAt(0).toUpperCase() +
                  project.type.slice(1).replace("_", " ")
                : "Projet"}{" "}
              • {project.ville}, {project.pays}
            </Text>

            {project.start_date && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 15,
                }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color="#888"
                  style={{ marginRight: 5 }}
                />
                <Text style={{ fontSize: 13, color: "#888" }}>
                  {new Date(project.start_date).toLocaleDateString()}
                  {project.end_date &&
                    ` - ${new Date(project.end_date).toLocaleDateString()}`}
                </Text>
              </View>
            )}

            <View
              style={{
                height: 1,
                backgroundColor: "#f5f5f5",
                marginVertical: 10,
              }}
            />

            <Text
              style={{
                fontSize: 12,
                color: "#666",
                textTransform: "uppercase",
                marginBottom: 8,
                letterSpacing: 0.5,
              }}
            >
              Propriétaire
            </Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <View style={styles.avatarPlaceholderSmall}>
                <Text style={styles.avatarTextSmall}>
                  {(project.owner?.full_name || project.owner?.username || "?")
                    .charAt(0)
                    .toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={{ fontWeight: "bold", fontSize: 15 }}>
                  {project.owner?.full_name ||
                    project.owner?.username ||
                    "Propriétaire"}
                </Text>
                <Text style={{ fontSize: 12, color: "#666" }}>
                  Créateur du projet
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* QUICK ACTIONS */}
        <View style={{ padding: 20, flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push(`/project/${projectId}/settings`)}
          >
            <Ionicons name="settings-outline" size={24} color="#333" />
            <Text style={styles.quickActionText}>Paramètres</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => router.push(`/project/${projectId}/manage_team`)}
          >
            <Ionicons name="people-outline" size={24} color="#333" />
            <Text style={styles.quickActionText}>Droit d'accès</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.quickAction,
              { backgroundColor: isDark ? colors.backgroundSecondary : "#FEF2F2", borderColor: isDark ? colors.border : "#FECACA" },
            ]}
            onPress={() => router.push(`/project/${projectId}/close`)}
          >
            <Ionicons
              name="trophy-outline"
              size={24}
              color={colors.danger}
            />
            <Text
              style={[styles.quickActionText, { color: colors.danger }]}
            >
              Clôturer
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            marginTop: 10,
          }}
        >
          <Text style={GlobalStyles.title2}>Membres de l'équipe</Text>
          <Text style={{ color: "#666" }}>{members.length} personne(s)</Text>
        </View>

        <View style={{ padding: 15 }}>
          {loading ? (
            <ClapLoading color={colors.primary} size={30} />
          ) : members.length === 0 ? (
            <Text style={styles.emptyText}>
              Aucun membre assigné pour le moment.
            </Text>
          ) : (
            members.map((item) => (
              <View key={item.id} style={GlobalStyles.card}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                      {item.assigned_profile?.full_name ||
                        item.assigned_profile?.username}
                    </Text>
                    <Text
                      style={{ color: colors.primary, fontWeight: "600" }}
                    >
                      {item.title}
                    </Text>
                    <Text style={{ color: "#666", fontSize: 12 }}>
                      {item.category}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/profile/[id]",
                        params: { id: item.assigned_profile_id },
                      })
                    }
                  >
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                  </TouchableOpacity>
                </View>

                {/* DOCS ACTIONS */}
                <View
                  style={{
                    flexDirection: "row",
                    gap: 10,
                    marginTop: 15,
                    borderTopWidth: 1,
                    borderColor: "#eee",
                    paddingTop: 10,
                  }}
                >
                  <TouchableOpacity
                    onPress={() =>
                      generateContract(
                        "image_rights",
                        project,
                        item.assigned_profile,
                        item,
                      )
                    }
                    style={styles.actionButton}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={18}
                      color="#333"
                    />
                    <Text style={styles.actionText}>Droit à l'image</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      generateContract(
                        "volunteer",
                        project,
                        item.assigned_profile,
                        item,
                      )
                    }
                    style={styles.actionButton}
                  >
                    <Ionicons name="briefcase-outline" size={18} color="#333" />
                    <Text style={styles.actionText}>Contrat Bénévolat</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  header: {
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
  },
  avatarPlaceholderSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarTextSmall: {
    fontSize: 14,
    fontWeight: "bold",
    color: colors.primary,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.card,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 5,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
    color: colors.text,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 20,
  },
  });
}
