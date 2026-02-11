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
  View,
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

  const visibleRoutes = state.routes.filter((route) => {
    const { options } = descriptors[route.key];

    // Explicitly hide if href is null or if tabBarButton is set to return null
    if ((options as any).href === null) return false;

    // Safety check for display: none if we use it
    if ((options as any).display === "none") return false;

    return true;
  });

  return (
    <View
      style={[
        styles.tabBarContainer,
        { backgroundColor: colors.background, borderTopColor: colors.border },
      ]}
    >
      {visibleRoutes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused =
          state.index === state.routes.findIndex((r) => r.key === route.key);
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
                    right: "25%",
                    minWidth:
                      typeof options.tabBarBadge === "number" ||
                      typeof options.tabBarBadge === "string"
                        ? 18
                        : 16,
                    height:
                      typeof options.tabBarBadge === "number" ||
                      typeof options.tabBarBadge === "string"
                        ? 18
                        : 16,
                    borderRadius: 9,
                    backgroundColor: Colors[colorScheme ?? "light"].tint,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1.5,
                    borderColor: colors.background,
                    paddingHorizontal: 2,
                  }}
                >
                  {typeof options.tabBarBadge === "number" ||
                  typeof options.tabBarBadge === "string" ? (
                    <Text
                      style={{
                        color: "white",
                        fontSize: 10,
                        fontWeight: "bold",
                      }}
                    >
                      {options.tabBarBadge}
                    </Text>
                  ) : (
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: "white",
                      }}
                    />
                  )}
                </View>
              ) : null}
              <Text style={[styles.tabLabel, { color }]}>{options.title}</Text>
            </Hoverable>

            {index < visibleRoutes.length - 1 && (
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
