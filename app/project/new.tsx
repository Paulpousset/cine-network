import ClapLoading from "@/components/ClapLoading";
import WebDatePicker from "@/components/WebDatePicker";
import { GlobalStyles } from "@/constants/Styles";
import { useTheme } from "@/providers/ThemeProvider";
import { JOB_TITLES } from "@/utils/roles";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import AddressAutocomplete from "../components/AddressAutocomplete";
import CityPicker from "../components/CityPicker";
import CountryPicker from "../components/CountryPicker";

const PROJECT_TYPES = [
  { value: "court_metrage", label: "Court-métrage" },
  { value: "long_metrage", label: "Long-métrage" },
  { value: "serie", label: "Série" },
  { value: "clip", label: "Clip" },
  { value: "publicite", label: "Pub" },
  { value: "documentaire", label: "Docu" },
  { value: "etudiant", label: "Étudiant" },
];

export default function CreateTournage() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("court_metrage");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [coords, setCoords] = useState<{
    lat: number | null;
    lon: number | null;
  }>({
    lat: null,
    lon: null,
  });
  const [creating, setCreating] = useState(false);

  // Subscription Restriction
  const [canCreate, setCanCreate] = useState(true);

  type Category = keyof typeof JOB_TITLES;
  type SelectedRole = { category: Category; title: string; quantity: number };
  const [selected, setSelected] = useState<Record<string, SelectedRole>>({});

  function roleKey(category: string, title: string) {
    return `${category}|${title}`;
  }

  useEffect(() => {
    checkSubscriptionLimits();
  }, []);

  async function checkSubscriptionLimits() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Get Profile Tier
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", session.user.id)
        .single();

      const tier = profile?.subscription_tier || "free";

      if (tier === "studio") {
        setCanCreate(true);
        return;
      }

      // 2. Count Active Projects for Free Users
      const { count, error } = await supabase
        .from("tournages")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", session.user.id);

      if (error) throw error;

      // Limit: 1 project for free users
      if ((count || 0) >= 1) {
        setCanCreate(false);
        Alert.alert(
          "Limite atteinte",
          "Vous avez atteint la limite de 1 projet actif avec le plan Gratuit. Passez au plan Studio pour créer des projets illimités (C'est gratuit !).",
          [
            { text: "Annuler", onPress: () => router.back(), style: "cancel" },
            {
              text: "Devenir membre Studio (Gratuit)",
              onPress: handleUpgradeSuccess,
            },
          ],
        );
      }
    } catch (e) {
      console.log("Error checking limits:", e);
    }
  }

  async function handleUpgradeSuccess() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from("profiles")
        .update({ 
          subscription_tier: "studio",
          updated_at: new Date().toISOString()
        })
        .eq("id", session.user.id);

      setCanCreate(true);
      setShowUpgradeModal(false);
      Alert.alert(
        "Félicitations !",
        "Vous pouvez maintenant créer des projets illimités.",
      );
    } catch (e) {
      Alert.alert("Erreur", "Mise à jour échouée.");
    }
  }

  // Very simple Nominatim Geocoding
  async function getCoordinates(fullAddress: string) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        fullAddress,
      )}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Tita/1.0", // Nominatim requires a User-Agent
        },
      });
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
        };
      }
    } catch (e) {
      console.log("Geocoding error:", e);
    }
    return null;
  }

  function addRole(category: Category, title: string) {
    setSelected((prev) => {
      const k = roleKey(category, title);
      const cur = prev[k];
      return {
        ...prev,
        [k]: cur
          ? { ...cur, quantity: cur.quantity + 1 }
          : { category, title, quantity: 1 },
      };
    });
  }

  function incRole(k: string) {
    setSelected((prev) => ({
      ...prev,
      [k]: { ...prev[k], quantity: prev[k].quantity + 1 },
    }));
  }

  function decRole(k: string) {
    setSelected((prev) => {
      const next = { ...prev } as Record<string, SelectedRole>;
      const cur = next[k];
      if (!cur) return prev;
      if (cur.quantity <= 1) {
        delete next[k];
      } else {
        next[k] = { ...cur, quantity: cur.quantity - 1 };
      }
      return next;
    });
  }

  async function handleCreate() {
    if (!title.trim()) {
      Alert.alert("Oups", "Le titre est obligatoire");
      return;
    }
    try {
      setCreating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");

      // Calculate Coordinates
      let lat = coords.lat;
      let lon = coords.lon;

      // More robust search term combining address, city and country
      const searchParts = [];
      if (address.trim()) searchParts.push(address.trim());
      if (city.trim()) searchParts.push(city.trim());
      if (country.trim()) searchParts.push(country.trim());

      const searchAddress = searchParts.join(", ");

      // Only refetch if we don't have coords yet
      if (!lat && !lon && searchAddress.trim()) {
        const c = await getCoordinates(searchAddress);
        if (c) {
          lat = c.lat;
          lon = c.lon;
        }
      }

      const { data, error } = await supabase
        .from("tournages")
        .insert({
          owner_id: session.user.id,
          title: title.trim(),
          description: desc.trim() || null,
          type,
          pays: country.trim() || null,
          ville: city.trim() || null,
          address: address.trim() || null,
          latitude: lat ? parseFloat(String(lat)) : null,
          longitude: lon ? parseFloat(String(lon)) : null,
          start_date: startDate || null,
          end_date: endDate || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data?.id) {
        const selectedList = Object.values(selected);
        const prefillRoles = selectedList.map((r) => ({
          category: r.category,
          title: r.title,
          quantity: r.quantity,
        }));
        Alert.alert("Succès", "Tournage créé. Configurez les rôles.");
        router.replace({
          pathname: "/project/[id]/setup",
          params: { id: data.id, prefillRoles: JSON.stringify(prefillRoles) },
        });
      } else {
        Alert.alert("Création réussie", "Le projet a été créé.");
        router.back();
      }
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}
      edges={["top"]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.select({ ios: "padding", android: undefined })}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.container}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.card,
                justifyContent: "center",
                alignItems: "center",
                marginRight: 15,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { marginVertical: 0 }]}>
              Créer un projet
            </Text>
          </View>

          {/* SECTION 1: INFORMATIONS GÉNÉRALES */}
          <View style={styles.formSection}>
            <View style={styles.formSectionHeader}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.formSectionTitle}>Le Projet</Text>
            </View>

            <Text style={styles.fieldLabel}>Titre du projet</Text>
            <TextInput
              placeholder="Ex: Le Dernier Métro"
              style={styles.formInput}
              value={title}
              onChangeText={setTitle}
              placeholderTextColor={colors.text + "60"}
            />

            <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Pitch / Description</Text>
            <TextInput
              placeholder="Décrivez brièvement votre projet"
              style={[styles.formInput, styles.textArea]}
              value={desc}
              onChangeText={setDesc}
              multiline
              placeholderTextColor={colors.text + "60"}
            />

            <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Type de projet</Text>
            <View style={[styles.typeContainer, { marginTop: 0 }]}>
              {PROJECT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[
                    styles.typeButton,
                    type === t.value && styles.typeButtonSelected,
                  ]}
                  onPress={() => setType(t.value)}
                >
                  <Text
                    style={{
                      color: type === t.value ? "white" : colors.primary,
                      fontWeight: "600",
                    }}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* SECTION 2: LOCALISATION */}
          <View style={styles.formSection}>
            <View style={styles.formSectionHeader}>
              <Ionicons name="location-outline" size={18} color={colors.primary} />
              <Text style={styles.formSectionTitle}>Localisation</Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Pays</Text>
                <CountryPicker
                  onSelect={setCountry}
                  currentValue={country}
                  placeholder="Choisir un pays"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Ville</Text>
                <CityPicker
                  onSelect={setCity}
                  currentValue={city}
                  placeholder="Rechercher une ville"
                />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Adresse précise (Optionnel)</Text>
            <AddressAutocomplete
              city={city}
              currentValue={address}
              onSelect={(addr, lat, lon) => {
                setAddress(addr);
                setCoords({
                  lat: lat || null,
                  lon: lon || null,
                });
              }}
              placeholder="Ex: 10 Rue de la Paix"
            />
            <Text style={styles.helperText}>
              Permet d'afficher le lieu exact sur la carte.
            </Text>
          </View>

          {/* SECTION 3: DATES */}
          <View style={styles.formSection}>
            <View style={styles.formSectionHeader}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.formSectionTitle}>Calendrier</Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Date de début</Text>
                {Platform.OS === "web" ? (
                  <WebDatePicker value={startDate} onChange={setStartDate} />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.formInput}
                      onPress={() => setShowStartPicker(true)}
                    >
                      <Text
                        style={{
                          color: startDate ? colors.text : colors.text + "60",
                        }}
                      >
                        {startDate || "Début"}
                      </Text>
                    </TouchableOpacity>
                    {showStartPicker && (
                      <DateTimePicker
                        value={startDate ? new Date(startDate) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, date) => {
                          if (Platform.OS === "android") {
                            setShowStartPicker(false);
                          }
                          if (date) {
                            setStartDate(date.toISOString().split("T")[0]);
                          }
                        }}
                      />
                    )}
                    {Platform.OS === "ios" && showStartPicker && (
                      <TouchableOpacity
                        onPress={() => setShowStartPicker(false)}
                        style={{
                          marginTop: 5,
                          padding: 8,
                          backgroundColor: colors.backgroundSecondary,
                          borderRadius: 5,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>OK</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Date de fin</Text>
                {Platform.OS === "web" ? (
                  <WebDatePicker value={endDate} onChange={setEndDate} />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.formInput}
                      onPress={() => setShowEndPicker(true)}
                    >
                      <Text
                        style={{ color: endDate ? colors.text : colors.text + "60" }}
                      >
                        {endDate || "Fin"}
                      </Text>
                    </TouchableOpacity>
                    {showEndPicker && (
                      <DateTimePicker
                        value={endDate ? new Date(endDate) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, date) => {
                          if (Platform.OS === "android") {
                            setShowEndPicker(false);
                          }
                          if (date) {
                            setEndDate(date.toISOString().split("T")[0]);
                          }
                        }}
                      />
                    )}
                    {Platform.OS === "ios" && showEndPicker && (
                      <TouchableOpacity
                        onPress={() => setShowEndPicker(false)}
                        style={{
                          marginTop: 5,
                          padding: 8,
                          backgroundColor: colors.backgroundSecondary,
                          borderRadius: 5,
                          alignItems: "center",
                        }}
                      >
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>OK</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            </View>
          </View>

          {/* SECTION 4: RÔLES À RECHERCHER */}
          <View style={styles.formSection}>
            <View style={styles.formSectionHeader}>
              <Ionicons name="people-outline" size={18} color={colors.primary} />
              <Text style={styles.formSectionTitle}>Casting & Recrutement</Text>
            </View>

            <Text style={[styles.fieldLabel, { marginBottom: 12 }]}>Sélectionnez les postes à pourvoir</Text>
            {Object.keys(JOB_TITLES).map((cat) => (
              <View key={cat} style={{ marginBottom: 15 }}>
                <Text style={[styles.catTitle, { fontSize: 13, textTransform: 'capitalize' }]}>
                  {cat.replace("_", " ")}
                </Text>
                <View style={[styles.rowWrap, { marginBottom: 5 }]}>
                  {(JOB_TITLES as any)[cat].map((job: string) => {
                    const k = `${cat}|${job}`;
                    const qty = selected[k]?.quantity || 0;
                    const active = qty > 0;
                    return (
                      <TouchableOpacity
                        key={job}
                        style={[
                          styles.jobAddChip,
                          active && styles.jobAddChipSelected,
                          { borderRadius: 8, borderStyle: active ? 'solid' : 'dashed' }
                        ]}
                        onPress={() => addRole(cat as Category, job)}
                      >
                        <Text
                          style={{
                            color: active ? "#fff" : colors.primary,
                            marginLeft: 4,
                            fontSize: 13,
                            fontWeight: active ? "bold" : "normal",
                          }}
                        >
                          + {job}
                        </Text>
                        {active ? (
                          <View style={[styles.countBadge, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                            <Text style={styles.countBadgeText}>{qty}</Text>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* Résumé de la sélection */}
            {Object.keys(selected).length > 0 && (
              <View
                style={{
                  marginTop: 10,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={styles.fieldLabel}>Votre sélection</Text>
                <View style={{ gap: 8 }}>
                  {Object.entries(selected).map(([k, r]) => (
                    <View key={k} style={[styles.selectionRow, { backgroundColor: colors.background, paddingVertical: 8, paddingHorizontal: 12 }]}>
                      <Text style={{ flex: 1, color: colors.text, fontSize: 13 }}>
                        <Text style={{ fontWeight: "bold" }}>{r.title}</Text> •{" "}
                        {r.category.replace("_", " ")}
                      </Text>
                      <View style={styles.qtyControls}>
                        <TouchableOpacity
                          onPress={() => decRole(k)}
                          style={[styles.qtyBtn, { width: 24, height: 24 }]}
                        >
                          <Text style={{ color: colors.text, fontWeight: "bold" }}>
                            −
                          </Text>
                        </TouchableOpacity>
                        <Text
                          style={{
                            minWidth: 16,
                            textAlign: "center",
                            color: colors.text,
                            fontWeight: '600'
                          }}
                        >
                          {r.quantity}
                        </Text>
                        <TouchableOpacity
                          onPress={() => incRole(k)}
                          style={[styles.qtyBtn, { width: 24, height: 24 }]}
                        >
                          <Text style={{ color: colors.text, fontWeight: "bold" }}>
                            +
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[GlobalStyles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => router.back()}
              disabled={creating}
            >
              <Text style={[GlobalStyles.secondaryButtonText, { color: colors.text }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={GlobalStyles.primaryButton}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <ClapLoading color="#fff" size={24} />
              ) : (
                <Text style={GlobalStyles.buttonText}>Créer le tournage</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: colors.backgroundSecondary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 20,
    color: colors.text,
  },
  label: {
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 8,
    color: colors.text,
  },
  helperText: {
    fontSize: 12,
    color: colors.text + "80",
    fontStyle: "italic",
    marginBottom: 10,
    marginTop: -4,
    marginLeft: 2,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  typeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  typeButtonSelected: {
    backgroundColor: colors.primary,
  },
  catTitle: {
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  jobAddChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  jobAddChipSelected: {
    backgroundColor: colors.primary,
  },
  countBadge: {
    marginLeft: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  countBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  selectionRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
  // Form Structure (Sync with Role Creation Style)
  formSection: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
  },
  formSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 8,
    textAlign: "left",
  },
  formInput: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  });
}
