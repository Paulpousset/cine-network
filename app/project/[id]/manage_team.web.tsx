import ScreenContainer from "@/components/ScreenContainer";
import Colors from "@/constants/Colors";
import { ALL_TOOLS } from "@/constants/Tools";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useManageTeam } from "./useManageTeam";

export default function ManageTeamWeb() {
  const {
    loading,
    sections,
    toggleAdmin,
    categoryPermissions,
    updateCategoryPermissions,
  } = useManageTeam();

  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const openPermissions = (category: string) => {
    setSelectedCategory(category);
    setPermissionModalVisible(true);
  };

  const closePermissions = () => {
    setPermissionModalVisible(false);
    setSelectedCategory(null);
  };

  const toggleTool = (toolId: string) => {
    if (!selectedCategory) return;
    const currentTools = categoryPermissions[selectedCategory] || [];
    let newTools;
    if (currentTools.includes(toolId)) {
      newTools = currentTools.filter((t) => t !== toolId);
    } else {
      newTools = [...currentTools, toolId];
    }
    updateCategoryPermissions(selectedCategory, newTools);
  };

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
              <TouchableOpacity
                style={styles.permissionButton}
                onPress={() => openPermissions(section.title)}
              >
                <Ionicons name="construct-outline" size={16} color="#444" />
                <Text style={styles.permissionButtonText}>
                  Gérer les outils
                </Text>
              </TouchableOpacity>
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

      <Modal
        animationType="fade"
        transparent={true}
        visible={permissionModalVisible}
        onRequestClose={closePermissions}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closePermissions}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Outils autorisés : {selectedCategory}
              </Text>
              <TouchableOpacity onPress={closePermissions}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {Object.values(ALL_TOOLS).map((tool) => {
                const isSelected = (
                  categoryPermissions[selectedCategory!] || []
                ).includes(tool.id);
                return (
                  <View key={tool.id} style={styles.toolRow}>
                    <View style={styles.toolInfo}>
                      <Ionicons
                        name={tool.icon}
                        size={24}
                        color={tool.color}
                        style={{ marginRight: 15 }}
                      />
                      <View>
                        <Text style={styles.toolName}>{tool.title}</Text>
                        <Text style={styles.toolDesc}>{tool.desc}</Text>
                      </View>
                    </View>
                    <Switch
                      value={isSelected}
                      onValueChange={() => toggleTool(tool.id)}
                      trackColor={{ false: "#767577", true: Colors.light.tint }}
                    />
                  </View>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  permissionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  permissionButtonText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#444",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: 500,
    maxWidth: "90%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  modalBody: {
    width: "100%",
  },
  toolRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  toolInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  toolName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  toolDesc: {
    fontSize: 13,
    color: "#666",
  },
});
