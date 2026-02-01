import Colors from "@/constants/Colors";
import { useUserMode } from "@/hooks/useUserMode";
import { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import {
    useGlobalSearchParams,
    useLocalSearchParams,
    useRouter,
} from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type Scene = Database["public"]["Tables"]["scenes"]["Row"];
type ProjectCharacter =
  Database["public"]["Tables"]["project_characters"]["Row"];
type ProjectSet = Database["public"]["Tables"]["project_sets"]["Row"];

const INT_EXT_OPTIONS = ["INT", "EXT", "INT/EXT"];
const DAY_NIGHT_OPTIONS = ["DAY", "NIGHT", "DAWN", "DUSK"];
const COMPLEXITY_OPTIONS = ["SIMPLE", "MEDIUM", "COMPLEX"];
const PRIORITY_OPTIONS = ["HIGH", "NORMAL", "FLEXIBLE"];
const LOCATION_TYPE_OPTIONS = ["REAL", "STUDIO"];

const CONSTRAINT_TAGS = [
  "Enfant",
  "Animal",
  "Cascade",
  "Nuit",
  "FX",
  "Dialogue long",
  "Intimité",
];

const SOUND_TAGS = ["Dialogue", "Ambiance", "Voix off", "Playback", "Musical"];

const ALLOWED_ROLES = [
  "Réalisateur",
  "1er Assistant Réalisateur",
  "Régisseur Général",
  "Directeur de production",
];

export default function BreakdownScreen() {
  const router = useRouter();
  const { mode } = useUserMode();
  const local = useLocalSearchParams<{ id: string }>();
  const global = useGlobalSearchParams<{ id: string }>();
  const id = local.id || global.id;

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [availableCharacters, setAvailableCharacters] = useState<
    ProjectCharacter[]
  >([]);
  const [projectSets, setProjectSets] = useState<ProjectSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);

  // Form State
  const [sceneNumber, setSceneNumber] = useState("");
  const [title, setTitle] = useState("");
  const [slugline, setSlugline] = useState("");
  const [intExt, setIntExt] = useState("INT");
  const [dayNight, setDayNight] = useState("DAY");
  const [description, setDescription] = useState("");
  const [scriptPages, setScriptPages] = useState("");

  // New States
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [extras, setExtras] = useState("");
  const [locationType, setLocationType] = useState("REAL");
  const [complexity, setComplexity] = useState("SIMPLE");
  const [priority, setPriority] = useState("NORMAL");
  const [props, setProps] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState(""); // minutes string

  // Multi-select states
  const [selectedConstraints, setSelectedConstraints] = useState<string[]>([]);
  const [selectedSound, setSelectedSound] = useState<string[]>([]);

  useEffect(() => {
    console.log("[Breakdown] useEffect triggered with id:", id);
    if (id) {
      checkPermissions();
      fetchScenes();
      fetchCharacters();
      fetchSets();
    } else {
      console.log("[Breakdown] No ID found, stopping loading");
      setLoading(false);
    }
  }, [id]);

  const checkPermissions = async () => {
    console.log("[Breakdown] checkPermissions starting");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.log("[Breakdown] No user logged in");
      return;
    }
    console.log("[Breakdown] User logged in:", user.id);

    // Check if owner
    const { data: project } = await supabase
      .from("tournages")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (project?.owner_id === user.id) {
      setCanEdit(true);
      return;
    }

    // Check project roles
    const { data: roles } = await supabase
      .from("project_roles")
      .select("title")
      .eq("tournage_id", id)
      .eq("assigned_profile_id", user.id);

    if (roles && roles.length > 0) {
      const hasAllowedRole = roles.some((r) => ALLOWED_ROLES.includes(r.title));
      if (hasAllowedRole) {
        setCanEdit(true);
      }
    }
  };

  const fetchScenes = async () => {
    console.log("[Breakdown] fetchScenes starting");
    setLoading(true);
    const { data, error } = await supabase
      .from("scenes")
      .select("*")
      .eq("tournage_id", id)
      .order("created_at", { ascending: true });

    console.log("[Breakdown] fetchScenes query result:", {
      dataCount: data?.length,
      error,
    });

    if (error) {
      console.error("Error fetching scenes:", error);
      Alert.alert("Erreur", "Impossible de charger les séquences.");
    } else {
      setScenes(data || []);
    }
    setLoading(false);
    console.log("[Breakdown] fetchScenes finished, loading set to false");
  };

  const fetchCharacters = async () => {
    const { data } = await supabase
      .from("project_characters")
      .select("*")
      .eq("project_id", id)
      .order("name", { ascending: true });

    if (data) {
      setAvailableCharacters(data);
    }
  };

  const fetchSets = async () => {
    const { data } = await supabase
      .from("project_sets")
      .select("*")
      .eq("project_id", id)
      .order("name", { ascending: true });

    if (data) {
      setProjectSets(data);
    }
  };

  const handleEditScene = (scene: Scene) => {
    setEditingSceneId(scene.id);
    setSceneNumber(scene.scene_number || "");
    setTitle(scene.title || "");
    setSlugline(scene.slugline || "");
    setIntExt(scene.int_ext || "INT");
    setDayNight(scene.day_night || "DAY");
    setDescription(scene.description || "");
    setScriptPages(scene.script_pages ? scene.script_pages.toString() : "");

    // New fields
    setSelectedCharacters(scene.characters || []);
    setExtras(scene.extras || "");
    setLocationType(scene.location_type || "REAL");
    setComplexity(scene.complexity || "SIMPLE");
    setPriority(scene.priority || "NORMAL");
    setProps(scene.props || "");
    setEstimatedDuration(
      scene.estimated_duration ? scene.estimated_duration.toString() : "",
    );
    setSelectedConstraints(scene.constraints || []);
    setSelectedSound(scene.sound_type || []);

    setModalVisible(true);
  };

  const handleUpdateScene = async () => {
    if (!editingSceneId || !sceneNumber || !slugline) return;

    setAdding(true);
    const pages = parseFloat(scriptPages.replace(",", ".")) || 0;
    const duration = parseInt(estimatedDuration) || null;

    const { error } = await supabase
      .from("scenes")
      .update({
        scene_number: sceneNumber,
        title: title,
        slugline: slugline,
        int_ext: intExt,
        day_night: dayNight,
        description: description,
        script_pages: pages,
        characters: selectedCharacters,
        extras: extras,
        location_type: locationType,
        complexity: complexity,
        priority: priority,
        props: props,
        estimated_duration: duration,
        constraints: selectedConstraints,
        sound_type: selectedSound,
      })
      .eq("id", editingSceneId);

    if (error) {
      console.error(error);
      Alert.alert("Erreur", "Impossible de modifier la séquence.");
    } else {
      setModalVisible(false);
      resetForm();
      fetchScenes();
    }
    setAdding(false);
  };

  const handleAddScene = async () => {
    if (!sceneNumber || !slugline) {
      Alert.alert(
        "Champs manquants",
        "Le numéro de séquence et le décor (slugline) sont requis.",
      );
      return;
    }

    setAdding(true);
    const pages = parseFloat(scriptPages.replace(",", ".")) || 0;
    const duration = parseInt(estimatedDuration) || null;

    const { error } = await supabase.from("scenes").insert({
      tournage_id: id,
      scene_number: sceneNumber,
      title: title,
      slugline: slugline,
      int_ext: intExt,
      day_night: dayNight,
      description: description,
      script_pages: pages,
      // New fields
      characters: selectedCharacters,
      extras: extras,
      location_type: locationType,
      complexity: complexity,
      priority: priority,
      props: props,
      estimated_duration: duration,
      constraints: selectedConstraints,
      sound_type: selectedSound,
    });

    if (error) {
      console.error(error);
      Alert.alert("Erreur", "Impossible d'ajouter la séquence.");
    } else {
      setModalVisible(false);
      resetForm();
      fetchScenes();
    }
    setAdding(false);
  };

  const resetForm = () => {
    setEditingSceneId(null);
    setSceneNumber("");
    setTitle("");
    setSlugline("");
    setIntExt("INT");
    setDayNight("DAY");
    setDescription("");
    setScriptPages("");

    setSelectedCharacters([]);
    setExtras("");
    setLocationType("REAL");
    setComplexity("SIMPLE");
    setPriority("NORMAL");
    setProps("");
    setEstimatedDuration("");
    setSelectedConstraints([]);
    setSelectedSound([]);
  };

  const toggleSelection = (
    item: string,
    list: string[],
    setList: (L: string[]) => void,
  ) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const renderSceneItem = ({ item }: { item: Scene & any }) => (
    <TouchableOpacity
      style={styles.sceneItem}
      onPress={() => canEdit && handleEditScene(item)}
      activeOpacity={canEdit ? 0.7 : 1}
    >
      <View style={styles.sceneHeader}>
        {/* LEFT COLUMN: Number+Title, then Slugline */}
        <View style={{ flex: 1, marginRight: 8 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 4,
              flexWrap: "wrap",
            }}
          >
            <Text style={styles.sceneNumber}>SC. {item.scene_number}</Text>
            {item.title ? (
              <Text
                style={{
                  fontWeight: "bold",
                  fontSize: 16,
                  color: "#000",
                  marginLeft: 8,
                }}
              >
                {item.title.toUpperCase()}
              </Text>
            ) : null}
          </View>

          <Text style={styles.sceneSlugline}>
            {item.int_ext} {item.slugline} - {item.day_night}
          </Text>
        </View>

        {/* RIGHT COLUMN: Pages + Duration */}
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.scenePages}>{item.script_pages} p</Text>
          {item.estimated_duration && (
            <Text style={{ fontSize: 10, color: "#666", marginTop: 2 }}>
              {item.estimated_duration} min
            </Text>
          )}
        </View>
      </View>

      {/* Short Summary of new fields */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 8,
        }}
      >
        {item.location_type === "STUDIO" && (
          <View style={[styles.badge, { backgroundColor: "#e7f5ff" }]}>
            <Text style={[styles.badgeText, { color: "#1c7ed6" }]}>STUDIO</Text>
          </View>
        )}
        {item.complexity === "COMPLEX" && (
          <View style={[styles.badge, { backgroundColor: "#fff0f6" }]}>
            <Text style={[styles.badgeText, { color: "#c2255c" }]}>
              COMPLEXE
            </Text>
          </View>
        )}
        {item.constraints &&
          item.constraints.map((c: string) => (
            <View
              key={c}
              style={[styles.badge, { backgroundColor: "#fff9db" }]}
            >
              <Text style={[styles.badgeText, { color: "#f08c00" }]}>{c}</Text>
            </View>
          ))}
      </View>

      {item.characters && item.characters.length > 0 && (
        <Text
          style={{
            fontSize: 13,
            color: "#1098AD",
            fontWeight: "600",
            marginBottom: 4,
          }}
        >
          <Ionicons name="people-outline" size={14} />{" "}
          {item.characters.join(", ")}
        </Text>
      )}

      {item.description ? (
        <Text style={styles.sceneDescription} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  const Selector = ({
    options,
    value,
    onChange,
  }: {
    options: string[];
    value: string;
    onChange: (val: string) => void;
  }) => (
    <View style={styles.selectorContainer}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[
            styles.selectorOption,
            value === opt && styles.selectorOptionSelected,
          ]}
          onPress={() => onChange(opt)}
        >
          <Text
            style={[
              styles.selectorText,
              value === opt && styles.selectorTextSelected,
            ]}
          >
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Custom Header since Tabs/Stack header is hidden */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          {mode !== "studio" && (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/project/[id]/spaces/[category]",
                  params: { id: id, category: "production", tab: "tools" },
                })
              }
              style={{ marginRight: 15 }}
            >
              <Ionicons name="arrow-back" size={28} color="#000" />
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>Dépouillement</Text>
        </View>
        {canEdit && (
          <TouchableOpacity
            onPress={() => {
              resetForm();
              setModalVisible(true);
            }}
            style={styles.headerButton}
          >
            <Ionicons name="add-circle" size={32} color={Colors.light.tint} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
        </View>
      ) : (
        <FlatList
          data={scenes}
          renderItem={renderSceneItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Aucune séquence pour le moment.
            </Text>
          }
        />
      )}

      {/* Add Scene Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingSceneId ? "Modifier la Séquence" : "Nouvelle Séquence"}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.formRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Numéro de séquence</Text>
                <TextInput
                  style={styles.input}
                  value={sceneNumber}
                  onChangeText={setSceneNumber}
                  placeholder="Ex: 1, 12A"
                  autoCapitalize="characters"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 3 }]}>
                <Text style={styles.label}>Décor (Slugline)</Text>
                <TextInput
                  style={styles.input}
                  value={slugline}
                  onChangeText={setSlugline}
                  placeholder="Ex: CHAMBRE DE PAUL"
                  autoCapitalize="characters"
                />

                {projectSets.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text
                      style={[styles.label, { fontSize: 12, marginBottom: 4 }]}
                    >
                      Nos décors :
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                    >
                      {projectSets.map((set) => (
                        <TouchableOpacity
                          key={set.id}
                          style={{
                            backgroundColor: Colors.light.backgroundSecondary,
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 16,
                            marginRight: 8,
                            borderWidth: 1,
                            borderColor: Colors.light.border,
                          }}
                          onPress={() => setSlugline(set.name.toUpperCase())}
                        >
                          <Text style={{ fontSize: 12, color: "#333" }}>
                            {set.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Titre (Optionnel)</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Ex: Rencontre avec le boss"
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Location</Text>
                <Selector
                  options={INT_EXT_OPTIONS}
                  value={intExt}
                  onChange={setIntExt}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Lumière</Text>
                <Selector
                  options={DAY_NIGHT_OPTIONS}
                  value={dayNight}
                  onChange={setDayNight}
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Nbre de pages</Text>
                <TextInput
                  style={styles.input}
                  value={scriptPages}
                  keyboardType="numeric"
                  onChangeText={setScriptPages}
                  placeholder="Ex: 1.5"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Durée estimée (min)</Text>
                <TextInput
                  style={styles.input}
                  value={estimatedDuration}
                  onChangeText={setEstimatedDuration}
                  keyboardType="numeric"
                  placeholder="Ex: 45"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <Text style={styles.label}>Personnages</Text>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {availableCharacters.map((char) => (
                    <TouchableOpacity
                      key={char.id}
                      onPress={() =>
                        toggleSelection(
                          char.name,
                          selectedCharacters,
                          setSelectedCharacters,
                        )
                      }
                      style={[
                        styles.chip,
                        selectedCharacters.includes(char.name) &&
                          styles.chipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedCharacters.includes(char.name) &&
                            styles.chipTextSelected,
                        ]}
                      >
                        {char.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {availableCharacters.length === 0 && (
                    <Text style={{ color: "#999", fontStyle: "italic" }}>
                      Aucun personnage créé. Allez dans Outils &gt; Casting.
                    </Text>
                  )}
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Figuration</Text>
                <TextInput
                  style={styles.input}
                  value={extras}
                  onChangeText={setExtras}
                  placeholder="Ex: 10 passants"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Décor</Text>
                <Selector
                  options={LOCATION_TYPE_OPTIONS}
                  value={locationType}
                  onChange={setLocationType}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Complexité</Text>
                <Selector
                  options={COMPLEXITY_OPTIONS}
                  value={complexity}
                  onChange={setComplexity}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Priorité</Text>
                <Selector
                  options={PRIORITY_OPTIONS}
                  value={priority}
                  onChange={setPriority}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contraintes</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {CONSTRAINT_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() =>
                      toggleSelection(
                        tag,
                        selectedConstraints,
                        setSelectedConstraints,
                      )
                    }
                    style={[
                      styles.chip,
                      selectedConstraints.includes(tag) && styles.chipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedConstraints.includes(tag) &&
                          styles.chipTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Son</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {SOUND_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() =>
                      toggleSelection(tag, selectedSound, setSelectedSound)
                    }
                    style={[
                      styles.chip,
                      selectedSound.includes(tag) && styles.chipSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedSound.includes(tag) && styles.chipTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Accessoires clés</Text>
              <TextInput
                style={styles.input}
                value={props}
                onChangeText={setProps}
                placeholder="Arme, Voiture..."
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Description de la scène..."
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, adding && styles.disabledButton]}
              onPress={editingSceneId ? handleUpdateScene : handleAddScene}
              disabled={adding}
            >
              <Text style={styles.saveButtonText}>
                {adding
                  ? "Enregistrement..."
                  : editingSceneId
                    ? "Mettre à jour"
                    : "Enregistrer"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60, // Safe Area top padding approx
    paddingBottom: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  headerButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyText: {
    textAlign: "center",
    color: "#6c757d",
    marginTop: 40,
    fontSize: 16,
  },
  sceneItem: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sceneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  sceneTitleRow: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    marginRight: 8,
  },
  sceneNumber: {
    fontWeight: "bold",
    fontSize: 16,
    color: Colors.light.tint,
  },
  sceneSlugline: {
    fontWeight: "600",
    fontSize: 16,
    color: "#212529",
  },
  scenePages: {
    fontSize: 12,
    color: "#6c757d",
    backgroundColor: "#e9ecef",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
  },
  sceneDescription: {
    fontSize: 14,
    color: "#495057",
  },
  chip: {
    backgroundColor: "#e9ecef",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipSelected: {
    backgroundColor: "#dbe4ff",
    borderColor: "#4c6ef5",
  },
  chipText: {
    fontSize: 12,
    color: "#495057",
  },
  chipTextSelected: {
    color: "#364fc7",
    fontWeight: "600",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  // Modal Styles
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
    backgroundColor: "white",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  cancelText: {
    color: Colors.light.tint,
    fontSize: 16,
  },
  modalContent: {
    padding: 20,
    width: "100%",
    maxWidth: Platform.OS === "web" ? 800 : undefined,
    alignSelf: "center",
  },
  formRow: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    gap: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f1f3f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#212529",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: "#a5d8ff",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Selector Styles
  selectorContainer: {
    flexDirection: "row",
    backgroundColor: "#e9ecef",
    borderRadius: 8,
    padding: 4,
  },
  selectorOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  selectorOptionSelected: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  selectorText: {
    fontSize: 13,
    color: "#868e96",
    fontWeight: "500",
  },
  selectorTextSelected: {
    color: Colors.light.tint,
    fontWeight: "600",
  },
});
