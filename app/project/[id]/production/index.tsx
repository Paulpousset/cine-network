import Colors from "@/constants/Colors";
import { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import {
    useGlobalSearchParams,
    useLocalSearchParams,
    useRouter,
} from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import AddressAutocomplete from "@/app/components/AddressAutocomplete";

type ShootDay = Database["public"]["Tables"]["shoot_days"]["Row"];
type Scene = Database["public"]["Tables"]["scenes"]["Row"];

type ShootDayWithScenes = ShootDay & {
  scenes: Scene[];
};

const ALLOWED_ROLES = [
  "Réalisateur",
  "1er Assistant Réalisateur",
  "Régisseur Général",
  "Directeur de production",
];

const DAY_TYPES = ['SHOOT', 'SCOUT', 'PREP', 'OFF', 'TRAVEL'];

const Selector = ({
    options,
    value,
    onChange,
  }: {
    options: string[];
    value: string;
    onChange: (val: string) => void;
  }) => (
    <View style={styles.selectorContainer}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[
            styles.selectorOption,
            value === opt && styles.selectorOptionSelected,
          ]}
          onPress={() => onChange(opt)}
        >
          <Text
            style={[
              styles.selectorText,
              value === opt && styles.selectorTextSelected,
            ]}
          >
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

export default function ProductionScreen() {
  const router = useRouter();
  const local = useLocalSearchParams<{ id: string }>();
  const global = useGlobalSearchParams<{ id: string }>();
  const id = local.id || global.id;

  const [shootDays, setShootDays] = useState<ShootDayWithScenes[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form State
  const [date, setDate] = useState("");
  const [callTime, setCallTime] = useState("");
  const [wrapTime, setWrapTime] = useState("");
  const [dayType, setDayType] = useState("SHOOT"); // Default to SHOOT
  const [location, setLocation] = useState(""); // General location name
  const [addressStreet, setAddressStreet] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [parkingInfo, setParkingInfo] = useState("");
  const [lunchTime, setLunchTime] = useState("");
  const [cateringInfo, setCateringInfo] = useState("");
  const [notes, setNotes] = useState("");

  // Pickers visibility
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCallPicker, setShowCallPicker] = useState(false);
  const [showWrapPicker, setShowWrapPicker] = useState(false);
  const [showLunchPicker, setShowLunchPicker] = useState(false);
  
  // Scene Selection State
  const [availableScenes, setAvailableScenes] = useState<Scene[]>([]);
  const [selectedScenes, setSelectedScenes] = useState<string[]>([]);
  const [loadingScenes, setLoadingScenes] = useState(false);

  useEffect(() => {
    console.log("[Production] useEffect triggered with id:", id);
    if (id) {
      checkPermissions();
      fetchShootDays();
    } else {
      console.log("[Production] No ID found, stopping loading");
      setLoading(false);
    }
  }, [id]);

  const checkPermissions = async () => {
    console.log("[Production] checkPermissions starting");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.log("[Production] No user logged in");
      return;
    }
    console.log("[Production] User logged in:", user.id);

    // Check if owner
    const { data: project } = await supabase
      .from("tournages")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (project?.owner_id === user.id) {
      setCanEdit(true);
      return;
    }

    // Check project roles
    const { data: roles } = await supabase
      .from("project_roles")
      .select("title")
      .eq("tournage_id", id)
      .eq("assigned_profile_id", user.id);

    if (roles && roles.length > 0) {
      const hasAllowedRole = roles.some((r) => ALLOWED_ROLES.includes(r.title));
      if (hasAllowedRole) {
        setCanEdit(true);
      }
    }
  };

  const fetchShootDays = async () => {
    console.log("[Production] fetchShootDays starting");
    setLoading(true);
    const { data, error } = await supabase
      .from("shoot_days")
      .select("*, scenes(*)")
      .eq("tournage_id", id)
      .order("date");

    console.log("[Production] fetchShootDays query result:", {
      dataCount: data?.length,
      error,
    });

    if (error) {
      console.error("Error fetching shoot days:", error);
      Alert.alert("Erreur", "Impossible de charger les jours de tournage.");
    } else {
      setShootDays((data as ShootDayWithScenes[]) || []);
    }
    setLoading(false);
    console.log("[Production] fetchShootDays finished, loading set to false");
  };

  const fetchAvailableScenes = async () => {
      setLoadingScenes(true);
      const { data } = await supabase
        .from("scenes")
        .select("*")
        .eq("tournage_id", id)
        .order("scene_number", { ascending: true }); // Numeric string sort might be tricky, but ok for now
      
      setAvailableScenes(data || []);
      setLoadingScenes(false);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate) {
      const formattedDate = selectedDate.toISOString().split('T')[0];
      setDate(formattedDate);
    }
  };

  const onCallTimeChange = (event: any, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
          setShowCallPicker(false);
      }
      if (selectedDate) {
        const hours = selectedDate.getHours().toString().padStart(2, '0');
        const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
        setCallTime(`${hours}:${minutes}`);
      }
  };

  const onWrapTimeChange = (event: any, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
          setShowWrapPicker(false);
      }
      if (selectedDate) {
        const hours = selectedDate.getHours().toString().padStart(2, '0');
        const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
        setWrapTime(`${hours}:${minutes}`);
      }
  };

  const onLunchTimeChange = (event: any, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
          setShowLunchPicker(false);
      }
      if (selectedDate) {
        const hours = selectedDate.getHours().toString().padStart(2, '0');
        const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
        setLunchTime(`${hours}:${minutes}`);
      }
  };

  const openAddModal = () => {
      setModalVisible(true);
      fetchAvailableScenes();
  };

  const handleAddDay = async () => {
    if (!date) {
      Alert.alert("Champs manquants", "La date est requise (YYYY-MM-DD).");
      return;
    }

    // Basic date validation YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      Alert.alert("Format invalide", "La date doit être au format YYYY-MM-DD.");
      return;
    }

    setAdding(true);

    const { data: dayData, error } = await supabase.from("shoot_days").insert({
      tournage_id: id,
      date: date,
      call_time: callTime || null,
      wrap_time: wrapTime || null,
      day_type: dayType,
      location: location || null,
      address_street: addressStreet || null,
      address_city: addressCity || null,
      parking_info: parkingInfo || null,
      lunch_time: lunchTime || null,
      catering_info: cateringInfo || null,
      notes: notes || null,
    }).select().single();

    if (error || !dayData) {
      console.error(error);
      Alert.alert("Erreur", "Impossible d'ajouter le jour de tournage.");
    } else {
      // If scenes were selected, link them
      if (selectedScenes.length > 0) {
          const links = selectedScenes.map((sceneId, index) => ({
              shoot_day_id: dayData.id,
              scene_id: sceneId,
              order_index: index
          }));
          
          const { error: linkError } = await supabase.from('shoot_day_scenes').insert(links);
          if (linkError) console.error("Error linking scenes", linkError);
      }

      setModalVisible(false);
      resetForm();
      fetchShootDays();
    }
    setAdding(false);
  };

  const resetForm = () => {
    setDate("");
    setCallTime("");
    setWrapTime("");
    setDayType("SHOOT");
    setLocation("");
    setAddressStreet("");
    setAddressCity("");
    setParkingInfo("");
    setLunchTime("");
    setCateringInfo("");
    setNotes("");
    setSelectedScenes([]);
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: ShootDayWithScenes;
    index: number;
  }) => {
    const sceneCount = item.scenes?.length || 0;
    const pageCount =
      item.scenes?.reduce((acc, scene) => acc + (scene.script_pages || 0), 0) ||
      0;

    // Safety check for date formatting
    let formattedDate = item.date;
    try {
      formattedDate = new Date(item.date).toLocaleDateString();
    } catch (e) {
      // Keep original string if parsing fails
    }

    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => router.push(`/project/${id}/production/${item.id}`)}
      >
        <View style={styles.itemHeader}>
          <Text style={styles.dayTitle}>
            Jour {index + 1}: {formattedDate}
          </Text>
          {item.call_time && (
            <Text style={styles.callTime}>Pâté: {item.call_time}</Text>
          )}
        </View>
        <Text style={styles.subtext}>
          {sceneCount} séquences - {pageCount} pages
        </Text>
        <View
          style={{
            marginTop: 8,
            flexDirection: "row",
            justifyContent: "flex-end",
          }}
        >
          <Text style={{ color: Colors.light.tint, fontSize: 13 }}>
            Voir détails
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Custom Header since Tabs/Stack header is hidden */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: `/project/${id}/spaces/production`,
                params: { tab: "tools" },
              })
            }
            style={{ marginRight: 15 }}
          >
            <Ionicons name="arrow-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Plan de Travail</Text>
        </View>
        {canEdit && (
          <TouchableOpacity
            onPress={openAddModal}
            style={styles.headerButton}
          >
            <Ionicons name="add-circle" size={32} color={Colors.light.tint} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={Colors.light.tint}
          style={{ marginTop: 20 }}
        />
      ) : (
        <FlatList
          data={shootDays}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucun jour de tournage prévu.</Text>
          }
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un jour de tournage</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Type de journée</Text>
                    <Selector options={DAY_TYPES} value={dayType} onChange={setDayType} />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Date</Text>
                    <TouchableOpacity 
                        style={[styles.input, { justifyContent: 'center' }]} 
                        onPress={() => setShowDatePicker(!showDatePicker)}
                    >
                        <Text style={{ color: date ? Colors.light.text : '#999' }}>
                            {date ? new Date(date).toLocaleDateString('fr-FR') : "Sélectionner une date"}
                        </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={date ? new Date(date) : new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'inline' : 'default'}
                            onChange={onDateChange}
                            textColor={Colors.light.text}
                        />
                    )}
                </View>

                <View style={{flexDirection: 'row', gap: 10}}>
                    <View style={[styles.inputGroup, {flex: 1}]}>
                        <Text style={styles.label}>Pâté (Call)</Text>
                         <TouchableOpacity 
                            style={[styles.input, { justifyContent: 'center' }]} 
                            onPress={() => setShowCallPicker(!showCallPicker)}
                        >
                            <Text style={{ color: callTime ? Colors.light.text : '#999' }}>
                                {callTime || "08:00"}
                            </Text>
                        </TouchableOpacity>
                        {showCallPicker && (
                            <DateTimePicker
                                value={(() => {
                                    const d = new Date();
                                    if(callTime) {
                                        const [h, m] = callTime.split(':');
                                        d.setHours(Number(h));
                                        d.setMinutes(Number(m));
                                    } else {
                                        d.setHours(8); d.setMinutes(0);
                                    }
                                    return d;
                                })()}
                                mode="time"
                                is24Hour={true}
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onCallTimeChange}
                            />
                        )}
                    </View>
                    <View style={[styles.inputGroup, {flex: 1}]}>
                        <Text style={styles.label}>Fin (Wrap)</Text>
                        <TouchableOpacity 
                            style={[styles.input, { justifyContent: 'center' }]} 
                            onPress={() => setShowWrapPicker(!showWrapPicker)}
                        >
                            <Text style={{ color: wrapTime ? Colors.light.text : '#999' }}>
                                {wrapTime || "19:00"}
                            </Text>
                        </TouchableOpacity>
                        {showWrapPicker && (
                            <DateTimePicker
                                value={(() => {
                                    const d = new Date();
                                    if(wrapTime) {
                                        const [h, m] = wrapTime.split(':');
                                        d.setHours(Number(h));
                                        d.setMinutes(Number(m));
                                    } else {
                                        d.setHours(19); d.setMinutes(0);
                                    }
                                    return d;
                                })()}
                                mode="time"
                                is24Hour={true}
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={onWrapTimeChange}
                            />
                        )}
                    </View>
                </View>

                <Text style={styles.sectionHeader}>Logistique</Text>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Lieu principal (Nom)</Text>
                    <TextInput
                        style={styles.input}
                        value={location}
                        onChangeText={setLocation}
                        placeholder="Studio, Extérieur..."
                        placeholderTextColor="#999"
                    />
                </View>
                <View style={[styles.inputGroup, {zIndex: 100}]}>
                    <Text style={styles.label}>Adresse</Text>
                    <AddressAutocomplete 
                        currentValue={addressStreet}
                        onSelect={(addr, lat, lon, city, zip) => {
                            setAddressStreet(addr);
                            if (city) {
                                // If zip is present, maybe append it or just use city
                                setAddressCity(zip ? `${zip} ${city}` : city);
                            }
                        }}
                        placeholder="Rechercher une adresse..."
                    />
                </View>
                 <View style={styles.inputGroup}>
                    <Text style={styles.label}>Ville</Text>
                    <TextInput style={styles.input} value={addressCity} onChangeText={setAddressCity} placeholder="Ville..." placeholderTextColor="#999" />
                </View>
                 <View style={styles.inputGroup}>
                    <Text style={styles.label}>Parking</Text>
                    <TextInput style={styles.input} value={parkingInfo} onChangeText={setParkingInfo} placeholder="Infos parking..." placeholderTextColor="#999" />
                </View>

                <Text style={styles.sectionHeader}>Repas</Text>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Heure Déjeuner</Text>
                     <TouchableOpacity 
                        style={[styles.input, { justifyContent: 'center' }]} 
                        onPress={() => setShowLunchPicker(!showLunchPicker)}
                    >
                        <Text style={{ color: lunchTime ? Colors.light.text : '#999' }}>
                            {lunchTime || "13:00"}
                        </Text>
                    </TouchableOpacity>
                    {showLunchPicker && (
                        <DateTimePicker
                            value={(() => {
                                const d = new Date();
                                if(lunchTime) {
                                    const [h, m] = lunchTime.split(':');
                                    d.setHours(Number(h));
                                    d.setMinutes(Number(m));
                                } else {
                                    d.setHours(13); d.setMinutes(0);
                                }
                                return d;
                            })()}
                            mode="time"
                            is24Hour={true}
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onLunchTimeChange}
                        />
                    )}
                </View>
                 <View style={styles.inputGroup}>
                    <Text style={styles.label}>Infos Traiteur</Text>
                    <TextInput style={styles.input} value={cateringInfo} onChangeText={setCateringInfo} placeholder="Cantine, Resto..." placeholderTextColor="#999" />
                </View>

                {availableScenes.length > 0 && (
                <View>
                    <Text style={styles.sectionHeader}>Dépouillement à tourner ({selectedScenes.length})</Text>
                     <View style={styles.sceneListContainer}>
                     {availableScenes.map(scene => (
                         <TouchableOpacity 
                            key={scene.id} 
                            style={[styles.sceneSelectMap, selectedScenes.includes(scene.id) && styles.sceneSelectMapSelected]}
                            onPress={() => {
                                if(selectedScenes.includes(scene.id)) setSelectedScenes(selectedScenes.filter(id => id !== scene.id));
                                else setSelectedScenes([...selectedScenes, scene.id]);
                            }}
                        >
                             <Text style={[styles.sceneSelectText, selectedScenes.includes(scene.id) && styles.sceneSelectTextSelected]}>
                                 {scene.scene_number} - {scene.slugline}
                             </Text>
                             {selectedScenes.includes(scene.id) && <Ionicons name="checkmark-circle" size={16} color={Colors.light.tint} />}
                         </TouchableOpacity>
                     ))}
                     </View>
                </View>
                )}


                <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                    style={[styles.input, { height: 60, textAlignVertical: "top" }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Notes importantes..."
                    placeholderTextColor="#999"
                    multiline
                />
                </View>

                <TouchableOpacity
                style={[styles.saveButton, adding && styles.disabledButton]}
                onPress={handleAddDay}
                disabled={adding}
                >
                {adding ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.saveButtonText}>Ajouter</Text>
                )}
                </TouchableOpacity>
                <View style={{height: 20}} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60, // Safe Area top padding approx
    paddingBottom: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  headerButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  addButton: {
    marginRight: 10,
  },
  itemContainer: {
    backgroundColor: "white",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  callTime: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  subtext: {
    fontSize: 14,
    color: "#666",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
    fontSize: 16,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    maxHeight: "90%",
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  input: {
    backgroundColor: "#f0f2f5",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: "#333",
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  disabledButton: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5
  },
  // Selector Styles
  selectorContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f3f5",
    borderRadius: 8,
    padding: 4,
    marginBottom: 10
  },
  selectorOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  selectorOptionSelected: {
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  selectorText: {
    fontSize: 13,
    color: "#868e96",
    fontWeight: "500",
  },
  selectorTextSelected: {
    color: Colors.light.tint,
    fontWeight: "600",
  },
  sceneListContainer: {
      backgroundColor: '#f8f9fa',
      borderRadius: 8,
      padding: 10,
      marginBottom: 10
  },
  sceneSelectMap: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
  },
  sceneSelectMapSelected: {
      backgroundColor: 'white'
  },
  sceneSelectText: {
      fontSize: 14,
      color: '#495057'
  },
  sceneSelectTextSelected: {
      color: Colors.light.tint,
      fontWeight: '600'
  }
});
