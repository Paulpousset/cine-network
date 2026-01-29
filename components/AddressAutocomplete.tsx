import Colors from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

interface AddressAutocompleteProps {
  value: string;
  onSelect: (
    address: string,
    coordinates?: { lat: number; lon: number },
  ) => void;
  placeholder?: string;
  style?: any;
}

export default function AddressAutocomplete({
  value,
  onSelect,
  placeholder = "Rechercher une adresse",
  style,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (query.length > 2 && modalVisible) {
      const delayDebounceFn = setTimeout(() => {
        searchAddress(query);
      }, 500);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [query, modalVisible]);

  async function searchAddress(text: string) {
    if (text.length < 3) return;
    setLoading(true);
    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(text)}&limit=5`,
      );
      const data = await response.json();
      if (data && data.features) {
        setSuggestions(data.features);
      }
    } catch (e) {
      console.log("Error fetching addresses", e);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(item: any) {
    const coords = item.geometry.coordinates; // [lon, lat]

    // Use the full label (e.g., "8 Boulevard du Port 80000 Amiens")
    const label = item.properties.label;

    onSelect(label, { lon: coords[0], lat: coords[1] });
    setQuery(label);
    setModalVisible(false);
  }

  return (
    <View style={style}>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.inputTrigger}
      >
        <Text
          style={[styles.inputText, !query && { color: "#999" }]}
          numberOfLines={1}
        >
          {query || placeholder}
        </Text>
        <Ionicons name="location-outline" size={20} color="#999" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent}>
            <View style={styles.searchHeader}>
              <Ionicons name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Rechercher une adresse..."
                placeholderTextColor="#999"
                autoFocus
              />
              {loading && (
                <Text style={{ fontSize: 10, color: "#666" }}>...</Text>
              )}
            </View>

            <FlatList
              data={suggestions}
              keyExtractor={(item) =>
                item.properties.id || Math.random().toString()
              }
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSelect(item)}
                >
                  <Ionicons
                    name="location"
                    size={20}
                    color={Colors.light.tint}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cityName}>{item.properties.label}</Text>
                    <Text style={styles.cityContext}>
                      {item.properties.context}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                query.length > 2 && !loading ? (
                  <Text style={styles.emptyText}>Aucune adresse trouvée.</Text>
                ) : null
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  inputTrigger: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inputText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    maxHeight: 400,
    overflow: "hidden",
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    height: 40,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    gap: 12,
  },
  cityName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  cityContext: {
    fontSize: 12,
    color: "#999",
  },
  emptyText: {
    textAlign: "center",
    padding: 20,
    color: "#999",
  },
});
