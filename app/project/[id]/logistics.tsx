import ClapLoading from "@/components/ClapLoading";
import { GlobalStyles } from "@/constants/Styles";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useGlobalSearchParams, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Types based on our DB schema
type InventoryItem = {
  id: string;
  item_name: string;
  quantity: number;
  status: "pending" | "acquired";
  assigned_to: string | null;
  assignee?: { full_name: string };
};

type BudgetItem = {
  id: string;
  item_name: string;
  category: string;
  estimated_cost: number;
  actual_cost: number;
};

export default function LogisticsScreen() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const insets = useSafeAreaInsets();
  const localParams = useLocalSearchParams();
  const globalParams = useGlobalSearchParams();

  const idValue = localParams.id || globalParams.id;
  const projectId = Array.isArray(idValue) ? idValue[0] : idValue;

  const [activeTab, setActiveTab] = useState<"inventory" | "budget">(
    "inventory",
  );
  const [loading, setLoading] = useState(false);

  // Data
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [budget, setBudget] = useState<BudgetItem[]>([]);

  // Modals
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [editingBudgetItem, setEditingBudgetItem] = useState<BudgetItem | null>(
    null,
  );

  // Form State
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newCostEst, setNewCostEst] = useState("0");
  const [newCostAct, setNewCostAct] = useState("0");
  const [newCategory, setNewCategory] = useState("materiel");

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [projectId, activeTab]),
  );

  async function fetchData() {
    if (!projectId || projectId === "undefined") {
      console.warn("Logistics: No projectId found");
      return;
    }
    setLoading(true);
    try {
      if (activeTab === "inventory") {
        const { data, error } = await supabase
          .from("project_inventory")
          .select(`*, assignee:profiles(full_name)`)
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setInventory(data || []);
      } else {
        const { data, error } = await supabase
          .from("project_budget")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setBudget(data || []);
      }
    } catch (e) {
      console.error("Logistics fetchData error:", e);
    } finally {
      setLoading(false);
    }
  }

  async function addInventoryItem() {
    if (!newItemName.trim() || !projectId) return;
    try {
      const { error } = await supabase.from("project_inventory").insert({
        project_id: projectId,
        item_name: newItemName,
        quantity: parseInt(newItemQty) || 1,
        status: "pending",
      });
      if (error) throw error;
      setInventoryModalVisible(false);
      setNewItemName("");
      setNewItemQty("1");
      fetchData();
    } catch (e) {
      Alert.alert("Erreur", "Ajout impossible");
    }
  }

  async function toggleInventoryStatus(item: InventoryItem) {
    const newStatus = item.status === "pending" ? "acquired" : "pending";
    try {
      await supabase
        .from("project_inventory")
        .update({ status: newStatus })
        .eq("id", item.id);
      fetchData();
    } catch (e) {
      Alert.alert("Erreur", "Mise à jour impossible");
    }
  }

  async function addBudgetItem() {
    if (!newItemName.trim() || !projectId) return;
    try {
      if (editingBudgetItem) {
        const { error } = await supabase
          .from("project_budget")
          .update({
            item_name: newItemName,
            category: newCategory,
            estimated_cost: parseFloat(newCostEst) || 0,
            actual_cost: parseFloat(newCostAct) || 0,
          })
          .eq("id", editingBudgetItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("project_budget").insert({
          project_id: projectId,
          item_name: newItemName,
          category: newCategory,
          estimated_cost: parseFloat(newCostEst) || 0,
          actual_cost: parseFloat(newCostAct) || 0,
        });
        if (error) throw error;
      }

      setBudgetModalVisible(false);
      setEditingBudgetItem(null);
      setNewItemName("");
      setNewCostEst("0");
      setNewCostAct("0");
      fetchData();
    } catch (e) {
      Alert.alert("Erreur", "Action impossible");
    }
  }

  async function deleteBudgetItem(item: BudgetItem) {
    Alert.alert("Supprimer", `Supprimer "${item.item_name}" ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("project_budget")
              .delete()
              .eq("id", item.id);
            if (error) throw error;
            fetchData();
          } catch (e) {
            Alert.alert("Erreur", "Suppression impossible");
          }
        },
      },
    ]);
  }

  function openEditBudget(item: BudgetItem) {
    setEditingBudgetItem(item);
    setNewItemName(item.item_name);
    setNewCategory(item.category);
    setNewCostEst(String(item.estimated_cost || 0));
    setNewCostAct(String(item.actual_cost || 0));
    setBudgetModalVisible(true);
  }

  // Calculate totals
  const totalEstimated = budget.reduce(
    (acc, item) => acc + (item.estimated_cost || 0),
    0,
  );
  const totalActual = budget.reduce(
    (acc, item) => acc + (item.actual_cost || 0),
    0,
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Logistique</Text>
      </View>

      {/* TABS */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "inventory" && styles.activeTab]}
          onPress={() => setActiveTab("inventory")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "inventory" && styles.activeTabText,
            ]}
          >
            Matériel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "budget" && styles.activeTab]}
          onPress={() => setActiveTab("budget")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "budget" && styles.activeTabText,
            ]}
          >
            Budget
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      {loading ? (
        <ClapLoading
          style={{ marginTop: 20 }}
          color={colors.primary}
          size={50}
        />
      ) : activeTab === "inventory" ? (
        <View style={{ flex: 1 }}>
          <FlatList
            data={inventory}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 15 }}
            ListEmptyComponent={
              <Text style={styles.empty}>Aucun matériel listé.</Text>
            }
            renderItem={({ item }) => (
              <View style={[GlobalStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "bold", fontSize: 16, color: colors.text }}>
                      {item.item_name}
                    </Text>
                    <Text style={{ color: colors.text, opacity: 0.6 }}>Qté: {item.quantity}</Text>
                    {item.assignee && (
                      <Text
                        style={{ fontSize: 12, color: colors.primary }}
                      >
                        Assigné à: {item.assignee.full_name}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => toggleInventoryStatus(item)}
                    style={{
                      padding: 5,
                      backgroundColor:
                        item.status === "acquired" 
                          ? (isDark ? "#1b3320" : "#e8f5e9") 
                          : (isDark ? "#332b1b" : "#fff3e0"),
                      borderRadius: 5,
                    }}
                  >
                    <Text
                      style={{
                        color: item.status === "acquired" 
                          ? (isDark ? "#4caf50" : "green") 
                          : (isDark ? "#ff9800" : "orange"),
                        fontWeight: "bold",
                        fontSize: 12,
                      }}
                    >
                      {item.status === "acquired" ? "ACQUIS" : "EN ATTENTE"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
          <TouchableOpacity
            style={styles.fab}
            onPress={() => setInventoryModalVisible(true)}
          >
            <Ionicons name="add" size={30} color="white" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={styles.budgetSummary}>
            <View style={styles.budgetCol}>
              <Text style={styles.budgetLabel}>Estimé</Text>
              <Text style={styles.budgetValue}>{totalEstimated} €</Text>
            </View>
            <View style={styles.budgetCol}>
              <Text style={styles.budgetLabel}>Réel</Text>
              <Text
                style={[
                  styles.budgetValue,
                  { color: totalActual > totalEstimated ? (isDark ? "#ff6b6b" : "red") : (isDark ? "#2ecc71" : "green") },
                ]}
              >
                {totalActual} €
              </Text>
            </View>
          </View>

          <FlatList
            data={budget}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 15 }}
            ListEmptyComponent={
              <Text style={styles.empty}>Aucun budget défini.</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onLongPress={() => deleteBudgetItem(item)}
                onPress={() => openEditBudget(item)}
                activeOpacity={0.7}
                style={[GlobalStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "bold", color: colors.text }}>{item.item_name}</Text>
                    <Text style={{ fontSize: 12, color: colors.text, opacity: 0.5 }}>
                      {item.category}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ color: colors.text }}>Est: {item.estimated_cost} €</Text>
                    <Text
                      style={{
                        fontWeight: "bold",
                        color:
                          (item.actual_cost || 0) > (item.estimated_cost || 0)
                            ? (isDark ? "#ff6b6b" : "red")
                            : (isDark ? "#2ecc71" : "green"),
                      }}
                    >
                      Act: {item.actual_cost} €
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={isDark ? "#444" : "#ccc"}
                    style={{ marginLeft: 10, alignSelf: "center" }}
                  />
                </View>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              setEditingBudgetItem(null);
              setNewItemName("");
              setNewCategory("materiel");
              setNewCostEst("0");
              setNewCostAct("0");
              setBudgetModalVisible(true);
            }}
          >
            <Ionicons name="add" size={30} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL INVENTORY */}
      <Modal visible={inventoryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[GlobalStyles.modalTitle, { color: colors.text }]}>Ajouter Matériel</Text>
            <TextInput
              style={[GlobalStyles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, marginBottom: 10 }]}
              placeholder="Nom de l'objet"
              placeholderTextColor={isDark ? "#999" : "#666"}
              value={newItemName}
              onChangeText={setNewItemName}
            />
            <TextInput
              style={[GlobalStyles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, marginBottom: 10 }]}
              placeholder="Quantité"
              placeholderTextColor={isDark ? "#999" : "#666"}
              value={newItemQty}
              onChangeText={setNewItemQty}
              keyboardType="numeric"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setInventoryModalVisible(false)}>
                <Text style={{ color: colors.danger, marginRight: 20 }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addInventoryItem}>
                <Text
                  style={{ color: colors.primary, fontWeight: "bold" }}
                >
                  Ajouter
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL BUDGET */}
      <Modal
        visible={budgetModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setBudgetModalVisible(false);
          setEditingBudgetItem(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[GlobalStyles.modalTitle, { color: colors.text }]}>
              {editingBudgetItem ? "Modifier Dépense" : "Ajouter Dépense"}
            </Text>
            <TextInput
              style={[GlobalStyles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, marginBottom: 10 }]}
              placeholder="Nom (ex: Location Caméra)"
              placeholderTextColor={isDark ? "#999" : "#666"}
              value={newItemName}
              onChangeText={setNewItemName}
            />
            <TextInput
              style={[GlobalStyles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, marginBottom: 10 }]}
              placeholder="Catégorie (ex: materiel)"
              placeholderTextColor={isDark ? "#999" : "#666"}
              value={newCategory}
              onChangeText={setNewCategory}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Estimé (€)</Text>
                <TextInput
                  style={[GlobalStyles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, marginBottom: 10 }]}
                  value={newCostEst}
                  onChangeText={setNewCostEst}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Réel (€)</Text>
                <TextInput
                  style={[GlobalStyles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, marginBottom: 10 }]}
                  value={newCostAct}
                  onChangeText={setNewCostAct}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setBudgetModalVisible(false);
                  setEditingBudgetItem(null);
                }}
              >
                <Text style={{ color: colors.danger, marginRight: 20 }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addBudgetItem}>
                <Text
                  style={{ color: colors.primary, fontWeight: "bold" }}
                >
                  {editingBudgetItem ? "Enregistrer" : "Ajouter"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundSecondary },

  header: {
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.card,
    elevation: 2,
  },
  tab: {
    flex: 1,
    padding: 15,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontWeight: "600",
    color: isDark ? "#666" : "#999",
  },
  activeTabText: {
    color: colors.primary,
  },
  empty: {
    textAlign: "center",
    marginTop: 50,
    color: isDark ? "#666" : "#999",
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  budgetSummary: {
    flexDirection: "row",
    padding: 20,
    backgroundColor: colors.card,
    marginBottom: 10,
  },
  budgetCol: {
    flex: 1,
    alignItems: "center",
  },
  budgetLabel: {
    fontSize: 12,
    color: isDark ? "#666" : "#999",
    textTransform: "uppercase",
  },
  budgetValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
    color: colors.text,
    opacity: 0.6,
  },
});
