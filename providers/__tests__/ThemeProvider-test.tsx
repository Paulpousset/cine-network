/// <reference types="jest" />
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { ThemeProvider, useTheme } from '../ThemeProvider';

// In this test file, we want to use the actual ThemeProvider and useTheme
// But they are mocked globally. We can unmock them for this test.
jest.unmock('../ThemeProvider');

const TestComponent = () => {
  const { accentColor, setAccentColor, isDark, colors } = useTheme();
  return (
    <>
      <Text testID="accent-color">{String(accentColor)}</Text>
      <Text testID="is-dark">{isDark ? 'true' : 'false'}</Text>
      <Text testID="primary-color">{String(colors.primary)}</Text>
      <Pressable testID="change-color" onPress={() => setAccentColor('blue')}>
        <Text>Change to Blue</Text>
      </Pressable>
    </>
  );
};

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('charge les valeurs par défaut au démarrage (violet)', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('accent-color').props.children).toBe('violet');
      expect(getByTestId('primary-color').props.children).toBe('#6C5CE7');
    });
  });

  it('met à jour la couleur d\'accent et sauvegarde dans AsyncStorage', async () => {
    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const button = getByTestId('change-color');
    
    await act(async () => {
      fireEvent.press(button);
    });

    await waitFor(() => {
      expect(getByTestId('accent-color').props.children).toBe('blue');
      expect(getByTestId('primary-color').props.children).toBe('#0984E3');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('user_accent_color', 'blue');
    });
  });

  it('charge les réglages sauvegardés depuis AsyncStorage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'user_accent_color') return Promise.resolve('green');
        if (key === 'user_theme_mode') return Promise.resolve('dark');
        return Promise.resolve(null);
    });

    const { getByTestId } = render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(getByTestId('accent-color').props.children).toBe('green');
      expect(getByTestId('primary-color').props.children).toBe('#55E6C1'); // Dark green
      expect(getByTestId('is-dark').props.children).toBe('true');
    });
  });
});
