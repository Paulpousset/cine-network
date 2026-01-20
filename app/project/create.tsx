import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
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
import CityPicker from "../components/CityPicker";
import CountryPicker from "../components/CountryPicker";
import { JOB_TITLES } from "../utils/roles";

export default function CreateTournage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("court_metrage");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [creating, setCreating] = useState(false);

  type Category = keyof typeof JOB_TITLES;
  type SelectedRole = { category: Category; title: string; quantity: number };
  const [selected, setSelected] = useState<Record<string, SelectedRole>>({});

  function roleKey(category: string, title: string) {
    return `${category}|${title}`;
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

      const { data, error } = await supabase
        .from("tournages")
        .insert({
          owner_id: session.user.id,
          title: title.trim(),
          description: desc.trim() || null,
          type,
          pays: country.trim() || null,
          ville: city.trim() || null,
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
          pathname: "/project/setup/[id]",
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
        <Text style={styles.headerTitle}>Créer un tournage</Text>

        <View style={styles.section}>
          <Text style={styles.label}>Titre</Text>
          <TextInput
            placeholder="Ex: Le Dernier Métro"
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Pitch / Description</Text>
          <TextInput
            placeholder="Décrivez brièvement votre projet"
            style={[styles.input, styles.textArea]}
            value={desc}
            onChangeText={setDesc}
            multiline
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
                <Text style={{ color: type === t ? "white" : "#841584" }}>
                  {t === "court_metrage"
                    ? "Court"
                    : t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Rôles à rechercher */}
        <View style={[styles.section, { marginTop: 16 }]}>
          <Text style={styles.sectionTitle}>Rôles recherchés</Text>
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
                          color: active ? "#fff" : "#841584",
                          marginLeft: 6,
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
          <View style={{ marginTop: 16 }}>
            <Text style={styles.label}>Sélection</Text>
            {Object.keys(selected).length === 0 ? (
              <Text style={{ color: "#888" }}>Aucun rôle sélectionné.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {Object.entries(selected).map(([k, r]) => (
                  <View key={k} style={styles.selectionRow}>
                    <Text style={{ flex: 1 }}>
                      {r.title} • {r.category}
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
                      <Text style={{ minWidth: 18, textAlign: "center" }}>
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
            style={[styles.button, styles.buttonSecondary]}
            onPress={() => router.back()}
            disabled={creating}
          >
            <Text style={[styles.buttonText, { color: "#333" }]}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary]}
            onPress={handleCreate}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text style={styles.buttonText}>Créer le tournage</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f8f9fa",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 20,
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  label: {
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
    borderColor: "#841584",
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  typeButtonSelected: {
    backgroundColor: "#841584",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
  catTitle: {
    fontWeight: "600",
    color: "#444",
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
    borderColor: "#841584",
    backgroundColor: "#fff",
  },
  jobAddChipSelected: {
    backgroundColor: "#841584",
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
    backgroundColor: "#fafafa",
    borderRadius: 8,
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
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPrimary: {
    backgroundColor: "#841584",
  },
  buttonSecondary: {
    backgroundColor: "#eee",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
