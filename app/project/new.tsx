import ClapLoading from "@/components/ClapLoading";
import PaymentModal from "@/components/PaymentModal";
import WebDatePicker from "@/components/WebDatePicker";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { JOB_TITLES } from "@/utils/roles";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
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
import { supabase } from "../../lib/supabase";
import AddressAutocomplete from "../components/AddressAutocomplete";
import CityPicker from "../components/CityPicker";
import CountryPicker from "../components/CountryPicker";

export default function CreateTournage() {
  const router = useRouter();

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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
          "Vous avez atteint la limite de 1 projet actif avec le plan Gratuit. Passez au plan Studio pour créer des projets illimités.",
          [
            { text: "Annuler", onPress: () => router.back(), style: "cancel" },
            {
              text: "Voir les offres",
              onPress: () => setShowUpgradeModal(true),
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
        .update({ subscription_tier: "studio" })
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
          "User-Agent": "CineNetwork/1.0", // Nominatim requires a User-Agent
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
        <Text style={GlobalStyles.title1}>Créer un tournage</Text>

        <View style={GlobalStyles.card}>
          <Text style={styles.label}>Titre</Text>
          <TextInput
            placeholder="Ex: Le Dernier Métro"
            style={GlobalStyles.input}
            value={title}
            onChangeText={setTitle}
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Pitch / Description</Text>
          <TextInput
            placeholder="Décrivez brièvement votre projet"
            style={[GlobalStyles.input, styles.textArea]}
            value={desc}
            onChangeText={setDesc}
            multiline
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Pays</Text>
          <CountryPicker
            onSelect={setCountry}
            currentValue={country}
            placeholder="Choisir un pays"
          />

          <Text style={styles.label}>Ville</Text>
          <CityPicker
            onSelect={setCity}
            currentValue={city}
            placeholder="Rechercher une ville"
          />

          <Text style={styles.label}>Adresse précise (Optionnel)</Text>
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
            Permet d'afficher le lieu exact sur la carte. Si vide, la ville sera
            utilisée.
          </Text>

          <View style={{ flexDirection: "row", marginTop: 15, gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Date de début</Text>
              {Platform.OS === "web" ? (
                <WebDatePicker value={startDate} onChange={setStartDate} />
              ) : (
                <>
                  <TouchableOpacity
                    style={GlobalStyles.input}
                    onPress={() => setShowStartPicker(true)}
                  >
                    <Text
                      style={{ color: startDate ? Colors.light.text : "#999" }}
                    >
                      {startDate || "Choisir une date"}
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
                        backgroundColor: "#eee",
                        borderRadius: 5,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 12, color: "#666" }}>OK</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Date de fin</Text>
              {Platform.OS === "web" ? (
                <WebDatePicker value={endDate} onChange={setEndDate} />
              ) : (
                <>
                  <TouchableOpacity
                    style={GlobalStyles.input}
                    onPress={() => setShowEndPicker(true)}
                  >
                    <Text
                      style={{ color: endDate ? Colors.light.text : "#999" }}
                    >
                      {endDate || "Choisir une date"}
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
                        backgroundColor: "#eee",
                        borderRadius: 5,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ fontSize: 12, color: "#666" }}>OK</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>

          <Text style={styles.label}>Type</Text>
          <View style={styles.typeContainer}>
            {["court_metrage", "clip", "serie"].map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeButton,
                  type === t && styles.typeButtonSelected,
                ]}
                onPress={() => setType(t)}
              >
                <Text
                  style={{
                    color: type === t ? "white" : Colors.light.primary,
                    fontWeight: "600",
                  }}
                >
                  {t === "court_metrage"
                    ? "Court"
                    : t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Rôles à rechercher */}
        <View style={[GlobalStyles.card, { marginTop: 16 }]}>
          <Text style={GlobalStyles.title2}>Rôles recherchés</Text>
          {Object.keys(JOB_TITLES).map((cat) => (
            <View key={cat} style={{ marginTop: 10 }}>
              <Text style={styles.catTitle}>
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " ")}
              </Text>
              <View style={styles.rowWrap}>
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
                      ]}
                      onPress={() => addRole(cat as Category, job)}
                    >
                      <Text
                        style={{
                          color: active ? "#fff" : Colors.light.primary,
                          marginLeft: 6,
                          fontWeight: active ? "bold" : "normal",
                        }}
                      >
                        + {job}
                      </Text>
                      {active ? (
                        <View style={styles.countBadge}>
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
          <View
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTopWidth: 1,
              borderColor: Colors.light.border,
            }}
          >
            <Text style={styles.label}>Sélection</Text>
            {Object.keys(selected).length === 0 ? (
              <Text style={{ color: "#888", fontStyle: "italic" }}>
                Aucun rôle sélectionné.
              </Text>
            ) : (
              <View style={{ gap: 8 }}>
                {Object.entries(selected).map(([k, r]) => (
                  <View key={k} style={styles.selectionRow}>
                    <Text style={{ flex: 1, color: Colors.light.text }}>
                      <Text style={{ fontWeight: "bold" }}>{r.title}</Text> •{" "}
                      {r.category}
                    </Text>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        onPress={() => decRole(k)}
                        style={styles.qtyBtn}
                      >
                        <Text style={{ color: "#333", fontWeight: "bold" }}>
                          −
                        </Text>
                      </TouchableOpacity>
                      <Text
                        style={{
                          minWidth: 18,
                          textAlign: "center",
                          color: Colors.light.text,
                        }}
                      >
                        {r.quantity}
                      </Text>
                      <TouchableOpacity
                        onPress={() => incRole(k)}
                        style={styles.qtyBtn}
                      >
                        <Text style={{ color: "#333", fontWeight: "bold" }}>
                          +
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={GlobalStyles.secondaryButton}
            onPress={() => router.back()}
            disabled={creating}
          >
            <Text style={GlobalStyles.secondaryButtonText}>Annuler</Text>
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

      <PaymentModal
        visible={showUpgradeModal}
        amount={29.0}
        label="Passer Studio (Projets Illimités)"
        onClose={() => {
          setShowUpgradeModal(false);
          if (!canCreate) router.back(); // If they closed without paying and were blocked, go back
        }}
        onSuccess={handleUpgradeSuccess}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: Colors.light.backgroundSecondary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 20,
  },
  label: {
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 8,
    color: Colors.light.text,
  },
  helperText: {
    fontSize: 12,
    color: "#666",
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
    gap: 10,
    marginTop: 8,
  },
  typeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.light.primary,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  typeButtonSelected: {
    backgroundColor: Colors.light.primary,
  },
  catTitle: {
    fontWeight: "600",
    color: Colors.light.text,
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
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.background,
  },
  jobAddChipSelected: {
    backgroundColor: Colors.light.primary,
  },
  countBadge: {
    marginLeft: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.15)",
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
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
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
    borderColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 12,
  },
});
