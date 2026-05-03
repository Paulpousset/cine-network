import WebDatePicker from "@/components/common/WebDatePicker";
import ClapLoading from "@/components/ui/ClapLoading";
import { GlobalStyles } from "@/constants/Styles";
import { useAlert } from "@/providers/ModalProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { Logger } from "@/services/LoggerService";
import { NotificationService } from "@/services/NotificationService";
import { JOB_TITLES } from "@/utils/roles";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";
import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import AddressAutocomplete from "../components/AddressAutocomplete";
import CityPicker from "../components/CityPicker";
import CountryPicker from "../components/CountryPicker";

const PROJECT_TYPES = [
  { value: "court_metrage", label: "Court-métrage" },
  { value: "long_metrage", label: "Long-métrage" },
  { value: "serie", label: "Série" },
  { value: "clip", label: "Clip" },
  { value: "publicite", label: "Pub" },
  { value: "documentaire", label: "Docu" },
  { value: "etudiant", label: "Étudiant" },
];

const ESTIMATED_DURATIONS = [
  { value: "less_than_10", label: "< 10 min" },
  { value: "10_30", label: "10-30 min" },
  { value: "30_60", label: "30-60 min" },
  { value: "long_metrage", label: "Long métrage" },
];

const PRODUCTION_TYPES = [
  { value: "recherche", label: "En recherche" },
  { value: "societe", label: "Oui (Société)" },
  { value: "non", label: "Non" },
];

const SCENARIO_VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "invitation", label: "Sur invitation" },
  { value: "productions", label: "Productions" },
  { value: "network", label: "Réseau" },
];

const CreationHeader = ({ step, onBack, onClose, title }: { step: number; onBack?: () => void; onClose: () => void; title: string }) => {
  const { colors } = useTheme();
  return (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      paddingHorizontal: 16, 
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.backgroundSecondary
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={{ marginRight: 12 }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>{title}</Text>
          <Text style={{ fontSize: 12, color: colors.text + '80' }}>Étape {step} sur 3</Text>
        </View>
      </View>
      
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 16 }}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={{
              width: s === step ? 16 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: s <= step ? colors.primary : colors.text + '20'
            }}
          />
        ))}
      </View>

      <TouchableOpacity onPress={onClose}>
        <Ionicons name="close-circle" size={24} color={colors.text + '40'} />
      </TouchableOpacity>
    </View>
  );
};

export default function CreateTournage() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);

  const [step, setStep] = useState(1);
  const [activeStep3Filter, setActiveStep3Filter] = useState<string>("Tous");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [types, setTypes] = useState<string[]>(["court_metrage"]);
  const [productionCompany, setProductionCompany] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("less_than_10");
  const [productionType, setProductionType] = useState<string>("recherche");
  const [schoolName, setSchoolName] = useState("");
  const [shootingCities, setShootingCities] = useState<string[]>([]);
  const [scenarioUrl, setScenarioUrl] = useState<string | null>(null);
  const [scenarioVisibility, setScenarioVisibility] = useState<string>("public");
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);
  
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [coords, setCoords] = useState<{
    lat: number | null;
    lon: number | null;
  }>({
    lat: null,
    lon: null,
  });
  const [creating, setCreating] = useState(false);
  const [uploadingScenario, setUploadingScenario] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  
  const [searchCollaborator, setSearchCollaborator] = useState("");
  const [collaboratorSuggestions, setCollaboratorSuggestions] = useState<any[]>([]);
  const [searchingCollaborators, setSearchingCollaborators] = useState(false);
  const [selectedCollaborators, setSelectedCollaborators] = useState<any[]>([]);
  const [createAutoSpaces, setCreateAutoSpaces] = useState(true);

  // Production search
  const [searchProductionQuery, setSearchProductionQuery] = useState("");
  const [productionSuggestions, setProductionSuggestions] = useState<any[]>([]);
  const [searchingProduction, setSearchingProduction] = useState(false);
  const [selectedProduction, setSelectedProduction] = useState<any | null>(null);

  // Profile Picker for Roles (Step 3)
  const [roleSearchId, setRoleSearchId] = useState<string | null>(null);
  const [roleSearchResults, setRoleSearchResults] = useState<any[]>([]);
  const [searchingRoleProfiles, setSearchingRoleProfiles] = useState(false);

  // Subscription Restriction
  const [canCreate, setCanCreate] = useState(true);

  type Category = keyof typeof JOB_TITLES;
  type SelectedRole = { 
    category: Category; 
    title: string; 
    quantity: number; 
    description?: string;
    assignees?: { id: string; label: string; avatar_url?: string }[];
  };
  const [selected, setSelected] = useState<Record<string, SelectedRole>>({});
  const [activeCategory, setActiveCategory] = useState<Category | "Tous">("Tous");
  const [activeSelectedCategory, setActiveSelectedCategory] = useState<Category | "Tous">("Tous");

  function roleKey(category: string, title: string) {
    return `${category}|${title}`;
  }

  useEffect(() => {
    checkSubscriptionLimits();
  }, []);

  async function checkSubscriptionLimits() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", session.user.id)
        .single();

      const tier = profile?.subscription_tier || "free";

      if (tier === "studio") {
        setCanCreate(true);
        return;
      }

      const { count, error } = await supabase
        .from("tournages")
        .select("*", { count: "exact", head: true })
        .eq("owner_id", session.user.id);

      if (error) throw error;

      if ((count || 0) >= 1) {
        setCanCreate(false);
        showAlert({
          title: "Limite atteinte",
          message: "Vous avez atteint la limite de 1 projet actif avec le plan Gratuit.",
          confirmLabel: "Devenir membre Studio (Gratuit)",
          onConfirm: handleUpgradeSuccess,
          onCancel: () => router.back(),
        });
      }
    } catch (e) {
      console.log("Error checking limits:", e);
    }
  }

  async function handleUpgradeSuccess() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      await supabase
        .from("profiles")
        .update({ 
          subscription_tier: "studio",
          updated_at: new Date().toISOString()
        })
        .eq("id", session.user.id);

      setCanCreate(true);
      showAlert({
        title: "Félicitations !",
        message: "Vous pouvez maintenant créer des projets illimités.",
        onConfirm: () => {},
      });
    } catch (e) {
      showAlert({
        title: "Erreur",
        message: "Mise à jour échouée.",
        onConfirm: () => {},
      });
    }
  }

  async function pickScenario() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (res.canceled) return;

      const file = res.assets[0];
      
      // Limit to 15MB for scenarios
      const MAX_FILE_SIZE = 15 * 1024 * 1024;
      if (file.size && file.size > MAX_FILE_SIZE) {
        showAlert({
          title: "Fichier trop volumineux",
          message: "Le scénario ne doit pas dépasser 15 Mo.",
          onConfirm: () => {},
        });
        return;
      }

      setUploadingScenario(true);
      setScenarioName(file.name);

      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `scenarios/${fileName}`;

      let blob;
      if (Platform.OS === "web") {
        blob = (file as any).file;
      } else {
        const response = await fetch(file.uri);
        blob = await response.blob();
      }

      const { data, error } = await supabase.storage
        .from("project-files")
        .upload(filePath, blob as Blob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("project-files")
        .getPublicUrl(filePath);

      setScenarioUrl(publicUrl);
    } catch (e) {
      showAlert({
        title: "Erreur",
        message: "Upload du scénario échoué.",
        onConfirm: () => {},
      });
      setScenarioName("");
    } finally {
      setUploadingScenario(false);
    }
  }

  async function searchProfiles(text: string) {
    setSearchCollaborator(text);
    if (text.length < 3) {
      setCollaboratorSuggestions([]);
      return;
    }

    try {
      setSearchingCollaborators(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .or(`full_name.ilike.%${text}%,username.ilike.%${text}%`)
        .limit(5);

      if (error) throw error;
      setCollaboratorSuggestions(data || []);
    } catch (e) {
      console.log("Search profiles error:", e);
    } finally {
      setSearchingCollaborators(false);
    }
  }

  async function searchProfilesForRole(text: string, k: string) {
    if (text.length < 3) {
      setRoleSearchResults([]);
      return;
    }

    try {
      setSearchingRoleProfiles(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .or(`full_name.ilike.%${text}%,username.ilike.%${text}%`)
        .limit(5);

      if (error) throw error;
      setRoleSearchResults(data || []);
    } catch (e) {
      console.log("Search profiles error:", e);
    } finally {
      setSearchingRoleProfiles(false);
    }
  }

  function addCollaborator(profile: any) {
    if (!selectedCollaborators.find((c) => c.id === profile.id)) {
      const newCollabs = [...selectedCollaborators, profile];
      setSelectedCollaborators(newCollabs);
      setCollaboratorIds(newCollabs.map((c) => c.id));
    }
    setSearchCollaborator("");
    setCollaboratorSuggestions([]);
  }

  function removeCollaborator(id: string) {
    const newCollabs = selectedCollaborators.filter((c) => c.id !== id);
    setSelectedCollaborators(newCollabs);
    setCollaboratorIds(newCollabs.map((c) => c.id));
  }

  async function searchProductions(text: string) {
    setSearchProductionQuery(text);
    if (text.length < 3) {
      setProductionSuggestions([]);
      return;
    }

    try {
      setSearchingProduction(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .eq("user_role", "societe_production")
        .or(`full_name.ilike.%${text}%,username.ilike.%${text}%`)
        .limit(5);

      if (error) throw error;
      setProductionSuggestions(data || []);
    } catch (e) {
      console.log("Search production error:", e);
    } finally {
      setSearchingProduction(false);
    }
  }

  function selectProduction(profile: any) {
    setSelectedProduction(profile);
    setProductionCompany(profile.full_name || profile.username || "");
    setProductionType("professionnelle");
    setSearchProductionQuery("");
    setProductionSuggestions([]);
  }

  async function getCoordinates(fullAddress: string) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        fullAddress,
      )}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Tita/1.0",
        },
      });
      const data = await res.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon),
        };
      }
    } catch (e) {
      console.log("Geocoding error:", e);
    }
    return null;
  }

  function addRole(category: Category, title: string) {
    if (category.toLowerCase() === "agent") {
      Alert.alert("Action impossible", "Le rôle d'agent ne peut pas être ajouté à un projet de tournage.");
      return;
    }
    setSelected((prev) => {
      const k = roleKey(category, title);
      const cur = prev[k];
      return {
        ...prev,
        [k]: cur
          ? { ...cur, quantity: cur.quantity + 1 }
          : { category, title, quantity: 1, assignees: [] },
      };
    });
  }

  function incRole(k: string) {
    setSelected((prev) => ({
      ...prev,
      [k]: { ...prev[k], quantity: prev[k].quantity + 1 },
    }));
  }

  function decRole(k: string) {
    setSelected((prev) => {
      const next = { ...prev } as Record<string, SelectedRole>;
      const cur = next[k];
      if (!cur) return prev;
      if (cur.quantity <= 1) {
        delete next[k];
      } else {
        next[k] = { ...cur, quantity: cur.quantity - 1 };
      }
      return next;
    });
  }

  async function handleCreate() {
    try {
      setCreating(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");

      let lat = coords.lat;
      let lon = coords.lon;
      const searchParts = [];
      if (address.trim()) searchParts.push(address.trim());
      if (city.trim()) searchParts.push(city.trim());
      if (country.trim()) searchParts.push(country.trim());
      const searchAddress = searchParts.join(", ");

      if (!lat && !lon && searchAddress.trim()) {
        const c = await getCoordinates(searchAddress);
        if (c) {
          lat = c.lat;
          lon = c.lon;
        }
      }

const selectedList = Object.values(selected);
        const uniqueCategories = Array.from(new Set(selectedList.map(r => r.category)));

        const { data, error } = await supabase
          .from("tournages")
          .insert({
            owner_id: session.user.id,
            title: title.trim(),
            description: desc.trim() || null,
            type: (types[0] as any),
            pays: country.trim() || null,
            ville: city.trim() || null,
            address: address.trim() || null,
            latitude: lat ? parseFloat(String(lat)) : null,
            longitude: lon ? parseFloat(String(lon)) : null,
            start_date: startDate || null,
            end_date: endDate || null,
            production_company: productionCompany.trim() || null,
            estimated_duration: estimatedDuration,
            production_type: productionType as any,
            school_name: types.includes("etudiant") ? schoolName.trim() : null,
            shooting_cities: shootingCities.length > 0 ? shootingCities : null,
            scenario_url: scenarioUrl,
            scenario_visibility: scenarioVisibility as any,
            collaborators: null,
            pending_collaborators: (selectedProduction ? [selectedProduction.id, ...collaboratorIds] : collaboratorIds).length > 0 
              ? (selectedProduction ? [selectedProduction.id, ...collaboratorIds] : collaboratorIds) 
              : null,
            active_native_spaces: createAutoSpaces ? uniqueCategories : [],
          })
          .select()
          .single();

      if (error) {
        Logger.error(error, "new.tsx:createProject:insertTournage");
        throw error;
      }

      if (data?.id) {
        if (selectedCollaborators.length > 0) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, username")
            .eq("id", session.user.id)
            .single();
          const inviterName = profile?.full_name || profile?.username || "Le collaborateur";
          
          const allPendingToInvite = selectedProduction 
            ? [selectedProduction, ...selectedCollaborators] 
            : selectedCollaborators;

          allPendingToInvite.forEach(collab => {
            NotificationService.sendCollaboratorInvitationNotification({
              receiverId: collab.id,
              projectTitle: title.trim(),
              projectId: data.id,
              inviterName: inviterName,
            });
          });
        }

        const selectedList = Object.values(selected);
        const prefillRoles = selectedList.flatMap((r) => {
          const qty = parseInt(String(r.quantity)) || 1;
          // Normalisation de la catégorie pour correspondre aux Enums de la base de données (user_role)
          let mappedCategory = String(r.category).toLowerCase();
          
          // Mapping strict basé sur l'Enum user_role de Supabase
          const validEnumValues = [
            "acteur", "realisateur", "agent", "technicien", 
            "production", "image", "son", "hmc", "deco", "post_prod"
          ];

          if (mappedCategory === "realisation") mappedCategory = "realisateur";
          if (mappedCategory === "technique" || mappedCategory === "regie") mappedCategory = "technicien";
          if (mappedCategory === "postprod") mappedCategory = "post_prod";
          // "scenariste" n'existe pas dans l'enum user_role de la DB, on le map sur "technicien" ou "realisateur"
          // Selon les logs, "scenariste" cause l'erreur 22P02.
          if (mappedCategory === "scenariste") mappedCategory = "realisateur"; 

          // Sécurité : si la catégorie n'est pas dans l'enum, on met 'technicien' par défaut
          if (!validEnumValues.includes(mappedCategory)) {
            mappedCategory = "technicien";
          }

          return Array.from({ length: qty }).map((_, index) => {
            const assignee = r.assignees?.[index];
            return {
              tournage_id: data.id,
              category: mappedCategory as any,
              title: r.title,
              description: r.description || null,
              assigned_profile_id: assignee?.id || null,
              status: assignee?.id ? "invitation_pending" : "draft" 
            };
          });
        });

        if (prefillRoles.length > 0) {
          console.log("Inserting prefilled roles for tournage:", data.id, JSON.stringify(prefillRoles, null, 2));
          const { error: rolesError } = await supabase.from("project_roles").insert(prefillRoles);
          
          if (!rolesError) {
            // Send notifications for all assigned roles
            const roleInvitations = prefillRoles.filter(r => r.assigned_profile_id && r.status === "invitation_pending");
            roleInvitations.forEach(inv => {
              NotificationService.sendRoleInvitationNotification({
                receiverId: inv.assigned_profile_id!,
                projectTitle: title.trim(),
                roleTitle: inv.title,
                projectId: data.id,
              });
            });
          }

          if (rolesError) {
            Logger.error(rolesError, "new.tsx:createProject:insertRoles");
            Alert.alert("Avertissement", "Le projet a été créé mais certains rôles n'ont pas pu être enregistrés.");
          } else {
            Logger.log("Roles successfully inserted");
          }
        }

        Alert.alert("Succès", "Tournage créé avec succès ! Vos rôles sont enregistrés.");
        router.push(`/project/${data.id}`);
      }
    } catch (e) {
      Alert.alert("Erreur", (e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Le titre est obligatoire";
    if (!city.trim()) newErrors.city = "La ville est obligatoire";
    if (!country.trim()) newErrors.country = "Le pays est obligatoire";
    if (!startDate) newErrors.startDate = "La date de début est obligatoire";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert("Champs manquants", "Veuillez remplir les champs obligatoires (*).");
      return false;
    }
    setErrors({});
    return true;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundSecondary }} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <CreationHeader
        step={step}
        onBack={step > 1 ? () => setStep(step - 1) : undefined}
        onClose={() => router.back()}
        title={step === 1 ? "Nouveau Projet" : step === 2 ? "Postes & Équipe" : "Finalisation"}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: "padding", android: undefined })}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
          <View style={styles.innerContainer}>
            
            {step === 1 && (
              <>
                {/* ... existing sections ... */}
              <View style={styles.formSection}>
                <View style={styles.formSectionHeader}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                  <Text style={styles.formSectionTitle}>Le Projet</Text>
                </View>

                <Text style={styles.fieldLabel}>Titre du projet *</Text>
                <TextInput
                  placeholder="Ex: Le Dernier Métro"
                  style={[styles.formInput, errors.title && { borderColor: "red" }]}
                  value={title}
                  onChangeText={(t) => { setTitle(t); if(errors.title) setErrors({...errors, title: ""}); }}
                />
                {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

                <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Avez-vous une société de production ?</Text>
                <View style={styles.typeContainer}>
                  {PRODUCTION_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.value}
                      style={[
                        styles.typeButton, 
                        productionType === t.value && styles.typeButtonSelected,
                        t.value === "recherche" && productionType === "recherche" && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => {
                        setProductionType(t.value);
                        if (t.value !== "societe") {
                          setProductionCompany("");
                          setSelectedProduction(null);
                        }
                      }}
                    >
                      <Text style={{ 
                        color: productionType === t.value ? "white" : colors.primary,
                        fontWeight: t.value === "recherche" ? "700" : "400"
                      }}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {productionType === "societe" && (
                  <>
                    <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Société de Production</Text>
                    {selectedProduction ? (
                      <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: colors.background,
                        padding: 10,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: colors.primary,
                        marginBottom: 10
                      }}>
                        <Image
                          source={selectedProduction.avatar_url ? { uri: selectedProduction.avatar_url } : {}}
                          style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.border }}
                        />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={{ color: colors.text, fontWeight: "600" }}>{selectedProduction.full_name}</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Société invitée</Text>
                        </View>
                        <TouchableOpacity onPress={() => {
                          setSelectedProduction(null);
                          setProductionCompany("");
                        }}>
                          <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{ position: "relative", zIndex: 3000 }}>
                        <TextInput
                          placeholder="Rechercher une société existante..."
                          style={styles.formInput}
                          value={searchProductionQuery}
                          onChangeText={searchProductions}
                        />
                        {searchingProduction && (
                          <ActivityIndicator 
                            size="small" 
                            color={colors.primary} 
                            style={{ position: "absolute", right: 10, top: 12 }} 
                          />
                        )}
                        
                        {productionSuggestions.length > 0 && (
                          <View style={{
                            position: "absolute",
                            top: 48,
                            left: 0,
                            right: 0,
                            backgroundColor: colors.backgroundSecondary,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: colors.border,
                            zIndex: 3001,
                            elevation: 5
                          }}>
                            {productionSuggestions.map((p) => (
                              <TouchableOpacity
                                key={p.id}
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  padding: 10,
                                  borderBottomWidth: 1,
                                  borderBottomColor: colors.border
                                }}
                                onPress={() => selectProduction(p)}
                              >
                                <Image
                                  source={p.avatar_url ? { uri: p.avatar_url } : {}}
                                  style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.border }}
                                />
                                <Text style={{ marginLeft: 10, color: colors.text }}>{p.full_name || p.username}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}
                        
                        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, fontStyle: "italic" }}>
                          Ou renseignez le nom manuellement ci-dessous :
                        </Text>
                        <TextInput
                          placeholder="Nom de la société..."
                          style={[styles.formInput, { marginTop: 4 }]}
                          value={productionCompany}
                          onChangeText={(t) => {
                            setProductionCompany(t);
                            if (selectedProduction) setSelectedProduction(null);
                          }}
                        />
                      </View>
                    )}
                  </>
                )}

                <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Pitch</Text>
                <TextInput
                  placeholder="Description..."
                  style={[styles.formInput, styles.textArea]}
                  value={desc}
                  onChangeText={setDesc}
                  multiline
                />

                <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Type de projet</Text>
                <View style={styles.typeContainer}>
                  {PROJECT_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.value}
                      style={[styles.typeButton, types.includes(t.value) && styles.typeButtonSelected]}
                      onPress={() => types.includes(t.value) ? (types.length > 1 && setTypes(types.filter(v => v !== t.value))) : setTypes([...types, t.value])}
                    >
                      <Text style={{ color: types.includes(t.value) ? "white" : colors.primary }}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {types.includes("etudiant") && (
                  <>
                    <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Nom de l'école</Text>
                    <TextInput
                      placeholder="Ex: La Fémis, Gobelins..."
                      style={[styles.formInput, errors.schoolName && { borderColor: "red" }]}
                      value={schoolName}
                      onChangeText={(t) => { setSchoolName(t); if(errors.schoolName) setErrors({...errors, schoolName: ""}); }}
                    />
                    {errors.schoolName && <Text style={styles.errorText}>{errors.schoolName}</Text>}
                  </>
                )}
              </View>

              <View style={[styles.formSection, { zIndex: 2000, elevation: 2000 }]}>
                <View style={styles.formSectionHeader}>
                  <Ionicons name="location-outline" size={18} color={colors.primary} />
                  <Text style={styles.formSectionTitle}>Localisation</Text>
                </View>

                <View style={{ flexDirection: "row", gap: 10, zIndex: 2100, elevation: 2100 }}>
                  <View style={{ flex: 1, zIndex: 2110, elevation: 2110 }}>
                    <Text style={styles.fieldLabel}>Pays *</Text>
                    <View style={errors.country && styles.errorBorder}>
                      <CountryPicker onSelect={(v) => { setCountry(v); setErrors({...errors, country: ""}); }} currentValue={country} />
                    </View>
                  </View>
                  <View style={{ flex: 1, zIndex: 2110, elevation: 2110 }}>
                    <Text style={styles.fieldLabel}>Ville *</Text>
                    <View style={errors.city && styles.errorBorder}>
                      <CityPicker onSelect={(v) => { setCity(v); setErrors({...errors, city: ""}); }} currentValue={city} />
                    </View>
                  </View>
                </View>

                <View style={{ zIndex: 2050, elevation: 2050 }}>
                  <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Adresse précise (optionnel)</Text>
                  <View style={errors.address && styles.errorBorder}>
                    <AddressAutocomplete city={city} currentValue={address} onSelect={(a) => { setAddress(a); setErrors({...errors, address: ""}); }} />
                  </View>
                </View>
              </View>

              <View style={[styles.formSection as any, { zIndex: 1, elevation: 1 }]}>
                <View style={styles.formSectionHeader}>
                  <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                  <Text style={styles.formSectionTitle}>Dates</Text>
                </View>
                <Text style={styles.fieldLabel}>Date de début *</Text>
                {Platform.OS === "web" ? (
                  <WebDatePicker
                    value={startDate}
                    onChange={(d) => { setStartDate(d); setErrors({...errors, startDate: ""}); }}
                  />
                ) : (
                  <TouchableOpacity style={[styles.formInput, errors.startDate && { borderColor: "red" }]} onPress={() => setShowStartPicker(true)}>
                    <Text style={{ color: startDate ? colors.text : colors.text + "60" }}>{startDate || "Sélectionner..."}</Text>
                  </TouchableOpacity>
                )}
                {showStartPicker && Platform.OS !== "web" && (
                  <DateTimePicker
                    value={startDate ? new Date(startDate) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(e, d) => {
                      setShowStartPicker(false);
                      if (d) {
                        setStartDate(d.toISOString().split("T")[0]);
                        setErrors({ ...errors, startDate: "" });
                      }
                    }}
                  />
                )}
                {errors.startDate && <Text style={styles.errorText}>{errors.startDate}</Text>}

                <Text style={[styles.fieldLabel, { marginTop: 15 }]}>Date de fin</Text>
                {Platform.OS === "web" ? (
                  <WebDatePicker
                    value={endDate}
                    onChange={(d) => setEndDate(d)}
                  />
                ) : (
                  <TouchableOpacity style={styles.formInput} onPress={() => setShowEndPicker(true)}>
                    <Text style={{ color: endDate ? colors.text : colors.text + "60" }}>{endDate || "Sélectionner..."}</Text>
                  </TouchableOpacity>
                )}
                {showEndPicker && Platform.OS !== "web" && (
                  <DateTimePicker
                    value={endDate ? new Date(endDate) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(e, d) => {
                      setShowEndPicker(false);
                      if (d) setEndDate(d.toISOString().split("T")[0]);
                    }}
                  />
                )}
              </View>

              <View style={styles.formSection}>
                <View style={styles.formSectionHeader}>
                  <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                  <Text style={styles.formSectionTitle}>Scénario</Text>
                </View>
                <TouchableOpacity style={[styles.formInput, { borderStyle: "dashed", alignItems: "center" }]} onPress={pickScenario}>
                  <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                  <Text style={{ color: colors.primary }}>{scenarioName || "Uploader le scénario (PDF)"}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={GlobalStyles.primaryButton} onPress={() => validateStep1() && setStep(2)}>
                <Text style={GlobalStyles.buttonText}>Suivant : Casting & Staff</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <View style={styles.formSection}>
                <View style={styles.formSectionHeader}>
                  <Ionicons name="people-outline" size={18} color={colors.primary} />
                  <Text style={styles.formSectionTitle}>Collaborateurs du projet</Text>
                </View>
                
                <View style={{ 
                  backgroundColor: colors.primary + "08", 
                  padding: 12, 
                  borderRadius: 10, 
                  marginBottom: 15,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.primary
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>Rôle de Collaborateur</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.text + "80", lineHeight: 16 }}>
                    Les collaborateurs ont des droits étendus : ils peuvent modifier le projet, gérer le casting et inviter d'autres membres.
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.text + "60", marginTop: 6, fontStyle: 'italic' }}>
                    Note : Pour ajouter les membres de l'équipe technique ou artistique, utilisez l'étape suivante.
                  </Text>
                </View>

                <Text style={styles.fieldLabel}>Ajouter des collaborateurs</Text>
                <View style={{ position: 'relative', zIndex: 3000 }}>
                  <TextInput
                    placeholder="Chercher par nom ou pseudo..."
                    style={styles.formInput}
                    value={searchCollaborator}
                    onChangeText={searchProfiles}
                  />
                  {searchingCollaborators && (
                    <View style={{ marginTop: 5 }}>
                      <ClapLoading size={15} color={colors.primary} />
                    </View>
                  )}
                  {collaboratorSuggestions.length > 0 && (
                    <View style={{
                      position: "absolute",
                      top: 50,
                      left: 0,
                      right: 0,
                      backgroundColor: colors.card,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: colors.border,
                      zIndex: 3100,
                      elevation: 3100,
                    }}>
                      {collaboratorSuggestions.map((p) => (
                        <TouchableOpacity
                          key={p.id}
                          style={{
                            padding: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: colors.border,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10
                          }}
                          onPress={() => addCollaborator(p)}
                        >
                          <Image
                            source={{ uri: p.avatar_url || "https://via.placeholder.com/150" }}
                            style={{ width: 30, height: 30, borderRadius: 15 }}
                          />
                          <Text style={{ color: colors.text }}>{p.full_name || p.username}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {selectedCollaborators.length > 0 && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 15 }}>
                    {selectedCollaborators.map((c) => (
                      <View key={c.id} style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: colors.backgroundSecondary,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 20,
                        gap: 5
                      }}>
                        <Text style={{ color: colors.text, fontSize: 13 }}>{c.full_name || c.username}</Text>
                        <TouchableOpacity onPress={() => removeCollaborator(c.id)}>
                          <Ionicons name="close-circle" size={18} color="red" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.formSection}>
                <View style={styles.formSectionHeader}>
                  <Ionicons name="people-outline" size={18} color={colors.primary} />
                  <Text style={styles.formSectionTitle}>Postes à pourvoir</Text>
                </View>

                {/* Filtres par catégorie */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ gap: 8, marginBottom: 20, paddingBottom: 5 }}
                >
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      activeCategory === "Tous" && styles.filterChipActive
                    ]}
                    onPress={() => setActiveCategory("Tous")}
                  >
                    <Text style={{ color: activeCategory === "Tous" ? "#fff" : colors.text, fontSize: 13, fontWeight: "600" }}>Tous</Text>
                  </TouchableOpacity>
                  {Object.keys(JOB_TITLES).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.filterChip,
                        activeCategory === cat && styles.filterChipActive
                      ]}
                      onPress={() => setActiveCategory(cat as Category)}
                    >
                      <Text style={{ 
                        color: activeCategory === cat ? "#fff" : colors.text, 
                        fontSize: 13, 
                        fontWeight: "600",
                        textTransform: "capitalize" 
                      }}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <View style={{ gap: 20 }}>
                  {Object.keys(JOB_TITLES)
                    .filter(cat => activeCategory === "Tous" || activeCategory === cat)
                    .map((cat) => (
                    <View key={cat}>
                      <Text style={styles.catTitle}>{cat}</Text>
                      <View style={styles.rowWrap}>
                        {(JOB_TITLES as any)[cat].map((job: string) => {
                          const k = roleKey(cat, job);
                          const quantity = selected[k]?.quantity || 0;
                          return (
                            <TouchableOpacity
                              key={job}
                              style={[
                                styles.jobAddChip,
                                quantity > 0 && styles.jobAddChipSelected
                              ]}
                              onPress={() => addRole(cat as Category, job)}
                            >
                              <Ionicons 
                                name={quantity > 0 ? "checkmark-circle" : "add-circle-outline"} 
                                size={14} 
                                color={quantity > 0 ? "#fff" : colors.primary} 
                              />
                              <Text style={[
                                styles.jobChipText,
                                { color: quantity > 0 ? "#fff" : colors.text }
                              ]}>
                                {job} {quantity > 0 && `(x${quantity})`}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {Object.keys(selected).length > 0 && (
                <View style={[styles.formSection, { borderLeftWidth: 4, borderLeftColor: colors.primary }]}>
                  <Text style={[styles.fieldLabel, { color: colors.primary, marginBottom: 15 }]}>
                    Votre sélection ({Object.keys(selected).length}) :
                  </Text>

                  {/* Filtres pour la sélection actuelle */}
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={{ gap: 8, marginBottom: 20, paddingBottom: 5 }}
                  >
                    <TouchableOpacity
                      style={[
                        styles.filterChip,
                        activeSelectedCategory === "Tous" && styles.filterChipActive
                      ]}
                      onPress={() => setActiveSelectedCategory("Tous")}
                    >
                      <Text style={{ color: activeSelectedCategory === "Tous" ? "#fff" : colors.text, fontSize: 12, fontWeight: "600" }}>Tous</Text>
                    </TouchableOpacity>
                    {Array.from(new Set(Object.values(selected).map(r => r.category))).map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.filterChip,
                          activeSelectedCategory === cat && styles.filterChipActive
                        ]}
                        onPress={() => setActiveSelectedCategory(cat as Category)}
                      >
                        <Text style={{ 
                          color: activeSelectedCategory === cat ? "#fff" : colors.text, 
                          fontSize: 12, 
                          fontWeight: "600",
                          textTransform: "capitalize" 
                        }}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {Object.entries(selected)
                    .filter(([_, r]) => activeSelectedCategory === "Tous" || activeSelectedCategory === r.category)
                    .map(([k, r]) => (
                    <View key={k} style={styles.selectedRoleItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: "600" }}>{r.title}</Text>
                        <Text style={{ color: colors.text + "80", fontSize: 11 }}>{r.category}</Text>
                      </View>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity 
                          style={styles.qtyBtn} 
                          onPress={() => decRole(k)}
                        >
                          <Ionicons name="remove" size={16} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{r.quantity}</Text>
                        <TouchableOpacity 
                          style={styles.qtyBtn} 
                          onPress={() => incRole(k)}
                        >
                          <Ionicons name="add" size={16} color={colors.text} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.formSection}>
                <View style={styles.formSectionHeader}>
                  <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
                  <Text style={styles.formSectionTitle}>Espaces d'équipe</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ fontWeight: "600", color: colors.text }}>Créer les espaces auto</Text>
                    <Text style={{ fontSize: 12, color: colors.text + "80" }}>Un groupe sera créé pour chaque département sélectionné.</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setCreateAutoSpaces(!createAutoSpaces)}
                    style={{
                      width: 50,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: createAutoSpaces ? colors.primary : colors.border,
                      justifyContent: "center",
                      paddingHorizontal: 2,
                    }}
                  >
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: "#fff",
                      alignSelf: createAutoSpaces ? "flex-end" : "flex-start",
                    }} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={GlobalStyles.secondaryButton} onPress={() => setStep(1)}>
                  <Text style={GlobalStyles.secondaryButtonText}>Précédent</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   style={[GlobalStyles.primaryButton, { flex: 1.5 }]} 
                   onPress={() => setStep(3)} 
                >
                  <Text style={GlobalStyles.buttonText}>Continuer</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step === 3 && (
            <>
              <View style={styles.formSection}>
                <View style={styles.formSectionHeader}>
                  <Ionicons name="checkmark-done-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.formSectionTitle}>Équipe & Casting</Text>
                </View>
                <Text style={{ color: colors.text + "90", fontSize: 13, marginBottom: 20, lineHeight: 18 }}>
                  Personnalisez chaque poste et assignez directement des membres de la communauté si vous les connaissez déjà.
                </Text>

                {Object.keys(selected).length > 0 && (
                  <View style={{ marginBottom: 20 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {["Tous", ...new Set(Object.values(selected).map(r => r.category))].map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          onPress={() => setActiveStep3Filter(cat)}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 20,
                            backgroundColor: activeStep3Filter === cat ? colors.primary : colors.card,
                            borderWidth: 1,
                            borderColor: activeStep3Filter === cat ? colors.primary : colors.border,
                          }}
                        >
                          <Text style={{ 
                            fontSize: 12, 
                            fontWeight: "600", 
                            color: activeStep3Filter === cat ? "white" : colors.text + "80",
                            textTransform: cat === "Tous" ? "none" : "uppercase"
                          }}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {Object.entries(selected)
                  .filter(([_, r]) => activeStep3Filter === "Tous" || r.category === activeStep3Filter)
                  .map(([k, r]) => (
                  <View key={k} style={{ 
                    marginBottom: 16, 
                    padding: 16, 
                    borderRadius: 12, 
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border + "60",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 2,
                    elevation: 2,
                    zIndex: roleSearchId === k ? 1000 : 1
                  }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 15 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: "800", color: colors.text, fontSize: 16 }}>{r.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                          <View style={{ backgroundColor: colors.primary + "15", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 10, color: colors.primary, fontWeight: "700", textTransform: "uppercase" }}>{r.category}</Text>
                          </View>
                          <Text style={{ fontSize: 12, color: colors.text + "60", marginLeft: 8 }}>Besoin de {r.quantity} pers.</Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text + "80", marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description du poste</Text>
                      <TextInput
                        placeholder="Quelles sont les attentes pour ce rôle ?"
                        placeholderTextColor={colors.text + "40"}
                        style={{
                          backgroundColor: colors.backgroundSecondary,
                          borderRadius: 8,
                          padding: 12,
                          color: colors.text,
                          fontSize: 14,
                          height: 70,
                          textAlignVertical: 'top',
                          borderWidth: 1,
                          borderColor: colors.border + "30"
                        }}
                        multiline
                        value={r.description || ""}
                        onChangeText={(text) => {
                          setSelected(prev => ({
                            ...prev,
                            [k]: { ...prev[k], description: text }
                          }));
                        }}
                      />
                    </View>

                    <View>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text + "80", marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Assignation directe ({r.assignees?.length || 0}/{r.quantity})</Text>
                      
                      {/* Liste des personnes assignées */}
                      {(r.assignees || []).map((assignee, index) => (
                        <View key={`${k}-assignee-${index}`} style={{ 
                          flexDirection: "row", 
                          alignItems: "center", 
                          backgroundColor: colors.primary + "08", 
                          padding: 10, 
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: colors.primary + "20",
                          marginBottom: 8
                        }}>
                          <Image 
                            source={{ uri: assignee.avatar_url || "https://ui-avatars.com/api/?name=" + encodeURIComponent(assignee.label) + "&background=random" }} 
                            style={{ width: 28, height: 28, borderRadius: 14, marginRight: 10 }} 
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>{assignee.label}</Text>
                          </View>
                          <TouchableOpacity 
                            style={{ padding: 4 }}
                            onPress={() => {
                              setSelected(prev => {
                                const newAssignees = [...(prev[k].assignees || [])];
                                newAssignees.splice(index, 1);
                                return {
                                  ...prev,
                                  [k]: { ...prev[k], assignees: newAssignees }
                                };
                              });
                            }}
                          >
                            <Ionicons name="close-circle" size={20} color={colors.text + "40"} />
                          </TouchableOpacity>
                        </View>
                      ))}

                      {/* Champ de recherche si places disponibles */}
                      {(r.assignees?.length || 0) < r.quantity ? (
                        <View style={{ position: 'relative', zIndex: roleSearchId === k ? 2000 : 1 }}>
                          <View style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            backgroundColor: colors.backgroundSecondary,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            borderWidth: 1,
                            borderColor: colors.border + "30"
                          }}>
                            <Ionicons name="search-outline" size={18} color={colors.text + "40"} />
                            <TextInput
                              placeholder="Chercher un membre..."
                              placeholderTextColor={colors.text + "40"}
                              style={{
                                flex: 1,
                                paddingVertical: 10,
                                paddingHorizontal: 10,
                                color: colors.text,
                                fontSize: 13,
                              }}
                              onChangeText={(text) => {
                                setRoleSearchId(k);
                                searchProfilesForRole(text, k);
                              }}
                              onFocus={() => setRoleSearchId(k)}
                            />
                            {roleSearchId === k && searchingRoleProfiles && <ClapLoading size={10} color={colors.primary} />}
                          </View>
                          
                          {roleSearchId === k && roleSearchResults.length > 0 && (
                            <View style={{
                              position: "absolute",
                              top: 48,
                              left: 0,
                              right: 0,
                              backgroundColor: colors.card,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: colors.border,
                              zIndex: 2100,
                              elevation: 10,
                              shadowColor: "#000",
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.15,
                              shadowRadius: 8,
                            }}>
                              <ScrollView bounces={false} style={{ maxHeight: 200 }}>
                                {roleSearchResults.map((p) => (
                                  <TouchableOpacity
                                    key={p.id}
                                    style={{
                                      padding: 12,
                                      borderBottomWidth: 1,
                                      borderBottomColor: colors.border + "40",
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 12
                                    }}
                                    onPress={() => {
                                      setSelected(prev => {
                                        const currentAssignees = prev[k].assignees || [];
                                        // Vérifier si pas déjà assigné
                                        if (currentAssignees.find(a => a.id === p.id)) return prev;
                                        
                                        return {
                                          ...prev,
                                          [k]: { 
                                            ...prev[k], 
                                            assignees: [...currentAssignees, { id: p.id, label: p.full_name || p.username, avatar_url: p.avatar_url }] 
                                          }
                                        };
                                      });
                                      setRoleSearchId(null);
                                      setRoleSearchResults([]);
                                    }}
                                  >
                                    <View style={{ position: 'relative' }}>
                                      <Image
                                        source={{ uri: p.avatar_url || "https://ui-avatars.com/api/?name=" + encodeURIComponent(p.full_name || p.username) + "&background=random" }}
                                        style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.backgroundSecondary }}
                                      />
                                      {p.user_mode === 'pro' && (
                                        <View style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: '#FFD700', borderRadius: 6, width: 12, height: 12, borderWidth: 1, borderColor: 'white' }} />
                                      )}
                                    </View>
                                    <View>
                                      <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{p.full_name || p.username}</Text>
                                      <Text style={{ color: colors.text + "60", fontSize: 11 }}>{p.city ? `${p.city}, ${p.country}` : 'Membre'}</Text>
                                    </View>
                                  </TouchableOpacity>
                                ))}
                              </ScrollView>
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={{ backgroundColor: colors.border + "20", padding: 10, borderRadius: 8, alignItems: 'center' }}>
                          <Text style={{ fontSize: 11, color: colors.text + "40" }}>Toutes les places (x{r.quantity}) sont assignées</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}

                <View style={{ 
                  backgroundColor: colors.primary + "05", 
                  padding: 16, 
                  borderRadius: 12, 
                  marginTop: 10,
                  borderWidth: 1,
                  borderColor: colors.primary + "10",
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <Ionicons name="bulb-outline" size={20} color={colors.primary} />
                  <Text style={{ flex: 1, fontSize: 12, color: colors.text + "90", lineHeight: 17 }}>
                    Vous pourrez enrichir ces fiches (critères physiques, références, budget) plus tard dans l'onglet <Text style={{ fontWeight: '700' }}>Casting</Text> du projet.
                  </Text>
                </View>

                {Object.keys(selected).length === 0 && (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Ionicons name="people-outline" size={48} color={colors.text + "20"} />
                    <Text style={{ textAlign: 'center', marginTop: 10, color: colors.text + '60', fontSize: 14 }}>
                      Aucun rôle sélectionné. Revenez à l'étape précédente pour ajouter des membres à votre équipe.
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.formSection}>
                <View style={styles.formSectionHeader}>
                  <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
                  <Text style={styles.formSectionTitle}>Espaces d'équipe</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ fontWeight: "600", color: colors.text }}>Espaces de discussion</Text>
                    <Text style={{ fontSize: 12, color: colors.text + "80" }}>Créer un groupe par département d'équipe.</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setCreateAutoSpaces(!createAutoSpaces)}
                    style={{
                      width: 50,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: createAutoSpaces ? colors.primary : colors.border,
                      justifyContent: "center",
                      paddingHorizontal: 2,
                    }}
                  >
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: "#fff",
                      alignSelf: createAutoSpaces ? "flex-end" : "flex-start",
                    }} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={GlobalStyles.secondaryButton} onPress={() => setStep(2)}>
                  <Text style={GlobalStyles.secondaryButtonText}>Précédent</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   style={[GlobalStyles.primaryButton, { flex: 1.5 }]} 
                   onPress={handleCreate} 
                   disabled={creating}
                >
                  {creating ? (
                    <ClapLoading color="#fff" size={20} />
                  ) : (
                    <Text style={GlobalStyles.buttonText}>Créer le projet</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
          
    <View style={{ height: 40 }} />
          <Text style={{ textAlign: "center", color: colors.text + "40", marginBottom: 20 }}>Étape {step} sur 3</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
  );
}

function createStyles(colors: any, isDark: boolean) {
  const isWeb = Platform.OS === "web";
  return StyleSheet.create({
    container: { 
      padding: isWeb ? 0 : 20,
      alignItems: isWeb ? "center" : "stretch",
      backgroundColor: colors.backgroundSecondary,
    } as ViewStyle,
    innerContainer: {
      width: isWeb ? "100%" as any : "auto",
      maxWidth: isWeb ? 900 : "none",
      padding: isWeb ? 40 : 0,
      backgroundColor: isWeb ? colors.card : "transparent",
      borderRadius: isWeb ? 20 : 0,
      marginTop: isWeb ? 40 : 0,
      marginBottom: isWeb ? 40 : 0,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isWeb ? 0.1 : 0,
      shadowRadius: 20,
      elevation: isWeb ? 5 : 0,
    } as ViewStyle,
    headerRow: { 
      flexDirection: "row", 
      alignItems: "center", 
      marginBottom: 30,
      gap: 15
    } as ViewStyle,
    backButton: { 
      width: 44, 
      height: 44, 
      borderRadius: 22, 
      backgroundColor: colors.card, 
      justifyContent: "center", 
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 2,
    } as ViewStyle,
    headerTitle: { 
      fontSize: isWeb ? 32 : 22, 
      fontWeight: "800", 
      color: colors.text,
      letterSpacing: -0.5 
    } as TextStyle,
    formSection: { 
      backgroundColor: isWeb ? (isDark ? "#1A1A1A" : "#F8F9FA") : colors.card, 
      padding: isWeb ? 30 : 16, 
      borderRadius: 16, 
      marginBottom: 25,
      borderWidth: 1,
      borderColor: colors.border + "40",
    } as ViewStyle,
    formSectionHeader: { 
      flexDirection: "row", 
      alignItems: "center", 
      marginBottom: 20, 
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.primary + "20",
      paddingBottom: 10,
    } as ViewStyle,
    formSectionTitle: { 
      fontSize: 16, 
      fontWeight: "800", 
      color: colors.primary, 
      textTransform: "uppercase",
      letterSpacing: 1
    } as TextStyle,
    fieldLabel: { 
      fontSize: 14, 
      fontWeight: "700", 
      color: colors.text, 
      marginBottom: 10,
      marginTop: 20,
    } as TextStyle,
    formInput: { 
      backgroundColor: colors.backgroundSecondary, 
      padding: 15, 
      borderRadius: 12, 
      borderWidth: 1, 
      borderColor: colors.border, 
      color: colors.text,
      fontSize: 15,
    } as any,
    errorText: { color: "#FF3B30", fontSize: 12, marginTop: 6, fontWeight: "600" } as TextStyle,
    errorBorder: { borderWidth: 1, borderColor: "#FF3B30", borderRadius: 12, overflow: 'hidden' } as ViewStyle,
    textArea: { height: 120, textAlignVertical: "top" } as TextStyle,
    typeContainer: { flexDirection: "row", flexWrap: "wrap", gap: 12 } as ViewStyle,
    typeButton: { 
      paddingHorizontal: 16, 
      paddingVertical: 10, 
      borderRadius: 25, 
      borderWidth: 1.5, 
      borderColor: colors.primary,
      backgroundColor: "transparent",
    } as ViewStyle,
    typeButtonSelected: { backgroundColor: colors.primary } as ViewStyle,
    catTitle: { 
      fontWeight: "800", 
      color: colors.primary, 
      marginBottom: 12, 
      textTransform: "uppercase", 
      fontSize: 13,
      letterSpacing: 1,
      marginTop: 10,
    } as TextStyle,
    rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 } as ViewStyle,
    jobAddChip: { 
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 25, 
      borderWidth: 1, 
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
      gap: 6
    } as ViewStyle,
    jobAddChipSelected: { 
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    } as ViewStyle,
    jobChipText: {
      fontSize: 13,
      fontWeight: "600"
    } as TextStyle,
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    } as ViewStyle,
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    } as ViewStyle,
    selectedRoleItem: {
      flexDirection: "row", 
      alignItems: "center",
      justifyContent: "space-between", 
      marginBottom: 12,
      backgroundColor: colors.backgroundSecondary,
      padding: 15,
      borderRadius: 12,
    } as ViewStyle,
    quantityControls: {
      flexDirection: "row", 
      alignItems: "center",
      backgroundColor: colors.card,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 3,
    } as ViewStyle,
    qtyBtn: {
      width: 32,
      height: 32,
      justifyContent: "center",
      alignItems: "center",
    } as ViewStyle,
    qtyText: {
      paddingHorizontal: 15,
      fontWeight: "800",
      color: colors.text,
      fontSize: 15,
    } as TextStyle,
    actions: { 
      flexDirection: "row", 
      justifyContent: "space-between", 
      gap: 15, 
      marginTop: 30,
      width: "100%",
    } as ViewStyle,
    primaryBtn: {
      flex: 1,
      backgroundColor: colors.primary,
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    } as ViewStyle,
    secondaryBtn: {
      flex: 1,
      backgroundColor: colors.card,
      height: 56,
      borderRadius: 28,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
    } as ViewStyle
  });
}
