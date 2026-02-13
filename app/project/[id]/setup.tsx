import ClapLoading from "@/components/ClapLoading";
import RoleFormFields from "@/components/RoleFormFields";
import { useUserMode } from "@/hooks/useUserMode";
import { useTheme } from "@/providers/ThemeProvider";
import { JOB_TITLES } from "@/utils/roles";
import { fuzzySearch } from "@/utils/search";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../lib/supabase";

const ROLE_CATEGORIES = [
  "acteur",
  "realisateur",
  "image",
  "son",
  "production",
  "hmc",
  "deco",
  "post_prod",
  "technicien",
] as const;

const HAIR_COLORS = [
  "Brun",
  "Châtain",
  "Blond",
  "Roux",
  "Noir",
  "Gris",
  "Blanc",
  "Autre",
];
const EYE_COLORS = ["Marron", "Bleu", "Vert", "Noisette", "Gris", "Vairons"];

type DraftRole = {
  id: string;
  category: (typeof ROLE_CATEGORIES)[number];
  title: string;
  quantity: string; // keep as string for input
  description?: string;
  assignee?: { id: string; label: string } | null;
  experience?: string; // debutant, intermediaire, confirme
  gender?: string; // homme, femme, autre
  ageMin?: string; // numeric string
  ageMax?: string; // numeric string
  height?: string; // numeric string (cm)
  hairColor?: string;
  eyeColor?: string;
  equipment?: string;
  software?: string;
  specialties?: string;
  isPaid?: boolean;
  remunerationAmount?: string;
  isFilled?: boolean;
  data?: any;
  errors?: Record<string, string>;
};

export default function ProjectSetupWizard() {
  const params = useLocalSearchParams();
  const { id } = params;
  const router = useRouter();
  const { mode } = useUserMode();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case "acteur":
        return "#E91E63";
      case "realisateur":
        return "#9C27B0";
      case "image":
        return "#2196F3";
      case "son":
        return "#4CAF50";
      case "production":
        return "#FF9800";
      case "hmc":
        return "#FF4081";
      case "deco":
        return "#795548";
      case "post_prod":
        return "#607D8B";
      case "technicien":
        return "#9E9E9E";
      default:
        return colors.primary;
    }
  };

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [draftRoles, setDraftRoles] = useState<DraftRole[]>([]);

  // Profile picker state
  const [pickerOpen, setPickerOpen] = useState<null | string>(null); // holds draftRole.id for which picker is open
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchProject();

    // Prefill roles from creation screen, if provided
    try {
      const prefillRaw = params?.prefillRoles as string | undefined;
      if (prefillRaw) {
        const arr = JSON.parse(prefillRaw) as Array<{
          category: (typeof ROLE_CATEGORIES)[number];
          title: string;
          quantity: number;
        }>;
        const drafts: DraftRole[] = arr.map((r) => ({
          id: Math.random().toString(36).slice(2),
          category: r.category,
          title: r.title,
          quantity: String(r.quantity || 1),
          description: "",
          assignee: null,
          experience: "",
          gender: "",
          ageMin: "",
          ageMax: "",
          height: "",
          hairColor: "",
          eyeColor: "",
          equipment: "",
          software: "",
          specialties: "",
          isPaid: false,
          remunerationAmount: "",
          isFilled: false,
          data: {},
        }));
        setDraftRoles(drafts);
      }
    } catch {}
  }, [id]);

  async function fetchProject() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tournages")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      setProject(data);
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
      router.back();
    } finally {
      setLoading(false);
    }
  }

  function addDraftRole() {
    setDraftRoles((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        category: "acteur",
        title: "",
        quantity: "1",
        description: "",
        assignee: null,
        experience: "",
        gender: "",
        ageMin: "",
        ageMax: "",
        height: "",
        hairColor: "",
        eyeColor: "",
        equipment: "",
        software: "",
        specialties: "",
        isPaid: false,
        remunerationAmount: "",
        isFilled: false,
        data: {},
      },
    ]);
  }

  function updateDraft(id: string, patch: Partial<DraftRole>) {
    setDraftRoles((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }

  function openPicker(id: string) {
    setPickerOpen(id);
    setQuery("");
    setResults([]);
  }

  function removeDraft(id: string) {
    setDraftRoles((prev) => prev.filter((r) => r.id !== id));
  }

  async function searchProfiles(term: string) {
    setQuery(term);

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    // Si pas de terme, on effectue la recherche immédiatement pour les suggestions
    if (!term || term.trim().length === 0) {
      executeSearchProfiles("");
    } else {
      setSearching(true);
      searchTimeout.current = setTimeout(() => {
        executeSearchProfiles(term);
      }, 300);
    }
  }

  async function executeSearchProfiles(term: string) {
    setSearching(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const currentUserId = session?.user.id;

      if (!currentUserId) return;

      // Fetch connections of the current user
      const { data: connections, error: connError } = await supabase
        .from("connections")
        .select("requester_id, receiver_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`);

      if (connError) throw connError;

      const friendIds =
        connections?.map((c) =>
          c.requester_id === currentUserId ? c.receiver_id : c.requester_id,
        ) || [];

      if (friendIds.length === 0) {
        setResults([]);
        setSearching(false);
        return;
      }

      const activeDraft = draftRoles.find((r) => r.id === pickerOpen);
      const category = activeDraft?.category;

      let queryBuilder = supabase
        .from("profiles")
        .select("id, full_name, username, ville, role, avatar_url")
        .in("id", friendIds)
        .limit(200);

      if (term && term.trim().length > 0) {
        const parts = term.trim().split(/\s+/);
        const mainPart = parts[0];
        queryBuilder = queryBuilder.or(
          `full_name.ilike.%${mainPart}%,username.ilike.%${mainPart}%,ville.ilike.%${mainPart}%`,
        );
      } else if (category) {
        queryBuilder = queryBuilder.eq("role", category);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;

      let processedResults = data || [];
      if (term) {
        processedResults = fuzzySearch(
          processedResults,
          ["full_name", "username", "ville"],
          term,
        );
      }

      setResults(processedResults.slice(0, 20));

      // Si aucun résultat après recherche, reset après un délai
      if (processedResults.length === 0 && term) {
        setTimeout(() => {
          if (query === term) {
            setResults([]);
            setSearching(false);
          }
        }, 2000);
      }
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setSearching(false);
    }
  }

  async function saveAll() {
    if (!draftRoles.length) {
      Alert.alert("Rien à enregistrer", "Ajoutez au moins un rôle.");
      return;
    }

    // Validation
    let hasErrors = false;
    const validatedRoles = draftRoles.map((r) => {
      const errors: Record<string, string> = {};
      if (!r.title.trim()) {
        errors.title = "L'intitulé du poste est requis";
      }
      if (r.isPaid && !r.remunerationAmount?.trim()) {
        errors.remunerationAmount = "Le montant est requis si rémunéré";
      }

      if (Object.keys(errors).length > 0) {
        hasErrors = true;
      }
      return { ...r, errors };
    });

    if (hasErrors) {
      setDraftRoles(validatedRoles);
      return;
    }

    try {
      setSaving(true);
      const baseRows = draftRoles.flatMap((r) => {
        const qty = parseInt(r.quantity) || 1;
        return Array.from({ length: qty }).map(() => ({
          tournage_id: id,
          category: r.category,
          title: r.title || "",
          description: r.description || null,
        }));
      });

      // First try with extra columns. If fails, fallback without extras.
      try {
        const rowsWithExtras = draftRoles.flatMap((r) => {
          const qty = parseInt(r.quantity) || 1;
          return Array.from({ length: qty }).map(() => ({
            tournage_id: id,
            category: r.category,
            title: r.title || "",
            description: r.description || null,
            assigned_profile_id: r.assignee?.id ?? null,
            experience_level: r.experience || null,
            gender: r.gender || null,
            age_min: r.ageMin ? parseInt(r.ageMin) : null,
            age_max: r.ageMax ? parseInt(r.ageMax) : null,
            equipment: r.equipment || null,
            software: r.software || null,
            specialties: r.specialties || null,
            is_paid: r.isPaid ?? false,
            remuneration_amount: r.isPaid ? r.remunerationAmount : null,
            status: r.assignee?.id ? "invitation_pending" : "published",
          }));
        });
        const { error: tryErr } = await supabase
          .from("project_roles")
          .insert(rowsWithExtras as any[]);
        if (tryErr) throw tryErr;
      } catch (err) {
        // fallback: insert without assignment
        const { error } = await supabase
          .from("project_roles")
          .insert(
            baseRows.map((r) => ({ ...r, status: "published" })) as any[],
          );
        if (error) throw error;
      }

      Alert.alert("Succès", "Rôles enregistrés.");
      router.replace({ pathname: "/project/[id]", params: { id: String(id) } });
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return <ClapLoading style={{ marginTop: 50 }} color={colors.primary} size={30} />;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}
      edges={["top"]}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          {(Platform.OS !== "web" || mode !== "studio") && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.card,
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 15,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          )}
          <Text style={styles.title}>Préparer le tournage</Text>
          <Text style={styles.subtitle}>
            {project?.title} • {project?.type} • {project?.pays || "Pays ?"}{" "}
            {project?.ville ? `• ${project.ville}` : ""}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Définir les rôles</Text>
          <TouchableOpacity onPress={addDraftRole}>
            <Text style={{ color: colors.primary, fontWeight: "bold" }}>
              + Ajouter un rôle
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={draftRoles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 15, paddingBottom: 120 }}
          renderItem={({ item }) => (
            <View style={styles.roleCard}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text style={styles.roleHeader}>Rôle</Text>
                <TouchableOpacity onPress={() => removeDraft(item.id)}>
                  <Text style={{ color: "#ff4444", fontWeight: "bold" }}>
                    Supprimer
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Catégorie</Text>
              <View style={styles.rowWrap}>
                {ROLE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => updateDraft(item.id, { category: cat })}
                    style={[
                      styles.catChip,
                      item.category === cat && styles.catChipSelected,
                    ]}
                  >
                    <Text
                      style={{
                        color: item.category === cat ? "white" : "#333",
                      }}
                    >
                      {cat.charAt(0).toUpperCase() +
                        cat.slice(1).replace("_", " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <Text style={[styles.label, { marginBottom: 0 }]}>
                  Intitulé du poste
                </Text>
                {item.errors?.title && (
                  <Text
                    style={{ color: "red", fontSize: 11, fontWeight: "600" }}
                  >
                    - {item.errors.title}
                  </Text>
                )}
              </View>
              <View style={styles.rowWrap}>
                {(JOB_TITLES[item.category] || []).slice(0, 8).map((job) => (
                  <TouchableOpacity
                    key={job}
                    onPress={() => updateDraft(item.id, { title: job })}
                    style={[
                      styles.jobChip,
                      item.title === job && styles.jobChipSelected,
                    ]}
                  >
                    <Text
                      style={{ color: item.title === job ? "white" : "#333" }}
                    >
                      {job}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                placeholder="Ou un autre titre..."
                style={styles.input}
                value={item.title}
                onChangeText={(t) => updateDraft(item.id, { title: t })}
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Quantité</Text>
                  <TextInput
                    keyboardType="numeric"
                    style={styles.input}
                    value={item.quantity}
                    onChangeText={(t) => updateDraft(item.id, { quantity: t })}
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput
                    placeholder="Précisions (optionnel)"
                    style={styles.input}
                    value={item.description}
                    onChangeText={(t) =>
                      updateDraft(item.id, { description: t })
                    }
                  />
                </View>
              </View>

              {/* Experience */}
              <Text style={styles.label}>Expérience recherchée</Text>
              <View style={styles.rowWrap}>
                {["debutant", "intermediaire", "confirme"].map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    onPress={() => updateDraft(item.id, { experience: lvl })}
                    style={[
                      styles.catChip,
                      item.experience === lvl && styles.catChipSelected,
                    ]}
                  >
                    <Text
                      style={{
                        color: item.experience === lvl ? "white" : "#333",
                      }}
                    >
                      {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Gender */}
              <Text style={styles.label}>Sexe (optionnel)</Text>
              <View style={styles.rowWrap}>
                {["homme", "femme", "autre"].map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => updateDraft(item.id, { gender: g })}
                    style={[
                      styles.catChip,
                      item.gender === g && styles.catChipSelected,
                    ]}
                  >
                    <Text
                      style={{ color: item.gender === g ? "white" : "#333" }}
                    >
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Age range */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Âge min.</Text>
                  <TextInput
                    keyboardType="numeric"
                    style={styles.input}
                    value={item.ageMin}
                    onChangeText={(t) => updateDraft(item.id, { ageMin: t })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Âge max.</Text>
                  <TextInput
                    keyboardType="numeric"
                    style={styles.input}
                    value={item.ageMax}
                    onChangeText={(t) => updateDraft(item.id, { ageMax: t })}
                  />
                </View>
              </View>

              <RoleFormFields
                category={item.category}
                data={item}
                onChange={(newData) => updateDraft(item.id, newData)}
              />

              <Text style={styles.label}>Rémunération</Text>
              <View style={styles.rowWrap}>
                <TouchableOpacity
                  onPress={() => updateDraft(item.id, { isPaid: true })}
                  style={[
                    styles.catChip,
                    item.isPaid && styles.catChipSelected,
                  ]}
                >
                  <Text style={{ color: item.isPaid ? "white" : "#333" }}>
                    Rémunéré
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => updateDraft(item.id, { isPaid: false })}
                  style={[
                    styles.catChip,
                    !item.isPaid && styles.catChipSelected,
                  ]}
                >
                  <Text style={{ color: !item.isPaid ? "white" : "#333" }}>
                    Bénévole
                  </Text>
                </TouchableOpacity>
              </View>

              {item.isPaid && (
                <View style={{ marginTop: 10 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <Text style={[styles.label, { marginBottom: 0 }]}>
                      Montant de la rémunération
                    </Text>
                    {item.errors?.remunerationAmount && (
                      <Text
                        style={{
                          color: "red",
                          fontSize: 11,
                          fontWeight: "600",
                        }}
                      >
                        - {item.errors.remunerationAmount}
                      </Text>
                    )}
                  </View>
                  <TextInput
                    placeholder="Ex: 150€ / jour ou Cachet global"
                    style={styles.input}
                    value={item.remunerationAmount}
                    onChangeText={(t) =>
                      updateDraft(item.id, { remunerationAmount: t })
                    }
                  />
                </View>
              )}

              <Text style={styles.label}>Poste déjà pourvu ?</Text>
              <View style={styles.rowWrap}>
                <TouchableOpacity
                  onPress={() => updateDraft(item.id, { isFilled: true })}
                  style={[
                    styles.catChip,
                    item.isFilled && styles.catChipSelected,
                  ]}
                >
                  <Text style={{ color: item.isFilled ? "white" : "#333" }}>
                    Oui
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => updateDraft(item.id, { isFilled: false })}
                  style={[
                    styles.catChip,
                    !item.isFilled && styles.catChipSelected,
                  ]}
                >
                  <Text style={{ color: !item.isFilled ? "white" : "#333" }}>
                    Non
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ASSIGNMENT */}

              <Text style={styles.label}>Assigner quelqu'un (optionnel)</Text>
              {item.assignee ? (
                <View style={styles.assigneeRow}>
                  <Text>{item.assignee.label}</Text>
                  <TouchableOpacity
                    onPress={() => updateDraft(item.id, { assignee: null })}
                  >
                    <Text style={{ color: "#999", fontWeight: "bold" }}>X</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => openPicker(item.id)}
                  style={styles.assignBtn}
                >
                  <Text style={{ color: "white", fontWeight: "600" }}>
                    + Choisir un profil
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.7 }]}
            onPress={saveAll}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Enregistrement..." : "Enregistrer ces rôles"}
            </Text>
          </TouchableOpacity>
        </View>
        <Modal
          visible={!!pickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setPickerOpen(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Rechercher un profil</Text>
              <TextInput
                placeholder="Nom / ville / pseudo"
                placeholderTextColor={colors.text + "80"}
                value={query}
                onChangeText={searchProfiles}
                style={styles.input}
              />
              {searching ? (
                <ClapLoading color={colors.primary} size={30} />
              ) : (
                <FlatList
                  data={results}
                  keyExtractor={(it) => it.id}
                  style={{ maxHeight: 300 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        const roleId = pickerOpen!;
                        const locationStr = item.ville
                          ? ` • ${item.ville}`
                          : "";
                        const label = `${item.full_name || item.username || "Profil"}${locationStr}`;
                        updateDraft(roleId, {
                          assignee: { id: item.id, label },
                        });
                        setPickerOpen(null);
                        setQuery("");
                        setResults([]);
                      }}
                      style={styles.profileRow}
                    >
                      <View>
                        <Text style={{ fontWeight: "600", fontSize: 16, color: colors.text }}>
                          {item.full_name || item.username || "Profil"}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {item.role && (
                            <Text
                              style={{
                                fontSize: 12,
                                color: colors.primary,
                                fontWeight: "600",
                              }}
                            >
                              {item.role.toUpperCase()}
                            </Text>
                          )}
                          {item.ville ? (
                            <Text style={{ fontSize: 12, color: colors.text + "80" }}>
                              {item.role ? `• ${item.ville}` : item.ville}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={{ textAlign: "center", color: colors.text + "80" }}>
                      Aucun résultat
                    </Text>
                  }
                />
              )}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "center",
                  marginTop: 10,
                }}
              >
                <TouchableOpacity
                  onPress={() => setPickerOpen(null)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                  }}
                >
                  <Text style={{ color: colors.text + "80", fontWeight: "600" }}>Fermer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },
  header: {
    padding: 20,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: "bold", color: colors.text },
  subtitle: { color: colors.text + "80", marginTop: 4 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: colors.text },
  roleCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  catChip: {
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  catChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  jobChip: {
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  jobChipSelected: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  roleHeader: { fontSize: 12, color: colors.text + "80", marginBottom: 8 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: colors.text,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: colors.backgroundSecondary,
    color: colors.text,
  },
  assigneeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  assignBtn: {
    backgroundColor: colors.primary,
    padding: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    padding: 10,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 15,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: colors.text,
  },
  profileRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
});
