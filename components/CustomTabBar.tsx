import { Hoverable } from "@/components/Hoverable";
import { useColorScheme } from "@/components/useColorScheme";
import Colors from "@/constants/Colors";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import {
    Platform,
    StyleSheet,
    Text,
    useWindowDimensions,
    View
} from "react-native";

export default function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
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
            <Hoverable
              onPress={onPress}
              style={styles.tabItem}
              hoverStyle={{
                backgroundColor: colors.backgroundSecondary + "80",
                opacity: 0.8,
              }}
            >
              {options.tabBarIcon?.({ focused: isFocused, color, size: 24 })}
              {options.tabBarBadge ? (
                <View
                  style={{
                    position: "absolute",
                    top: 5,
                    right: "30%",
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: Colors[colorScheme ?? "light"].tint,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1.5,
                    borderColor: colors.background,
                  }}
                >
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "white",
                    }}
                  />
                </View>
              ) : null}
              <Text style={[styles.tabLabel, { color }]}>{options.title}</Text>
            </Hoverable>

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
