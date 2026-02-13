import { GlobalStyles } from "@/constants/Styles";
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
        <Text style={[GlobalStyles.sectionTitle, { color: colors.text }]}>
          Caractéristiques physiques
        </Text>

        <Text style={[GlobalStyles.label, { color: colors.text }]}>Taille (cm)</Text>
        <TextInput
          placeholder="Ex: 175"
          placeholderTextColor={colors.text + "80"}
          keyboardType="numeric"
          style={[GlobalStyles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          value={data.height ? String(data.height) : ""}
          onChangeText={(t) => updateField("height", t ? parseInt(t) : null)}
        />

        <Text style={[GlobalStyles.label, { color: colors.text }]}>Cheveux</Text>
        <View style={styles.rowWrap}>
          {HAIR_COLORS.map((c) => (
            <Hoverable
              key={c}
              onPress={() => toggleMultiSelect("hairColor", c)}
              hoverStyle={{ transform: [{ scale: 1.05 }] }}
              style={[
                styles.chip,
                toArray(data.hairColor).includes(c) && styles.chipSelected,
                { cursor: "pointer" } as any,
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

        <Text style={[GlobalStyles.label, { color: colors.text }]}>Yeux</Text>
        <View style={styles.rowWrap}>
          {EYE_COLORS.map((c) => (
            <Hoverable
              key={c}
              onPress={() => toggleMultiSelect("eyeColor", c)}
              hoverStyle={{ transform: [{ scale: 1.05 }] }}
              style={[
                styles.chip,
                toArray(data.eyeColor).includes(c) && styles.chipSelected,
                { cursor: "pointer" } as any,
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
        <Text style={[GlobalStyles.sectionTitle, { color: colors.text }]}>Compétences techniques</Text>

        <Text style={[GlobalStyles.label, { color: colors.text }]}>Matériel requis / utilisé</Text>
        <Text style={styles.helper}>
          Liste du matériel que la personne devra manipuler ou apporter.
        </Text>
        <TextInput
          placeholder="Ex: Caméra RED, Micro HF, Kit Lumière..."
          placeholderTextColor={colors.text + "80"}
          style={[GlobalStyles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          value={data.equipment || ""}
          onChangeText={(t) => updateField("equipment", t)}
        />

        <Text style={[GlobalStyles.label, { color: colors.text }]}>Logiciels maitrisés</Text>
        <TextInput
          placeholder="Ex: DaVinci Resolve, Pro Tools, After Effects..."
          placeholderTextColor={colors.text + "80"}
          style={[GlobalStyles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          value={data.software || ""}
          onChangeText={(t) => updateField("software", t)}
        />
      </View>
    );
  }

  if (category === "hmc") {
    return (
      <View>
        <Text style={[GlobalStyles.sectionTitle, { color: colors.text }]}>Spécificités HMC</Text>

        <Text style={[GlobalStyles.label, { color: colors.text }]}>Spécialités</Text>
        <TextInput
          placeholder="Ex: Maquillage FX, Coiffure d'époque, Couture..."
          placeholderTextColor={colors.text + "80"}
          style={[GlobalStyles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
          value={data.specialties || ""}
          onChangeText={(t) => updateField("specialties", t)}
        />
      </View>
    );
  }

  return null;
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
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
    justifyContent: "center",
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});

