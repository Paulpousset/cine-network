import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type AddressAutocompleteProps = {
  city?: string; // The city context to refine search
  onSelect: (address: string, lat?: number, lon?: number) => void;
  currentValue?: string;
  placeholder?: string;
};

export default function AddressAutocomplete({
  city,
  onSelect,
  currentValue,
  placeholder,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(currentValue || "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);

  useEffect(() => {
    if (currentValue !== undefined && currentValue !== query) {
      setQuery(currentValue);
    }
  }, [currentValue]);

  async function searchAddress(text: string) {
    setQuery(text);
    // Basic update without coords if typing manually
    onSelect(text);

    if (text.length < 3) {
      setSuggestions([]);
      setShowList(false);
      return;
    }

    try {
      setLoading(true);
      // We combine the user input with the selected city to filter results effectively
      // "10 rue de la paix" + " Paris" -> "10 rue de la paix Paris"
      const searchTerm = city ? `${text} ${city}` : text;

      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
          searchTerm,
        )}&limit=5`,
      );
      const data = await response.json();

      if (data && data.features) {
        // Filter: If city is specified, we might want to ensure results are in acceptable range?
        // But adding it to query usually does the job.
        setSuggestions(data.features);
        setShowList(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(item: any) {
    // item.properties.name gives "10 Rue de la Paix" (housenumber + street)
    // item.properties.label gives full address "10 Rue de la Paix 75002 Paris"
    // Since we separate city in the form, we likely want "name" (Street + Number)

    // However, sometimes it is just the street name if no number.
    const streetPart = item.properties.name || item.properties.label;

    setQuery(streetPart);
    setShowList(false);
    setSuggestions([]);

    const [lon, lat] = item.geometry.coordinates;
    onSelect(streetPart, lat, lon);
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder || "Adresse précise..."}
          value={query}
          onChangeText={searchAddress}
        />
        {loading && (
          <ActivityIndicator
            size="small"
            color="#841584"
            style={styles.loader}
          />
        )}
      </View>

      {/* SUGGESTIONS LIST */}
      {showList && suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={item.properties.id || index}
                style={styles.item}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.itemText}>{item.properties.label}</Text>
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
    marginBottom: 15,
    zIndex: 1000, // Helps with overlay if needed, though simpler here
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "white",
    fontSize: 16,
  },
  loader: {
    position: "absolute",
    right: 10,
  },
  suggestionsBox: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#eee",
    borderTopWidth: 0,
    maxHeight: 200,
    borderRadius: 8,
    marginTop: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemText: {
    fontSize: 14,
    color: "#333",
  },
});
