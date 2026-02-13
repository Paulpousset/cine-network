import WebDatePicker from "@/components/WebDatePicker";
import { useUserMode } from "@/hooks/useUserMode";
import { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { WeatherService, getWeatherCodeInfo } from "@/services/WeatherService";
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

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 60, // Safe Area top padding approx
      paddingBottom: 20,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      minWidth: 45,
      alignItems: "flex-start",
    },
    headerRight: {
      minWidth: 45,
      alignItems: "flex-end",
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
    },
    headerButton: {
      padding: 4,
    },
    listContent: {
      padding: 16,
    },
    addButton: {
      marginRight: 10,
    },
    itemContainer: {
      backgroundColor: colors.card,
      padding: 16,
      marginBottom: 12,
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    itemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    dayTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },
    callTime: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    subtext: {
      fontSize: 14,
      color: colors.secondary,
    },
    scenesSummary: {
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    sceneSummaryItem: {
      marginBottom: 8,
    },
    sceneBrief: {
      fontSize: 13,
      color: colors.tint,
    },
    sceneAddress: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 2,
    },
    emptyText: {
      textAlign: "center",
      color: colors.textSecondary,
      marginTop: 40,
      fontSize: 16,
    },
    // Modal Styles
    modalContainer: {
      flex: 1,
      justifyContent: "flex-end",
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: Platform.OS === "ios" ? 40 : 20,
      maxHeight: "90%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.text,
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
      color: colors.secondary,
    },
    input: {
      backgroundColor: isDark ? colors.backgroundSecondary : "#f0f2f5",
      padding: 12,
      borderRadius: 8,
      fontSize: 16,
      color: colors.text,
    },
    saveButton: {
      backgroundColor: colors.tint,
      padding: 16,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 10,
    },
    disabledButton: {
      opacity: 0.7,
    },
    saveButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "bold",
    },
    sectionHeader: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.textSecondary,
      marginTop: 10,
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 5,
    },
    // Selector Styles
    selectorContainer: {
      flexDirection: "row",
      backgroundColor: isDark ? colors.backgroundSecondary : "#f1f3f5",
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
      backgroundColor: colors.card,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
      elevation: 1,
    },
    selectorText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    selectorTextSelected: {
      color: colors.tint,
      fontWeight: "600",
    },
    sceneListContainer: {
      backgroundColor: isDark ? colors.backgroundSecondary : "#f8f9fa",
      borderRadius: 8,
      padding: 10,
      marginBottom: 10,
    },
    sceneSelectMap: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sceneSelectMapSelected: {
      backgroundColor: isDark ? colors.backgroundSecondary : "white",
    },
    sceneSelectText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    sceneSelectTextSelected: {
      color: colors.tint,
      fontWeight: "600",
    },
  });

type ShootDay = Database["public"]["Tables"]["shoot_days"]["Row"];
type Scene = Database["public"]["Tables"]["scenes"]["Row"];
type ProjectSet = Database["public"]["Tables"]["project_sets"]["Row"];

type ShootDayWithScenes = ShootDay & {
  linkedScenes: {
    id: string;
    schedule_time: string | null;
    scene: Scene;
  }[];
};

type ProposedDay = {
  date: string;
  location: string;
  address: string;
  scenes: Scene[];
  sceneTimes: string[];
  isGoodWeather: boolean;
  weatherForecast?: {
    temp: number;
    code: number;
  };
  callTime: string;
};

const ALLOWED_ROLES = [
  "Réalisateur",
  "1er Assistant Réalisateur",
  "Régisseur Général",
  "Directeur de production",
];

const DAY_TYPES = ["SHOOT", "SCOUT", "PREP", "OFF", "TRAVEL"];

const Selector = ({
  options,
  value,
  onChange,
  styles,
}: {
  options: string[];
  value: string;
  onChange: (val: string) => void;
  styles: any;
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

const ShootDayItem = ({
  item,
  index,
  onPress,
  projectSets,
  scenesCount,
  pagesCount,
}: {
  item: ShootDayWithScenes;
  index: number;
  onPress: () => void;
  projectSets: ProjectSet[];
  scenesCount: number;
  pagesCount: number;
}) => {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const [weather, setWeather] = useState<any>(null);
  const [sceneWeather, setSceneWeather] = useState<Record<string, any>>({});

  useEffect(() => {
    let active = true;
    const fetchW = async () => {
      console.log("[Weather] Fetching for day:", item.date, "ID:", item.id);
      if (!item.date) return;

      // Logic to find address
      let addr = "";
      // 1. Try shoot day explicit address fields
      if (item.address_city || item.address_street) {
        if (item.address_city && item.address_street) {
          addr = `${item.address_street}, ${item.address_city}`;
        } else {
          addr = item.address_city || item.address_street || "";
        }
      } else if (item.location) {
        addr = item.location;
      }

      // 2. If still no address, try finding it from the scenes -> sets
      if (!addr && item.linkedScenes && item.linkedScenes.length > 0) {
        for (const ls of item.linkedScenes) {
          const scene = ls.scene;
          if (scene.slugline && projectSets.length > 0) {
            const slug = scene.slugline.toLowerCase();
            const matchingSet = projectSets.find((s) => {
              const sName = s.name?.toLowerCase().trim();
              return sName && (slug === sName || slug.includes(sName));
            });
            if (matchingSet && matchingSet.address) {
              addr = matchingSet.address;
              break;
            }
          }
        }
      }

      console.log("[Weather] Resolved address:", addr);
      if (!addr) return;

      const geo = await WeatherService.geocode(addr);
      console.log("[Weather] Geo results:", geo);
      if (geo && active) {
        const w = await WeatherService.getForecast(
          geo.latitude,
          geo.longitude,
          item.date,
          "12:00",
        );
        console.log("[Weather] Day Forecast results:", w);
        if (w && active) setWeather(w);

        // Also fetch for each scene if we have linked scenes
        if (item.linkedScenes && item.linkedScenes.length > 0) {
          const newSceneWeather: Record<string, any> = {};
          for (const ls of item.linkedScenes) {
            // Get specific address for this scene if different
            let sceneAddr = addr;
            if (ls.scene.slugline && projectSets.length > 0) {
              const slug = ls.scene.slugline.toLowerCase().trim();
              const matchingSet = projectSets.find((s) => {
                const sName = s.name?.toLowerCase().trim();
                return sName && (slug === sName || slug.includes(sName));
              });
              if (matchingSet && matchingSet.address) {
                sceneAddr = matchingSet.address;
              }
            }

            const sceneGeo =
              sceneAddr === addr
                ? geo
                : await WeatherService.geocode(sceneAddr);
            if (sceneGeo) {
              const sw = await WeatherService.getForecast(
                sceneGeo.latitude,
                sceneGeo.longitude,
                item.date,
                ls.schedule_time || "12:00",
              );
              console.log(
                "[Weather] Scene Forecast for SC.",
                ls.scene.scene_number,
                sw,
              );
              if (sw) newSceneWeather[ls.id] = sw;
            }
          }
          if (active) setSceneWeather(newSceneWeather);
        }
      }
    };
    fetchW();
    return () => {
      active = false;
    };
  }, [
    item.id,
    item.date,
    item.address_city,
    item.address_street,
    item.location,
    item.linkedScenes,
    projectSets,
  ]);

  const getSceneAddress = (scene: Scene) => {
    if (scene.slugline && projectSets.length > 0) {
      const slug = scene.slugline.toLowerCase().trim();
      const matchingSet = projectSets.find((s) => {
        const sName = s.name?.toLowerCase().trim();
        return sName && (slug === sName || slug.includes(sName));
      });
      if (matchingSet && matchingSet.address) {
        return matchingSet.address;
      }
    }
    return null;
  };

  // Safety check for date formatting - Avoid UTC shifts
  let formattedDate = item.date;
  if (item.date && item.date.includes("-")) {
    const [y, m, d] = item.date.split("-");
    formattedDate = `${m}/${d}/${y}`; // US format as seen in screenshot
  }

  return (
    <TouchableOpacity style={styles.itemContainer} onPress={onPress}>
      <View style={styles.itemHeader}>
        <Text style={styles.dayTitle}>
          Jour {index + 1}: {formattedDate}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {weather && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: isDark ? colors.backgroundSecondary : "#e7f5ff",
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
              }}
            >
              <Ionicons
                name={getWeatherCodeInfo(weather.weathercode).icon as any}
                size={14}
                color={isDark ? colors.tint : "#1c7ed6"}
              />
              <Text
                style={{ fontSize: 12, fontWeight: "bold", color: isDark ? colors.tint : "#1c7ed6" }}
              >
                {Math.round(weather.temperature_2m)}°C
              </Text>
            </View>
          )}
          {item.call_time && (
            <Text style={styles.callTime}>
              Pâté: {item.call_time.slice(0, 5)}
            </Text>
          )}
        </View>
      </View>
      <Text style={styles.subtext}>
        {scenesCount} séquences - {pagesCount} pages
      </Text>

      {item.linkedScenes && item.linkedScenes.length > 0 && (
        <View style={styles.scenesSummary}>
          {item.linkedScenes.map((ls, idx) => {
            const scene = ls.scene;
            const address = getSceneAddress(scene);
            return (
              <View key={ls.id} style={styles.sceneSummaryItem}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={styles.sceneBrief}>
                    <Text style={{ fontWeight: "bold" }}>
                      {ls.schedule_time
                        ? ls.schedule_time.slice(0, 5)
                        : "--:--"}
                      {"   |   "}SC. {scene.scene_number}
                    </Text>{" "}
                    - {scene.title?.toUpperCase() || "SANS TITRE"}
                  </Text>
                  {sceneWeather[ls.id] && (
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Ionicons
                        name={
                          getWeatherCodeInfo(sceneWeather[ls.id].weathercode)
                            .icon as any
                        }
                        size={12}
                        color={colors.textSecondary}
                      />
                      <Text
                        style={{ fontSize: 10, color: colors.textSecondary, marginLeft: 4 }}
                      >
                        {Math.round(sceneWeather[ls.id].temperature_2m)}°C
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.sceneAddress} numberOfLines={1}>
                  <Ionicons name="location-outline" size={10} color={colors.textSecondary} />{" "}
                  {address || item.location || "Lieu non défini"}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <View
        style={{
          marginTop: 8,
          flexDirection: "row",
          justifyContent: "flex-end",
        }}
      >
        <Text style={{ color: colors.tint, fontSize: 13 }}>
          Voir détails
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default function ProductionScreen() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const router = useRouter();
  const { mode } = useUserMode();
  const local = useLocalSearchParams<{ id: string }>();
  const global = useGlobalSearchParams<{ id: string }>();
  const id = local.id || global.id;

  const [shootDays, setShootDays] = useState<ShootDayWithScenes[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [adding, setAdding] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form State
  const [date, setDate] = useState("");
  const [callTime, setCallTime] = useState("");
  const [wrapTime, setWrapTime] = useState("");
  const [dayType, setDayType] = useState("SHOOT"); // Default to SHOOT
  const [location, setLocation] = useState(""); // General location name
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [parkingInfo, setParkingInfo] = useState("");
  const [lunchTime, setLunchTime] = useState("");
  const [cateringInfo, setCateringInfo] = useState("");
  const [notes, setNotes] = useState("");

  // Pickers visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCallPicker, setShowCallPicker] = useState(false);
  const [showWrapPicker, setShowWrapPicker] = useState(false);
  const [showLunchPicker, setShowLunchPicker] = useState(false);

  // Optimization Start Date State
  const [optStartDateModalVisible, setOptStartDateModalVisible] =
    useState(false);
  const [optStartDate, setOptStartDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0],
  );
  const [showOptDatePicker, setShowOptDatePicker] = useState(false);

  // Scene Selection State
  const [availableScenes, setAvailableScenes] = useState<Scene[]>([]);
  const [selectedScenes, setSelectedScenes] = useState<
    { id: string; time: string }[]
  >([]);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [projectSets, setProjectSets] = useState<ProjectSet[]>([]);
  const [editingSceneTime, setEditingSceneTime] = useState<string | null>(null);

  // Optimization Preview State
  const [proposedDays, setProposedDays] = useState<ProposedDay[] | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  useEffect(() => {
    console.log("[Production] useEffect triggered with id:", id);
    if (id) {
      checkPermissions();
      fetchShootDays();
      fetchProjectSets();
    } else {
      console.log("[Production] No ID found, stopping loading");
      setLoading(false);
    }
  }, [id]);

  const generateOptimizedPlanning = async (startDateOverride?: string) => {
    console.log("[Optimize] Starting...", { id, startDateOverride });
    if (generating) return;

    setGenerating(true);
    try {
      // 1. Fetch all scenes and sets
      const { data: allScenes, error: scenesError } = await supabase
        .from("scenes")
        .select("*")
        .eq("tournage_id", id);

      console.log("[Optimize] All scenes fetched:", allScenes?.length);

      if (scenesError || !allScenes) throw new Error("Erreur scenes");

      // 2. We now take ALL scenes for a full re-optimization if requested
      const scenesToPlan = allScenes;

      console.log("[Optimize] Total scenes to plan:", scenesToPlan.length);

      if (scenesToPlan.length === 0) {
        Alert.alert("Info", "Aucune séquence trouvée pour ce projet.");
        setGenerating(false);
        return;
      }

      // 3. Get Project Sets for addresses
      const { data: sets } = await supabase
        .from("project_sets")
        .select("*")
        .eq("project_id", id);

      const getSetForScene = (slug?: string | null) => {
        if (!slug || !sets) return null;
        const lowSlug = slug.toLowerCase().trim();
        return sets.find(
          (s) =>
            s.name?.toLowerCase().trim() === lowSlug ||
            lowSlug.includes(s.name?.toLowerCase().trim() || ""),
        );
      };

      // 4. Group scenes by Location (Slugline)
      const locationGroups: Record<string, Scene[]> = {};
      scenesToPlan.forEach((s) => {
        const key = s.slugline || "INCONNU";
        if (!locationGroups[key]) locationGroups[key] = [];
        locationGroups[key].push(s);
      });

      // 5. Setup loop variables
      let currentDate = new Date();
      currentDate.setHours(12, 0, 0, 0);

      if (startDateOverride) {
        const [y, m, d] = startDateOverride.split("-").map(Number);
        currentDate = new Date(y, m - 1, d, 12, 0, 0, 0);
      } else {
        currentDate.setDate(currentDate.getDate() + 1);
        if (shootDays.length > 0) {
          const firstDayStr = shootDays[0].date;
          if (firstDayStr && firstDayStr.includes("-")) {
            const [y, m, d] = firstDayStr.split("-").map(Number);
            const firstDate = new Date(y, m - 1, d, 12, 0, 0, 0);
            if (firstDate.getTime() >= new Date().setHours(0, 0, 0, 0)) {
              currentDate = firstDate;
            }
          }
        }
      }

      const MAX_DAILY_MINUTES = 600; // 10h limit
      let unplannedScenes = [...scenesToPlan];
      const tempProposed: ProposedDay[] = [];
      let daySafety = 0;
      let nextDayStartOverride: number | null = null; // Minutes from midnight

      while (unplannedScenes.length > 0 && daySafety < 100) {
        daySafety++;
        const yyyymmdd =
          currentDate.getFullYear() +
          "-" +
          String(currentDate.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(currentDate.getDate()).padStart(2, "0");

        // --- Weather Analysis for the Day ---
        let isGoodWeather = true;
        let weatherForecast: { temp: number; code: number } | undefined =
          undefined;

        // Use first available address for forecast
        const anySet = sets?.find((s) => s.address);
        if (anySet?.address) {
          try {
            const geo = await WeatherService.geocode(anySet.address);
            if (geo) {
              const forecast = await WeatherService.getForecast(
                geo.latitude,
                geo.longitude,
                yyyymmdd,
                "12:00",
              );
              if (forecast) {
                weatherForecast = {
                  temp: Math.round(forecast.temperature_2m),
                  code: forecast.weathercode,
                };
                if (forecast.weathercode > 3) isGoodWeather = false;
              }
            }
          } catch (e) {
            console.warn("Weather forecast failed", e);
          }
        }

        // --- Initialize Day ---
        let dayMinutesUsed = 0;
        let currentLoc: string | null = null;
        let dayStartTime: number = nextDayStartOverride || 9 * 60; // Default 09:00
        let currentCursor: number = dayStartTime;
        nextDayStartOverride = null; // Reset for next day

        const dayScenes: Scene[] = [];
        const daySceneTimes: string[] = [];
        const dayLocationHistory: string[] = [];

        let dayCanContinue = true;
        while (dayCanContinue && dayMinutesUsed < MAX_DAILY_MINUTES) {
          // Find the best next scene from ALL unplanned scenes
          const candidates = unplannedScenes.map((scene) => {
            const duration = scene.estimated_duration || 60;
            const isExt = (scene.int_ext || "").toUpperCase().includes("EXT");
            const isNight = (scene.day_night || "")
              .toUpperCase()
              .includes("NIGHT");
            const sceneLoc = scene.slugline || "INCONNU";

            // 1. Weather Constraint (Hard)
            if (!isGoodWeather && isExt) return { scene, score: -10000 };

            // 2. Travel Time (Company Move)
            let travelTime = 0;
            if (currentLoc && sceneLoc !== currentLoc) {
              const currentSet = getSetForScene(currentLoc);
              const nextSet = getSetForScene(sceneLoc);
              // Heuristic: 30m if same city, 60m if different/unknown
              if (
                currentSet?.address_city &&
                nextSet?.address_city &&
                currentSet.address_city === nextSet.address_city
              ) {
                travelTime = 30;
              } else {
                travelTime = 60;
              }
            }

            // 3. Daily Capacity Check
            if (dayMinutesUsed + duration + travelTime > MAX_DAILY_MINUTES) {
              return { scene, score: -5000 };
            }

            // 4. Scoring Heuristic
            let score = 0;

            // Stay in the same décor if possible
            if (currentLoc === sceneLoc) score += 500;

            // Priority boost
            const priorityVal = parseInt(scene.priority || "0", 10) || 0;
            score += priorityVal * 50;

            // Day/Night logic based on time progression
            const dayProgress = dayMinutesUsed / MAX_DAILY_MINUTES;
            if (isNight) {
              score += dayProgress * 400; // Higher score as day ends
            } else {
              score += (1 - dayProgress) * 200; // Prefer day scenes early
            }

            // External scenes preference if weather is good
            if (isGoodWeather && isExt) score += 100;

            // Character overlap (stay consistent)
            const activeChars = new Set(
              dayScenes.flatMap((ds) => ds.characters || []),
            );
            const sceneChars = (scene.characters as string[]) || [];
            const overlapping = sceneChars.filter((c: string) =>
              activeChars.has(c),
            ).length;
            score += overlapping * 30;

            return { scene, score, travelTime };
          });

          // Pick the winner
          candidates.sort((a, b) => b.score - a.score);
          const best = candidates[0];

          if (best && best.score > -1000) {
            const s = best.scene;
            const travel = best.travelTime || 0;

            if (travel > 0) {
              currentCursor += travel;
              dayMinutesUsed += travel;
            }

            // Set specific time for this scene
            const h = Math.floor(currentCursor / 60)
              .toString()
              .padStart(2, "0");
            const m = (currentCursor % 60).toString().padStart(2, "0");
            daySceneTimes.push(`${h}:${m}`);

            dayScenes.push(s);
            dayMinutesUsed += s.estimated_duration || 60;
            currentCursor += (s.estimated_duration || 60) + 15; // 15m buffer

            currentLoc = s.slugline || "INCONNU";
            if (!dayLocationHistory.includes(currentLoc as string))
              dayLocationHistory.push(currentLoc as string);

            unplannedScenes = unplannedScenes.filter((us) => us.id !== s.id);
          } else {
            dayCanContinue = false;
          }
        }

        // --- Finalize Day Data ---
        if (dayScenes.length > 0) {
          const wrapMinutes: number = currentCursor;

          // Turnaround Logic: If we wrapped at NIGHT (late), tomorrow starts later
          if (wrapMinutes > 22 * 60) {
            const wrapTotalMinutes: number = wrapMinutes;
            // Calculated for next day: 11h rest
            nextDayStartOverride = wrapTotalMinutes - 24 * 60 + 11 * 60;
            if (nextDayStartOverride < 9 * 60) nextDayStartOverride = 9 * 60;
          }

          const dayCallTime =
            Math.floor((dayStartTime - 60) / 60)
              .toString()
              .padStart(2, "0") + ":00";

          tempProposed.push({
            date: yyyymmdd,
            location: dayLocationHistory.join(" / "),
            address: getSetForScene(dayLocationHistory[0])?.address || "",
            scenes: dayScenes,
            sceneTimes: daySceneTimes,
            isGoodWeather,
            weatherForecast,
            callTime: dayCallTime,
          });
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      console.log("[Optimize] Final proposal length:", tempProposed.length);

      if (tempProposed.length > 0) {
        setProposedDays(tempProposed);
        setPreviewModalVisible(true);
      } else {
        Alert.alert("Info", "Aucune nouvelle séquence à planifier.");
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Erreur", err.message || "Erreur lors de la génération");
    } finally {
      setGenerating(false);
    }
  };

  const confirmOptimization = async () => {
    if (!proposedDays) return;
    setGenerating(true);
    try {
      // 0. Remove existing planning as confirmed by the user
      const { error: delErr } = await supabase
        .from("shoot_days")
        .delete()
        .eq("tournage_id", id);

      if (delErr) throw delErr;

      // Fetch crew roles once for all days
      const { data: crewRoles } = await supabase
        .from("project_roles")
        .select("id")
        .eq("tournage_id", id)
        .in("category", [
          "realisateur",
          "technicien",
          "production",
          "image",
          "son",
          "hmc",
          "deco",
        ])
        .not("assigned_profile_id", "is", null);

      const baseCrewRoleIds = crewRoles?.map((r) => r.id) || [];

      for (const day of proposedDays) {
        // Create Shoot Day
        const weatherText = day.weatherForecast
          ? `${Math.round(day.weatherForecast.temp)}°C - ${getWeatherCodeInfo(day.weatherForecast.code).label}`
          : day.isGoodWeather
            ? "Beau temps"
            : "Météo incertaine";

        const { data: newDay, error: dayErr } = await supabase
          .from("shoot_days")
          .insert({
            tournage_id: id,
            date: day.date,
            location: day.location,
            address_street: day.address,
            day_type: "SHOOT",
            call_time: day.callTime,
            wrap_time: "19:00",
            weather_summary: weatherText,
            notes: `Optimisation: ${weatherText}`,
          })
          .select()
          .single();

        if (newDay) {
          // 1. Link Scenes with calculated times
          const links = day.scenes.map((s, idx) => ({
            shoot_day_id: newDay.id,
            scene_id: s.id,
            order_index: idx,
            schedule_time: day.sceneTimes[idx],
          }));
          await supabase.from("shoot_day_scenes").insert(links);

          // 2. Auto-generate convocations (calls)
          try {
            let rolesToCall = [...baseCrewRoleIds];

            // Actors detection
            const allCharNames = Array.from(
              new Set(day.scenes.flatMap((s) => s.characters || [])),
            );

            if (allCharNames.length > 0) {
              const { data: projChars } = await supabase
                .from("project_characters")
                .select("assigned_actor_id")
                .eq("project_id", id)
                .in("name", allCharNames)
                .not("assigned_actor_id", "is", null);

              const actorUserIds =
                projChars?.map((c) => c.assigned_actor_id) || [];

              if (actorUserIds.length > 0) {
                const { data: actorRoles } = await supabase
                  .from("project_roles")
                  .select("id")
                  .eq("tournage_id", id)
                  .eq("category", "acteur")
                  .in("assigned_profile_id", actorUserIds);

                if (actorRoles) {
                  rolesToCall = [
                    ...rolesToCall,
                    ...actorRoles.map((r) => r.id),
                  ];
                }
              }
            }

            const uniqueRoles = Array.from(new Set(rolesToCall));
            if (uniqueRoles.length > 0) {
              const calls = uniqueRoles.map((roleId) => ({
                shoot_day_id: newDay.id,
                role_id: roleId,
                call_time: day.callTime,
              }));
              await supabase.from("day_calls").insert(calls);
            }
          } catch (callErr) {
            console.error("Call generation error for day", day.date, callErr);
          }
        }
      }
      Alert.alert("Succès", "Planning remplacé avec succès !");
      setProposedDays(null);
      setPreviewModalVisible(false);
      fetchShootDays();
    } catch (err: any) {
      console.error(err);
      Alert.alert(
        "Erreur",
        "Une erreur est survenue lors du remplacement du planning.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const checkPermissions = async () => {
    console.log("[Production] checkPermissions starting");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.log("[Production] No user logged in");
      return;
    }
    console.log("[Production] User logged in:", user.id);

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

  const fetchShootDays = async () => {
    console.log("[Production] fetchShootDays starting");
    setLoading(true);
    const { data, error } = await supabase
      .from("shoot_days")
      .select("*, shoot_day_scenes(*, scene:scenes(*))")
      .eq("tournage_id", id)
      .order("date");

    console.log("[Production] fetchShootDays query result:", {
      dataCount: data?.length,
      error,
    });

    if (error) {
      console.error("Error fetching shoot days:", error);
      Alert.alert("Erreur", "Impossible de charger les jours de tournage.");
    } else {
      // Transform data to populate 'linkedScenes' via the junction table
      const formattedData = (data || []).map((day: any) => ({
        ...day,
        linkedScenes: (day.shoot_day_scenes || [])
          .filter((sds: any) => sds.scene)
          .map((sds: any) => ({
            id: sds.id,
            schedule_time: sds.schedule_time || null,
            scene: sds.scene,
          })),
      }));
      setShootDays(formattedData as ShootDayWithScenes[]);
    }
    setLoading(false);
    console.log("[Production] fetchShootDays finished, loading set to false");
  };

  const fetchAvailableScenes = async () => {
    setLoadingScenes(true);
    const { data } = await supabase
      .from("scenes")
      .select("*")
      .eq("tournage_id", id)
      .order("scene_number", { ascending: true }); // Numeric string sort might be tricky, but ok for now

    setAvailableScenes(data || []);
    setLoadingScenes(false);
  };

  const fetchProjectSets = async () => {
    const { data } = await supabase
      .from("project_sets")
      .select("*")
      .eq("project_id", id)
      .order("name");

    if (data) {
      setProjectSets(data);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }

    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      setDate(formattedDate);
    }
  };

  const onCallTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowCallPicker(false);
    }
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, "0");
      const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
      setCallTime(`${hours}:${minutes}`);
    }
  };

  const onWrapTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowWrapPicker(false);
    }
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, "0");
      const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
      setWrapTime(`${hours}:${minutes}`);
    }
  };

  const onLunchTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowLunchPicker(false);
    }
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, "0");
      const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
      setLunchTime(`${hours}:${minutes}`);
    }
  };

  const openAddModal = () => {
    setModalVisible(true);
    fetchAvailableScenes();
  };

  const handleAddDay = async () => {
    if (!date) {
      Alert.alert("Champs manquants", "La date est requise (YYYY-MM-DD).");
      return;
    }

    // Basic date validation YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      Alert.alert("Format invalide", "La date doit être au format YYYY-MM-DD.");
      return;
    }

    setAdding(true);

    const { data: dayData, error } = await supabase
      .from("shoot_days")
      .insert({
        tournage_id: id,
        date: date,
        call_time: callTime || null,
        wrap_time: wrapTime || null,
        day_type: dayType,
        location: location || null,
        address_street: addressStreet || null,
        address_city: addressCity || null,
        parking_info: parkingInfo || null,
        lunch_time: lunchTime || null,
        catering_info: cateringInfo || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error || !dayData) {
      console.error(error);
      Alert.alert("Erreur", "Impossible d'ajouter le jour de tournage.");
    } else {
      // If scenes were selected, link them
      if (selectedScenes.length > 0) {
        const links = selectedScenes.map((item, index) => ({
          shoot_day_id: dayData.id,
          scene_id: item.id,
          order_index: index,
          schedule_time: item.time || null,
        }));

        const { error: linkError } = await supabase
          .from("shoot_day_scenes")
          .insert(links);
        if (linkError) console.error("Error linking scenes", linkError);
      }

      // --- AUTO-GENERATE CALLS (CONVOCATIONS) ---
      try {
        // 1. Identify Crew Roles (excluding Post-Prod, Agent, Actor)
        const { data: crewRoles } = await supabase
          .from("project_roles")
          .select("id")
          .eq("tournage_id", id)
          .in("category", [
            "realisateur",
            "technicien",
            "production",
            "image",
            "son",
            "hmc",
            "deco",
          ])
          .not("assigned_profile_id", "is", null);

        let rolesToCall = crewRoles?.map((r) => r.id) || [];

        // 2. Identify Actors based on Characters in Selected Scenes
        if (selectedScenes.length > 0) {
          // Find the full scene objects to access 'characters' array
          const connectedScenes = availableScenes.filter((s) =>
            selectedScenes.some((sel) => sel.id === s.id),
          );

          // Extract all unique character names
          const allCharNames = Array.from(
            new Set(connectedScenes.flatMap((s) => s.characters || [])),
          );

          if (allCharNames.length > 0) {
            // Find corresponding project_characters (that have an assigned actor)
            const { data: projChars } = await supabase
              .from("project_characters")
              .select("assigned_actor_id")
              .eq("project_id", id)
              .in("name", allCharNames)
              .not("assigned_actor_id", "is", null);

            const actorUserIds =
              projChars?.map((c) => c.assigned_actor_id) || [];

            if (actorUserIds.length > 0) {
              // Find the 'acteur' roles assigned to these users
              const { data: actorRoles } = await supabase
                .from("project_roles")
                .select("id")
                .eq("tournage_id", id)
                .eq("category", "acteur")
                .in("assigned_profile_id", actorUserIds);

              if (actorRoles) {
                rolesToCall = [...rolesToCall, ...actorRoles.map((r) => r.id)];
              }
            }
          }
        }

        // 3. Insert Calls (Deduplicated)
        const uniqueRoles = Array.from(new Set(rolesToCall));
        if (uniqueRoles.length > 0) {
          const calls = uniqueRoles.map((roleId) => ({
            shoot_day_id: dayData.id,
            role_id: roleId,
            call_time: callTime || null, // Default to day Call Time
          }));

          const { error: callsError } = await supabase
            .from("day_calls")
            .insert(calls);

          if (callsError)
            console.error("Error auto-generating calls", callsError);
        }
      } catch (err) {
        console.error("Error in auto-call generation logic", err);
      }
      // ------------------------------------------

      setModalVisible(false);
      resetForm();
      fetchShootDays();
    }
    setAdding(false);
  };

  const resetForm = () => {
    setDate("");
    setCallTime("");
    setWrapTime("");
    setDayType("SHOOT");
    setLocation("");
    setAddressStreet("");
    setAddressCity("");
    setParkingInfo("");
    setLunchTime("");
    setCateringInfo("");
    setNotes("");
    setSelectedScenes([]);
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: ShootDayWithScenes;
    index: number;
  }) => (
    <ShootDayItem
      item={item}
      index={index}
      onPress={() => router.push(`/project/${id}/production/${item.id}`)}
      projectSets={projectSets}
      scenesCount={item.linkedScenes?.length || 0}
      pagesCount={
        item.linkedScenes?.reduce(
          (acc, ls) => acc + (ls.scene.script_pages || 0),
          0,
        ) || 0
      }
    />
  );

  return (
    <View style={styles.container}>
      {/* Custom Header since Tabs/Stack header is hidden */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {(Platform.OS !== "web" || mode !== "studio") && (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/project/[id]/spaces/[category]",
                  params: {
                    id: id as string,
                    category: "production",
                    tab: "tools",
                  },
                })
              }
              style={{ padding: 4 }}
            >
              <Ionicons name="arrow-back" size={28} color={colors.text} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.headerTitle}>Plan de Travail</Text>

        <View style={styles.headerRight}>
          {canEdit && (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <TouchableOpacity
                onPress={() => setOptStartDateModalVisible(true)}
                disabled={generating}
                style={[
                  styles.headerButton,
                  { backgroundColor: colors.card, paddingHorizontal: 12 },
                ]}
              >
                {generating ? (
                  <ActivityIndicator size="small" color={colors.tint} />
                ) : (
                  <Text
                    style={{
                      color: colors.tint,
                      fontWeight: "bold",
                      fontSize: 12,
                    }}
                  >
                    OPTIMISER
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openAddModal}
                style={styles.headerButton}
              >
                <Ionicons
                  name="add-circle"
                  size={32}
                  color={colors.tint}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.tint}
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          data={shootDays}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucun jour de tournage prévu.</Text>
          }
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un jour de tournage</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Type de journée</Text>
                <Selector
                  options={DAY_TYPES}
                  value={dayType}
                  onChange={setDayType}
                  styles={styles}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date</Text>
                {Platform.OS === "web" ? (
                  <WebDatePicker
                    type="date"
                    value={date}
                    onChange={(val) => setDate(val)}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.input, { justifyContent: "center" }]}
                      onPress={() => setShowDatePicker(!showDatePicker)}
                    >
                      <Text
                        style={{ color: date ? colors.text : colors.textSecondary }}
                      >
                        {date
                          ? new Date(date).toLocaleDateString("fr-FR")
                          : "Sélectionner une date"}
                      </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <View style={{ alignItems: "center" }}>
                        <DateTimePicker
                          value={date ? new Date(date) : new Date()}
                          mode="date"
                          display="default"
                          onChange={onDateChange}
                          textColor={colors.text}
                        />
                        {Platform.OS === "ios" && (
                          <TouchableOpacity
                            onPress={() => setShowDatePicker(false)}
                            style={{
                              marginTop: 10,
                              padding: 10,
                              backgroundColor: colors.backgroundSecondary,
                              borderRadius: 8,
                              alignItems: "center",
                            }}
                          >
                            <Text style={{ fontWeight: "bold", color: colors.textSecondary }}>
                              Valider la date
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Pâté (Call)</Text>
                  {Platform.OS === "web" ? (
                    <WebDatePicker
                      type="time"
                      value={callTime}
                      onChange={(val) => setCallTime(val)}
                    />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.input, { justifyContent: "center" }]}
                        onPress={() => setShowCallPicker(!showCallPicker)}
                      >
                        <Text
                          style={{
                            color: callTime ? colors.text : colors.textSecondary,
                          }}
                        >
                          {callTime || "08:00"}
                        </Text>
                      </TouchableOpacity>
                      {showCallPicker && (
                        <View style={{ alignItems: "center" }}>
                          <DateTimePicker
                            value={(() => {
                              const d = new Date();
                              if (callTime) {
                                const [h, m] = callTime.split(":");
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
                            display="spinner"
                            onChange={onCallTimeChange}
                            textColor={colors.text}
                          />
                          {Platform.OS === "ios" && (
                            <TouchableOpacity
                              onPress={() => setShowCallPicker(false)}
                              style={{
                                marginTop: 5,
                                padding: 8,
                                backgroundColor: colors.backgroundSecondary,
                                borderRadius: 5,
                              }}
                            >
                              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                OK
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </>
                  )}
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Fin (Wrap)</Text>
                  {Platform.OS === "web" ? (
                    <WebDatePicker
                      type="time"
                      value={wrapTime}
                      onChange={(val) => setWrapTime(val)}
                    />
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[styles.input, { justifyContent: "center" }]}
                        onPress={() => setShowWrapPicker(!showWrapPicker)}
                      >
                        <Text
                          style={{
                            color: wrapTime ? colors.text : colors.textSecondary,
                          }}
                        >
                          {wrapTime || "19:00"}
                        </Text>
                      </TouchableOpacity>
                      {showWrapPicker && (
                        <View style={{ alignItems: "center" }}>
                          <DateTimePicker
                            value={(() => {
                              const d = new Date();
                              if (wrapTime) {
                                const [h, m] = wrapTime.split(":");
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
                            display="spinner"
                            onChange={onWrapTimeChange}
                            textColor={colors.text}
                          />
                          {Platform.OS === "ios" && (
                            <TouchableOpacity
                              onPress={() => setShowWrapPicker(false)}
                              style={{
                                marginTop: 5,
                                padding: 8,
                                backgroundColor: colors.backgroundSecondary,
                                borderRadius: 5,
                              }}
                            >
                              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                OK
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </>
                  )}
                </View>
              </View>

              {availableScenes.length > 0 && (
                <View>
                  <Text style={styles.sectionHeader}>
                    Dépouillement à tourner ({selectedScenes.length})
                  </Text>
                  <View style={styles.sceneListContainer}>
                    {availableScenes.map((scene) => {
                      const isSelected = selectedScenes.some(
                        (s) => s.id === scene.id,
                      );
                      const selectedItem = selectedScenes.find(
                        (s) => s.id === scene.id,
                      );

                      return (
                        <View key={scene.id} style={{ marginBottom: 4 }}>
                          <TouchableOpacity
                            style={[
                              styles.sceneSelectMap,
                              isSelected && styles.sceneSelectMapSelected,
                            ]}
                            onPress={() => {
                              let newSelected = [];
                              if (isSelected) {
                                newSelected = selectedScenes.filter(
                                  (s) => s.id !== scene.id,
                                );
                              } else {
                                newSelected = [
                                  ...selectedScenes,
                                  { id: scene.id, time: "" },
                                ];

                                // Try to auto-set Location based on this scene's slugline
                                if (projectSets.length > 0) {
                                  const matchingSet = projectSets.find(
                                    (s) =>
                                      s.name?.toLowerCase() ===
                                      scene.slugline?.toLowerCase(),
                                  );
                                  if (matchingSet) {
                                    setLocation(matchingSet.name);
                                    setAddressStreet(matchingSet.address || "");
                                    // We keep addressCity empty or infer from address if needed
                                  }
                                }
                              }
                              setSelectedScenes(newSelected);
                            }}
                          >
                            <Text
                              style={[
                                styles.sceneSelectText,
                                isSelected && styles.sceneSelectTextSelected,
                              ]}
                            >
                              <Text style={{ fontWeight: "bold" }}>
                                {scene.scene_number}
                              </Text>
                              {scene.title
                                ? ` - ${scene.title.toUpperCase()}`
                                : ""}
                              {" - "}
                              {scene.slugline}
                            </Text>
                            {isSelected && (
                              <Ionicons
                                name="checkmark-circle"
                                size={16}
                                color={colors.tint}
                              />
                            )}
                          </TouchableOpacity>

                          {isSelected && (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                paddingLeft: 10,
                                paddingBottom: 8,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: colors.secondary,
                                  marginRight: 8,
                                }}
                              >
                                Heure de passage :
                              </Text>
                              {Platform.OS === "web" ? (
                                <View style={{ width: 100 }}>
                                  <WebDatePicker
                                    type="time"
                                    value={selectedItem?.time || ""}
                                    onChange={(val) => {
                                      const updated = selectedScenes.map((s) =>
                                        s.id === scene.id
                                          ? { ...s, time: val }
                                          : s,
                                      );
                                      setSelectedScenes(updated);
                                    }}
                                    style={{
                                      padding: "4px 8px",
                                      height: "30px",
                                      fontSize: "12px",
                                      borderRadius: "6px",
                                    }}
                                  />
                                </View>
                              ) : (
                                <>
                                  <TouchableOpacity
                                    style={{
                                      backgroundColor: colors.background,
                                      paddingHorizontal: 8,
                                      paddingVertical: 4,
                                      borderRadius: 4,
                                      borderWidth: 1,
                                      borderColor: colors.border,
                                    }}
                                    onPress={() =>
                                      setEditingSceneTime(scene.id)
                                    }
                                  >
                                    <Text
                                      style={{
                                        fontSize: 12,
                                        color: selectedItem?.time
                                          ? colors.text
                                          : colors.textSecondary,
                                      }}
                                    >
                                      {selectedItem?.time || "--:--"}
                                    </Text>
                                  </TouchableOpacity>

                                  {editingSceneTime === scene.id && (
                                    <DateTimePicker
                                      value={(() => {
                                        const d = new Date();
                                        if (selectedItem?.time) {
                                          const [h, m] =
                                            selectedItem.time.split(":");
                                          d.setHours(Number(h));
                                          d.setMinutes(Number(m));
                                        } else {
                                          d.setHours(9);
                                          d.setMinutes(0);
                                        }
                                        return d;
                                      })()}
                                      mode="time"
                                      is24Hour={true}
                                      display="default"
                                      onChange={(event, date) => {
                                        setEditingSceneTime(null);
                                        if (date) {
                                          const timeStr = `${date
                                            .getHours()
                                            .toString()
                                            .padStart(2, "0")}:${date
                                            .getMinutes()
                                            .toString()
                                            .padStart(2, "0")}`;
                                          const updated = selectedScenes.map(
                                            (s) =>
                                              s.id === scene.id
                                                ? { ...s, time: timeStr }
                                                : s,
                                          );
                                          setSelectedScenes(updated);
                                        }
                                      }}
                                    />
                                  )}
                                </>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              <Text style={styles.sectionHeader}>Logistique</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Parking</Text>
                <TextInput
                  style={styles.input}
                  value={parkingInfo}
                  onChangeText={setParkingInfo}
                  placeholder="Infos parking..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <Text style={styles.sectionHeader}>Repas</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Heure Déjeuner</Text>
                {Platform.OS === "web" ? (
                  <WebDatePicker
                    type="time"
                    value={lunchTime}
                    onChange={(val) => setLunchTime(val)}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.input, { justifyContent: "center" }]}
                      onPress={() => setShowLunchPicker(!showLunchPicker)}
                    >
                      <Text
                        style={{
                          color: lunchTime ? colors.text : colors.textSecondary,
                        }}
                      >
                        {lunchTime || "13:00"}
                      </Text>
                    </TouchableOpacity>
                    {showLunchPicker && (
                      <View style={{ alignItems: "center" }}>
                        <DateTimePicker
                          value={(() => {
                            const d = new Date();
                            if (lunchTime) {
                              const [h, m] = lunchTime.split(":");
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
                          display="spinner"
                          onChange={onLunchTimeChange}
                          textColor={colors.text}
                        />
                        {Platform.OS === "ios" && (
                          <TouchableOpacity
                            onPress={() => setShowLunchPicker(false)}
                            style={{
                              marginTop: 5,
                              padding: 8,
                              backgroundColor: colors.backgroundSecondary,
                              borderRadius: 5,
                            }}
                          >
                            <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                              OK
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Infos Traiteur</Text>
                <TextInput
                  style={styles.input}
                  value={cateringInfo}
                  onChangeText={setCateringInfo}
                  placeholder="Cantine, Resto..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[
                    styles.input,
                    { height: 60, textAlignVertical: "top" },
                  ]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Notes importantes..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, adding && styles.disabledButton]}
                onPress={handleAddDay}
                disabled={adding}
              >
                {adding ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Ajouter</Text>
                )}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Choose Start Date for Optimization Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={optStartDateModalVisible}
        onRequestClose={() => setOptStartDateModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View
            style={[styles.modalContent, { height: "auto", maxHeight: "50%" }]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Optimisation</Text>
              <TouchableOpacity
                onPress={() => setOptStartDateModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 10 }}>
              <Text style={{ color: colors.textSecondary, marginBottom: 15 }}>
                Veuillez choisir la date de début de votre tournage pour lancer
                l'optimisation.
              </Text>

              <Text style={styles.label}>Date de début</Text>
              {Platform.OS === "web" ? (
                <WebDatePicker
                  type="date"
                  value={optStartDate}
                  onChange={setOptStartDate}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.input, { justifyContent: "center" }]}
                    onPress={() => setShowOptDatePicker(true)}
                  >
                    <Text style={{ color: optStartDate ? colors.text : colors.textSecondary }}>
                      {optStartDate || "Choisir une date..."}
                    </Text>
                  </TouchableOpacity>
                  {showOptDatePicker && (
                    <DateTimePicker
                      value={new Date(optStartDate)}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(event, selectedDate) => {
                        setShowOptDatePicker(Platform.OS === "ios");
                        if (selectedDate) {
                          setOptStartDate(
                            selectedDate.toISOString().split("T")[0],
                          );
                        }
                      }}
                      textColor={colors.text}
                    />
                  )}
                </>
              )}

              <TouchableOpacity
                style={[styles.saveButton, { marginTop: 20 }]}
                onPress={() => {
                  setOptStartDateModalVisible(false);
                  generateOptimizedPlanning(optStartDate);
                }}
              >
                <Text style={styles.saveButtonText}>LANCER L'OPTIMISATION</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Optimization Preview Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={previewModalVisible}
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { height: "80%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Proposition de planning</Text>
              <TouchableOpacity
                onPress={() => {
                  setPreviewModalVisible(false);
                  setProposedDays(null);
                }}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: colors.textSecondary, marginBottom: 15 }}>
                Voici le planning généré automatiquement. Vous pouvez l'accepter
                pour l'ajouter à votre plan de travail.
              </Text>

              {proposedDays?.map((day, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.itemContainer,
                    { borderWidth: 1, borderColor: colors.border, elevation: 0 },
                  ]}
                >
                  <View style={styles.itemHeader}>
                    <Text style={styles.dayTitle}>
                      Jour {idx + 1}:{" "}
                      {(() => {
                        if (day.date.includes("-")) {
                          const [y, m, d] = day.date.split("-");
                          return `${m}/${d}/${y}`;
                        }
                        return day.date;
                      })()}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: colors.textSecondary,
                          fontWeight: "bold",
                        }}
                      >
                        Pâté: {day.callTime}
                      </Text>
                      {day.weatherForecast ? (
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <Ionicons
                            name={
                              getWeatherCodeInfo(day.weatherForecast.code)
                                .icon as any
                            }
                            size={18}
                            color={
                              day.weatherForecast.code > 3
                                ? colors.textSecondary
                                : "#fcc419"
                            }
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              color: colors.textSecondary,
                              marginLeft: 4,
                              fontWeight: "bold",
                            }}
                          >
                            {Math.round(day.weatherForecast.temp)}°C
                          </Text>
                        </View>
                      ) : (
                        <Ionicons
                          name={day.isGoodWeather ? "sunny" : "cloudy"}
                          size={18}
                          color={day.isGoodWeather ? "#fcc419" : colors.textSecondary}
                        />
                      )}
                    </View>
                  </View>
                  <Text
                    style={{ fontSize: 13, color: colors.text, fontWeight: "bold" }}
                  >
                    {day.location}
                  </Text>
                  <View style={{ marginTop: 8 }}>
                    {day.scenes.map((s, sIdx) => (
                      <View
                        key={s.id}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{ fontSize: 12, color: colors.tint }}
                        >
                          • SC. {s.scene_number} - {s.title}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.textSecondary,
                            fontWeight: "500",
                          }}
                        >
                          {day.sceneTimes[sIdx]}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 20 }}>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { flex: 1, backgroundColor: colors.backgroundSecondary },
                ]}
                onPress={() => {
                  setPreviewModalVisible(false);
                  setProposedDays(null);
                }}
              >
                <Text style={[styles.saveButtonText, { color: colors.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { flex: 2 }]}
                onPress={confirmOptimization}
                disabled={generating}
              >
                {generating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>Valider le planning</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
