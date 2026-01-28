import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
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
        <Text style={GlobalStyles.sectionTitle}>
          Caractéristiques physiques
        </Text>

        <Text style={GlobalStyles.label}>Taille (cm)</Text>
        <TextInput
          placeholder="Ex: 175"
          placeholderTextColor={Colors.light.tabIconDefault}
          keyboardType="numeric"
          style={GlobalStyles.input}
          value={data.height ? String(data.height) : ""}
          onChangeText={(t) => updateField("height", t ? parseInt(t) : null)}
        />

        <Text style={GlobalStyles.label}>Cheveux</Text>
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
                    : Colors.light.text,
                }}
              >
                {c}
              </Text>
            </Hoverable>
          ))}
        </View>

        <Text style={GlobalStyles.label}>Yeux</Text>
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
                    : Colors.light.text,
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
        <Text style={GlobalStyles.sectionTitle}>Compétences techniques</Text>

        <Text style={GlobalStyles.label}>Matériel requis / utilisé</Text>
        <Text style={styles.helper}>
          Liste du matériel que la personne devra manipuler ou apporter.
        </Text>
        <TextInput
          placeholder="Ex: Caméra RED, Micro HF, Kit Lumière..."
          placeholderTextColor={Colors.light.tabIconDefault}
          style={GlobalStyles.input}
          value={data.equipment || ""}
          onChangeText={(t) => updateField("equipment", t)}
        />

        <Text style={GlobalStyles.label}>Logiciels maitrisés</Text>
        <TextInput
          placeholder="Ex: DaVinci Resolve, Pro Tools, After Effects..."
          placeholderTextColor={Colors.light.tabIconDefault}
          style={GlobalStyles.input}
          value={data.software || ""}
          onChangeText={(t) => updateField("software", t)}
        />
      </View>
    );
  }

  if (category === "hmc") {
    return (
      <View>
        <Text style={GlobalStyles.sectionTitle}>Spécificités HMC</Text>

        <Text style={GlobalStyles.label}>Spécialités</Text>
        <TextInput
          placeholder="Ex: Maquillage FX, Coiffure d'époque, Couture..."
          placeholderTextColor={Colors.light.tabIconDefault}
          style={GlobalStyles.input}
          value={data.specialties || ""}
          onChangeText={(t) => updateField("specialties", t)}
        />
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  helper: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
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
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  chipSelected: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
});
