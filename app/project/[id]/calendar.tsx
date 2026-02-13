import ClapLoading from "@/components/ClapLoading";
import WebDatePicker from "@/components/WebDatePicker";
import { GlobalStyles } from "@/constants/Styles";
import { useTheme } from "@/providers/ThemeProvider";
import { useTutorial } from "@/providers/TutorialProvider";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  useFocusEffect,
  useGlobalSearchParams,
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import React, { useCallback, useState } from "react";
import {
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
  target_role_ids?: string[];
  target_categories?: string[];
  is_shoot_day?: boolean;
};

export default function ProjectCalendar() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const { isTutorialActive, currentStep } = useTutorial();
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();
  const idValue = localParams.id || globalParams.id;
  const projectId = Array.isArray(idValue) ? idValue[0] : idValue;

  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Week View State
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  });

  // Data
  const [events, setEvents] = useState<Event[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [userRoleIds, setUserRoleIds] = useState<string[]>([]);
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [adminCategories, setAdminCategories] = useState<string[]>([]);

  // Modal (Create/Edit Event)
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDesc, setNewEventDesc] = useState("");
  const [newEventDate, setNewEventDate] = useState(""); // YYYY-MM-DD
  const [newEventTime, setNewEventTime] = useState(""); // HH:MM

  const [newEventType, setNewEventType] = useState<
    "general" | "role_specific" | "category_specific"
  >("general");

  const [targetRoles, setTargetRoles] = useState<any[]>([]);
  const [targetCategories, setTargetCategories] = useState<string[]>([]);

  const [projectRoles, setProjectRoles] = useState<any[]>([]);
  const [projectCategories, setProjectCategories] = useState<string[]>([]);

  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState<
    "none" | "role" | "category"
  >("none");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onDateChange = (event: any, selectedDate?: Date) => {
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

  useFocusEffect(
    useCallback(() => {
      if (projectId && projectId !== "undefined") {
        fetchContext();
      }
    }, [projectId]),
  );

  async function fetchContext() {
    if (!projectId || projectId === "undefined") {
      console.warn("Calendar: No project ID found");
      return;
    }

    try {
      setLoading(true);
      console.log("Calendar: Fetching context for project:", projectId);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.warn("Calendar: No session found");
        return;
      }

      console.log("Calendar: User ID:", session.user.id);

      const { data: proj, error: projError } = await supabase
        .from("tournages")
        .select("owner_id, title")
        .eq("id", projectId)
        .maybeSingle();

      if (projError) {
        console.error("Calendar: Error fetching project:", projError);
      }

      const owner =
        proj?.owner_id === session.user.id ||
        (isTutorialActive &&
          proj?.title?.includes("Vitrine") &&
          currentStep?.id?.startsWith("admin"));
      console.log(
        "Calendar: Is Owner?",
        owner,
        "Owner ID in DB:",
        proj?.owner_id,
      );
      setIsOwner(owner);

      let roleIds: string[] = [];
      let categories: string[] = [];
      let adminCats: string[] = [];

      if (!owner && proj) {
        const { data: myRoles } = await supabase
          .from("project_roles")
          .select("id, category, is_category_admin")
          .eq("tournage_id", projectId)
          .eq("assigned_profile_id", session.user.id);

        if (myRoles) {
          roleIds = myRoles.map((r) => r.id);
          categories = [...new Set(myRoles.map((r) => r.category))];
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

      if (owner || adminCats.length > 0) {
        const { data: rollers, error: rolesError } = await supabase
          .from("project_roles")
          .select("id, title, category")
          .eq("tournage_id", projectId);

        if (rolesError) {
          console.log("Error fetching roles for calendar:", rolesError);
        }

        if (rollers) {
          setProjectRoles(rollers);
          const cats = Array.from(
            new Set<string>(
              rollers
                .map((r: any) => r.category)
                .filter((c: any) => typeof c === "string" && c.length > 0),
            ),
          ).sort();
          setProjectCategories(cats);
        }
      }

      await fetchEvents(owner, roleIds, categories);
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
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
      // 1. Fetch Project Events
      let query = supabase
        .from("project_events" as any)
        .select("*")
        .eq("tournage_id", projectId)
        .order("start_time", { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      let validEvents = (data || []).map((e: any) => ({
        ...e,
        start_time: new Date(e.start_time).toISOString(),
      }));

      // Filter events based on permissions
      if (!owner) {
        validEvents = validEvents.filter((e: any) => {
          if (e.event_type === "general") return true;

          if (e.event_type === "role_specific") {
            const targets = e.target_role_ids || [];
            return targets.some((tid: string) => myRoleIds.includes(tid));
          }

          if (e.event_type === "category_specific") {
            const targets = e.target_categories || [];
            return targets.some((c: string) => myCategories.includes(c));
          }
          return false;
        });
      }

      // 2. Fetch Shoot Days (as Events)
      let shootDaysQuery = supabase
        .from("shoot_days")
        .select("*, day_calls(role_id)") // Select calls to filter for members
        .eq("tournage_id", projectId);

      const { data: shootDays, error: sdError } = await shootDaysQuery;

      let myShootSays: any[] = [];
      if (shootDays) {
        if (owner) {
          myShootSays = shootDays;
        } else {
          // Filter: keep days where I have a call OR (maybe) days that are general?
          // For now, only where I have a call.
          // "Category Convocation" creates a day_call, so this works.
          myShootSays = shootDays.filter((sd: any) => {
            const calls = sd.day_calls || [];
            return calls.some((c: any) => myRoleIds.includes(c.role_id));
          });
        }
      }

      const shootDayEvents = myShootSays.map((sd: any) => {
        // Construct Start Time from Date + Call Time
        let startIso = sd.date; // YYYY-MM-DD
        if (sd.call_time) {
          startIso = `${sd.date}T${sd.call_time}`;
        } else {
          startIso = `${sd.date}T08:00:00`; // Default
        }

        return {
          id: sd.id,
          title: `🎥 Tournage: ${sd.location || "Lieu non défini"}`,
          description: sd.notes || "",
          start_time: new Date(startIso).toISOString(),
          location: sd.location,
          event_type: "general", // treated as general for display logic
          target_categories: [], // could populate if needed
          is_shoot_day: true,
        };
      });

      const allEvents = [...validEvents, ...shootDayEvents];

      // Re-sort
      allEvents.sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
      );

      setEvents(allEvents);
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    }
  }

  function openEditModal(event: Event) {
    const isCategoryAdmin =
      event.event_type === "category_specific" &&
      event.target_categories?.some((cat) => adminCategories.includes(cat));

    if (!isOwner && !isCategoryAdmin) {
      // Normal users can't edit
      return;
    }

    setEditingEvent(event);
    setNewEventTitle(event.title);
    setNewEventDesc(event.description || "");

    const startDate = new Date(event.start_time);
    setNewEventDate(startDate.toISOString().split("T")[0]);
    const hours = startDate.getHours().toString().padStart(2, "0");
    const minutes = startDate.getMinutes().toString().padStart(2, "0");
    setNewEventTime(`${hours}:${minutes}`);

    setNewEventType(event.event_type);
    if (event.event_type === "role_specific") {
      const roles = projectRoles.filter((r) =>
        event.target_role_ids?.includes(r.id),
      );
      setTargetRoles(roles);
    } else if (event.event_type === "category_specific") {
      setTargetCategories(event.target_categories || []);
    }

    setModalVisible(true);
  }

  async function deleteEvent() {
    if (!editingEvent) return;

    Alert.alert(
      "Supprimer l'événement",
      "Êtes-vous sûr de vouloir supprimer cet événement ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("project_events" as any)
                .delete()
                .eq("id", editingEvent.id);

              if (error) throw error;

              setModalVisible(false);
              setEditingEvent(null);
              fetchEvents(isOwner, userRoleIds, userCategories);
              Alert.alert("Succès", "Événement supprimé.");
            } catch (e) {
              Alert.alert("Erreur", (e as Error).message);
            }
          },
        },
      ],
    );
  }

  async function saveEvent() {
    if (!newEventTitle.trim() || !newEventDate.trim() || !newEventTime.trim()) {
      Alert.alert("Erreur", "Titre, Date et Heure requis.");
      return;
    }

    try {
      const isoStart = `${newEventDate}T${newEventTime}:00`;

      const payload: any = {
        tournage_id: projectId,
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
        payload.target_categories = null;
      } else if (newEventType === "category_specific") {
        if (targetCategories.length === 0) {
          Alert.alert(
            "Erreur",
            "Veuillez sélectionner au moins une catégorie.",
          );
          return;
        }
        payload.target_categories = targetCategories;
        payload.target_role_ids = null;
      } else {
        payload.target_role_ids = null;
        payload.target_categories = null;
      }

      if (editingEvent) {
        const { error } = await supabase
          .from("project_events" as any)
          .update(payload)
          .eq("id", editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("project_events" as any)
          .insert(payload);
        if (error) throw error;

        // Only notify on NEW events to avoid spamming on simple edits
        let chatMessage = `Un nouvel élément a été ajouté dans le calendrier : ${newEventTitle}\nDate : ${newEventDate} à ${newEventTime}`;
        if (newEventDesc) chatMessage += `\nDétails : ${newEventDesc}`;

        if (newEventType === "category_specific") {
          for (const cat of targetCategories) {
            await supabase.from("project_messages" as any).insert({
              project_id: projectId,
              content: chatMessage,
              sender_id: (await supabase.auth.getSession()).data.session?.user
                .id,
              category: cat,
            });
          }
        } else if (newEventType === "role_specific") {
          // No specific chat notification for roles for now
        } else {
          await supabase.from("project_messages" as any).insert({
            project_id: projectId,
            content: chatMessage,
            sender_id: (await supabase.auth.getSession()).data.session?.user.id,
            category: "general",
          });
        }
      }

      setModalVisible(false);
      setEditingEvent(null);
      setSelectionMode("none");
      setNewEventTitle("");
      setNewEventDesc("");
      setTargetRoles([]);
      setTargetCategories([]);
      setNewEventType("general");

      Alert.alert(
        "Succès",
        editingEvent ? "Événement mis à jour." : "Événement ajouté et notifié.",
      );
      fetchEvents(isOwner, userRoleIds, userCategories);
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    }
  }

  const canCreateGeneral = isOwner;
  const canCreateRole = isOwner || adminCategories.length > 0;
  const canCreateCategory = isOwner || adminCategories.length > 0;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

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
      <View style={styles.fullHeader}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>Calendrier</Text>
        {isOwner ? (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/project/[id]/settings",
                params: { id: projectId },
              })
            }
            style={{ padding: 5 }}
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <View style={styles.headerRow}>
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={() => changeWeek(-1)}>
            <Ionicons name="chevron-back" size={24} color={colors.tint} />
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <TouchableOpacity onPress={() => changeWeek(1)}>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={colors.tint}
            />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ClapLoading
          size={50}
          color={colors.tint}
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
              <Text
                style={{ color: colors.tabIconDefault, fontSize: 16 }}
              >
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

                {dayEvents.map((evt: Event) => {
                  const isCategoryAdmin =
                    evt.event_type === "category_specific" &&
                    evt.target_categories?.some((cat) =>
                      adminCategories.includes(cat),
                    );
                  const canEdit =
                    !evt.is_shoot_day && (isOwner || isCategoryAdmin);

                  return (
                    <TouchableOpacity
                      key={evt.id}
                      activeOpacity={evt.is_shoot_day || canEdit ? 0.7 : 1}
                      onPress={() => {
                        if (evt.is_shoot_day) {
                          // Use 'push' to go to production view
                          router.push(
                            `/project/${projectId}/production/${evt.id}`,
                          );
                        } else if (canEdit) {
                          openEditModal(evt);
                        }
                      }}
                      style={[
                        styles.eventCard,
                        evt.event_type === "role_specific" &&
                          styles.roleEventCard,
                        evt.is_shoot_day && {
                          backgroundColor: isDark ? "#2C1E00" : "#fff9db",
                          borderLeftColor: "#fcc419",
                        },
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                        }}
                      >
                        <Text style={styles.eventTime}>
                          {evt.start_time
                            ? new Date(evt.start_time).toLocaleTimeString(
                                "fr-FR",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )
                            : "--:--"}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 5 }}>
                          {evt.is_shoot_day && (
                            <View
                              style={[
                                styles.roleBadge,
                                { backgroundColor: "#e67700" },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.roleBadgeText,
                                  { color: colors.background },
                                ]}
                              >
                                TOURNAGE
                              </Text>
                            </View>
                          )}

                          {!evt.is_shoot_day &&
                            evt.event_type === "role_specific" && (
                              <View style={styles.roleBadge}>
                                <Text style={styles.roleBadgeText}>Perso</Text>
                              </View>
                            )}
                          {!evt.is_shoot_day &&
                            evt.event_type === "category_specific" && (
                              <View
                                style={[
                                  styles.roleBadge,
                                  { backgroundColor: colors.success },
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
                          {canEdit && (
                            <Ionicons
                              name="pencil"
                              size={14}
                              color={colors.tabIconDefault}
                            />
                          )}
                        </View>
                      </View>
                      <Text style={styles.eventTitle}>{evt.title}</Text>
                      {evt.description ? (
                        <Text style={styles.eventDesc}>{evt.description}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          }}
        />
      )}

      {(isOwner || adminCategories.length > 0) && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setEditingEvent(null);
            setNewEventTitle("");
            setNewEventDesc("");
            setTargetRoles([]);
            setTargetCategories([]);
            const now = new Date();
            setNewEventDate(now.toISOString().split("T")[0]);
            setNewEventTime("09:00");
            if (!isOwner && adminCategories.length > 0) {
              setNewEventType("category_specific");
            } else {
              setNewEventType("general");
            }
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={30} color={colors.background} />
        </TouchableOpacity>
      )}
   

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          if (selectionMode !== "none") {
            setSelectionMode("none");
          } else {
            setModalVisible(false);
            setEditingEvent(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectionMode === "none" ? (
              <>
                <Text style={GlobalStyles.modalTitle}>
                  {editingEvent ? "Modifier l'événement" : "Nouvel Événement"}
                </Text>

                <Text style={GlobalStyles.label}>Titre</Text>
                <TextInput
                  style={GlobalStyles.input}
                  value={newEventTitle}
                  onChangeText={setNewEventTitle}
                  placeholder="Réunion, Tournage sc. 1..."
                  placeholderTextColor={colors.tabIconDefault}
                />

                <View
                  style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={GlobalStyles.label}>Date</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowDatePicker(true);
                        if (Platform.OS === "ios") setShowTimePicker(false);
                      }}
                      style={[GlobalStyles.input, { justifyContent: "center" }]}
                    >
                      <Text style={{ color: colors.text }}>
                        {newEventDate || "Choisir date"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={GlobalStyles.label}>Heure</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowTimePicker(true);
                        if (Platform.OS === "ios") setShowDatePicker(false);
                      }}
                      style={[GlobalStyles.input, { justifyContent: "center" }]}
                    >
                      <Text style={{ color: colors.text }}>
                        {newEventTime || "Choisir heure"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {showDatePicker && (
                  <View style={{ alignItems: "center", marginBottom: 15 }}>
                    {Platform.OS === "web" ? (
                      <WebDatePicker
                        type="date"
                        value={newEventDate}
                        onChange={(val) => {
                          setNewEventDate(val);
                          setShowDatePicker(false);
                        }}
                      />
                    ) : (
                      <DateTimePicker
                        value={
                          newEventDate ? new Date(newEventDate) : new Date()
                        }
                        mode="date"
                        display={Platform.OS === "ios" ? "inline" : "default"}
                        onChange={onDateChange}
                        style={
                          Platform.OS === "ios" ? { width: 320 } : undefined
                        }
                      />
                    )}
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
                    {Platform.OS === "web" ? (
                      <WebDatePicker
                        type="time"
                        value={newEventTime}
                        onChange={(val) => {
                          setNewEventTime(val);
                          setShowTimePicker(false);
                        }}
                      />
                    ) : (
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
                        style={
                          Platform.OS === "ios" ? { width: 320 } : undefined
                        }
                      />
                    )}
                    {Platform.OS === "ios" && (
                      <Button
                        title="Valider l'heure"
                        onPress={() => setShowTimePicker(false)}
                      />
                    )}
                  </View>
                )}

                <Text style={GlobalStyles.label}>Description</Text>
                <TextInput
                  style={GlobalStyles.input}
                  value={newEventDesc}
                  onChangeText={setNewEventDesc}
                  placeholder="Lieu, détails..."
                  placeholderTextColor={colors.tabIconDefault}
                />

                <Text style={GlobalStyles.label}>Visibilité</Text>
                <View
                  style={{ flexDirection: "row", gap: 5, marginBottom: 15 }}
                >
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
                        newEventType === "general" && { color: colors.background },
                      ]}
                    >
                      Général
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setNewEventType("category_specific");
                      setSelectionMode("category");
                    }}
                    style={[
                      styles.typeBtn,
                      newEventType === "category_specific" &&
                        styles.typeBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        newEventType === "category_specific" && {
                          color: colors.background,
                        },
                      ]}
                    >
                      {targetCategories.length > 0
                        ? `${targetCategories.length} Catégorie(s)`
                        : "Catégorie"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setNewEventType("role_specific");
                      setSelectionMode("role");
                    }}
                    style={[
                      styles.typeBtn,
                      newEventType === "role_specific" && styles.typeBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        newEventType === "role_specific" && {
                          color: colors.background,
                        },
                      ]}
                    >
                      {targetRoles.length > 0
                        ? `${targetRoles.length} Pers.`
                        : "Personne"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: 20,
                  }}
                >
                  {editingEvent ? (
                    <TouchableOpacity
                      onPress={deleteEvent}
                      style={{ padding: 10 }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={24}
                        color={colors.danger}
                      />
                    </TouchableOpacity>
                  ) : (
                    <View />
                  )}

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      onPress={() => {
                        setModalVisible(false);
                        setEditingEvent(null);
                      }}
                      style={{ padding: 10, justifyContent: "center" }}
                    >
                      <Text style={{ color: colors.tabIconDefault }}>
                        Annuler
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={saveEvent}
                      style={GlobalStyles.primaryButton}
                    >
                      <Text style={GlobalStyles.buttonText}>
                        {editingEvent ? "Enregistrer" : "Créer"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : selectionMode === "role" ? (
              <View style={{ flex: 1 }}>
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
                          borderColor: colors.border,
                          backgroundColor: isSelected
                            ? colors.backgroundSecondary
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
                        <Text style={{ color: colors.text }}>
                          {item.title}{" "}
                          <Text
                            style={{
                              color: colors.tabIconDefault,
                              fontSize: 12,
                            }}
                          >
                            ({item.category})
                          </Text>
                        </Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={colors.tint}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
                <TouchableOpacity
                  onPress={() => setSelectionMode("none")}
                  style={{ marginTop: 10, alignSelf: "center", padding: 10 }}
                >
                  <Text
                    style={{ color: colors.tint, fontWeight: "bold" }}
                  >
                    Valider la sélection
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
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
                          borderColor: colors.border,
                          backgroundColor: isSelected
                            ? colors.backgroundSecondary
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
                        <Text style={{ color: colors.text }}>{item}</Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color={colors.tint}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <Text
                      style={{
                        textAlign: "center",
                        color: colors.tabIconDefault,
                      }}
                    >
                      Aucune catégorie trouvée
                    </Text>
                  }
                />
                <TouchableOpacity
                  onPress={() => setSelectionMode("none")}
                  style={{ marginTop: 10, alignSelf: "center", padding: 10 }}
                >
                  <Text
                    style={{ color: colors.tint, fontWeight: "bold" }}
                  >
                    Valider la sélection
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 20,
    },
    fullHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 60,
      paddingBottom: 15,
      paddingHorizontal: 20,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderColor: colors.border,
      marginHorizontal: -20,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "bold",
      fontFamily: "System",
      color: colors.text,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: 20,
      marginBottom: 20,
    },
    weekNav: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 5,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    weekLabel: { fontWeight: "600", color: colors.text },

    todaySection: {
      backgroundColor: colors.backgroundSecondary,
      marginLeft: -10,
      marginRight: -10,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    todayText: { color: colors.tint },

    daySection: { marginBottom: 20 },
    dateHeader: {
      marginBottom: 10,
      borderBottomWidth: 1,
      borderColor: colors.border,
      paddingBottom: 5,
    },
    dateTitle: {
      fontSize: 16,
      fontWeight: "bold",
      textTransform: "capitalize",
      color: colors.text,
    },

    eventCard: {
      backgroundColor: colors.card,
      padding: 15,
      borderRadius: 12,
      marginBottom: 8,
      borderLeftWidth: 4,
      borderLeftColor: colors.tint,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    roleEventCard: {
      borderLeftColor: "#FF9800",
      backgroundColor: isDark ? "#2C1E00" : "#FFF8E1",
    },

    eventTime: { fontWeight: "bold", color: colors.text, marginBottom: 4 },
    eventTitle: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 4,
      color: colors.text,
    },
    eventDesc: { color: colors.tabIconDefault, fontSize: 14 },
    roleBadge: {
      backgroundColor: "#FF9800",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    roleBadgeText: { fontSize: 10, color: colors.background, fontWeight: "bold" },

    fab: {
      position: "absolute",
      bottom: 100,
      right: 30,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.tint,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 8,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 20,
      width: "90%",
      maxHeight: "80%",
      minHeight: 400, // Hauteur minimale pour éviter l'effet "écrasé"
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    typeBtn: {
      flex: 1,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      alignItems: "center",
    },
    typeBtnActive: {
      backgroundColor: colors.tint,
      borderColor: colors.tint,
    },
    typeBtnText: { color: colors.text, fontWeight: "600" },

    rolePickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      padding: 30,
    },
    rolePickerBox: {
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: 20,
      width: "100%",
      maxHeight: 400,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
  });
}
