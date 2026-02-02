import AddressAutocomplete from "@/components/AddressAutocomplete";
import Colors from "@/constants/Colors";
import { useUserMode } from "@/hooks/useUserMode";
import { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

type ProjectSet = Database["public"]["Tables"]["project_sets"]["Row"];

const EDIT_TITLES = [
  "Régisseur Général",
  "Directeur de production",
  "Réalisateur",
  "Chef Décorateur",
  "Accessoiriste",
];

const SecureImage = ({ path, style }: { path: string; style: any }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;
    if (path.startsWith("http") || path.startsWith("file:")) {
      setUrl(path);
      return;
    }
    // Fetch signed URL
    const fetchUrl = async () => {
      const { data } = await supabase.storage
        .from("project_files")
        .createSignedUrl(path, 3600);
      if (data?.signedUrl) setUrl(data.signedUrl);
    };
    fetchUrl();
  }, [path]);

  if (!url) return <View style={[style, { backgroundColor: "#eee" }]} />;
  return <Image source={{ uri: url }} style={style} />;
};

export default function SetsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mode } = useUserMode();

  const [loading, setLoading] = useState(true);
  const [sets, setSets] = useState<ProjectSet[]>([]);
  const [accessLevel, setAccessLevel] = useState<"edit" | "read" | "none">(
    "none",
  );
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Modals
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSet, setEditingSet] = useState<ProjectSet | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    if (id) {
      checkPermissions();
      fetchSets();
    }
  }, [id]);

  const checkPermissions = async () => {
    setCheckingAccess(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setAccessLevel("none");
      setCheckingAccess(false);
      return;
    }

    // Check if owner
    const { data: project } = await supabase
      .from("tournages")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (project?.owner_id === user.id) {
      setAccessLevel("edit");
      setCheckingAccess(false);
      return;
    }

    // Check roles
    const { data: roles } = await supabase
      .from("project_roles")
      .select("title, category")
      .eq("tournage_id", id)
      .eq("assigned_profile_id", user.id);

    if (!roles || roles.length === 0) {
      setAccessLevel("none"); // Or read? Defaulting to none if not on team
      setCheckingAccess(false);
      return;
    }

    const isActor = roles.some(
      (r) => r.category === "acteur" || r.title === "Acteur",
    );
    if (isActor) {
      // Explicitly deny actors as per requirement
      setAccessLevel("none");
      setCheckingAccess(false);
      return;
    }

    const canEdit = roles.some((r) => EDIT_TITLES.includes(r.title));
    if (canEdit) {
      setAccessLevel("edit");
    } else {
      // Default to read-only for other crew members (Image, Son, etc.)
      setAccessLevel("read");
    }
    setCheckingAccess(false);
  };

  const fetchSets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_sets")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSets(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Erreur", "Le nom du décor est requis.");
      return;
    }

    const payload = {
      project_id: id,
      name: name.trim(),
      address: address.trim() || null,
      description: description.trim() || null,
      photos: photos.length > 0 ? photos : null,
    };

    let error;
    if (editingSet) {
      const { error: updateError } = await supabase
        .from("project_sets")
        .update(payload)
        .eq("id", editingSet.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from("project_sets")
        .insert(payload);
      error = insertError;
    }

    if (error) {
      Alert.alert("Erreur", "Impossible de sauvegarder le décor.");
      console.error(error);
    } else {
      closeModal();
      fetchSets();
    }
  };

  const handleDelete = async (setId: string) => {
    Alert.alert(
      "Supprimer le décor",
      "Êtes-vous sûr de vouloir supprimer ce décor ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("project_sets")
              .delete()
              .eq("id", setId);
            if (!error) {
              fetchSets();
            } else {
              Alert.alert("Erreur", "Impossible de supprimer le décor.");
            }
          },
        },
      ],
    );
  };

  const openEditModal = (set: ProjectSet) => {
    setEditingSet(set);
    setName(set.name);
    setAddress(set.address || "");
    setDescription(set.description || "");
    setPhotos(set.photos || []);
    setModalVisible(true);
  };

  const openCreateModal = () => {
    setEditingSet(null);
    setName("");
    setAddress("");
    setDescription("");
    setPhotos([]);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingSet(null);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        uploadImage(result.assets[0].uri);
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Impossible d'ouvrir la galerie");
    }
  };

  const uploadImage = async (uri: string) => {
    setImageUploading(true);
    try {
      const fileName = `sets/${Date.now()}_${Math.random()
        .toString(36)
        .substring(7)}.jpg`;
      const filePath = `${id}/${fileName}`;

      let fileBody;

      if (Platform.OS === "web") {
        const response = await fetch(uri);
        fileBody = await response.blob();
      } else {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: "base64",
        });
        fileBody = decode(base64);
      }

      const { error } = await supabase.storage
        .from("project_files")
        .upload(filePath, fileBody, {
          contentType: "image/jpeg",
        });

      if (error) throw error;

      // Add filePath to photos list
      setPhotos([...photos, filePath]);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Erreur", "Échec de l'envoi de l'image: " + e.message);
    } finally {
      setImageUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  if (checkingAccess) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  if (accessLevel === "none") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/project/[id]/spaces/[category]",
                  params: {
                    id: id as string,
                    category: "production",
                    tab: "tools",
                  },
                })
              }
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Décors</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centerContent}>
          <Ionicons name="lock-closed-outline" size={64} color="#ccc" />
          <Text style={styles.accessDeniedText}>
            Accès refusé. Cette page est réservée à l'équipe technique.
          </Text>
        </View>
      </View>
    );
  }

  const renderItem = ({ item }: { item: ProjectSet }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        {accessLevel === "edit" && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              onPress={() => openEditModal(item)}
              style={styles.actionButton}
            >
              <Ionicons name="pencil" size={20} color={Colors.light.tint} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              style={styles.actionButton}
            >
              <Ionicons name="trash-outline" size={20} color="red" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {item.address && (
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.address}</Text>
        </View>
      )}

      {item.description && (
        <Text style={styles.description}>{item.description}</Text>
      )}

      {item.photos && item.photos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photosScroll}
        >
          {item.photos.map((photo, index) => (
            <SecureImage key={index} path={photo} style={styles.setPhoto} />
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {(Platform.OS !== "web" || mode !== "studio") && (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/project/[id]/spaces/[category]",
                  params: {
                    id: id as string,
                    category: "production",
                    tab: "tools",
                  },
                })
              }
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.title}>Décors</Text>

        <View style={styles.headerRight}>
          {accessLevel === "edit" && (
            <TouchableOpacity
              onPress={openCreateModal}
              style={styles.addButton}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={sets}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              Aucun décor ajouté pour le moment.
            </Text>
          ) : null
        }
        refreshing={loading}
        onRefresh={fetchSets}
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSet ? "Modifier le décor" : "Nouveau décor"}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: "80%" }}>
              <Text style={styles.label}>Nom du lieu *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Appartement de Julie"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Adresse</Text>
              <AddressAutocomplete
                value={address}
                onSelect={(selectedAddress) => setAddress(selectedAddress)}
                placeholder="Ex: 12 Rue de la Paix, Paris"
                style={{ marginBottom: 12 }}
              />

              <Text style={styles.label}>Description / Détails</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description technique, accès, contraintes..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Photos</Text>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={pickImage}
                disabled={imageUploading}
              >
                {imageUploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="camera" size={20} color="#fff" />
                )}
                <Text style={styles.uploadButtonText}>
                  {imageUploading ? "Envoi en cours..." : "Ajouter une photo"}
                </Text>
              </TouchableOpacity>

              {photos.length > 0 && (
                <View style={styles.photosList}>
                  {photos.map((p, idx) => (
                    <View key={idx} style={styles.photoItem}>
                      <SecureImage
                        path={p}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 4,
                          backgroundColor: "#eee",
                          marginRight: 10,
                        }}
                      />
                      <Text numberOfLines={1} style={styles.photoUrl}>
                        Photo {idx + 1}
                      </Text>
                      <TouchableOpacity onPress={() => removePhoto(idx)}>
                        <Ionicons name="trash-outline" size={20} color="red" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                {editingSet ? "Mettre à jour" : "Créer"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  uploadButton: {
    flexDirection: "row",
    backgroundColor: Colors.light.tint,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  uploadButtonText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 15,
    paddingTop: Platform.OS === "ios" ? 60 : 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerLeft: {
    width: 45,
    alignItems: "flex-start",
  },
  headerRight: {
    width: 45,
    alignItems: "flex-end",
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  addButton: {
    backgroundColor: Colors.light.tint,
    padding: 8,
    borderRadius: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  accessDeniedText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  cardActions: {
    flexDirection: "row",
  },
  actionButton: {
    padding: 4,
    marginLeft: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 6,
    color: "#444",
    fontSize: 14,
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  photosScroll: {
    flexDirection: "row",
    marginTop: 8,
  },
  setPhoto: {
    width: 100,
    height: 70,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: "#eee",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
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
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
    marginTop: 12,
  },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  photosList: {
    marginTop: 12,
  },
  photoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  photoUrl: {
    flex: 1,
    fontSize: 12,
    color: "#555",
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
    marginBottom: Platform.OS === "ios" ? 20 : 0,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
