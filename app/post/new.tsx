import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker"; // Optional based on preference
import * as ImagePicker from "expo-image-picker";
import { Stack, router } from "expo-router";
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

import ClapLoading from "@/components/ClapLoading";
import { GlobalStyles } from "@/constants/Styles";
import { supabase } from "@/lib/supabase";
import { postSchema } from "@/schemas/post";

import { useTheme } from "@/providers/ThemeProvider";

export default function NewPostScreen() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [projects, setProjects] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"public" | "connections">(
    "public",
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (userId) {
      fetchMyProjects(userId);
    }
  }, [userId]);

  const fetchMyProjects = async (uid: string) => {
    try {
      // Fetch projects where user is owner or possibly a member?
      // "un de nos tournages" -> implies projects I manage or am part of.
      // For simplicity, let's fetch projects created by user (owner).
      const { data, error } = await supabase
        .from("tournages")
        .select("id, title")
        .eq("owner_id", uid)
        .order("created_at", { ascending: false });

      if (data) {
        setProjects(data);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const fileExt = uri.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Assuming a 'posts' bucket exists, or we use 'images'
      // If it fails, we might need to create the bucket manually in supabase dashboard
      const { error: uploadError } = await supabase.storage
        .from("posts") // Bucket name
        .upload(filePath, arrayBuffer, {
          contentType: blob.type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("posts").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (e) {
      console.error("Upload error", e);
      Alert.alert("Erreur", "Impossible d'uploader l'image.");
      return null;
    }
  };

  const handlePost = async () => {
    // Basic pre-validation for UI (Zod handles the rest)
    if (!content.trim() && !image) {
      Alert.alert("Erreur", "Veuillez ajouter du texte ou une image.");
      return;
    }

    const validation = postSchema.safeParse({ content });
    if (!validation.success) {
      Alert.alert("Erreur", validation.error.issues[0].message);
      return;
    }

    setLoading(true);
    let imageUrl = null;

    if (image) {
      imageUrl = await uploadImage(image);
      if (!imageUrl && image) {
        setLoading(false);
        return; // Failed to upload
      }
    }

    try {
      const { error } = await supabase.from("posts").insert({
        user_id: userId,
        content: content,
        image_url: imageUrl,
        project_id: selectedProjectId === "none" ? null : selectedProjectId,
        visibility: visibility,
      });

      if (error) {
        console.error(error);
        Alert.alert("Erreur", "Impossible de publier.");
      } else {
        Alert.alert("Succès", "Post publié !");
        router.back();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen
        options={{ title: "Nouveau Post", headerBackTitle: "Annuler" }}
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
              <Ionicons name="image" size={24} color={colors.primary} />
              <Text style={styles.actionText}>Ajouter une photo</Text>
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

          <Text style={styles.label}>Lier à un tournage (optionnel)</Text>
          {Platform.OS === "ios" ? (
            // Simple select for iOS visual consistency or just a list
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
            loading && { opacity: 0.7 },
            { marginTop: 20 },
          ]}
          onPress={handlePost}
          disabled={loading}
        >
          {loading ? (
            <ClapLoading color="white" size={24} />
          ) : (
            <Text style={GlobalStyles.buttonText}>Publier</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Simple Custom Picker for iOS if needed, or just use @react-native-picker/picker which renders native wheel
// We will use a simplified approach for iOS by using Actionsheet or just standard Picker which works as wheel
const CustomPicker = ({ items, selectedValue, onValueChange }: any) => {
  // For brevity, using standard Picker which on iOS renders a wheel inline or we can style it.
  // iOS Picker is height-consuming by default.
  // Let's just use the native picker, it's fine.
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

function createStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({
    container: {
      padding: 20,
    },
    input: {
      fontSize: 16,
      color: colors.text,
    },
    imagePreview: {
      marginVertical: 15,
      position: "relative",
    },
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
      borderColor: colors.border,
      paddingVertical: 10,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      padding: 5,
    },
    actionText: {
      marginLeft: 10,
      color: colors.primary,
      fontWeight: "600",
    },
    projectSelect: {
      // marginTop: 20,
    },
    label: {
      fontSize: 14,
      color: colors.text + "80",
      marginBottom: 5,
      fontWeight: "600",
    },
    pickerContainer: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 8,
      overflow: "hidden",
    },
    pickerBorder: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.backgroundSecondary,
    },
    visibilityBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.backgroundSecondary,
      gap: 8,
    },
    visibilityBtnActive: {
      backgroundColor: colors.primary,
    },
    visibilityText: {
      fontWeight: "600",
      color: colors.text + "80",
    },
  });
}
