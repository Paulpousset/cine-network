import HallOfFameScreen from '@/app/hall-of-fame';
import LocationsScreen from '@/app/locations/index';
import { useTheme } from '@/providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';

export default function DiscoverScreen() {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'hall-of-fame' | 'locations'>('hall-of-fame');
  const { width } = useWindowDimensions();
  const isWebLarge = Platform.OS === 'web' && width >= 768;

  const styles = createStyles(colors, isDark);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen 
        options={{ 
          title: "Découvrir",
          headerShown: Platform.OS !== 'web',
        }} 
      />
      
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'hall-of-fame' && styles.activeTab]} 
          onPress={() => setActiveTab('hall-of-fame')}
        >
          <Ionicons 
            name="trophy-outline" 
            size={20} 
            color={activeTab === 'hall-of-fame' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabLabel, { color: activeTab === 'hall-of-fame' ? colors.primary : colors.textSecondary }]}>
            Hall of Fame
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tab, activeTab === 'locations' && styles.activeTab]} 
          onPress={() => setActiveTab('locations')}
        >
          <Ionicons 
            name="map-outline" 
            size={20} 
            color={activeTab === 'locations' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[styles.tabLabel, { color: activeTab === 'locations' ? colors.primary : colors.textSecondary }]}>
            Lieux
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'hall-of-fame' ? (
          <HallOfFameScreen hideHeader={true} />
        ) : (
          <LocationsScreen />
        )}
      </View>
    </View>
  );
}

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    tabBar: {
      flexDirection: 'row',
      height: 50,
      borderBottomWidth: 1,
      backgroundColor: colors.background,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    activeTab: {
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    tabLabel: {
      fontSize: 14,
      fontWeight: '600',
    },
  });
}
