import AppMap, { Marker } from '@/components/AppMap';
import LocationCard from '@/components/LocationCard';
import ScreenContainer from '@/components/ScreenContainer';
import StyledText from '@/components/StyledText';
import { Text, View } from '@/components/Themed';
import { useFilmingLocations } from '@/hooks/useFilmingLocations';
import { useLocationCategories } from '@/hooks/useLocationCategories';
import { useTheme } from '@/providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  View as RNView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity
} from 'react-native';

// Pure JS Draggable Slider to avoid Native Module issues
const CustomSlider = ({ value, min, max, step, onValueChange, disabled, color, colors, isDark }: any) => {
  const [width, setWidth] = useState(0);

  const handleTouch = (evt: any) => {
    if (disabled || width === 0) return;
    const { locationX } = evt.nativeEvent;
    const percent = Math.max(0, Math.min(1, locationX / width));
    const rawValue = percent * (max - min) + min;
    const steppedValue = Math.round(rawValue / step) * step;
    onValueChange(steppedValue);
  };

  const displayValue = value === null ? (max >= 1000 ? max : 0) : value;
  const percentage = ((displayValue - min) / (max - min)) * 100;

  return (
    <RNView style={{ marginBottom: 20, paddingHorizontal: 15 }}>
      <RNView 
        style={{ 
          width: '100%', 
          height: 40, 
          justifyContent: 'center', 
          opacity: disabled ? 0.3 : 1,
        }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => !disabled}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
      >
        <RNView style={{ width: '100%', height: 40, justifyContent: 'center' }}>
          {/* Track background */}
          <RNView pointerEvents="none" style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, width: '100%' }} />
          
          {/* Active track color */}
          <RNView 
            pointerEvents="none"
            style={{ 
              height: 6, 
              backgroundColor: color, 
              borderRadius: 3, 
              position: 'absolute',
              left: 0,
              width: `${percentage}%`
            }} 
          />

          {/* Thumb */}
          <RNView 
            pointerEvents="none"
            style={{ 
              position: 'absolute', 
              left: `${percentage}%`,
              marginLeft: -15,
              width: 30, 
              height: 30, 
              borderRadius: 15, 
              backgroundColor: isDark ? colors.text : 'white',
              borderWidth: 3,
              borderColor: color,
              elevation: 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 2,
              zIndex: 10,
            }} 
          />
        </RNView>
      </RNView>
      
      {/* Plus/Minus helpers if touch is difficult */}
      <RNView style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
        <TouchableOpacity 
          disabled={disabled || (value !== null && value <= min)}
          onPress={() => {
            const current = value === null ? (max >= 1000 ? max : 0) : value;
            onValueChange(Math.max(min, current - step));
          }}
          style={{ padding: 8, backgroundColor: colors.backgroundSecondary, borderRadius: 8, width: 44, alignItems: 'center' }}
        >
          <Ionicons name="remove" size={20} color={disabled ? colors.textSecondary : colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity 
          disabled={disabled || (value === max)}
          onPress={() => {
            const current = value === null ? (max >= 1000 ? max : 0) : value;
            const next = current + step;
            onValueChange(next >= max ? (max >= 1000 ? null : max) : next);
          }}
          style={{ padding: 8, backgroundColor: colors.backgroundSecondary, borderRadius: 8, width: 44, alignItems: 'center' }}
        >
          <Ionicons name="add" size={20} color={disabled ? colors.textSecondary : colors.primary} />
        </TouchableOpacity>
      </RNView>
    </RNView>
  );
};

export default function LocationsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { categories: LOCATION_CATEGORIES } = useLocationCategories();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [mapRegion, setMapRegion] = useState({
    latitude: 46.2276,
    longitude: 2.2137,
    latitudeDelta: 10,
    longitudeDelta: 10,
  });
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<any[]>([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);

  const {
    locations,
    isLoading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedCity,
    setSelectedCity,
    maxPrice,
    setMaxPrice,
    distanceRange,
    setDistanceRange,
    userLocation,
    setUserLocation,
    refresh,
  } = useFilmingLocations();

  const activeFiltersCount = [
    selectedCategory,
    selectedCity,
    maxPrice,
    distanceRange
  ].filter(f => f !== null && f !== '').length;

  useEffect(() => {
    if (citySearchQuery.length > 2) {
      const delayDebounceFn = setTimeout(() => {
        searchCities(citySearchQuery);
      }, 500);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setCitySuggestions([]);
    }
  }, [citySearchQuery]);

  const searchCities = async (text: string) => {
    setIsSearchingCity(true);
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&osm_tag=place:city&osm_tag=place:town&osm_tag=place:village&limit=5`,
      );
      const data = await response.json();
      if (data && data.features) {
        setCitySuggestions(data.features);
      }
    } catch (e) {
      console.log("Error fetching cities", e);
    } finally {
      setIsSearchingCity(false);
    }
  };

  const handleCitySelect = (city: string, coords?: { lat: number; lon: number }) => {
    setSelectedCity(city);
    if (coords) {
      const newLoc = { latitude: coords.lat, longitude: coords.lon };
      setUserLocation(newLoc);
      setMapRegion({
        ...newLoc,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      });
    } else {
      setUserLocation(null);
    }
  };

  return (
    <ScreenContainer scrollable={false} style={StyleSheet.flatten([styles.container, { backgroundColor: colors.background }])}>
      <View style={styles.header}>
        <View style={StyleSheet.flatten([styles.searchContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }])}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={StyleSheet.flatten([styles.searchInput, { color: colors.text }])}
            placeholder="Rechercher..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity 
          style={StyleSheet.flatten([styles.addButton, { backgroundColor: colors.primary, marginLeft: 12 }])}
          onPress={() => router.push('/locations/new')}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.addButtonText}>Publier</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterBar}>
        <TouchableOpacity 
          style={StyleSheet.flatten([styles.filterToggle, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }])}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={20} color={colors.primary} />
          <Text style={{ color: colors.text, marginLeft: 8, fontWeight: '600' }}>
            Filtres {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ''}
          </Text>
        </TouchableOpacity>

        <View style={[styles.viewToggle, { backgroundColor: isDark ? colors.backgroundSecondary : '#eee' }]}>
          <TouchableOpacity 
            onPress={() => setViewMode('list')}
            style={[
              styles.toggleBtn, 
              viewMode === 'list' && { backgroundColor: colors.primary }
            ]}
          >
            <Ionicons name="list" size={20} color={viewMode === 'list' ? 'white' : colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setViewMode('map')}
            style={[
              styles.toggleBtn, 
              viewMode === 'map' && { backgroundColor: colors.primary }
            ]}
          >
            <Ionicons name="map" size={20} color={viewMode === 'map' ? 'white' : colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <StyledText style={styles.modalTitle}>Filtres</StyledText>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Autour de...</Text>
                <View style={{ position: 'relative', zIndex: 1000 }}>
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: colors.backgroundSecondary, 
                    borderRadius: 12, 
                    paddingHorizontal: 12, 
                    height: 48,
                    borderWidth: 1,
                    borderColor: colors.border
                  }}>
                    <Ionicons name="location-outline" size={20} color={colors.textSecondary} />
                    <TextInput
                      style={{ 
                        color: colors.text, 
                        fontSize: 16, 
                        marginLeft: 10, 
                        flex: 1,
                        height: '100%'
                      }}
                      placeholder="Chercher une ville..."
                      placeholderTextColor={colors.textSecondary}
                      value={citySearchQuery || selectedCity || ''}
                      onChangeText={(text) => {
                        setCitySearchQuery(text);
                        if (!text) {
                          setSelectedCity(null);
                          setUserLocation(null);
                        }
                      }}
                    />
                    {(citySearchQuery || selectedCity) ? (
                      <TouchableOpacity onPress={() => {
                        setCitySearchQuery('');
                        setSelectedCity(null);
                        setUserLocation(null);
                        setCitySuggestions([]);
                      }}>
                        <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {citySuggestions.length > 0 && (
                    <View style={{ 
                      backgroundColor: colors.card,
                      borderRadius: 12,
                      marginTop: 4,
                      borderWidth: 1,
                      borderColor: colors.border,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 5,
                    }}>
                      {citySuggestions.map((item, index) => {
                        const cityName = item.properties.name || item.properties.city;
                        const country = item.properties.country;
                        const postcode = item.properties.postcode;
                        const coords = item.geometry.coordinates;
                        
                        let label = cityName;
                        if (postcode && country === 'France') {
                          label += ` (${postcode.substring(0, 2)})`;
                        }
                        if (country) {
                          label += `, ${country}`;
                        }
                        
                        return (
                          <TouchableOpacity 
                            key={index}
                            style={{ 
                              padding: 15, 
                              borderBottomWidth: index === citySuggestions.length - 1 ? 0 : 1,
                              borderBottomColor: colors.border,
                              flexDirection: 'row',
                              alignItems: 'center'
                            }}
                            onPress={() => {
                              handleCitySelect(label, { lon: coords[0], lat: coords[1] });
                              setCitySearchQuery(label);
                              setCitySuggestions([]);
                            }}
                          >
                            <Ionicons name="location" size={16} color={colors.primary} style={{ marginRight: 10 }} />
                            <View>
                              <Text style={{ color: colors.text, fontSize: 15 }}>{label}</Text>
                              {item.properties.state && (
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.properties.state}</Text>
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Catégorie</Text>
                <View style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  backgroundColor: colors.backgroundSecondary, 
                  borderRadius: 12, 
                  paddingHorizontal: 12, 
                  height: 44,
                  borderWidth: 1,
                  borderColor: colors.border,
                  marginBottom: 12
                }}>
                  <Ionicons name="search" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={{ 
                      color: colors.text, 
                      fontSize: 15, 
                      marginLeft: 10, 
                      flex: 1,
                      height: '100%'
                    }}
                    placeholder="Filtrer les catégories..."
                    placeholderTextColor={colors.textSecondary}
                    value={categorySearch}
                    onChangeText={setCategorySearch}
                  />
                  {categorySearch ? (
                    <TouchableOpacity onPress={() => setCategorySearch('')} style={{ padding: 4 }}>
                      <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity 
                    onPress={() => setSelectedCategory(null)}
                    style={[
                      styles.categoryTag, 
                      { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                      selectedCategory === null && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                  >
                    <Text style={{ color: selectedCategory === null ? 'white' : colors.text, fontWeight: selectedCategory === null ? '700' : '500' }}>Toutes</Text>
                  </TouchableOpacity>
                  {LOCATION_CATEGORIES
                    .filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase()))
                    .map((cat) => (
                      <TouchableOpacity 
                        key={cat}
                        onPress={() => setSelectedCategory(cat)}
                        style={[
                          styles.categoryTag, 
                          { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
                          selectedCategory === cat && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}
                      >
                        <Text style={{ color: selectedCategory === cat ? 'white' : colors.text, fontWeight: selectedCategory === cat ? '700' : '500' }}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  {LOCATION_CATEGORIES.filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase())).length === 0 && (
                    <Text style={{ color: colors.textSecondary, fontSize: 13, fontStyle: 'italic', paddingVertical: 10 }}>
                      Aucune catégorie trouvée
                    </Text>
                  )}
                </ScrollView>
              </View>

              <RNView style={styles.filterSection}>
                <RNView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[styles.filterLabel, { color: colors.textSecondary, marginBottom: 0 }]}>Budget max (par jour)</Text>
                  <Text style={{ 
                    color: colors.primary, 
                    fontWeight: '800', 
                    backgroundColor: colors.primary + '15',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                    fontSize: 13
                  }}>
                    {maxPrice === null || maxPrice >= 1000 ? 'Tous les prix' : `Jusqu'à ${maxPrice}€`}
                  </Text>
                </RNView>
                <CustomSlider
                  min={0}
                  max={1000}
                  step={50}
                  value={maxPrice === null ? 1000 : (maxPrice > 1000 ? 1000 : maxPrice)}
                  onValueChange={(val: number) => setMaxPrice(val >= 1000 ? null : val)}
                  color={colors.primary}
                  colors={colors}
                  isDark={isDark}
                  disabled={false}
                />
              </RNView>

              <RNView style={styles.filterSection}>
                <RNView style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[styles.filterLabel, { color: colors.textSecondary, marginBottom: 0 }]}>Rayon de recherche</Text>
                  <Text style={{ 
                    color: userLocation ? colors.primary : colors.textSecondary, 
                    fontWeight: '800',
                    backgroundColor: (userLocation ? colors.primary : colors.textSecondary) + '15',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                    fontSize: 13
                  }}>
                    {distanceRange === null ? 'Toute la France' : `${distanceRange} km`}
                  </Text>
                </RNView>
                <CustomSlider
                  min={0}
                  max={200}
                  step={10}
                  disabled={!userLocation}
                  value={distanceRange === null ? 0 : distanceRange}
                  onValueChange={(val: number) => setDistanceRange(val === 0 ? null : val)}
                  color={userLocation ? colors.primary : colors.textSecondary}
                  colors={colors}
                  isDark={isDark}
                />
                {!userLocation && (
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: -4, fontStyle: 'italic' }}>
                    Sélectionnez une ville pour activer le rayon.
                  </Text>
                )}
              </RNView>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity 
                onPress={() => {
                  setSelectedCategory(null);
                  setSelectedCity(null);
                  setMaxPrice(null);
                  setDistanceRange(null);
                  setCategorySearch('');
                  setCitySearchQuery('');
                  setCitySuggestions([]);
                }}
                style={styles.resetBtn}
              >
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setShowFilters(false)}
                style={[styles.applyBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: 'white', fontWeight: '700' }}>Appliquer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {isLoading && locations.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : viewMode === 'list' ? (
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LocationCard location={item} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            Platform.OS !== 'web' ? (
              <RefreshControl refreshing={isLoading} onRefresh={refresh} colors={[colors.primary]} />
            ) : undefined
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="map-outline" size={64} color={colors.textSecondary} />
              <StyledText style={StyleSheet.flatten([styles.emptyText, { color: colors.textSecondary }])}>
                {activeFiltersCount > 0 || searchQuery 
                  ? "Aucun lieu ne correspond à vos filtres." 
                  : "Aucun lieu de tournage n'a été publié pour le moment."}
              </StyledText>
            </View>
          }
        />
      ) : (
        <View style={styles.mapContainer}>
          <AppMap
            style={styles.map}
            initialRegion={mapRegion}
            region={mapRegion}
            onRegionChangeComplete={(region: any) => setMapRegion(region)}
          >
            {locations.map((loc) => (
              loc.latitude && loc.longitude && (
                <Marker
                  key={loc.id}
                  coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
                  title={loc.title}
                  description={`${loc.city} - ${loc.price_per_day}€/j`}
                  onCalloutPress={() => router.push(`/locations/${loc.id}`)}
                />
              )
            ))}
          </AppMap>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: '100%',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '700',
    marginLeft: 4,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalScroll: {
    flex: 1,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  autocompleteFix: {
    zIndex: 100,
  },
  categoryTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rangeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  rangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  resetBtn: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtn: {
    flex: 2,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
