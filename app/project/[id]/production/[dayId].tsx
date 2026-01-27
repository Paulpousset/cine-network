import AddressAutocomplete from "@/app/components/AddressAutocomplete";
import CityPicker from "@/app/components/CityPicker";
import WebDatePicker from "@/components/WebDatePicker";
import Colors from "@/constants/Colors";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
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
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const DAY_TYPES = ["SHOOT", "SCOUT", "PREP", "OFF", "TRAVEL"];
const ACCESS_TAGS = ["STAIRS", "NO ELEVATOR", "NOISE", "PERMITS", "NARROW"];
const RISK_TAGS = [
  "NIGHT",
  "TRAFFIC",
  "STUNTS",
  "CHILDREN",
  "ANIMALS",
  "FIRE",
  "HEIGHT",
];

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

export default function DayDetailScreen() {
  const local = useLocalSearchParams();
  const global = useGlobalSearchParams();
  const id = local.id || global.id; // Project ID
  const dayId = local.dayId; // Shoot Day ID
  const router = useRouter();

  const [day, setDay] = useState<any>(null);
  const [calls, setCalls] = useState<any[]>([]);
  const [linkedScenes, setLinkedScenes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [sceneModalVisible, setSceneModalVisible] = useState(false);
  const [addingCall, setAddingCall] = useState(false);

  // Data for modals
  const [roles, setRoles] = useState<any[]>([]);
  const [availableScenes, setAvailableScenes] = useState<any[]>([]);

  // Edit Day State
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    location: "",
    notes: "",
    call_time: "",
    wrap_time: "",
    day_type: "SHOOT",
    address_street: "",
    address_city: "",
    parking_info: "",
    base_camp_location: "",
    lunch_time: "",
    catering_info: "",
    weather_summary: "",
    risks: [] as string[],
    access_constraints: [] as string[],
  });

  // Pickers visibility
  const [showCallPicker, setShowCallPicker] = useState(false);
  const [showWrapPicker, setShowWrapPicker] = useState(false);
  const [showLunchPicker, setShowLunchPicker] = useState(false);

  const onCallTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowCallPicker(false);
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, "0");
      const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
      setFormData((prev) => ({ ...prev, call_time: `${hours}:${minutes}` }));
    }
  };

  const onWrapTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowWrapPicker(false);
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, "0");
      const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
      setFormData((prev) => ({ ...prev, wrap_time: `${hours}:${minutes}` }));
    }
  };

  const onLunchTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowLunchPicker(false);
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, "0");
      const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
      setFormData((prev) => ({ ...prev, lunch_time: `${hours}:${minutes}` }));
    }
  };

  // Add Call State
  const [selectedRole, setSelectedRole] = useState("");
  const [individualCallTime, setIndividualCallTime] = useState("");
  const [callMode, setCallMode] = useState<"individual" | "category">(
    "individual",
  );
  const [selectedCategory, setSelectedCategory] = useState("");

  const categories = Array.from(
    new Set(roles.map((r) => r.category).filter(Boolean)),
  );

  useEffect(() => {
    fetchDayDetails();
    fetchCalls();
    fetchLinkedScenes();
  }, [dayId]);

  async function fetchDayDetails() {
    const { data, error } = await supabase
      .from("shoot_days")
      .select("*")
      .eq("id", dayId)
      .single();

    if (error) {
      // console.error(error);
      Alert.alert("Erreur", "Impossible de charger les détails du jour");
    } else {
      setDay(data);
      setFormData({
        date: data.date,
        location: data.location || "",
        notes: data.notes || "",
        call_time: data.call_time || "",
        wrap_time: data.wrap_time || "",
        day_type: data.day_type || "SHOOT",
        address_street: data.address_street || "",
        address_city: data.address_city || "",
        parking_info: data.parking_info || "",
        base_camp_location: data.base_camp_location || "",
        lunch_time: data.lunch_time || "",
        catering_info: data.catering_info || "",
        weather_summary: data.weather_summary || "",
        risks: data.risks || [],
        access_constraints: data.access_constraints || [],
      });
    }
  }

  async function fetchCalls() {
    const { data, error } = await supabase
      .from("day_calls")
      .select(
        `
        *,
        role:project_roles(
            id, 
            title, 
            assigned_profile:profiles(full_name)
        )
      `,
      )
      .eq("shoot_day_id", dayId);

    if (error) console.error(error);
    else setCalls(data || []);
    setLoading(false);
  }

  async function fetchLinkedScenes() {
    const { data, error } = await supabase
      .from("shoot_day_scenes")
      .select(
        `
            id,
            scene:scenes (*)
        `,
      )
      .eq("shoot_day_id", dayId)
      .order("order_index", { ascending: true });

    if (error) console.error("Error fetching linked scenes", error);
    else setLinkedScenes(data || []);
  }

  async function fetchAvailableScenes() {
    // Get all scenes for the project
    // Ideally we filter out scenes already attached, but showing all is fine for now
    const { data } = await supabase
      .from("scenes")
      .select("*")
      .eq("project_id", id)
      .order("scene_number");
    if (data) {
      // Filter out already linked
      const linkedIds = linkedScenes.map((ls) => ls.scene?.id);
      setAvailableScenes(data.filter((s) => !linkedIds.includes(s.id)));
    }
    setSceneModalVisible(true);
  }

  async function handleLinkScene(sceneId: string) {
    const { error } = await supabase.from("shoot_day_scenes").insert({
      shoot_day_id: dayId,
      scene_id: sceneId,
      order_index: linkedScenes.length, // Append to end
    });
    if (error) Alert.alert("Erreur", "Impossible d'ajouter la séquence");
    else {
      setSceneModalVisible(false);
      fetchLinkedScenes();
    }
  }

  async function handleUnlinkScene(linkId: string) {
    const { error } = await supabase
      .from("shoot_day_scenes")
      .delete()
      .eq("id", linkId);
    if (!error) fetchLinkedScenes();
  }

  async function handleUpdateDay() {
    const { error } = await supabase
      .from("shoot_days")
      .update({
        location: formData.location,
        notes: formData.notes,
        call_time: formData.call_time || null,
        wrap_time: formData.wrap_time || null,
        day_type: formData.day_type,
        address_street: formData.address_street,
        address_city: formData.address_city,
        parking_info: formData.parking_info,
        base_camp_location: formData.base_camp_location,
        lunch_time: formData.lunch_time || null,
        catering_info: formData.catering_info,
        weather_summary: formData.weather_summary,
        risks: formData.risks,
        access_constraints: formData.access_constraints,
      })
      .eq("id", dayId);

    if (error) {
      Alert.alert("Erreur", "Mise à jour échouée");
    } else {
      setEditing(false);
      fetchDayDetails();
    }
  }

  // --- Helpers for Arrays (Tags) ---
  function toggleTag(
    tag: string,
    list: string[],
    fieldName: "risks" | "access_constraints",
  ) {
    const newList = list.includes(tag)
      ? list.filter((t) => t !== tag)
      : [...list, tag];
    setFormData({ ...formData, [fieldName]: newList });
  }

  // --- Convocations Logic ---
  async function fetchRoles() {
    const { data } = await supabase
      .from("project_roles")
      .select("id, title, category, assigned_profile:profiles(full_name)")
      .eq("tournage_id", id);
    setRoles(data || []);
  }

  async function handleAddCategoryCall(category: string) {
    const rolesInCat = roles.filter((r) => r.category === category);
    if (rolesInCat.length === 0) {
      Alert.alert("Info", "Aucun rôle trouvé dans cette catégorie");
      return;
    }

    // Prepare inserts
    const inserts = rolesInCat.map((r) => ({
      shoot_day_id: dayId,
      role_id: r.id,
      call_time: individualCallTime || null,
    }));

    const { error } = await supabase.from("day_calls").insert(inserts);

    if (error) {
      console.error(error);
      Alert.alert("Erreur", "Problème lors de l'ajout du groupe");
    } else {
      setCallModalVisible(false);
      fetchCalls();
    }
  }

  async function handleAddCall() {
    if (!selectedRole) return;
    const { error } = await supabase.from("day_calls").insert({
      shoot_day_id: dayId,
      role_id: selectedRole,
      call_time: individualCallTime || null,
    });
    if (error) Alert.alert("Erreur", "Impossible d'ajouter la convocation");
    else {
      setCallModalVisible(false);
      fetchCalls();
    }
  }

  async function handleDeleteCall(callId: string) {
    const { error } = await supabase
      .from("day_calls")
      .delete()
      .eq("id", callId);
    if (!error) fetchCalls();
  }

  function openCallModal() {
    fetchRoles();
    setCallModalVisible(true);
  }

  if (!day)
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );

  const totalPages = linkedScenes.reduce(
    (acc, curr) => acc + (curr.scene?.script_pages || 0),
    0,
  );
  const totalEstMinutes = linkedScenes.reduce(
    (acc, curr) => acc + (curr.scene?.estimated_duration || 0),
    0,
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 15 }}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {day.date
            ? new Date(day.date).toLocaleDateString()
            : "Nouvelle Journée"}
        </Text>
        <TouchableOpacity onPress={() => setEditing(!editing)}>
          <Text style={{ color: Colors.light.tint, fontWeight: "600" }}>
            {editing ? "Annuler" : "Modifier"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. GENERAL INFO */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Général</Text>
          {editing ? (
            <>
              <Text style={styles.label}>Type de journée</Text>
              <Selector
                options={DAY_TYPES}
                value={formData.day_type}
                onChange={(val) => setFormData({ ...formData, day_type: val })}
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Pâté (Call)</Text>
                  <TouchableOpacity
                    style={[styles.input, { justifyContent: "center" }]}
                    onPress={() => setShowCallPicker(!showCallPicker)}
                  >
                    <Text
                      style={{
                        color: formData.call_time ? Colors.light.text : "#999",
                      }}
                    >
                      {formData.call_time || "08:00"}
                    </Text>
                  </TouchableOpacity>
                  {showCallPicker &&
                    (Platform.OS === "web" ? (
                      <WebDatePicker
                        type="time"
                        value={formData.call_time}
                        onChange={(val) => {
                          setFormData((prev) => ({ ...prev, call_time: val }));
                          setShowCallPicker(false);
                        }}
                      />
                    ) : (
                      <DateTimePicker
                        value={(() => {
                          const d = new Date();
                          if (formData.call_time) {
                            const [h, m] = formData.call_time.split(":");
                            d.setHours(Number(h));
                            d.setMinutes(Number(m));
                          } else {
                            d.setHours(8);
                            d.setMinutes(0);
                          }
                          return d;
                        })()}
                        mode="time"
                        is24Hour={true}
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={onCallTimeChange}
                      />
                    ))}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.label}>Fin (Wrap)</Text>
                  <TouchableOpacity
                    style={[styles.input, { justifyContent: "center" }]}
                    onPress={() => setShowWrapPicker(!showWrapPicker)}
                  >
                    <Text
                      style={{
                        color: formData.wrap_time ? Colors.light.text : "#999",
                      }}
                    >
                      {formData.wrap_time || "19:00"}
                    </Text>
                  </TouchableOpacity>
                  {showWrapPicker &&
                    (Platform.OS === "web" ? (
                      <WebDatePicker
                        type="time"
                        value={formData.wrap_time}
                        onChange={(val) => {
                          setFormData((prev) => ({ ...prev, wrap_time: val }));
                          setShowWrapPicker(false);
                        }}
                      />
                    ) : (
                      <DateTimePicker
                        value={(() => {
                          const d = new Date();
                          if (formData.wrap_time) {
                            const [h, m] = formData.wrap_time.split(":");
                            d.setHours(Number(h));
                            d.setMinutes(Number(m));
                          } else {
                            d.setHours(19);
                            d.setMinutes(0);
                          }
                          return d;
                        })()}
                        mode="time"
                        is24Hour={true}
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={onWrapTimeChange}
                      />
                    ))}
                </View>
              </View>
            </>
          ) : (
            <View style={styles.readOnlyRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{day.day_type}</Text>
              </View>
              <Text style={styles.infoText}>
                Call: {day.call_time || "--:--"} {"->"} Wrap:{" "}
                {day.wrap_time || "--:--"}
              </Text>
            </View>
          )}
        </View>

        {/* 2. ORGANIZATION (SCENES) */}
        {!editing && (
          <View style={styles.card}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={styles.cardTitle}>
                Organisation ({linkedScenes.length} seq)
              </Text>
              <TouchableOpacity onPress={fetchAvailableScenes}>
                <Ionicons
                  name="add-circle-outline"
                  size={24}
                  color={Colors.light.tint}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
              <Text style={styles.statText}>Pages: {totalPages}</Text>
              <Text style={styles.statText}>
                Est: {Math.floor(totalEstMinutes / 60)}h{totalEstMinutes % 60}
              </Text>
            </View>

            {linkedScenes.map((item, index) => (
              <View key={item.id} style={styles.sceneItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sceneTitle}>
                    <Text
                      style={{ fontWeight: "bold", color: Colors.light.tint }}
                    >
                      {item.scene?.scene_number}
                    </Text>
                    {" - "}
                    {item.scene?.slugline}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 5, marginTop: 4 }}>
                    {item.scene?.location_type && (
                      <Text style={styles.miniTag}>
                        {item.scene.location_type}
                      </Text>
                    )}
                    {item.scene?.day_night && (
                      <Text style={styles.miniTag}>{item.scene.day_night}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleUnlinkScene(item.id)}>
                  <Ionicons name="close-circle" size={20} color="#adb5bd" />
                </TouchableOpacity>
              </View>
            ))}

            {linkedScenes.length === 0 && (
              <Text style={{ color: "#999", fontStyle: "italic" }}>
                Aucune séquence liée.
              </Text>
            )}
          </View>
        )}

        {/* 3. LOGISTICS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Logistique</Text>
          {editing ? (
            <>
              <Text style={styles.label}>Lieu (Nom)</Text>
              <TextInput
                style={styles.input}
                value={formData.location}
                onChangeText={(t) => setFormData({ ...formData, location: t })}
              />

              <Text style={[styles.label, { zIndex: 10 }]}>Adresse (Rue)</Text>
              <AddressAutocomplete
                currentValue={formData.address_street}
                onSelect={(addr, lat, lon, city, zip) => {
                  setFormData((prev) => ({
                    ...prev,
                    address_street: addr,
                    address_city: city
                      ? zip
                        ? `${zip} ${city}`
                        : city
                      : prev.address_city,
                  }));
                }}
                placeholder="Rechercher une adresse..."
              />

              <Text style={styles.label}>Ville / CP</Text>
              <CityPicker
                currentValue={formData.address_city}
                onSelect={(t) => setFormData({ ...formData, address_city: t })}
                placeholder="Ville..."
              />

              <Text style={styles.label}>Base Régie (si différent)</Text>
              <TextInput
                style={styles.input}
                value={formData.base_camp_location}
                onChangeText={(t) =>
                  setFormData({ ...formData, base_camp_location: t })
                }
                placeholder="Parking stade..."
              />

              <Text style={styles.label}>Infos Parking</Text>
              <TextInput
                style={styles.input}
                value={formData.parking_info}
                onChangeText={(t) =>
                  setFormData({ ...formData, parking_info: t })
                }
                placeholder="Code portail: 1234"
                multiline
              />

              <Text style={styles.label}>Contraintes d'accès</Text>
              <View style={styles.tagContainer}>
                {ACCESS_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.chip,
                      formData.access_constraints.includes(tag) &&
                        styles.chipSelected,
                    ]}
                    onPress={() =>
                      toggleTag(
                        tag,
                        formData.access_constraints,
                        "access_constraints",
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        formData.access_constraints.includes(tag) &&
                          styles.chipTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={18} color="#666" />
                <Text style={styles.infoText}>
                  {day.location || "Lieu non défini"}
                </Text>
              </View>
              {day.address_street && (
                <Text style={styles.subInfo}>
                  {day.address_street}, {day.address_city}
                </Text>
              )}
              {day.base_camp_location && (
                <View style={styles.infoRow}>
                  <Ionicons name="bus" size={18} color="#666" />
                  <Text style={styles.infoText}>
                    Régie: {day.base_camp_location}
                  </Text>
                </View>
              )}
              {day.parking_info && (
                <View style={styles.noteBox}>
                  <Text style={{ fontSize: 12 }}>PKG: {day.parking_info}</Text>
                </View>
              )}

              {day.access_constraints && day.access_constraints.length > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 5,
                    marginTop: 10,
                  }}
                >
                  {day.access_constraints.map((t: string) => (
                    <View key={t} style={styles.smallChip}>
                      <Text style={styles.smallChipText}>{t}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* 4. MEALS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Repas</Text>
          {editing ? (
            <>
              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Heure Déj</Text>
                  <TouchableOpacity
                    style={[styles.input, { justifyContent: "center" }]}
                    onPress={() => setShowLunchPicker(!showLunchPicker)}
                  >
                    <Text
                      style={{
                        color: formData.lunch_time ? Colors.light.text : "#999",
                      }}
                    >
                      {formData.lunch_time || "13:00"}
                    </Text>
                  </TouchableOpacity>
                  {showLunchPicker &&
                    (Platform.OS === "web" ? (
                      <WebDatePicker
                        type="time"
                        value={formData.lunch_time}
                        onChange={(val) => {
                          setFormData((prev) => ({ ...prev, lunch_time: val }));
                          setShowLunchPicker(false);
                        }}
                      />
                    ) : (
                      <DateTimePicker
                        value={(() => {
                          const d = new Date();
                          if (formData.lunch_time) {
                            const [h, m] = formData.lunch_time.split(":");
                            d.setHours(Number(h));
                            d.setMinutes(Number(m));
                          } else {
                            d.setHours(13);
                            d.setMinutes(0);
                          }
                          return d;
                        })()}
                        mode="time"
                        is24Hour={true}
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={onLunchTimeChange}
                      />
                    ))}
                </View>
              </View>
              <Text style={styles.label}>Infos Traiteur / Resto</Text>
              <TextInput
                style={styles.input}
                value={formData.catering_info}
                onChangeText={(t) =>
                  setFormData({ ...formData, catering_info: t })
                }
                placeholder="Cantine sur place"
                multiline
              />
            </>
          ) : (
            <View style={styles.readOnlyRow}>
              <Text style={styles.infoText}>
                🍽 {day.lunch_time || "--:--"}
              </Text>
              <Text style={{ marginLeft: 10, flex: 1, color: "#666" }}>
                {day.catering_info || "Pas d'infos"}
              </Text>
            </View>
          )}
        </View>

        {/* 5. WEATHER & SAFETY */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sécurité & Météo</Text>
          {editing ? (
            <>
              <Text style={styles.label}>Météo prévue</Text>
              <TextInput
                style={styles.input}
                value={formData.weather_summary}
                onChangeText={(t) =>
                  setFormData({ ...formData, weather_summary: t })
                }
                placeholder="Soleil, 20°C"
              />

              <Text style={styles.label}>Risques</Text>
              <View style={styles.tagContainer}>
                {RISK_TAGS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.chip,
                      formData.risks.includes(tag) && styles.chipSelected,
                    ]}
                    onPress={() => toggleTag(tag, formData.risks, "risks")}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        formData.risks.includes(tag) && styles.chipTextSelected,
                      ]}
                    >
                      {tag}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="sunny" size={18} color="#666" />
                <Text style={styles.infoText}>
                  {day.weather_summary || "-"}
                </Text>
              </View>
              {day.risks && day.risks.length > 0 && (
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 5,
                    marginTop: 10,
                  }}
                >
                  {day.risks.map((t: string) => (
                    <View
                      key={t}
                      style={[styles.smallChip, { backgroundColor: "#ffe3e3" }]}
                    >
                      <Text
                        style={[styles.smallChipText, { color: "#c92a2a" }]}
                      >
                        {t}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* SAVE BUTTON */}
        {editing && (
          <TouchableOpacity
            style={styles.mainSaveButton}
            onPress={handleUpdateDay}
          >
            <Text style={styles.mainSaveButtonText}>
              Enregistrer les modifications
            </Text>
          </TouchableOpacity>
        )}

        {/* 6. CALLS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Convocations ({calls.length})</Text>
          <TouchableOpacity onPress={openCallModal}>
            <Ionicons name="add-circle" size={24} color={Colors.light.tint} />
          </TouchableOpacity>
        </View>

        {calls.map((call) => (
          <View key={call.id} style={styles.callItem}>
            <View>
              <Text style={styles.roleTitle}>
                {call.role?.title || "Unknown Role"}
              </Text>
              <Text style={styles.personName}>
                {call.role?.assigned_profile?.full_name || "Non assigné"}
              </Text>
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <Text style={styles.timeBadge}>
                {call.call_time
                  ? call.call_time.slice(0, 5)
                  : day.call_time?.slice(0, 5) || "--:--"}
              </Text>
              <TouchableOpacity onPress={() => handleDeleteCall(call.id)}>
                <Ionicons name="trash-outline" size={20} color="red" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* MODAL CALLS */}
      <Modal
        visible={callModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCallModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Ajouter une convocation</Text>

          <View
            style={{
              flexDirection: "row",
              marginBottom: 20,
              backgroundColor: "#f1f3f5",
              padding: 4,
              borderRadius: 8,
            }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                padding: 8,
                alignItems: "center",
                backgroundColor:
                  callMode === "individual" ? "white" : "transparent",
                borderRadius: 6,
              }}
              onPress={() => setCallMode("individual")}
            >
              <Text
                style={{
                  fontWeight: callMode === "individual" ? "bold" : "normal",
                }}
              >
                Par Personne
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                padding: 8,
                alignItems: "center",
                backgroundColor:
                  callMode === "category" ? "white" : "transparent",
                borderRadius: 6,
              }}
              onPress={() => setCallMode("category")}
            >
              <Text
                style={{
                  fontWeight: callMode === "category" ? "bold" : "normal",
                }}
              >
                Par Catégorie
              </Text>
            </TouchableOpacity>
          </View>

          {callMode === "individual" ? (
            <>
              <Text style={styles.label}>Rôle / Personne</Text>
              <FlatList
                data={roles}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 300, marginBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      selectedRole === item.id && styles.selectedRoleOption,
                    ]}
                    onPress={() => setSelectedRole(item.id)}
                  >
                    <Text style={{ fontWeight: "bold" }}>{item.title}</Text>
                    <Text>{item.assigned_profile?.full_name || "Vacant"}</Text>
                  </TouchableOpacity>
                )}
              />
            </>
          ) : (
            <>
              <Text style={styles.label}>Choisir une Catégorie</Text>
              <FlatList
                data={categories}
                keyExtractor={(item) => item as string}
                style={{ maxHeight: 300, marginBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      selectedCategory === item && styles.selectedRoleOption,
                    ]}
                    onPress={() => setSelectedCategory(item as string)}
                  >
                    <Text style={{ fontWeight: "bold" }}>{item as string}</Text>
                  </TouchableOpacity>
                )}
              />
            </>
          )}

          <Text style={styles.label}>Heure spécifique (facultatif)</Text>
          <TextInput
            style={styles.input}
            value={individualCallTime}
            onChangeText={setIndividualCallTime}
            placeholder="08:00 (laisser vide pour heure générale)"
          />

          <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
            <TouchableOpacity
              style={[styles.saveButton, { flex: 1, backgroundColor: "#ccc" }]}
              onPress={() => setCallModalVisible(false)}
            >
              <Text style={styles.saveButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { flex: 1 }]}
              onPress={() =>
                callMode === "individual"
                  ? handleAddCall()
                  : handleAddCategoryCall(selectedCategory)
              }
            >
              <Text style={styles.saveButtonText}>Ajouter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL SCENES */}
      <Modal
        visible={sceneModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSceneModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Ajouter une séquence</Text>
          <FlatList
            data={availableScenes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.sceneOption}
                onPress={() => handleLinkScene(item.id)}
              >
                <Text style={{ fontWeight: "bold", marginRight: 10 }}>
                  {item.scene_number}
                </Text>
                <Text style={{ flex: 1 }} numberOfLines={1}>
                  {item.slugline}
                </Text>
                <Text style={{ fontSize: 12, color: "#999" }}>
                  {item.script_pages}p
                </Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: "#ccc", marginTop: 20 },
            ]}
            onPress={() => setSceneModalVisible(false)}
          >
            <Text style={styles.saveButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  card: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#495057",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: "#333",
  },
  subInfo: {
    fontSize: 13,
    color: "#666",
    marginLeft: 28,
    marginBottom: 8,
  },
  noteBox: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.tint,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
  },
  callItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  roleTitle: { fontWeight: "bold", fontSize: 14 },
  personName: { fontSize: 13, color: "#666" },
  timeBadge: {
    backgroundColor: "#e7f5ff",
    color: "#1c7ed6",
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: "hidden",
  },
  // Form
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 5,
    color: "#666",
    marginTop: 10,
  },
  input: {
    backgroundColor: "#f1f3f5",
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  textArea: { height: 80, textAlignVertical: "top" },
  saveButton: {
    backgroundColor: Colors.light.tint,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: { color: "white", fontWeight: "bold" },
  mainSaveButton: {
    backgroundColor: Colors.light.tint,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  mainSaveButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },

  // Modal
  modalContent: { flex: 1, padding: 20, paddingTop: 50 },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  roleOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedRoleOption: {
    backgroundColor: "#e7f5ff",
  },
  rowInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  readOnlyRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  badge: {
    backgroundColor: "#e9ecef",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: { fontSize: 12, fontWeight: "bold", color: "#495057" },

  // Tag chips
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 5,
  },
  chip: {
    backgroundColor: "#f1f3f5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
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
  smallChip: {
    backgroundColor: "#e9ecef",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  smallChipText: { fontSize: 10, color: "#495057" },

  // Scene items
  sceneItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f3f5",
  },
  sceneTitle: { fontSize: 14, color: "#333" },
  miniTag: {
    fontSize: 10,
    color: "#868e96",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  statsRow: { flexDirection: "row", gap: 15, marginBottom: 10 },
  statText: { fontSize: 12, color: "#adb5bd", fontWeight: "600" },
  sceneOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  // Selector Styles
  selectorContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f3f5",
    borderRadius: 8,
    padding: 4,
    marginBottom: 10,
  },
  selectorOption: {
    flex: 1,
    paddingVertical: 8,
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
