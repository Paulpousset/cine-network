import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useGlobalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../../lib/supabase";

type Event = {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  event_type: "general" | "role_specific" | "category_specific";
  target_role_ids?: string[]; // CHANGED: array of strings
  target_categories?: string[]; // CHANGED: array of strings
};

export default function ProjectCalendar() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Week View State
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  });

  // Data
  const [events, setEvents] = useState<Event[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [userRoleIds, setUserRoleIds] = useState<string[]>([]);
  const [userCategories, setUserCategories] = useState<string[]>([]);
  // ADMIN SYSTEM: List of categories where the user is an admin
  const [adminCategories, setAdminCategories] = useState<string[]>([]);

  // Modal (Create Event)
  const [modalVisible, setModalVisible] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [newEventDate, setNewEventDate] = useState(""); // YYYY-MM-DD
  const [newEventTime, setNewEventTime] = useState(""); // HH:MM

  const [newEventType, setNewEventType] = useState<
    "general" | "role_specific" | "category_specific"
  >("general");

  // Multi-select states
  const [targetRoles, setTargetRoles] = useState<any[]>([]); // Array of selected role objects or IDs
  const [targetCategories, setTargetCategories] = useState<string[]>([]); // Array of category strings

  // For selecting target role/category
  const [projectRoles, setProjectRoles] = useState<any[]>([]);
  const [projectCategories, setProjectCategories] = useState<string[]>([]);

  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // Date/Time Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
    // On Android, the picker closes automatically.
    // On iOS, we might want to keep it open or close it manually.
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setNewEventDate(selectedDate.toISOString().split("T")[0]);
    }
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, "0");
      const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
      setNewEventTime(`${hours}:${minutes}`);
    }
  };

  useEffect(() => {
    if (id && id !== "undefined") {
      fetchContext();
    } else {
      setLoading(false);
    }
  }, [id]);

  async function fetchContext() {
    if (!id || id === "undefined") return;
    try {
      setLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Check Owner
      const { data: proj } = await supabase
        .from("tournages")
        .select("owner_id")
        .eq("id", id)
        .single();

      const owner = proj?.owner_id === session.user.id;
      setIsOwner(owner);

      // 2. Identify User's Roles in this project (if not owner)
      let roleIds: string[] = [];
      let categories: string[] = [];
      let adminCats: string[] = [];

      if (!owner) {
        const { data: myRoles } = await supabase
          .from("project_roles")
          .select("id, category, is_category_admin")
          .eq("tournage_id", id)
          .eq("assigned_profile_id", session.user.id);

        if (myRoles) {
          roleIds = myRoles.map((r) => r.id);
          categories = [...new Set(myRoles.map((r) => r.category))];

          // Helper: Filter roles where is_category_admin is true
          adminCats = [
            ...new Set(
              myRoles
                .filter((r: any) => r.is_category_admin === true)
                .map((r) => r.category),
            ),
          ];
        }
        setUserRoleIds(roleIds);
        setUserCategories(categories);
        setAdminCategories(adminCats);
      }

      // 3. Fetch All Roles (needed for creating role-specific events)
      // OWNER OR ADMIN needs this list to select targets
      if (owner || adminCats.length > 0) {
        const { data: rollers } = await supabase
          .from("project_roles")
          .select("id, title, category, assigned_profile:profiles(full_name)")
          .eq("tournage_id", id);

        if (rollers) {
          console.log("DEBUG: Roles fetched:", rollers.length);
          setProjectRoles(rollers);
          // Extract unique categories
          const cats = Array.from(
            new Set<string>(
              rollers
                .map((r: any) => r.category)
                .filter((c: any) => typeof c === "string" && c.length > 0),
            ),
          ).sort();
          console.log("DEBUG: Categories extracted:", cats);
          setProjectCategories(cats);
        }
      }

      // 4. Fetch Events
      fetchEvents(owner, roleIds, categories);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEvents(
    owner: boolean,
    myRoleIds: string[],
    myCategories: string[] = [],
  ) {
    try {
      let query = supabase
        .from("project_events" as any)
        .select("*")
        .eq("tournage_id", id)
        .order("start_time", { ascending: true });

      // Retrieve data first, then filter in memory or specific query?
      // OWNER sees ALL.
      // USER sees 'general'
      // OR 'event_type'='role_specific' AND 'target_role_id' IN myRoleIds
      // OR 'event_type'='category_specific' AND 'target_category' IN myCategories

      const { data, error } = await query;
      if (error) throw error;

      let validEvents = (data || []).map((e: any) => ({
        ...e,
        start_time: new Date(e.start_time).toISOString(), // ensure standard format
      }));

      if (!owner) {
        validEvents = validEvents.filter((e: any) => {
          if (e.event_type === "general") return true;

          if (e.event_type === "role_specific") {
            // Check if ANY of my roles is in the target_role_ids array
            // The DB stores it as JSONB array usually, or we need to adjust schema
            // Assuming now we store array in a JSON column or text array
            const targets = e.target_role_ids || [];
            // If targets is array of strings
            return targets.some((tid: string) => myRoleIds.includes(tid));
          }

          if (e.event_type === "category_specific") {
            const targets = e.target_categories || [];
            return targets.some((c: string) => myCategories.includes(c));
          }
          return false;
        });
      }

      setEvents(validEvents);
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    }
  }

  async function createEvent() {
    if (!newEventTitle.trim() || !newEventDate.trim() || !newEventTime.trim()) {
      Alert.alert("Erreur", "Titre, Date et Heure requis.");
      return;
    }

    try {
      // Construct ISO timestamp: YYYY-MM-DDTHH:MM:00
      const isoStart = `${newEventDate}T${newEventTime}:00`;

      const payload: any = {
        tournage_id: id,
        title: newEventTitle,
        description: newEventDesc,
        start_time: isoStart,
        event_type: newEventType,
      };

      if (newEventType === "role_specific") {
        if (targetRoles.length === 0) {
          Alert.alert(
            "Erreur",
            "Veuillez sélectionner au moins un rôle/personne.",
          );
          return;
        }
        payload.target_role_ids = targetRoles.map((r) => r.id);
      } else if (newEventType === "category_specific") {
        if (targetCategories.length === 0) {
          Alert.alert(
            "Erreur",
            "Veuillez sélectionner au moins une catégorie.",
          );
          return;
        }
        payload.target_categories = targetCategories;
      }

      const { error } = await supabase
        .from("project_events" as any)
        .insert(payload);

      if (error) throw error;

      // NOTIFY CHAT
      // If specific type, find relevant convo or send to general?
      // For simplicity, let's send a system message to the GENERAL chat for now,
      // or to specific category channels if implemented.
      // Based on user request: "détails sont envoyé dans la conv en particulier"

      let chatMessage = `Un nouvel élément a été ajouté dans le calendrier : ${newEventTitle}\nDate : ${newEventDate} à ${newEventTime}`;
      if (newEventDesc) chatMessage += `\nDétails : ${newEventDesc}`;

      if (newEventType === "category_specific") {
        // Send to EACH category channel
        for (const cat of targetCategories) {
          await supabase.from("project_messages" as any).insert({
            project_id: id,
            content: chatMessage,
            sender_id: (await supabase.auth.getSession()).data.session?.user.id,
            category: cat,
          });
        }
      } else if (newEventType === "role_specific") {
        // No specific chat notification for roles for now
      } else {
        // General event -> General chat
        await supabase.from("project_messages" as any).insert({
          project_id: id,
          content: chatMessage,
          sender_id: (await supabase.auth.getSession()).data.session?.user.id,
          category: "general",
        });
      }

      setModalVisible(false);
      // Reset form
      setNewEventTitle("");
      setNewEventDesc("");
      setTargetRoles([]);
      setTargetCategories([]);
      setNewEventType("general");

      Alert.alert("Succès", "Événement ajouté et notifié.");
      fetchEvents(isOwner, userRoleIds, userCategories);
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    }
  }

  // Helper determining if user can create general events
  const canCreateGeneral = isOwner;
  // Helper determining if user can create role events (Admin of at least one category OR Owner)
  const canCreateRole = isOwner || adminCategories.length > 0;
  // Helper for category events
  const canCreateCategory = isOwner || adminCategories.length > 0;

  // --- UI Helpers ---

  // Calculate the 7 days of the current visible week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  // Group events by Day
  const eventsByDay = events.reduce((acc: any, curr) => {
    const day = curr.start_time.split("T")[0];
    if (!acc[day]) acc[day] = [];
    acc[day].push(curr);
    return acc;
  }, {});

  function changeWeek(offset: number) {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + offset * 7);
    setCurrentWeekStart(newStart);
  }

  const weekLabel = `${weekDays[0].split("-")[2]}/${weekDays[0].split("-")[1]} - ${weekDays[6].split("-")[2]}/${weekDays[6].split("-")[1]}`;

  return (
    <View style={styles.container}>
      {/* CUSTOM NAV HEADER: Just Title (No Back) + Settings if owner */}
      <View style={styles.fullHeader}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>Calendrier</Text>
        {isOwner ? (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/project/[id]/settings",
                params: { id: typeof id === "string" ? id : id[0] },
              })
            }
            style={{ padding: 5 }}
          >
            <Ionicons name="settings-outline" size={24} color="#841584" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <View style={styles.headerRow}>
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={() => changeWeek(-1)}>
            <Ionicons name="chevron-back" size={24} color="#841584" />
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <TouchableOpacity onPress={() => changeWeek(1)}>
            <Ionicons name="chevron-forward" size={24} color="#841584" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#841584"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={weekDays.filter(
            (day) => eventsByDay[day] && eventsByDay[day].length > 0,
          )}
          keyExtractor={(day) => day}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={{ marginTop: 40, alignItems: "center" }}>
              <Text style={{ color: "#888", fontSize: 16 }}>
                Aucun événement cette semaine
              </Text>
            </View>
          }
          renderItem={({ item: day }) => {
            const dayEvents = eventsByDay[day] || [];
            const isToday = day === new Date().toISOString().split("T")[0];

            return (
              <View style={[styles.daySection, isToday && styles.todaySection]}>
                <View style={styles.dateHeader}>
                  <Text style={[styles.dateTitle, isToday && styles.todayText]}>
                    {new Date(day).toLocaleDateString("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </Text>
                </View>

                {dayEvents.map((evt: Event) => (
                  <View
                    key={evt.id}
                    style={[
                      styles.eventCard,
                      evt.event_type === "role_specific" &&
                        styles.roleEventCard,
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text style={styles.eventTime}>
                        {new Date(evt.start_time).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                      {evt.event_type === "role_specific" && (
                        <View style={styles.roleBadge}>
                          <Text style={styles.roleBadgeText}>Perso</Text>
                        </View>
                      )}
                      {evt.event_type === "category_specific" && (
                        <View
                          style={[
                            styles.roleBadge,
                            { backgroundColor: "#4CAF50" },
                          ]}
                        >
                          <Text style={styles.roleBadgeText}>
                            {evt.target_categories &&
                            evt.target_categories.length > 0
                              ? evt.target_categories.join(", ")
                              : "Groupe"}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.eventTitle}>{evt.title}</Text>
                    {evt.description ? (
                      <Text style={styles.eventDesc}>{evt.description}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            );
          }}
        />
      )}

      {/* FAB Add Event (Owner OR Admin Only) */}
      {(isOwner || adminCategories.length > 0) && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            // Default to today
            const now = new Date();
            setNewEventDate(now.toISOString().split("T")[0]);
            setNewEventTime("09:00");
            // If not owner but admin, force category type
            if (!isOwner && adminCategories.length > 0) {
              setNewEventType("category_specific");
            } else {
              setNewEventType("general");
            }
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}

      {/* CREATE EVENT MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="formSheet"
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalHeader}>Nouvel Événement</Text>

          <Text style={styles.label}>Titre</Text>
          <TextInput
            style={styles.input}
            value={newEventTitle}
            onChangeText={setNewEventTitle}
            placeholder="Réunion, Tournage sc. 1..."
          />

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDatePicker(true);
                  if (Platform.OS === "ios") setShowTimePicker(false);
                }}
                style={[styles.input, { justifyContent: "center" }]}
              >
                <Text>{newEventDate || "Choisir date"}</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Heure</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowTimePicker(true);
                  if (Platform.OS === "ios") setShowDatePicker(false);
                }}
                style={[styles.input, { justifyContent: "center" }]}
              >
                <Text>{newEventTime || "Choisir heure"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showDatePicker && (
            <View style={{ alignItems: "center", marginBottom: 15 }}>
              <DateTimePicker
                value={newEventDate ? new Date(newEventDate) : new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={onDateChange}
                style={Platform.OS === "ios" ? { width: 320 } : undefined}
              />
              {Platform.OS === "ios" && (
                <Button
                  title="Fermer le calendrier"
                  onPress={() => setShowDatePicker(false)}
                />
              )}
            </View>
          )}

          {showTimePicker && (
            <View style={{ alignItems: "center", marginBottom: 15 }}>
              <DateTimePicker
                value={(() => {
                  const d = new Date();
                  if (newEventTime) {
                    const [h, m] = newEventTime.split(":");
                    d.setHours(parseInt(h), parseInt(m));
                  }
                  return d;
                })()}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onTimeChange}
                style={Platform.OS === "ios" ? { width: 320 } : undefined}
              />
              {Platform.OS === "ios" && (
                <Button
                  title="Valider l'heure"
                  onPress={() => setShowTimePicker(false)}
                />
              )}
            </View>
          )}

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            value={newEventDesc}
            onChangeText={setNewEventDesc}
            placeholder="Lieu, détails..."
          />

          <Text style={styles.label}>Visibilité</Text>
          <View style={{ flexDirection: "row", gap: 5, marginBottom: 15 }}>
            {canCreateGeneral && (
              <TouchableOpacity
                onPress={() => setNewEventType("general")}
                style={[
                  styles.typeBtn,
                  newEventType === "general" && styles.typeBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    newEventType === "general" && { color: "white" },
                  ]}
                >
                  Général
                </Text>
              </TouchableOpacity>
            )}

            {canCreateCategory && (
              <TouchableOpacity
                onPress={() => {
                  setNewEventType("category_specific");
                  setCategoryModalVisible(true);
                }}
                style={[
                  styles.typeBtn,
                  newEventType === "category_specific" && styles.typeBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    newEventType === "category_specific" && { color: "white" },
                  ]}
                >
                  {targetCategories.length > 0
                    ? `${targetCategories.length} Catégorie(s)`
                    : "Catégorie"}
                </Text>
              </TouchableOpacity>
            )}

            {canCreateRole && (
              <TouchableOpacity
                onPress={() => {
                  setNewEventType("role_specific");
                  setRoleModalVisible(true);
                }}
                style={[
                  styles.typeBtn,
                  newEventType === "role_specific" && styles.typeBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    newEventType === "role_specific" && { color: "white" },
                  ]}
                >
                  {targetRoles.length > 0
                    ? `${targetRoles.length} Pers.`
                    : "Personne"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 20,
            }}
          >
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{ padding: 10 }}
            >
              <Text style={{ color: "red" }}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={createEvent} style={styles.createBtn}>
              <Text style={{ color: "white", fontWeight: "bold" }}>Créer</Text>
            </TouchableOpacity>
          </View>

          {/* ROLE PICKER SUB-MODAL */}
          {roleModalVisible && (
            <View style={styles.rolePickerOverlay}>
              <View style={styles.rolePickerBox}>
                <Text
                  style={{ fontWeight: "bold", marginBottom: 10, fontSize: 16 }}
                >
                  Choisir les rôles concernés
                </Text>
                <FlatList
                  data={projectRoles}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => {
                    const isSelected = targetRoles.some(
                      (r) => r.id === item.id,
                    );
                    return (
                      <TouchableOpacity
                        style={{
                          padding: 12,
                          borderBottomWidth: 1,
                          borderColor: "#eee",
                          backgroundColor: isSelected
                            ? "#f3e5f5"
                            : "transparent",
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                        onPress={() => {
                          setTargetRoles((prev) => {
                            if (prev.some((r) => r.id === item.id)) {
                              return prev.filter((r) => r.id !== item.id);
                            } else {
                              return [...prev, item];
                            }
                          });
                        }}
                      >
                        <Text>
                          {item.title}{" "}
                          <Text style={{ color: "#999", fontSize: 12 }}>
                            ({item.category})
                          </Text>
                        </Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color="#841584"
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
                <TouchableOpacity
                  onPress={() => setRoleModalVisible(false)}
                  style={{ marginTop: 10, alignSelf: "center" }}
                >
                  <Text style={{ color: "#841584", fontWeight: "bold" }}>
                    Validé
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* CATEGORY PICKER SUB-MODAL */}
          {categoryModalVisible && (
            <View style={styles.rolePickerOverlay}>
              <View style={styles.rolePickerBox}>
                <Text
                  style={{ fontWeight: "bold", marginBottom: 10, fontSize: 16 }}
                >
                  Choisir les catégories
                </Text>
                <FlatList
                  data={
                    isOwner
                      ? projectCategories
                      : projectCategories.filter((c) =>
                          adminCategories.includes(c),
                        )
                  }
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => {
                    const isSelected = targetCategories.includes(item);
                    return (
                      <TouchableOpacity
                        style={{
                          padding: 12,
                          borderBottomWidth: 1,
                          borderColor: "#eee",
                          backgroundColor: isSelected
                            ? "#f3e5f5"
                            : "transparent",
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                        onPress={() => {
                          setTargetCategories((prev) => {
                            if (prev.includes(item)) {
                              return prev.filter((c) => c !== item);
                            } else {
                              return [...prev, item];
                            }
                          });
                        }}
                      >
                        <Text>{item}</Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color="#841584"
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <Text style={{ textAlign: "center", color: "#999" }}>
                      Aucune catégorie trouvée
                    </Text>
                  }
                />
                <TouchableOpacity
                  onPress={() => setCategoryModalVisible(false)}
                  style={{ marginTop: 10, alignSelf: "center" }}
                >
                  <Text style={{ color: "#841584", fontWeight: "bold" }}>
                    Validé
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa", padding: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 40,
    marginBottom: 20,
  },
  fullHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#eee",
    marginHorizontal: -20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
  },
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 10,
  },
  weekLabel: { fontWeight: "600", color: "#333" },

  emptyText: { textAlign: "center", color: "#999", marginTop: 50 },
  noEventText: {
    color: "#999",
    fontStyle: "italic",
    fontSize: 12,
    marginLeft: 10,
    marginBottom: 10,
  },
  todaySection: {
    backgroundColor: "rgba(132, 21, 132, 0.05)",
    marginLeft: -10,
    marginRight: -10,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  todayText: { color: "#841584" },

  daySection: { marginBottom: 20 },
  dateHeader: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#ddd",
    paddingBottom: 5,
  },
  dateTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "capitalize",
    color: "#333",
  },

  eventCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#841584",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  roleEventCard: { borderLeftColor: "#FF9800", backgroundColor: "#FFF8E1" }, // Orange for specific roles

  eventTime: { fontWeight: "bold", color: "#333", marginBottom: 4 },
  eventTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  eventDesc: { color: "#666", fontSize: 14 },
  roleBadge: {
    backgroundColor: "#FF9800",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleBadgeText: { fontSize: 10, color: "white", fontWeight: "bold" },

  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#841584",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  modalContent: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
    backgroundColor: "white",
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: { color: "#666", marginBottom: 5, fontSize: 12, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },

  typeBtn: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    alignItems: "center",
  },
  typeBtnActive: { backgroundColor: "#841584", borderColor: "#841584" },
  typeBtnText: { color: "#333", fontWeight: "600" },

  createBtn: {
    backgroundColor: "#841584",
    padding: 10,
    borderRadius: 8,
    paddingHorizontal: 20,
  },

  rolePickerOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 30,
  },
  rolePickerBox: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    maxHeight: 400,
  },
});
