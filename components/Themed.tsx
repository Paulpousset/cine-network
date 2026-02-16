/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import { Text as DefaultText, View as DefaultView, StyleSheet } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof ReturnType<typeof useTheme>['colors']
) {
  const { colors, isDark } = useTheme();
  const theme = isDark ? 'dark' : 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    // @ts-ignore
    return colors[colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const { colors } = useTheme();
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <DefaultText
      style={StyleSheet.flatten([{ color: color || colors.text }, style])}
      {...otherProps}
    />
  );
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const { colors } = useTheme();
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return (
    <DefaultView
      style={StyleSheet.flatten([
        { backgroundColor: backgroundColor || colors.background },
        style,
      ])}
      {...otherProps}
    />
  );
}
