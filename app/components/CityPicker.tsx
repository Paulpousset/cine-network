import ClapLoading from "@/components/ClapLoading";
import { useTheme } from "@/providers/ThemeProvider";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type CityPickerProps = {
  onSelect: (city: string) => void; // Fonction renvoyée au parent quand on choisit
  currentValue?: string; // Valeur actuelle (ex: pour l'édition)
  placeholder?: string;
};

export default function CityPicker({
  onSelect,
  currentValue,
  placeholder,
}: CityPickerProps) {
  const { colors, isDark } = useTheme();
  const [query, setQuery] = useState(currentValue || "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);

  // Fonction qui appelle l'API Photon (OpenStreetMap)
  async function searchCities(text: string) {
    setQuery(text);
    onSelect(text); // On met à jour le parent en temps réel aussi (au cas où il ne clique pas)

    if (text.length < 2) {
      setSuggestions([]);
      setShowList(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&osm_tag=place:city&osm_tag=place:town&osm_tag=place:village&limit=5`,
      );
      const data = await response.json();
      if (data && data.features) {
        setSuggestions(data.features);
        setShowList(true);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(item: any) {
    const cityName = item.properties.name || item.properties.city;
    const country = item.properties.country;
    const label = country ? `${cityName}, ${country}` : cityName;
    
    setQuery(label); // On affiche le nom complet
    onSelect(label); // On envoie le nom au parent
    setShowList(false); // On cache la liste
    setSuggestions([]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.backgroundSecondary,
              color: colors.text,
            },
          ]}
          placeholder={placeholder || "Rechercher une ville..."}
          placeholderTextColor={colors.textSecondary + "80"}
          value={query}
          onChangeText={searchCities}
        />
        {loading && (
          <ClapLoading size={20} color="#841584" style={styles.loader} />
        )}
      </View>

      {/* LISTE DES SUGGESTIONS */}
      {showList && suggestions.length > 0 && (
        <View
          style={[
            styles.suggestionsBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            {suggestions.map((item, index) => {
              const cityName = item.properties.name || item.properties.city;
              const country = item.properties.country;
              const state = item.properties.state;

              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.item, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={[styles.itemText, { color: colors.text }]}>
                    {cityName} {country ? `, ${country}` : ""}
                  </Text>
                  {state && (
                    <Text style={{ fontSize: 10, color: colors.text + "80" }}>{state}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 10, // Très important pour que la liste passe par dessus le reste
    marginBottom: 15,
  },
  inputContainer: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  loader: {
    position: "absolute",
    right: 10,
  },
  suggestionsBox: {
    position: "absolute",
    top: 50, // Juste en dessous de l'input
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 200, // Hauteur max avec scroll
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  item: {
    padding: 12,
    borderBottomWidth: 1,
  },
  itemText: {
  },
});
