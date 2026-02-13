import ClapLoading from "@/components/ClapLoading";
import { GlobalStyles } from "@/constants/Styles";
import { ALL_TOOLS } from "@/constants/Tools";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  SectionList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useManageTeam } from "./useManageTeam";

export default function ManageTeam() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const {
    loading,
    sections,
    toggleAdmin,
    router,
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
      <View style={styles.container}>
        <ClapLoading
          size={50}
          color={colors.tint}
          style={{ marginTop: 50 }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/my-projects")}
          style={styles.backButton}
        >
          <Ionicons name="home" size={18} color={colors.text} />
          <Text style={styles.backButtonText}>Accueil</Text>
        </TouchableOpacity>
        <Text style={[GlobalStyles.title2, { color: colors.text }]}>Gérer les Admins</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.subtitle}>
        Activez l'option "Admin" pour permettre à un membre de gérer les
        événements de sa catégorie.
      </Text>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 50 }}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
            <TouchableOpacity
              onPress={() => openPermissions(title)}
              style={styles.permissionsLink}
            >
              <Ionicons name="settings-outline" size={16} color={colors.text} />
              <Text style={styles.permissionsLinkText}>Gérer les outils</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={[GlobalStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {item.assigned_profile?.full_name ||
                  item.assigned_profile?.username}
              </Text>
              <Text style={styles.role}>{item.title}</Text>
            </View>

            <View style={{ alignItems: "center" }}>
              <Text style={styles.switchLabel}>Admin</Text>
              <Switch
                value={item.is_category_admin}
                onValueChange={() =>
                  toggleAdmin(item.id, item.is_category_admin)
                }
                trackColor={{ false: "#767577", true: colors.tint }}
                thumbColor={
                  item.is_category_admin ? "white" : "#f4f3f4"
                }
              />
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Aucun membre assigné pour le moment.
          </Text>
        }
      />
      <Modal
        animationType="slide"
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
                <Ionicons name="close" size={24} color={colors.text} />
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
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.toolName}>{tool.title}</Text>
                        <Text style={styles.toolDesc}>{tool.desc}</Text>
                      </View>
                    </View>
                    <Switch
                      value={isSelected}
                      onValueChange={() => toggleTool(tool.id)}
                      trackColor={{ false: "#767577", true: colors.tint }}
                    />
                  </View>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}



function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    padding: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    marginTop: 30,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  subtitle: {
    color: colors.text,
    opacity: 0.6,
    marginBottom: 20,
    fontSize: 14,
    fontStyle: "italic",
  },
  sectionHeader: {
    backgroundColor: colors.backgroundSecondary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 15,
    borderRadius: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontWeight: "bold",
    color: colors.text,
    opacity: 0.8,
    fontSize: 14,
  },
  permissionsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  permissionsLinkText: {
    fontSize: 12,
    color: colors.text,
    opacity: 0.6,
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
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
    borderBottomColor: colors.border,
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
    color: colors.text,
  },
  toolDesc: {
    fontSize: 12,
    color: colors.text,
    opacity: 0.6,
  },
  name: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 4,
    color: colors.text,
  },
  role: { color: colors.text, opacity: 0.6, fontSize: 14 },
  switchLabel: { fontSize: 10, color: colors.text, opacity: 0.5, marginBottom: 2 },
  emptyText: { textAlign: "center", marginTop: 30, color: colors.text, opacity: 0.6 },
  });
}
