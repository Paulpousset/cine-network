import ClapLoading from "@/components/ClapLoading";
import { GlobalStyles } from "@/constants/Styles";
import { useTheme } from "@/providers/ThemeProvider";
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
  onSelect: (
    address: string,
    lat?: number,
    lon?: number,
    city?: string,
    zipcode?: string,
  ) => void;
  currentValue?: string;
  placeholder?: string;
};

export default function AddressAutocomplete({
  city,
  onSelect,
  currentValue,
  placeholder,
}: AddressAutocompleteProps) {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
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
        `https://photon.komoot.io/api/?q=${encodeURIComponent(searchTerm)}&limit=5`,
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
    const props = item.properties;
    const streetPart = [props.housenumber, props.street].filter(Boolean).join(' ') || props.name || props.city;
    const itemCity = props.city;
    const itemZipcode = props.postcode;
    const country = props.country;

    const displayLabel = streetPart + (country ? `, ${country}` : '');

    setQuery(displayLabel);
    setShowList(false);
    setSuggestions([]);

    const [lon, lat] = item.geometry.coordinates;
    onSelect(displayLabel, lat, lon, itemCity, itemZipcode);
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            GlobalStyles.input,
            {
              backgroundColor: colors.backgroundSecondary,
              color: colors.text,
              borderColor: colors.border,
              borderWidth: 1,
              width: "100%",
            }
          ]}
          placeholder={placeholder || "Adresse précise..."}
          placeholderTextColor={colors.textSecondary + "80"}
          value={query}
          onChangeText={searchAddress}
        />
        {loading && (
          <ClapLoading
            size={20}
            color={colors.tint}
            style={styles.loader}
          />
        )}
      </View>

      {showList && suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          <ScrollView
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled={true}
          >
            {suggestions.map((item, index) => {
              const props = item.properties;
              const mainLabel = [props.housenumber, props.street].filter(Boolean).join(' ') || props.name || props.city;
              const subLabel = [props.postcode, props.city, props.state, props.country]
                .filter(Boolean)
                .filter((val, index, self) => self.indexOf(val) === index && val !== mainLabel)
                .join(', ');

              return (
                <TouchableOpacity
                  key={item.properties.id || index}
                  style={styles.item}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.itemText}>{mainLabel}</Text>
                  {subLabel ? <Text style={{ fontSize: 12, color: colors.textSecondary }}>{subLabel}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    maxHeight: 200,
    borderRadius: 8,
    marginTop: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.backgroundSecondary,
  },
  itemText: {
    fontSize: 14,
    color: colors.text,
  },
  });
}
