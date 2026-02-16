import { useTheme } from "@/providers/ThemeProvider";
import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Hoverable } from "./Hoverable";

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
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  
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

  if (category === "acteur") {
    return (
      <View>
        <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Détails Physiques</Text>

        <Text style={styles.fieldLabel}>Taille (cm)</Text>
        <TextInput
          placeholder="Ex: 175"
          placeholderTextColor={colors.text + "60"}
          keyboardType="numeric"
          style={styles.formInput}
          value={data.height ? String(data.height) : ""}
          onChangeText={(t) => updateField("height", t ? parseInt(t) : null)}
        />

        <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Cheveux</Text>
        <View style={styles.rowWrap}>
          {HAIR_COLORS.map((c) => (
            <Hoverable
              key={c}
              onPress={() => toggleMultiSelect("hairColor", c)}
              style={[
                styles.chip,
                toArray(data.hairColor).includes(c) && styles.chipSelected,
              ]}
            >
              <Text
                style={{
                  color: toArray(data.hairColor).includes(c)
                    ? "white"
                    : colors.text,
                }}
              >
                {c}
              </Text>
            </Hoverable>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Yeux</Text>
        <View style={styles.rowWrap}>
          {EYE_COLORS.map((c) => (
            <Hoverable
              key={c}
              onPress={() => toggleMultiSelect("eyeColor", c)}
              style={[
                styles.chip,
                toArray(data.eyeColor).includes(c) && styles.chipSelected,
              ]}
            >
              <Text
                style={{
                  color: toArray(data.eyeColor).includes(c)
                    ? "white"
                    : colors.text,
                }}
              >
                {c}
              </Text>
            </Hoverable>
          ))}
        </View>
      </View>
    );
  }

  if (["image", "son", "post_prod", "deco", "technicien"].includes(category)) {
    return (
      <View>
        <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Compétences techniques</Text>

        <Text style={styles.fieldLabel}>Matériel requis / utilisé</Text>
        <Text style={styles.helper}>
          Liste du matériel que la personne devra manipuler ou apporter.
        </Text>
        <TextInput
          placeholder="Ex: Caméra RED, Micro HF, Kit Lumière..."
          placeholderTextColor={colors.text + "60"}
          style={styles.formInput}
          value={data.equipment || ""}
          onChangeText={(t) => updateField("equipment", t)}
        />

        <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Logiciels maitrisés</Text>
        <TextInput
          placeholder="Ex: DaVinci Resolve, Pro Tools, After Effects..."
          placeholderTextColor={colors.text + "60"}
          style={styles.formInput}
          value={data.software || ""}
          onChangeText={(t) => updateField("software", t)}
        />
      </View>
    );
  }

  if (category === "hmc") {
    return (
      <View>
        <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Spécificités HMC</Text>

        <Text style={styles.fieldLabel}>Spécialités</Text>
        <TextInput
          placeholder="Ex: Maquillage FX, Coiffure d'époque, Couture..."
          placeholderTextColor={colors.text + "60"}
          style={styles.formInput}
          value={data.specialties || ""}
          onChangeText={(t) => updateField("specialties", t)}
        />
      </View>
    );
  }

  return null;
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
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
  helper: {
    fontSize: 12,
    color: colors.text + "80",
    marginBottom: 6,
    fontStyle: "italic",
    textAlign: "center",
  },
  rowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-start",
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});

