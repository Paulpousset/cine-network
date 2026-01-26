import ScreenContainer from "@/components/ScreenContainer";
import Colors from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useManageTeam } from "./useManageTeam";

export default function ManageTeamWeb() {
  const { loading, sections, toggleAdmin } = useManageTeam();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  return (
    <ScreenContainer scrollable={true}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestion de l'Équipe</Text>
        <Text style={styles.subtitle}>
          Gérez les administrateurs par catégorie sur desktop
        </Text>
      </View>

      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.columnHeader, { flex: 2 }]}>Membre</Text>
          <Text style={[styles.columnHeader, { flex: 2 }]}>
            Rôle / Catégorie
          </Text>
          <Text style={[styles.columnHeader, { flex: 1, textAlign: "center" }]}>
            Admin Catégorie
          </Text>
        </View>

        {sections.map((section) => (
          <View key={section.title}>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryText}>{section.title}</Text>
            </View>
            {section.data.map((member: any) => (
              <View key={member.id} style={styles.row}>
                <View style={[styles.cell, { flex: 2 }]}>
                  <Text style={styles.memberName}>
                    {member.assigned_profile?.full_name || "Utilisateur"}
                  </Text>
                  <Text style={styles.username}>
                    @{member.assigned_profile?.username}
                  </Text>
                </View>
                <View style={[styles.cell, { flex: 2 }]}>
                  <Text style={styles.roleTitle}>{member.title}</Text>
                </View>
                <View style={[styles.cell, { flex: 1, alignItems: "center" }]}>
                  <TouchableOpacity
                    onPress={() =>
                      toggleAdmin(member.id, member.is_category_admin)
                    }
                    style={[
                      styles.toggleButton,
                      member.is_category_admin
                        ? styles.toggleOn
                        : styles.toggleOff,
                    ]}
                  >
                    <Ionicons
                      name={
                        member.is_category_admin
                          ? "shield-checkmark"
                          : "shield-outline"
                      }
                      size={20}
                      color={member.is_category_admin ? "white" : "#666"}
                    />
                    <Text
                      style={[
                        styles.toggleText,
                        { color: member.is_category_admin ? "white" : "#666" },
                      ]}
                    >
                      {member.is_category_admin ? "Admin" : "Membre"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#000",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
  },
  tableContainer: {
    padding: 20,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#eee",
    backgroundColor: "#fafafa",
  },
  columnHeader: {
    fontWeight: "bold",
    color: "#333",
    paddingHorizontal: 10,
  },
  categoryRow: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    marginTop: 20,
  },
  categoryText: {
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 12,
    color: "#555",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },
  cell: {
    paddingHorizontal: 10,
  },
  memberName: {
    fontWeight: "600",
    fontSize: 16,
  },
  username: {
    fontSize: 14,
    color: "#888",
  },
  roleTitle: {
    fontSize: 15,
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  toggleOn: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  toggleOff: {
    backgroundColor: "#fff",
  },
  toggleText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "600",
  },
});
