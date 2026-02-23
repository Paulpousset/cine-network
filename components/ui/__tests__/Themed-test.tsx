/// <reference types="jest" />
import { useTheme } from '@/providers/ThemeProvider';
import { render } from '@testing-library/react-native';
import React from 'react';
import { Text, View, useThemeColor } from '../Themed';

jest.mock('@/providers/ThemeProvider', () => ({
  useTheme: jest.fn(),
}));

const mockUseTheme = useTheme as jest.Mock;

describe('Themed Components', () => {
  const mockColors = {
    light: { text: '#000000', background: '#FFFFFF' },
    dark: { text: '#FFFFFF', background: '#000000' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useThemeColor', () => {
    it('retourne la couleur du thème clair par défaut', () => {
      mockUseTheme.mockReturnValue({
        colors: mockColors.light,
        isDark: false,
      });

      const color = useThemeColor({}, 'text');
      expect(color).toBe('#000000');
    });

    it('retourne la couleur du thème sombre quand isDark est true', () => {
      mockUseTheme.mockReturnValue({
        colors: mockColors.dark,
        isDark: true,
      });

      const color = useThemeColor({}, 'text');
      expect(color).toBe('#FFFFFF');
    });

    it('priorise la couleur passée en prop (lightColor)', () => {
      mockUseTheme.mockReturnValue({
        colors: mockColors.light,
        isDark: false,
      });

      const color = useThemeColor({ light: 'red' }, 'text');
      expect(color).toBe('red');
    });
  });

  describe('Text', () => {
    it('rend un texte avec la couleur correcte du thème', () => {
      mockUseTheme.mockReturnValue({
        colors: mockColors.light,
        isDark: false,
      });

      const { getByText } = render(<Text>Hello</Text>);
      const textElement = getByText('Hello');
      expect(textElement.props.style).toContainEqual({ color: '#000000' });
    });
  });

  describe('View', () => {
    it('rend une vue avec la couleur de fond correcte du thème', () => {
      mockUseTheme.mockReturnValue({
        colors: mockColors.dark,
        isDark: true,
      });

      const { getByTestId } = render(<View testID="themed-view" />);
      const viewElement = getByTestId('themed-view');
      expect(viewElement.props.style).toContainEqual({ backgroundColor: '#000000' });
    });
  });
});
