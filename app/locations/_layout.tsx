import { useTheme } from '@/providers/ThemeProvider';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function LocationsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: Platform.OS !== 'web',
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.tint,
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerBackTitle: 'Retour',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Marché des Lieux',
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'Publier un lieu',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Détails du lieu',
        }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{
          title: 'Modifier le lieu',
        }}
      />
    </Stack>
  );
}
