const tintColorLight = '#6C5CE7'; // Violet Électrique (Creative)
const tintColorDark = '#A29BFE';

const Colors = {
  light: {
    text: '#1F2937', // Gris très foncé (presque noir) pour la lisibilité (Minimal)
    background: '#FFFFFF', // Blanc pur (Minimal)
    backgroundSecondary: '#F9FAFB', // Gris très très léger pour les zones de contenu
    tint: tintColorLight,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
    border: '#E5E7EB', // Gris clair pour les séparations fines (Minimal)
    textSecondary: '#6B7280', // Text gris moyen
    primary: '#6C5CE7', // Violet principal
    secondary: '#00D2D3', // Teal pour les accents
    danger: '#FF6B6B',
    success: '#1DD1A1',
    card: '#FFFFFF',
    shadow: '#000000',
  },
  dark: {
    text: '#F9FAFB',
    background: '#111827', // Gris très foncé (pas noir pur)
    backgroundSecondary: '#1F2937',
    tint: tintColorDark,
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorDark,
    border: '#374151',
    textSecondary: '#9CA3AF',
    primary: '#A29BFE',
    secondary: '#81ECEC',
    danger: '#FF8787',
    success: '#55E6C1',
    card: '#1F2937',
    shadow: '#000000',
  },
};

export default Colors;

export function updateGlobalColors(newColors: any) {
  if (newColors.light) {
    Object.assign(Colors.light, newColors.light);
  }
  if (newColors.dark) {
    Object.assign(Colors.dark, newColors.dark);
  }
}
