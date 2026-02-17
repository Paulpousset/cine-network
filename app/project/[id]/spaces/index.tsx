import ClapLoading from "@/components/ClapLoading";
import { GlobalStyles } from "@/constants/Styles";
import { ALL_TOOLS } from "@/constants/Tools";
import { useUserMode } from "@/hooks/useUserMode";
import { useTheme } from "@/providers/ThemeProvider";
import { useTutorial } from "@/providers/TutorialProvider";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../../../lib/supabase";

type Channel = {
    id: string;
    name: string;
    type: 'category' | 'custom';
    color?: string;
}

export default function ChatList() {
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const { id } = useGlobalSearchParams();
  const { isTutorialActive, currentStep } = useTutorial();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { mode } = useUserMode();
  const [loading, setLoading] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [debugInfo, setDebugInfo] = useState("");

  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  const getCategoryColor = (category: string) => {
    const mapping: Record<string, string> = {
      general: "#78909C",
      realisateur: "#E91E63",
      acteur: colors.primary,
      image: "#2196F3",
      son: "#FF9800",
      production: "#4CAF50",
      hmc: "#E91E63",
      deco: "#795548",
      post_prod: "#607D8B",
      technicien: "#607D8B",
    };
    return mapping[category] || colors.tint;
  };

  const projectId = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (projectId) {
      setLoading(true);
      fetchChannels();
      if (isOwner) fetchProjectMembers();
    } else {
      setDebugInfo("No Project ID found in params?? ID: " + typeof id);
    }
  }, [projectId, isOwner]);

  async function fetchProjectMembers() {
      const { data } = await supabase.from("project_roles")
        .select("category, assigned_profile:profiles(id, full_name, avatar_url)")
        .eq("tournage_id", projectId)
        .not("assigned_profile_id", "is", null);
      
      if (data) {
          const grouped: Record<string, any[]> = {};
          data.forEach((role: any) => {
              const cat = role.category || "Autre";
              if (!grouped[cat]) grouped[cat] = [];
              
              if (!grouped[cat].some(m => m.id === role.assigned_profile.id)) {
                  grouped[cat].push(role.assigned_profile);
              }
          });
          setProjectMembers(Object.entries(grouped).map(([category, members]) => ({ category, members })));
      }
  }

  async function handleCreateSpace() {
      if (!newSpaceName.trim()) {
          Alert.alert("Erreur", "Veuillez donner un nom à l'espace");
          return;
      }
      setCreating(true);
      try {
          const { data: space, error: spaceError } = await supabase.from("project_custom_spaces" as any).insert({
              project_id: projectId,
              name: newSpaceName.trim(),
              allowed_tools: selectedTools
          }).select().single();

          if (spaceError) throw spaceError;

          if (selectedMembers.length > 0) {
              const memberInserts = selectedMembers.map(pid => ({
                  space_id: space.id,
                  profile_id: pid
              }));
              await supabase.from("project_custom_space_members" as any).insert(memberInserts);
          }

          Alert.alert("Succès", "Espace créé avec succès");
          setIsAddModalVisible(false);
          setNewSpaceName("");
          setSelectedTools([]);
          setSelectedMembers([]);
          fetchChannels();
      } catch (e: any) {
          Alert.alert("Erreur", e.message);
      } finally {
          setCreating(false);
      }
  }

  async function fetchChannels() {
    try {
      setDebugInfo("Fetching... " + projectId);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setDebugInfo("No session found in Supabase Auth");
        return;
      }
      const userId = session.user.id;

      const { data: proj, error: projError } = await supabase
        .from("tournages")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

      if (projError) {
        setDebugInfo(`Proj Error: ${projError.message}`);
        return;
      }

      setProject(proj);
      const userIsOwner =
        proj?.owner_id === userId ||
        (isTutorialActive &&
          proj?.title?.includes("Vitrine") &&
          currentStep?.id?.startsWith("admin"));
      setIsOwner(userIsOwner);

      const { data: roles, error: roleError } = await supabase
        .from("project_roles")
        .select("category, assigned_profile_id")
        .eq("tournage_id", projectId);

      if (roleError) {
        setDebugInfo(`Role Error: ${roleError.message}`);
        setChannels([]);
        return;
      }

      let categories: string[] = [];
      if (userIsOwner) {
        categories = Array.from(new Set(roles.map((r: any) => r.category)));
        categories = ["general", ...categories];
      } else {
        const myRoles = roles.filter((r: any) => r.assigned_profile_id === userId);
        categories = Array.from(new Set(myRoles.map((r: any) => r.category)));

        // Also check native space memberships
        const { data: manualNative } = await supabase
            .from("project_native_space_members" as any)
            .select("category")
            .eq("project_id", projectId)
            .eq("profile_id", userId);
        
        if (manualNative && manualNative.length > 0) {
            manualNative.forEach(m => {
                if (!categories.includes(m.category)) categories.push(m.category);
            });
        }

        if (categories.length > 0) categories = ["general", ...categories];
      }

      const standardChannels: Channel[] = categories.map(cat => ({
          id: cat,
          name: cat === "general" ? "Espace Général" : `Équipe ${cat.toUpperCase()}`,
          type: 'category',
          color: getCategoryColor(cat)
      }));

      // Fetch Custom Spaces
      let customSpacesData: any[] = [];
      if (userIsOwner) {
          const { data } = await supabase.from("project_custom_spaces" as any).select("*").eq("project_id", projectId);
          customSpacesData = data || [];
      } else {
          const { data } = await supabase.from("project_custom_spaces" as any)
            .select("*, project_custom_space_members!inner(profile_id)")
            .eq("project_id", projectId)
            .eq("project_custom_space_members.profile_id", userId);
          customSpacesData = data || [];
      }

      const customChannels: Channel[] = customSpacesData.map(cs => ({
          id: cs.id,
          name: cs.name,
          type: 'custom',
          color: colors.tint
      }));

      setChannels([...standardChannels, ...customChannels]);

    } catch (e: any) {
      setDebugInfo("Exception: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ClapLoading color={colors.primary} size={50} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <View style={styles.projectHeader}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 10,
            alignItems: "center",
          }}
        >
          {(Platform.OS !== "web" || mode !== "studio") && (
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/my-projects")}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: colors.backgroundSecondary,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 20,
                position: "absolute",
                left: 0,
                zIndex: 10,
              }}
            >
              <Ionicons name="home" size={16} color={colors.text} />
              <Text style={{ fontSize: 11, fontWeight: "600", color: colors.text }}>
                Accueil
              </Text>
            </TouchableOpacity>
          )}

          <View
            style={{
              alignItems: "center",
              flex: 1,
            }}
          >
            <Text style={styles.title} numberOfLines={2}>
              {project?.title}
            </Text>
            <Text style={styles.subtitleProject} numberOfLines={1}>
              {project?.type} • {project?.ville || "Lieu non défini"}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              gap: 15,
              alignItems: "center",
              position: "absolute",
              right: 0,
              zIndex: 10,
            }}
          >
            {isOwner && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/project/[id]/settings",
                    params: { id: projectId as string },
                  })
                }
                style={{ padding: 5 }}
              >
                <Ionicons
                  name="settings-outline"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={styles.header}>
        <Text style={styles.subtitle}>
          {isOwner ? "Vue Ensemble" : "Vos équipes"}
        </Text>
        {isOwner && (
            <TouchableOpacity onPress={() => setIsAddModalVisible(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="add-circle-outline" size={20} color={colors.tint} />
                <Text style={{ color: colors.tint, fontWeight: '600' }}>Ajouter un espace</Text>
            </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={channels}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 15 }}
        ListEmptyComponent={
          <View style={{ padding: 20 }}>
            <Text
              style={{
                textAlign: "center",
                color: colors.text + "80",
                marginTop: 30,
              }}
            >
              {isOwner
                ? "Aucun rôle créé pour le moment."
                : "Vous ne faites partie d'aucune équipe."}
            </Text>
            {debugInfo ? (
              <Text
                style={{
                  color:  "#FF4444",
                  marginTop: 10,
                  fontSize: 10,
                  textAlign: "center",
                }}
              >
                {debugInfo}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          return (
            <TouchableOpacity
              style={styles.channelCard}
              onPress={() =>
                router.push({
                  pathname: "/project/[id]/spaces/[category]",
                  params: { id: projectId as string, category: item.id },
                })
              }
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: (item.color || colors.tint) + "20" },
                ]}
              >
                <Ionicons name={item.type === 'custom' ? "people" : "apps"} size={24} color={item.color || colors.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.channelTitle}>
                  {item.name}
                </Text>
                <Text
                  style={{ fontSize: 12, color: colors.text + "80" }}
                >
                  Appuyez pour entrer {item.type === 'custom' ? '• Espace Perso' : ''}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.border}
              />
            </TouchableOpacity>
          );
        }}
      />

      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Créer un nouvel espace</Text>
                    <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                        <Ionicons name="close" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
                    <Text style={styles.label}>Nom de l'espace</Text>
                    <TextInput
                        style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                        placeholder="Ex: Équipe technique B"
                        placeholderTextColor={colors.text + "40"}
                        value={newSpaceName}
                        onChangeText={setNewSpaceName}
                    />

                    <Text style={styles.label}>Choisir les membres</Text>
                    <View style={styles.membersList}>
                        {projectMembers.map(section => (
                            <View key={section.category} style={{ width: '100%', marginBottom: 10 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: colors.tint, textTransform: 'uppercase', marginBottom: 8, opacity: 0.8 }}>
                                    {section.category}
                                </Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {section.members.map(member => (
                                        <TouchableOpacity 
                                            key={member.id} 
                                            style={[
                                                styles.memberItem, 
                                                selectedMembers.includes(member.id) && { backgroundColor: colors.tint + "20", borderColor: colors.tint }
                                            ]}
                                            onPress={() => {
                                                if (selectedMembers.includes(member.id)) {
                                                    setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                                                } else {
                                                    setSelectedMembers([...selectedMembers, member.id]);
                                                }
                                            }}
                                        >
                                            <Text style={[styles.memberName, { color: colors.text }]}>{member.full_name || member.username}</Text>
                                            {selectedMembers.includes(member.id) && <Ionicons name="checkmark-circle" size={16} color={colors.tint} />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ))}
                        {projectMembers.length === 0 && <Text style={{ color: colors.text + "60", fontSize: 12 }}>Aucun membre trouvé dans le projet.</Text>}
                    </View>

                    <Text style={styles.label}>Choisir les outils</Text>
                    <View style={styles.toolsGrid}>
                        {Object.entries(ALL_TOOLS).map(([key, tool]: [string, any]) => (
                            <TouchableOpacity 
                                key={key}
                                style={[
                                    styles.toolItem,
                                    selectedTools.includes(key) && { backgroundColor: tool.bg + "40", borderColor: tool.color }
                                ]}
                                onPress={() => {
                                    if (selectedTools.includes(key)) {
                                        setSelectedTools(selectedTools.filter(k => k !== key));
                                    } else {
                                        setSelectedTools([...selectedTools, key]);
                                    }
                                }}
                            >
                                <Ionicons name={tool.icon} size={20} color={tool.color} />
                                <Text style={[styles.toolName, { color: colors.text }]}>{tool.title}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>

                <TouchableOpacity 
                    style={[styles.createButton, { backgroundColor: colors.tint }]}
                    onPress={handleCreateSpace}
                    disabled={creating}
                >
                    {creating ? <ClapLoading size={20} color="white" /> : <Text style={styles.createButtonText}>Créer l'espace</Text>}
                </TouchableOpacity>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  projectHeader: {
    padding: 15,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text,
    textAlign: "center",
  },
  subtitleProject: {
    fontSize: 12,
    color: colors.text + "80",
    textTransform: "capitalize",
    textAlign: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  subtitle: {
    color: colors.text + "B3", // Equivalent to tabIconDefault roughly
    fontWeight: "600",
  },
  channelCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: colors.card,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    // Shadow
    shadowColor: isDark ? "transparent" : "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  channelTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end'
  },
  modalContent: {
      height: '85%',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20
  },
  modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: 'bold'
  },
  label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text + "80",
      marginBottom: 8,
      marginTop: 15
  },
  input: {
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      fontSize: 16
  },
  membersList: {
      gap: 10
  },
  memberItem: {
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5
  },
  memberName: {
      fontSize: 13
  },
  toolsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 20
  },
  toolItem: {
      width: '48%',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10
  },
  toolName: {
      fontSize: 12,
      fontWeight: '500'
  },
  createButton: {
      padding: 15,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 30
  },
  createButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold'
  }
});
