import React from "react";
import { StyleSheet, Text, View } from "react-native";

export const Marker = ({ children }: any) => <View>{children}</View>;
export const PROVIDER_DEFAULT = "google";

const AppMap = ({ style, children }: any) => {
  return (
    <View
      style={{
        ...(Array.isArray(style) ? Object.assign({}, ...style) : style),
        ...styles.placeholder,
      }}
    >
      <Text style={styles.text}>
        La carte n'est pas encore disponible sur le Web.
      </Text>
      <Text style={styles.subtext}>
        Les marqueurs ({React.Children.count(children)}) sont chargés en
        mémoire.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#666",
    textAlign: "center",
  },
  subtext: {
    fontSize: 14,
    color: "#888",
    marginTop: 10,
  },
});

export default AppMap;
