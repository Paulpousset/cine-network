import React, { useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type CountryPickerProps = {
  onSelect: (country: string) => void;
  currentValue?: string;
  placeholder?: string;
};

export default function CountryPicker({
  onSelect,
  currentValue,
  placeholder,
}: CountryPickerProps) {
  const [query, setQuery] = useState(currentValue || "");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);

  async function searchCountries(text: string) {
    setQuery(text);
    onSelect(text);

    if (text.length < 1) {
      setSuggestions([]);
      setShowList(false);
      return;
    }

    try {
      setLoading(true);
      // Using REST Countries API v3
      const resp = await fetch(
        `https://restcountries.com/v3.1/name/${encodeURIComponent(text)}?fields=name`,
      );
      if (!resp.ok) {
        setSuggestions([]);
        setShowList(false);
        return;
      }
      const data = await resp.json();
      const items = Array.isArray(data)
        ? data.map((c: any) => ({ name: c?.name?.common || "" }))
        : [];
      setSuggestions(items.slice(0, 10));
      setShowList(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(item: any) {
    const name = item.name;
    setQuery(name);
    onSelect(name);
    setShowList(false);
    setSuggestions([]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder || "Choisir un pays"}
          value={query}
          onChangeText={searchCountries}
        />
        {loading && (
          <ActivityIndicator
            size="small"
            color="#841584"
            style={styles.loader}
          />
        )}
      </View>
      {showList && suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          <ScrollView keyboardShouldPersistTaps="handled">
            {suggestions.map((item, idx) => (
              <TouchableOpacity
                key={`${item.name}-${idx}`}
                style={styles.item}
                onPress={() => handleSelect(item)}
              >
                <Text style={styles.itemText}>{item.name}</Text>
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
    zIndex: 10,
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
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    maxHeight: 200,
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
