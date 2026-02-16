import AddressAutocomplete from '@/components/AddressAutocomplete';
import CityAutocomplete from '@/components/CityAutocomplete';
import ScreenContainer from '@/components/ScreenContainer';
import StyledText from '@/components/StyledText';
import { useFilmingLocations } from '@/hooks/useFilmingLocations';
import { useLocationCategories } from '@/hooks/useLocationCategories';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function EditLocationScreen() {
  const { id } = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const styles = createStyles(colors, isDark);
  const router = useRouter();
  const { updateLocation, deleteLocation } = useFilmingLocations();
  const { categories: LOCATION_CATEGORIES } = useLocationCategories();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    city: '',
    address: '',
    contact_info: '',
    price_per_day: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    fetchLocation();
  }, [id]);

  const fetchLocation = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('filming_locations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (data) {
        setFormData({
          title: data.title || '',
          description: data.description || '',
          category: data.category || '',
          city: data.city || '',
          address: data.address || '',
          contact_info: data.contact_info || '',
          price_per_day: data.price_per_day ? data.price_per_day.toString() : '',
          latitude: data.latitude,
          longitude: data.longitude,
        });
        setImages(data.images || []);
      }
    } catch (error: any) {
      console.error('Error fetching location for edit:', error);
      Alert.alert('Erreur', 'Impossible de charger les données du lieu.');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(/(\s|-|\/)/)
      .map((part) => {
        if (part.length > 0 && part.match(/[a-zà-ÿ0-9]/i)) {
          return part.charAt(0).toUpperCase() + part.slice(1);
        }
        return part;
      })
      .join('');
  };

  const filteredCategories = LOCATION_CATEGORIES.filter(cat => 
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const newImages = result.assets.map(asset => asset.uri);
      setImages([...images, ...newImages]);
    }
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    for (const uri of images) {
      if (uri.startsWith('http') && !uri.startsWith('blob:')) {
        uploadedUrls.push(uri);
        continue;
      }

      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        
        // Déterminer l'extension du fichier de manière plus robuste
        const mimeType = blob.type || 'image/jpeg';
        let fileExt = 'jpg';
        if (mimeType.includes('/')) {
            fileExt = mimeType.split('/')[1].split(';')[0].split('+')[0] || 'jpg';
        }
        
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `locations/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('user_content')
          .upload(filePath, arrayBuffer, {
            contentType: mimeType,
            upsert: false,
          });

        if (uploadError) {
          console.error('Supabase upload error:', uploadError);
          throw uploadError;
        }

        const { data } = supabase.storage.from('user_content').getPublicUrl(filePath);
        uploadedUrls.push(data.publicUrl);
      } catch (err) {
        console.error('Error uploading image:', err);
      }
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.city) {
      Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires (Titre, Description, Ville).');
      return;
    }

    setIsSaving(true);
    try {
      const imageUrls = await uploadImages();
      
      await updateLocation(id as string, {
        ...formData,
        price_per_day: formData.price_per_day ? parseFloat(formData.price_per_day) : null,
        images: imageUrls,
      });

      Alert.alert('Succès', 'Votre lieu de tournage a été mis à jour !', [
        { text: 'OK', onPress: () => router.replace('/locations') }
      ]);
    } catch (error: any) {
      console.error('Error updating location:', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue lors de la mise à jour.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer le lieu',
      'Êtes-vous sûr de vouloir supprimer ce lieu ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLocation(id as string);
              Alert.alert('Succès', 'Le lieu a été supprimé.');
              router.replace('/locations');
            } catch (error: any) {
              Alert.alert('Erreur', 'Impossible de supprimer le lieu.');
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Modifier le lieu', headerTitle: 'Modifier le lieu' }} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>Retour</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleDelete} style={styles.deleteHeaderButton}>
            <Ionicons name="trash-outline" size={24} color="red" />
          </TouchableOpacity>
        </View>

        <StyledText style={styles.sectionTitle}>Images du lieu</StyledText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.imagePreview} contentFit="cover" />
              <TouchableOpacity 
                style={styles.removeImage} 
                onPress={() => setImages(images.filter((_, i) => i !== index))}
              >
                <Ionicons name="close-circle" size={24} color="red" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity 
            style={[styles.addPhotoButton, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}
            onPress={pickImage}
          >
            <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>Ajouter</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Titre de l'annonce *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
              placeholder="Ex: Loft industriel avec grande terrasse"
              placeholderTextColor={colors.textSecondary}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Description détaillée *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
              placeholder="Décrivez précisément le lieu, l'ambiance, les accès..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
            />
          </View>

          <View style={[styles.row, { zIndex: 2000, position: 'relative' }]}>
            <View style={[styles.inputGroup, { flex: 1, zIndex: 2001 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Ville *</Text>
              <CityAutocomplete
                value={formData.city}
                onSelect={(city, coords) => setFormData({ 
                  ...formData, 
                  city, 
                  latitude: typeof coords === 'object' && coords && 'lat' in coords ? (coords as any).lat : formData.latitude, 
                  longitude: typeof coords === 'object' && coords && 'lon' in coords ? (coords as any).lon : formData.longitude 
                })}
                placeholder="Ex: Paris"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 12, zIndex: 1000 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Catégorie</Text>
              <TouchableOpacity
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, justifyContent: 'center' }]}
                onPress={() => setShowCategoryModal(true)}
              >
                <Text style={{ color: formData.category ? colors.text : colors.textSecondary }}>
                  {formData.category || "Choisir..."}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.inputGroup, { zIndex: 10 }]}>
            <Text style={[styles.label, { color: colors.text }]}>Adresse exacte</Text>
            <AddressAutocomplete
              onSelect={(address, coords) => setFormData({
                ...formData,
                address,
                latitude: typeof coords === 'object' && coords && 'lat' in coords ? (coords as any).lat : formData.latitude,
                longitude: typeof coords === 'object' && coords && 'lon' in coords ? (coords as any).lon : formData.longitude
              })}
              placeholder="Rue, numéro..." 
              value={formData.address}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Tarif journalier (€)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
              placeholder="Ex: 500"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={formData.price_per_day}
              onChangeText={(text) => setFormData({ ...formData, price_per_day: text })}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Contact (Email/Tel)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.text }]}
              placeholder="Comment vous contacter ?"
              placeholderTextColor={colors.textSecondary}
              value={formData.contact_info}
              onChangeText={(text) => setFormData({ ...formData, contact_info: text })}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Enregistrer les modifications</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Sélectionner une catégorie</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.modalSearchContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                placeholder="Rechercher une catégorie..."
                placeholderTextColor={colors.textSecondary}
                value={categorySearch}
                onChangeText={setCategorySearch}
                autoFocus
              />
            </View>

            <FlatList
              data={categorySearch.trim() && !filteredCategories.find(c => c.toLowerCase() === categorySearch.trim().toLowerCase()) 
                ? [...filteredCategories, `Ajouter "${toTitleCase(categorySearch.trim())}"`] 
                : filteredCategories}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isAddingNew = item.startsWith('Ajouter "');
                const displayValue = isAddingNew ? toTitleCase(categorySearch.trim()) : item;
                
                return (
                  <TouchableOpacity
                    style={[styles.categoryItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setFormData({ ...formData, category: displayValue });
                      setShowCategoryModal(false);
                      setCategorySearch('');
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {isAddingNew && <Ionicons name="add-circle" size={20} color={colors.primary} style={{ marginRight: 8 }} />}
                      <Text style={[styles.categoryItemText, { color: isAddingNew ? colors.primary : colors.text }]}>
                        {item}
                      </Text>
                    </View>
                    {formData.category === displayValue && !isAddingNew && (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  deleteHeaderButton: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  imageScroll: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImage: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: isDark ? colors.card : '#fff',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  submitButton: {
    height: 54,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    height: 44,
    borderRadius: 10,
    marginBottom: 15,
  },
  modalSearchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  categoryItemText: {
    fontSize: 16,
  },
});
