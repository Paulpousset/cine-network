import { useTheme } from '@/providers/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    Modal,
    Platform,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface ImageViewerModalProps {
  isVisible: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

const ImageViewerModal = ({ isVisible, images, initialIndex, onClose }: ImageViewerModalProps) => {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [dimensions, setDimensions] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : Dimensions.get('window').width, 
    height: typeof window !== 'undefined' ? window.innerHeight : Dimensions.get('window').height 
  });
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (isVisible) {
      setCurrentIndex(initialIndex);
      // Give UI a tiny bit of time to render before scrolling
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 100);
    }
  }, [isVisible, initialIndex]);

  const onLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setDimensions({ width, height });
  };

  if (!images || images.length === 0) return null;

  const nextImage = () => {
    if (currentIndex < images.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const prevImage = () => {
    if (currentIndex > 0) {
      flatListRef.current?.scrollToIndex({ index: currentIndex - 1, animated: true });
    }
  };

  const onScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    if (roundIndex !== currentIndex && roundIndex >= 0 && roundIndex < images.length) {
      setCurrentIndex(roundIndex);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container} onLayout={onLayout}>
        <StatusBar barStyle="light-content" backgroundColor="black" />
        
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>

        <FlatList
          ref={flatListRef}
          key={`viewer-${dimensions.width}`}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={{ width: dimensions.width, height: dimensions.height }}
          snapToInterval={dimensions.width}
          decelerationRate="fast"
          snapToAlignment="center"
          getItemLayout={(_, index) => ({
            length: dimensions.width,
            offset: dimensions.width * index,
            index,
          })}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={[styles.imageContainer, { width: dimensions.width, height: dimensions.height }]}>
              <Image
                source={{ uri: item }}
                style={[styles.fullImage, { width: dimensions.width, height: dimensions.height }]}
                contentFit="contain"
              />
            </View>
          )}
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity 
                style={[styles.navButton, styles.leftButton]} 
                onPress={prevImage}
              >
                <Ionicons name="chevron-back" size={40} color="white" />
              </TouchableOpacity>
            )}
            {currentIndex < images.length - 1 && (
              <TouchableOpacity 
                style={[styles.navButton, styles.rightButton]} 
                onPress={nextImage}
              >
                <Ionicons name="chevron-forward" size={40} color="white" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Pagination Info */}
        <View style={styles.pagination}>
          <Ionicons name="image-outline" size={16} color="rgba(255,255,255,0.7)" />
          <View style={{ width: 8 }} />
          <View style={styles.paginationTextContainer}>
             {images.map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.dot, 
                    { backgroundColor: index === currentIndex ? colors.primary : 'rgba(255,255,255,0.3)' }
                  ]} 
                />
              ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fullImage: {
    flex: 1,
    backgroundColor: 'black',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    padding: 15,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 30,
  },
  leftButton: {
    left: 10,
  },
  rightButton: {
    right: 10,
  },
  pagination: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  paginationTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
});

export default ImageViewerModal;
