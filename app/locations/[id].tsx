import ImageViewerModal from '@/components/ImageViewerModal';
import ScreenContainer from '@/components/ScreenContainer';
import StyledText from '@/components/StyledText';
import { FilmingLocation } from '@/hooks/useFilmingLocations';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

const { width: WINDOW_WIDTH } = Dimensions.get('window');

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const { user, isGuest } = useUser();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  
  // Responsive width for gallery
  const isLargeScreen = Platform.OS === 'web' && windowWidth >= 1024;
  const contentWidth = isLargeScreen ? 700 : windowWidth;

  const [location, setLocation] = useState<FilmingLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showViewer, setShowViewer] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const isOwner = user?.id === location?.owner_id;

  useEffect(() => {
    fetchLocation();
  }, [id]);

  const handleScroll = (event: any) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / contentWidth);
    setActiveImageIndex(index);
  };

  const goToNextImage = () => {
    if (location && activeImageIndex < location.images.length - 1) {
      scrollViewRef.current?.scrollTo({ x: (activeImageIndex + 1) * contentWidth, animated: true });
    }
  };

  const goToPrevImage = () => {
    if (activeImageIndex > 0) {
      scrollViewRef.current?.scrollTo({ x: (activeImageIndex - 1) * contentWidth, animated: true });
    }
  };

  const fetchLocation = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('filming_locations')
        .select(`
          *,
          profiles:owner_id (
            id,
            full_name,
            avatar_url,
            role
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setLocation(data);
    } catch (error) {
      console.error('Error fetching location details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!location) return;
    try {
      await Share.share({
        message: `Découvrez ce lieu de tournage sur Cine Network : ${location.title} à ${location.city}.\n${location.description}`,
      });
    } catch (error) {
      console.error('Error sharing location:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!location) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Lieu introuvable.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary }}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScreenContainer scrollable={false} style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ 
        title: location.title,
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={handleShare} style={{ marginRight: isOwner ? 16 : 0 }}>
              <Ionicons name="share-outline" size={24} color={colors.text} />
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity onPress={() => router.push(`/locations/edit/${location.id}`)}>
                <Ionicons name="create-outline" size={24} color={colors.text} />
              </TouchableOpacity>
            )}
          </View>
        )
      }} />
      
      <ScrollView>
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>Retour</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.imageGalleryContainer, { width: contentWidth }]}>
          <ScrollView 
            ref={scrollViewRef}
            horizontal 
            pagingEnabled 
            showsHorizontalScrollIndicator={false} 
            onScroll={handleScroll}
            scrollEventThrottle={16}
            style={[styles.imageGallery, { width: contentWidth }]}
          >
            {location.images && location.images.length > 0 ? (
              location.images.map((img, index) => (
                <TouchableOpacity 
                  key={index} 
                  activeOpacity={0.9} 
                  onPress={() => setShowViewer(true)}
                  style={{ width: contentWidth }}
                >
                  <Image 
                    source={{ uri: img }} 
                    style={[styles.galleryImage, { width: contentWidth }]} 
                    contentFit={Platform.OS === 'web' ? "contain" : "cover"} 
                    contentPosition="center"
                  />
                </TouchableOpacity>
              ))
            ) : (
              <View style={[styles.galleryImage, { width: contentWidth, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="image-outline" size={64} color={colors.textSecondary} />
              </View>
            )}
          </ScrollView>

          {location.images && location.images.length > 0 && (
            <>
              {location.images.length > 1 && (
                <>
                  {activeImageIndex > 0 && (
                    <TouchableOpacity style={[styles.arrowButton, styles.leftArrow]} onPress={goToPrevImage}>
                      <Ionicons name="chevron-back" size={28} color="white" />
                    </TouchableOpacity>
                  )}
                  {activeImageIndex < location.images.length - 1 && (
                    <TouchableOpacity style={[styles.arrowButton, styles.rightArrow]} onPress={goToNextImage}>
                      <Ionicons name="chevron-forward" size={28} color="white" />
                    </TouchableOpacity>
                  )}
                </>
              )}
              <View style={styles.paginationDots}>
                {location.images.map((_, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.dot, 
                      { backgroundColor: index === activeImageIndex ? colors.primary : 'rgba(255,255,255,0.5)' }
                    ]} 
                  />
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <StyledText style={styles.title}>{location.title}</StyledText>
              <View style={styles.locationInfo}>
                <Ionicons name="location" size={16} color={colors.primary} />
                <Text style={[styles.cityText, { color: colors.textSecondary }]}>
                  {location.city}{location.address ? `, ${location.address}` : ''}
                </Text>
              </View>
            </View>
            {location.price_per_day && (
              <View style={[styles.priceTag, { backgroundColor: colors.primary }]}>
                <Text style={styles.priceText}>{location.price_per_day}€/j</Text>
              </View>
            )}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.section}>
            <StyledText style={styles.sectionTitle}>Description</StyledText>
            <StyledText style={[styles.description, { color: colors.text }]}>
              {location.description}
            </StyledText>
          </View>

          {location.category && (
            <View style={styles.section}>
              <StyledText style={styles.sectionTitle}>Type de lieu</StyledText>
              <View style={[styles.badge, { backgroundColor: colors.tint + '20' }]}>
                <Text style={{ color: colors.tint, fontWeight: '600' }}>{location.category}</Text>
              </View>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.section}>
            <StyledText style={styles.sectionTitle}>Contact & Propriétaire</StyledText>
            <TouchableOpacity 
              style={[styles.ownerCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
              onPress={() => router.push(`/profile/${location.owner_id}`)}
            >
              {location.profiles?.avatar_url && (
                <Image source={{ uri: location.profiles.avatar_url }} style={styles.avatar} />
              )}
              <View style={styles.ownerInfo}>
                <Text style={[styles.ownerName, { color: colors.text }]}>{location.profiles?.full_name}</Text>
                <Text style={[styles.ownerRole, { color: colors.textSecondary }]}>{location.profiles?.role || 'Membre'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {location.contact_info && (
              <View style={[styles.contactBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles.contactText, { color: colors.text }]}>
                  Contact : {location.contact_info}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity 
          style={[styles.contactButton, { backgroundColor: colors.primary, opacity: isGuest ? 0.5 : 1 }]}
          onPress={() => {
            if (isGuest) {
              Alert.alert("Invité", "Vous devez être connecté pour contacter un propriétaire.");
              return;
            }
            // Logic to open message or contact
            router.push(`/direct-messages/${location.owner_id}`);
          }}
          disabled={isGuest}
        >
          <Ionicons name="chatbubble-ellipses" size={20} color="white" />
          <Text style={styles.contactButtonText}>Contacter le propriétaire</Text>
        </TouchableOpacity>
      </View>

      <ImageViewerModal
        isVisible={showViewer}
        images={location.images || []}
        initialIndex={activeImageIndex}
        onClose={() => setShowViewer(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageGallery: {
    height: 350,
    width: WINDOW_WIDTH,
    backgroundColor: '#000',
  },
  galleryImage: {
    width: WINDOW_WIDTH,
    height: 350,
    backgroundColor: '#000',
  },
  imageGalleryContainer: {
    height: 350,
    width: WINDOW_WIDTH,
    position: 'relative',
    backgroundColor: '#000',
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  leftArrow: {
    left: 16,
  },
  rightArrow: {
    right: 16,
  },
  paginationDots: {
    position: 'absolute',
    bottom: 16,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cityText: {
    fontSize: 16,
    marginLeft: 4,
  },
  priceTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 16,
  },
  priceText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  divider: {
    height: 1,
    marginVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  ownerInfo: {
    flex: 1,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  ownerRole: {
    fontSize: 14,
  },
  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  contactText: {
    fontSize: 14,
    flex: 1,
    marginLeft: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  contactButton: {
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});
