import Colors, { updateGlobalColors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

export type AccentColor = 'violet' | 'blue' | 'green' | 'orange' | 'pink' | 'red';

export const ACCENT_COLORS: Record<AccentColor, { light: string; dark: string }> = {
  violet: { light: '#6C5CE7', dark: '#A29BFE' },
  blue: { light: '#0984E3', dark: '#74B9FF' },
  green: { light: '#00B894', dark: '#55E6C1' },
  orange: { light: '#E17055', dark: '#FAB1A0' },
  pink: { light: '#D63031', dark: '#FF7675' },
  red: { light: '#D63031', dark: '#FF7675' }, // Matching pink for now as base
};

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  accentColor: AccentColor;
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
  colors: typeof Colors.light;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [accentColor, setAccentColorState] = useState<AccentColor>('violet');

  useEffect(() => {
    // Load saved preferences
    const loadSettings = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('user_theme_mode');
        const savedAccent = await AsyncStorage.getItem('user_accent_color');
        
        if (savedMode) setThemeModeState(savedMode as ThemeMode);
        if (savedAccent) setAccentColorState(savedAccent as AccentColor);
      } catch (e) {
        console.error('Error loading theme settings:', e);
      }
    };
    loadSettings();
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem('user_theme_mode', mode);
    } catch (e) {
      console.error('Error saving theme mode:', e);
    }
  };

  const setAccentColor = async (color: AccentColor) => {
    setAccentColorState(color);
    try {
      await AsyncStorage.setItem('user_accent_color', color);
    } catch (e) {
      console.error('Error saving accent color:', e);
    }
  };

  const isDark = themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const activeBaseTheme = isDark ? Colors.dark : Colors.light;
  const activeAccent = isDark ? ACCENT_COLORS[accentColor].dark : ACCENT_COLORS[accentColor].light;

  useEffect(() => {
    // Sync global Colors constant for non-hook components/navigation
    updateGlobalColors({
      light: {
        tint: ACCENT_COLORS[accentColor].light,
        primary: ACCENT_COLORS[accentColor].light,
        tabIconSelected: ACCENT_COLORS[accentColor].light,
      },
      dark: {
        tint: ACCENT_COLORS[accentColor].dark,
        primary: ACCENT_COLORS[accentColor].dark,
        tabIconSelected: ACCENT_COLORS[accentColor].dark,
      }
    });
  }, [accentColor]);

  const colors = {
    ...activeBaseTheme,
    tint: activeAccent,
    primary: activeAccent,
    tabIconSelected: activeAccent,
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        accentColor,
        setThemeMode,
        setAccentColor,
        colors,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
