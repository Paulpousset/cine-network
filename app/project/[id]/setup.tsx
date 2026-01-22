import RoleFormFields from "@/components/RoleFormFields";
import { JOB_TITLES } from "@/utils/roles";
import { fuzzySearch } from "@/utils/search";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";
import { GlobalStyles } from "@/constants/Styles";
import Colors from "@/constants/Colors";

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
  data?: any;
};

export default function ProjectSetupWizard() {
  const params = useLocalSearchParams();
  const { id } = params;
  const router = useRouter();

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
      const activeDraft = draftRoles.find((r) => r.id === pickerOpen);
      const category = activeDraft?.category;

      let queryBuilder = supabase
        .from("profiles")
        .select("id, full_name, username, ville, role")
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
            status: "draft",
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
          .insert(baseRows as any[]);
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
    return <ActivityIndicator style={{ marginTop: 50 }} color="#841584" />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginBottom: 10 }}
        >
          <Text style={{ fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Préparer le tournage</Text>
        <Text style={styles.subtitle}>
          {project?.title} • {project?.type} • {project?.pays || "Pays ?"}{" "}
          {project?.ville ? `• ${project.ville}` : ""}
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Définir les rôles</Text>
        <TouchableOpacity onPress={addDraftRole}>
          <Text style={{ color: "#841584", fontWeight: "bold" }}>
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
                    style={{ color: item.category === cat ? "white" : "#333" }}
                  >
                    {cat.charAt(0).toUpperCase() +
                      cat.slice(1).replace("_", " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Intitulé du poste</Text>
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
                  onChangeText={(t) => updateDraft(item.id, { description: t })}
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
                  <Text style={{ color: item.gender === g ? "white" : "#333" }}>
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
        <Button
          title={saving ? "Enregistrement..." : "Enregistrer ces rôles"}
          onPress={saveAll}
          color="#841584"
          disabled={saving}
        />
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
              value={query}
              onChangeText={searchProfiles}
              style={styles.input}
            />
            {searching ? (
              <ActivityIndicator color="#841584" />
            ) : (
              <FlatList
                data={results}
                keyExtractor={(it) => it.id}
                style={{ maxHeight: 300 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => {
                      const roleId = pickerOpen!;
                      const locationStr = item.ville ? ` • ${item.ville}` : "";
                      const label = `${item.full_name || item.username || "Profil"}${locationStr}`;
                      updateDraft(roleId, { assignee: { id: item.id, label } });
                      setPickerOpen(null);
                      setQuery("");
                      setResults([]);
                    }}
                    style={styles.profileRow}
                  >
                    <View>
                      <Text style={{ fontWeight: "600", fontSize: 16 }}>
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
                              color: "#841584",
                              fontWeight: "600",
                            }}
                          >
                            {item.role.toUpperCase()}
                          </Text>
                        )}
                        {item.ville ? (
                          <Text style={{ fontSize: 12, color: "#666" }}>
                            {item.role ? `• ${item.ville}` : item.ville}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={{ textAlign: "center", color: "#999" }}>
                    Aucun résultat
                  </Text>
                }
              />
            )}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 10,
              }}
            >
              <Button
                title="Fermer"
                color="#999"
                onPress={() => setPickerOpen(null)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.backgroundSecondary },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
  },
  title: { fontSize: 22, fontWeight: "bold", color: Colors.light.text },
  subtitle: { color: "#666", marginTop: 4 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: Colors.light.text },
  roleCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: Colors.light.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.light.border
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  catChip: {
    borderColor: Colors.light.primary,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  catChipSelected: { backgroundColor: Colors.light.primary },
  jobChip: {
    backgroundColor: Colors.light.backgroundSecondary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.light.border
  },
  jobChipSelected: { backgroundColor: Colors.light.text, borderColor: Colors.light.text },
  roleHeader: { fontSize: 12, color: "#999", marginBottom: 8 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: Colors.light.text,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    backgroundColor: Colors.light.backgroundSecondary,
    color: Colors.light.text
  },
  assigneeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 8,
    backgroundColor: Colors.light.background
  },
  assignBtn: {
    backgroundColor: Colors.light.primary,
    padding: 10,
    alignItems: "center",
    borderRadius: 8,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.background,
    padding: 10,
    borderTopWidth: 1,
    borderColor: Colors.light.border,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  modalContent: { backgroundColor: Colors.light.background, borderRadius: 15, padding: 20 },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
    color: Colors.light.text
  },
  profileRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
  },
});
