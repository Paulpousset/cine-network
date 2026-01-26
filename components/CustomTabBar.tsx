import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import {
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { width } = useWindowDimensions();

  // On Web, if the screen is large enough, the Sidebar is already showing.
  // We hide the bottom tab bar to avoid redundancy.
  if (Platform.OS === "web" && width >= 768) {
    return null;
  }

  return (
    <View
      style={[
        styles.tabBarContainer,
        { backgroundColor: colors.background, borderTopColor: colors.border },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const color = isFocused ? colors.tint : "#999";

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <React.Fragment key={route.key}>
            <TouchableOpacity
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              {options.tabBarIcon?.({ focused: isFocused, color, size: 24 })}
              <Text style={[styles.tabLabel, { color }]}>{options.title}</Text>
            </TouchableOpacity>

            {index < state.routes.length - 1 && (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: colors.tint, opacity: 0.3 },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: "row",
    height: 85,
    alignItems: "center",
    borderTopWidth: 1,
    paddingBottom: 25,
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    fontFamily: "System",
  },
  divider: {
    width: 2,
    height: 24,
    borderRadius: 2,
  },
});
