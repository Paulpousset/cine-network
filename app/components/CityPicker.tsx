import ClapLoading from "@/components/ClapLoading";
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
  const [query, setQuery] = useState(currentValue || "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);

  // Fonction qui appelle l'API Gouv.fr
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
      // boost=population permet de faire remonter Paris avant "Paris-l'Hôpital"
      const response = await fetch(
        `https://geo.api.gouv.fr/communes?nom=${text}&fields=nom,code,codesPostaux&boost=population&limit=5`,
      );
      const data = await response.json();
      setSuggestions(data);
      setShowList(true);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(city: any) {
    const cityName = city.nom;
    setQuery(cityName); // On affiche le nom complet
    onSelect(cityName); // On envoie le nom au parent
    setShowList(false); // On cache la liste
    setSuggestions([]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder || "Rechercher une ville..."}
          value={query}
          onChangeText={searchCities}
        />
        {loading && (
          <ClapLoading size={20} color="#841584" style={styles.loader} />
        )}
      </View>

      {/* LISTE DES SUGGESTIONS */}
      {showList && suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={item?.code ?? item?.nom ?? index}
                style={styles.item}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.itemText}>
                  {item.nom} ({item.codesPostaux ? item.codesPostaux[0] : ""})
                </Text>
              </TouchableOpacity>
            ))}
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
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "white",
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
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    maxHeight: 200, // Hauteur max avec scroll
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemText: {
    color: "#333",
  },
});
