import React from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

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

type RoleFormFieldsProps = {
  category: string;
  data: any;
  onChange: (newData: any) => void;
};

export default function RoleFormFields({
  category,
  data,
  onChange,
}: RoleFormFieldsProps) {
  const updateField = (key: string, value: any) => {
    onChange({ ...data, [key]: value });
  };

  const toArray = (value: any): string[] => {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    return [String(value)];
  };

  const toggleMultiSelect = (key: string, value: string) => {
    const current = toArray(data[key]);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateField(key, next);
  };

  // --- FORMULAIRES SPÉCIFIQUES ---

  // 1. ACTEUR (Physique)
  if (category === "acteur") {
    return (
      <View>
        <Text style={styles.sectionTitle}>Caractéristiques physiques</Text>

        <Text style={styles.label}>Taille (cm)</Text>
        <TextInput
          placeholder="Ex: 175"
          keyboardType="numeric"
          style={styles.input}
          value={data.height ? String(data.height) : ""}
          onChangeText={(t) => updateField("height", t ? parseInt(t) : null)}
        />

        <Text style={styles.label}>Cheveux</Text>
        <View style={styles.rowWrap}>
          {HAIR_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => toggleMultiSelect("hairColor", c)}
              style={[
                styles.chip,
                toArray(data.hairColor).includes(c) && styles.chipSelected,
              ]}
            >
              <Text
                style={{
                  color: toArray(data.hairColor).includes(c) ? "white" : "#333",
                }}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Yeux</Text>
        <View style={styles.rowWrap}>
          {EYE_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => toggleMultiSelect("eyeColor", c)}
              style={[
                styles.chip,
                toArray(data.eyeColor).includes(c) && styles.chipSelected,
              ]}
            >
              <Text
                style={{
                  color: toArray(data.eyeColor).includes(c) ? "white" : "#333",
                }}
              >
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // 2. TECHNIQUE (Image, Son, Post-prod, Deco, Technicien)
  if (["image", "son", "post_prod", "deco", "technicien"].includes(category)) {
    return (
      <View>
        <Text style={styles.sectionTitle}>Compétences techniques</Text>

        <Text style={styles.label}>Matériel requis / utilisé</Text>
        <Text style={styles.helper}>
          Liste du matériel que la personne devra manipuler ou apporter.
        </Text>
        <TextInput
          placeholder="Ex: Caméra RED, Micro HF, Kit Lumière..."
          style={styles.input}
          value={data.equipment || ""}
          onChangeText={(t) => updateField("equipment", t)}
        />

        <Text style={styles.label}>Logiciels maitrisés</Text>
        <TextInput
          placeholder="Ex: DaVinci Resolve, Pro Tools, After Effects..."
          style={styles.input}
          value={data.software || ""}
          onChangeText={(t) => updateField("software", t)}
        />
      </View>
    );
  }

  // 3. HMC (Costume, Maquillage)
  if (category === "hmc") {
    return (
      <View>
        <Text style={styles.sectionTitle}>Spécificités HMC</Text>

        <Text style={styles.label}>Spécialités</Text>
        <TextInput
          placeholder="Ex: Maquillage FX, Coiffure d'époque, Couture..."
          style={styles.input}
          value={data.specialties || ""}
          onChangeText={(t) => updateField("specialties", t)}
        />
      </View>
    );
  }

  // 4. PRODUCTION / REALISATION (Général)
  // Pas de champs spécifiques pour l'instant, juste les champs standards (Description, Expérience)
  return null;
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#841584",
    marginTop: 10,
    marginBottom: 10,
    textTransform: "uppercase",
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#333",
    marginTop: 10,
    textAlign: "center",
  },
  helper: {
    fontSize: 12,
    color: "#666",
    marginBottom: 6,
    fontStyle: "italic",
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fafafa",
    textAlign: "center",
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "white",
  },
  chipSelected: {
    backgroundColor: "#333",
    borderColor: "#333",
  },
});
