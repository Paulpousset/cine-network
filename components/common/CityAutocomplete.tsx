import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";

interface CityAutocompleteProps {
  value: string;
  onSelect: (city: string, coordinates?: { lat: number; lon: number }) => void;
  placeholder?: string;
  style?: any;
}

export default function CityAutocomplete({
  value,
  onSelect,
  placeholder = "Ville",
  style,
}: CityAutocompleteProps) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
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
        searchCities(query);
      }, 500);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [query, modalVisible]);

  async function searchCities(text: string) {
    if (text.length < 3) return;
    setLoading(true);
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&osm_tag=place:city&osm_tag=place:town&osm_tag=place:village&limit=5`,
      );
      const data = await response.json();
      if (data && data.features) {
        setSuggestions(data.features);
      }
    } catch (e) {
      console.log("Error fetching cities", e);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(item: any) {
    const cityName = item.properties.name || item.properties.city;
    const country = item.properties.country;
    const postcode = item.properties.postcode;
    const coords = item.geometry.coordinates; // [lon, lat]
    
    // Format: "Paris, France" or "Paris (75), France"
    let label = cityName;
    if (postcode && country === 'France') {
      label += ` (${postcode.substring(0, 2)})`;
    }
    if (country) {
      label += `, ${country}`;
    }
    
    onSelect(label, { lon: coords[0], lat: coords[1] });
    setQuery(label);
    setModalVisible(false);
  }

  return (
    <View style={[style, { zIndex: 1000 }]}>
      <TouchableOpacity
        onPress={() => setModalVisible(!modalVisible)}
        style={styles.inputTrigger}
      >
        <Text style={[styles.inputText, !query && { color: colors.text + "80" }]} numberOfLines={1}>
          {query || placeholder}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {query ? (
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation();
                setQuery('');
                onSelect('');
                setSuggestions([]);
              }}
              style={{ marginRight: 10 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.text + "80"} />
            </TouchableOpacity>
          ) : null}
          <Ionicons name="search" size={20} color={colors.text + "80"} />
        </View>
      </TouchableOpacity>

      {modalVisible && (
        <View style={[
          styles.dropdownContainer,
          { 
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
            position: 'absolute',
            top: 50,
            left: 0,
            right: 0,
            borderRadius: 12,
            maxHeight: 250,
            zIndex: 9999,
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          }
        ]}>
          <View style={styles.searchHeader}>
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                if (text.length === 0) setSuggestions([]);
              }}
              placeholder="Rechercher une ville..."
              placeholderTextColor={colors.text + "80"}
              autoFocus
            />
            {loading && <Text style={{ fontSize: 10, color: colors.text + "80" }}>...</Text>}
          </View>

          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.properties.id || Math.random().toString()}
            keyboardShouldPersistTaps="always"
            renderItem={({ item }) => {
              const cityName = item.properties.name || item.properties.city;
              const country = item.properties.country;
              const postcode = item.properties.postcode;
              const state = item.properties.state;

              return (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSelect(item)}
                >
                  <Ionicons name="location-outline" size={18} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cityName}>
                      {cityName} 
                      {postcode && country === 'France' ? ` (${postcode.substring(0, 2)})` : ''}
                    </Text>
                    <Text style={styles.cityContext}>
                      {[state, country].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              query.length > 2 && !loading ? (
                <Text style={styles.emptyText}>Aucune ville trouvée.</Text>
              ) : null
            }
          />
        </View>
      )}
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    inputTrigger: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      height: 48,
    },
    inputText: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
      marginRight: 10,
    },
    dropdownContainer: {
      marginTop: 4,
      overflow: 'hidden',
    },
    searchHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 15,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      height: 36,
    },
    suggestionItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 12,
    },
    cityName: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.text,
    },
    cityContext: {
      fontSize: 12,
      color: colors.text + "80",
    },
    emptyText: {
      textAlign: "center",
      padding: 20,
      color: colors.text + "80",
      fontSize: 14,
    },
  });
}
