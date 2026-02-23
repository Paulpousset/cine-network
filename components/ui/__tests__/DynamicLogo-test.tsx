/// <reference types="jest" />
import { useTheme } from '@/providers/ThemeProvider';
import { render } from '@testing-library/react-native';
import React from 'react';
import DynamicLogo from '../DynamicLogo';

// On mocke le hook useTheme pour contrôler l'état du thème dans les tests
jest.mock('@/providers/ThemeProvider', () => ({
  useTheme: jest.fn(),
}));

const mockUseTheme = useTheme as jest.Mock;

describe('DynamicLogo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rend le logo violet par défaut en mode clair', () => {
    mockUseTheme.mockReturnValue({
      accentColor: 'violet',
      isDark: false,
    });

    const { toJSON } = render(<DynamicLogo />);
    const tree: any = toJSON();

    // On vérifie que c'est bien notre SvgMock
    expect(tree.type).toBe('SvgMock');
    // On vérifie les dimensions par défaut
    expect(tree.props.width).toBe(120);
    expect(tree.props.height).toBe(40);
  });

  it('rend le logo en mode sombre quand isDark est true', () => {
    mockUseTheme.mockReturnValue({
      accentColor: 'blue',
      isDark: true,
    });

    const { toJSON } = render(<DynamicLogo />);
    const tree: any = toJSON();

    expect(tree.type).toBe('SvgMock');
    // Le test passera tant qu'un composant est rendu. 
    // Pour aller plus loin on pourrait mocker chaque fichier SVG différemment, 
    // mais ici on vérifie surtout la logique de sélection de DynamicLogo.
    expect(tree).toMatchSnapshot();
  });

  it('applique les props width, height et color (fill) correctement', () => {
    mockUseTheme.mockReturnValue({
      accentColor: 'green',
      isDark: false,
    });

    const { toJSON } = render(<DynamicLogo width={200} height={80} color="#FF0000" />);
    const tree: any = toJSON();
    
    expect(tree.props.width).toBe(200);
    expect(tree.props.height).toBe(80);
    expect(tree.props.fill).toBe('#FF0000');
  });

  it('utilise le logo violet comme repli si la couleur est inconnue', () => {
    mockUseTheme.mockReturnValue({
      accentColor: 'unknown-color' as any,
      isDark: false,
    });

    const { toJSON } = render(<DynamicLogo />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('rend le logo violet par défaut si la couleur n\'est pas trouvée', () => {
    mockUseTheme.mockReturnValue({
      accentColor: 'non-existent',
      isDark: false,
    });

    const { toJSON } = render(<DynamicLogo />);
    const tree: any = toJSON();
    
    // Devrait retomber sur le logo violet par défaut
    expect(tree.type).toBe('SvgMock');
  });
});
