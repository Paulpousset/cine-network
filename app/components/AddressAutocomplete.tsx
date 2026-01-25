import ClapLoading from "@/components/ClapLoading";
import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import React, { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type AddressAutocompleteProps = {
  city?: string;
  onSelect: (address: string, lat?: number, lon?: number, city?: string, zipcode?: string) => void;
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
    onSelect(text);

    if (text.length < 3) {
      setSuggestions([]);
      setShowList(false);
      return;
    }

    try {
      setLoading(true);
      const searchTerm = city ? `${text} ${city}` : text;

      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
          searchTerm,
        )}&limit=5`,
      );
      const data = await response.json();

      if (data && data.features) {
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
    const streetPart = item.properties.name || item.properties.label;
    const itemCity = item.properties.city;
    const itemZipcode = item.properties.postcode;

    setQuery(streetPart);
    setShowList(false);
    setSuggestions([]);

    const [lon, lat] = item.geometry.coordinates;
    onSelect(streetPart, lat, lon, itemCity, itemZipcode);
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={GlobalStyles.input}
          placeholder={placeholder || "Adresse précise..."}
          placeholderTextColor={Colors.light.tabIconDefault}
          value={query}
          onChangeText={searchAddress}
        />
        {loading && (
          <ClapLoading
            size={20}
            color={Colors.light.tint}
            style={styles.loader}
          />
        )}
      </View>

      {showList && suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          <ScrollView keyboardShouldPersistTaps="always" nestedScrollEnabled={true}>
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
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  loader: {
    position: "absolute",
    right: 10,
    top: 15, // Adjusted to align with input height
  },
  suggestionsBox: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderTopWidth: 0,
    maxHeight: 200,
    borderRadius: 8,
    marginTop: 2,
    shadowColor: Colors.light.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.backgroundSecondary,
  },
  itemText: {
    fontSize: 14,
    color: Colors.light.text,
  },
});
