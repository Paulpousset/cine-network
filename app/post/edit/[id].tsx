import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { Stack, router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import Colors from "@/constants/Colors";
import { GlobalStyles } from "@/constants/Styles";
import { supabase } from "@/lib/supabase";

export default function EditPostScreen() {
  const { id } = useLocalSearchParams();
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [visibility, setVisibility] = useState<"public" | "connections">(
    "public",
  );

  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        fetchPostDetails(id as string, user.id);
        fetchMyProjects(user.id);
      } else {
        Alert.alert("Erreur", "Vous devez être connecté.");
        router.back();
      }
    });
  }, [id]);

  const fetchPostDetails = async (postId: string, currentUserId: string) => {
    try {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .single();

      if (error) throw error;

      if (data.user_id !== currentUserId) {
        Alert.alert("Erreur", "Vous ne pouvez pas modifier ce post.");
        router.back();
        return;
      }

      setContent(data.content || "");
      setImage(data.image_url);
      setSelectedProjectId(data.project_id || "none");
      setVisibility(data.visibility || "public");
      setLoading(false);
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Impossible de charger le post.");
      router.back();
    }
  };

  const fetchMyProjects = async (uid: string) => {
    try {
      const { data } = await supabase
        .from("tournages")
        .select("id, title")
        .eq("owner_id", uid)
        .order("created_at", { ascending: false });

      if (data) setProjects(data);
    } catch (e) {
      console.log(e);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    // If it's already an http url, it's already uploaded (or preserved)
    if (uri.startsWith("http")) return uri;

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const fileExt = uri.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("posts")
        .upload(filePath, arrayBuffer, {
          contentType: blob.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("posts").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (e) {
      console.error("Upload error", e);
      return null;
    }
  };

  const handleUpdate = async () => {
    if (!content.trim() && !image) {
      Alert.alert("Erreur", "Le post ne peut pas être vide.");
      return;
    }

    setSaving(true);
    let imageUrl = image;

    if (image && !image.startsWith("http")) {
      const uploaded = await uploadImage(image);
      if (uploaded) imageUrl = uploaded;
      else {
        setSaving(false);
        Alert.alert("Erreur", "Échec de l'upload de l'image.");
        return;
      }
    }

    try {
      const { error } = await supabase
        .from("posts")
        .update({
          content: content,
          image_url: imageUrl,
          project_id: selectedProjectId === "none" ? null : selectedProjectId,
          visibility: visibility,
        })
        .eq("id", id);

      if (error) throw error;

      Alert.alert("Succès", "Post mis à jour !");
      router.back();
    } catch (e) {
      console.error(e);
      Alert.alert("Erreur", "Impossible de mettre à jour.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ClapLoading size={50} color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.light.backgroundSecondary }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{ title: "Modifier le post", headerBackTitle: "Annuler" }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={GlobalStyles.card}>
          <TextInput
            style={[styles.input, { minHeight: 100 }]}
            placeholder="Quoi de neuf ?"
            multiline
            value={content}
            onChangeText={setContent}
            textAlignVertical="top"
            placeholderTextColor="#999"
          />

          {image && (
            <View style={styles.imagePreview}>
              <Image
                source={{ uri: image }}
                style={{ width: "100%", height: 200, borderRadius: 8 }}
              />
              <TouchableOpacity
                style={styles.removeImage}
                onPress={() => setImage(null)}
              >
                <Ionicons name="close-circle" size={24} color="white" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={pickImage}>
              <Ionicons name="image" size={24} color={Colors.light.tint} />
              <Text style={styles.actionText}>Changer / Ajouter une photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[GlobalStyles.card, styles.projectSelect]}>
          <Text style={styles.label}>Visibilité du post</Text>
          <View style={{ flexDirection: "row", gap: 15, marginBottom: 20 }}>
            <TouchableOpacity
              style={[
                styles.visibilityBtn,
                visibility === "public" && styles.visibilityBtnActive,
              ]}
              onPress={() => setVisibility("public")}
            >
              <Ionicons
                name="earth"
                size={20}
                color={visibility === "public" ? "white" : "#666"}
              />
              <Text
                style={[
                  styles.visibilityText,
                  visibility === "public" && { color: "white" },
                ]}
              >
                Public
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.visibilityBtn,
                visibility === "connections" && styles.visibilityBtnActive,
              ]}
              onPress={() => setVisibility("connections")}
            >
              <Ionicons
                name="people"
                size={20}
                color={visibility === "connections" ? "white" : "#666"}
              />
              <Text
                style={[
                  styles.visibilityText,
                  visibility === "connections" && { color: "white" },
                ]}
              >
                Mon Réseau
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Lier à un tournage</Text>
          {Platform.OS === "ios" ? (
            <View style={styles.pickerContainer}>
              <CustomPicker
                items={[{ id: "none", title: "Aucun" }, ...projects]}
                selectedValue={selectedProjectId || "none"}
                onValueChange={setSelectedProjectId}
              />
            </View>
          ) : (
            <View style={styles.pickerBorder}>
              <Picker
                selectedValue={selectedProjectId || "none"}
                onValueChange={(itemValue) => setSelectedProjectId(itemValue)}
              >
                <Picker.Item label="Aucun projet lié" value="none" />
                {projects.map((p) => (
                  <Picker.Item key={p.id} label={p.title} value={p.id} />
                ))}
              </Picker>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            GlobalStyles.primaryButton,
            saving && { opacity: 0.7 },
            { marginTop: 20 },
          ]}
          onPress={handleUpdate}
          disabled={saving}
        >
          {saving ? (
            <ClapLoading color="white" size={24} />
          ) : (
            <Text style={GlobalStyles.buttonText}>Enregistrer</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const CustomPicker = ({ items, selectedValue, onValueChange }: any) => {
  return (
    <Picker
      selectedValue={selectedValue}
      onValueChange={onValueChange}
      itemStyle={{ height: 120 }}
    >
      {items.map((p: any) => (
        <Picker.Item key={p.id} label={p.title} value={p.id} />
      ))}
    </Picker>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  input: { fontSize: 16, color: Colors.light.text },
  imagePreview: { marginVertical: 15, position: "relative" },
  removeImage: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
  },
  actions: {
    flexDirection: "row",
    marginVertical: 10,
    borderTopWidth: 1,
    borderColor: Colors.light.border,
    paddingVertical: 10,
  },
  actionButton: { flexDirection: "row", alignItems: "center", padding: 5 },
  actionText: { marginLeft: 10, color: Colors.light.tint, fontWeight: "600" },
  projectSelect: {
    // marginTop: 20
  },
  label: { fontSize: 14, color: "#666", marginBottom: 5, fontWeight: "600" },
  pickerContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    overflow: "hidden",
  },
  pickerBorder: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  visibilityBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    gap: 8,
  },
  visibilityBtnActive: {
    backgroundColor: Colors.light.tint,
  },
  visibilityText: {
    fontWeight: "600",
    color: "#666",
  },
});
