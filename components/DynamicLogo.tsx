import { useTheme } from '@/providers/ThemeProvider';
import { Image } from 'expo-image';
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

// Import all SVG logos
import BleuClair from '../images/bleuclair.svg';
import BleuSombre from '../images/bleusombre.svg';
import OrangeClair from '../images/orangeclair.svg';
import OrangeSombre from '../images/orangesombre.svg';
import RougeClair from '../images/rougeclair.svg';
import RougeSombre from '../images/rougesombre.svg';
import VertClair from '../images/vertclair.svg';
import VertSombre from '../images/vertsombre.svg';
import VioletClair from '../images/violetclaire.svg';
import VioletSombre from '../images/violetnocture.svg';

interface LogoProps {
  width?: number | string;
  height?: number | string;
  style?: StyleProp<ViewStyle>;
  color?: string;
}

const LOGOS: Record<string, { light: any; dark: any }> = {
  violet: { light: VioletClair, dark: VioletSombre },
  blue: { light: BleuClair, dark: BleuSombre },
  green: { light: VertClair, dark: VertSombre },
  orange: { light: OrangeClair, dark: OrangeSombre },
  red: { light: RougeClair, dark: RougeSombre },
  pink: { light: RougeClair, dark: RougeSombre },
};

export const DynamicLogo = ({ width = 120, height = 40, style, color }: LogoProps) => {
  const { accentColor, isDark } = useTheme();
  
  const logoSet = LOGOS[accentColor] || LOGOS.violet;
  const rawLogo = isDark ? logoSet.dark : logoSet.light;

  if (!rawLogo) return null;

  // Modern Metro/Expo might wrap the SVG component in a .default property
  // We check for various ways it might be exported to be safe
  const LogoComponent = typeof rawLogo === 'function' 
    ? rawLogo 
    : (rawLogo.default || rawLogo.ReactComponent || rawLogo);

  // If LogoComponent is still an object and not a component, React will crash.
  // We check if it's a valid element type.
  const isValidComponent = 
    typeof LogoComponent === 'function' || 
    (typeof LogoComponent === 'object' && LogoComponent !== null && (LogoComponent.$$typeof || LogoComponent.render));

  if (!isValidComponent) {
    // If it's not a component, it might be an asset object (uri, etc.), a resource ID, or a string URL
    const isAsset = LogoComponent && (
      typeof LogoComponent === 'number' || 
      typeof LogoComponent === 'string' ||
      (typeof LogoComponent === 'object' && (LogoComponent.uri || LogoComponent.src))
    );

    if (isAsset) {
      return (
        <Image 
          source={LogoComponent} 
          style={[{ width, height }, style as any]} 
          contentFit="contain"
          tintColor={color}
        />
      );
    }
    return null;
  }

  return (
    <LogoComponent 
      width={width} 
      height={height} 
      fill={color} 
      style={style}
    />
  );
};

export default DynamicLogo;
