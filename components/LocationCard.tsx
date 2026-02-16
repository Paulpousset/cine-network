import { FilmingLocation } from '@/hooks/useFilmingLocations';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, View as RNView, StyleSheet, TouchableOpacity } from 'react-native';
import ImageViewerModal from './ImageViewerModal';
import StyledText from './StyledText';
import { Text, View } from './Themed';

interface LocationCardProps {
  location: FilmingLocation;
}

const LocationCard = ({ location }: LocationCardProps) => {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);
  const { user } = useUser();
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [showViewer, setShowViewer] = React.useState(false);

  const isOwner = user?.id === location.owner_id;

  const handleEdit = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/locations/edit/${location.id}`);
  };

  const nextImage = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (location.images && currentImageIndex < location.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const prevImage = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  const openViewer = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setShowViewer(true);
  };

  return (
    <>
      <Link href={`/locations/${location.id}`} asChild>
        <Pressable style={StyleSheet.flatten([styles.container, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }])}>
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={openViewer}
            style={styles.imageContainer}
          >
            {location.images && location.images.length > 0 ? (
              <>
                <Image 
                  source={{ uri: location.images[currentImageIndex] }} 
                  style={styles.image} 
                  contentFit={Platform.OS === 'web' ? "contain" : "cover"} 
                  contentPosition="center"
                />
                
                {location.images.length > 1 && (
                  <>
                    {currentImageIndex > 0 && (
                      <TouchableOpacity style={[styles.arrowButton, styles.leftArrow]} onPress={prevImage}>
                        <Ionicons name="chevron-back" size={20} color="white" />
                      </TouchableOpacity>
                    )}
                    {currentImageIndex < location.images.length - 1 && (
                      <TouchableOpacity style={[styles.arrowButton, styles.rightArrow]} onPress={nextImage}>
                        <Ionicons name="chevron-forward" size={20} color="white" />
                      </TouchableOpacity>
                    )}
                  </>
                )}

                <RNView style={styles.paginationDots}>
                  {location.images.map((_, idx) => (
                    <RNView 
                      key={idx} 
                      style={[
                        styles.dot, 
                        { backgroundColor: idx === currentImageIndex ? colors.primary : 'rgba(255,255,255,0.4)' }
                      ]} 
                    />
                  ))}
                </RNView>
              </>
            ) : (
              <View style={[styles.placeholderImage, { backgroundColor: colors.border }]}>
                <Ionicons name="image-outline" size={40} color={colors.textSecondary} />
              </View>
            )}
            {location.price_per_day && (
              <View style={[styles.priceTag, { backgroundColor: colors.primary }]}>
                <Text style={styles.priceText}>{location.price_per_day}€/j</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.content}>
          <View style={styles.header}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <StyledText style={[styles.title, { flex: 0, marginRight: 8 }]} numberOfLines={1}>{location.title}</StyledText>
              {isOwner && (
                <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            {location.category && (
              <View style={[styles.categoryBadge, { backgroundColor: colors.tint + '20' }]}>
                <Text style={[styles.categoryText, { color: colors.tint }]}>{location.category}</Text>
              </View>
            )}
          </View>

          <View style={styles.locationInfo}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.cityText, { color: colors.textSecondary }]}>
              {location.city}{location.address ? ` • ${location.address}` : ''}
            </Text>
          </View>

          <StyledText style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {location.description}
          </StyledText>

          <View style={styles.footer}>
            <View style={styles.userInfo}>
              {location.profiles?.avatar_url && (
                <Image source={{ uri: location.profiles.avatar_url }} style={styles.avatar} />
              )}
              <Text style={[styles.userName, { color: colors.textSecondary }]}>
                {location.profiles?.full_name || 'Anonyme'}
              </Text>
            </View>
            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
              {new Date(location.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </Pressable>
    </Link>

    <ImageViewerModal
      isVisible={showViewer}
      images={location.images || []}
      initialIndex={currentImageIndex}
      onClose={() => setShowViewer(false)}
    />
    </>
  );
};

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  imageContainer: {
    height: 220,
    width: '100%',
    position: 'relative',
    backgroundColor: isDark ? "#000" : "#fff",
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: isDark ? "#000" : "#ffffff",
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priceText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  editButton: {
    padding: 4,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cityText: {
    fontSize: 13,
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  userName: {
    fontSize: 12,
  },
  dateText: {
    fontSize: 12,
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  leftArrow: {
    left: 8,
  },
  rightArrow: {
    right: 8,
  },
  paginationDots: {
    position: 'absolute',
    bottom: 8,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
  },
});

export default LocationCard;
