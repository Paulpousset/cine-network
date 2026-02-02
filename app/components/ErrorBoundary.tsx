import React from "react";
import { StyleSheet, Text, View } from "react-native";

let crashlytics: any;
try {
  crashlytics = require("@react-native-firebase/crashlytics").default;
} catch (e) {
  // Firebase not available
}

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error);
    try {
      if (crashlytics) {
        crashlytics().recordError(error);
      }
    } catch (e) {
      // Ignorer si Crashlytics n'est pas disponible (ex: Web ou Native module non lié)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Une erreur est survenue</Text>
          <Text style={styles.message}>
            {this.state.error?.message || "Erreur de rendu"}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff5f5",
  },
  title: { fontWeight: "bold", fontSize: 18, marginBottom: 8 },
  message: { color: "#d6336c", textAlign: "center" },
});
