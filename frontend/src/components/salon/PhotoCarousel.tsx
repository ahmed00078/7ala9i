import React, { useRef, useState } from 'react';
import { FlatList, View, StyleSheet, Dimensions, TouchableOpacity, I18nManager } from 'react-native';
import { AppText as Text } from '../ui/AppText';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { getImageUrl } from '../../api/client';

const { width } = Dimensions.get('window');
const CAROUSEL_HEIGHT = 260;

interface PhotoCarouselProps {
  photos: Array<{ id: string; photo_url: string }>;
}

export function PhotoCarousel({ photos }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  });

  if (!photos.length) {
    return (
      <View style={[styles.slide, styles.placeholder]}>
        <Ionicons name="cut-outline" size={48} color={colors.grayLight} />
      </View>
    );
  }

  const goTo = (index: number) => {
    if (index < 0 || index >= photos.length) return;
    listRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  };

  const isRTL = I18nManager.isRTL;

  return (
    <View style={styles.wrapper}>
      <FlatList
        ref={listRef}
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => (
          <Image
            source={{ uri: getImageUrl(item.photo_url) }}
            style={styles.slide}
            contentFit="cover"
          />
        )}
      />

      {/* Previous arrow */}
      {currentIndex > 0 && (
        <TouchableOpacity
          style={[styles.arrow, isRTL ? styles.arrowRight : styles.arrowLeft]}
          onPress={() => goTo(currentIndex - 1)}
          activeOpacity={0.8}
        >
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={colors.white} />
        </TouchableOpacity>
      )}

      {/* Next arrow */}
      {currentIndex < photos.length - 1 && (
        <TouchableOpacity
          style={[styles.arrow, isRTL ? styles.arrowLeft : styles.arrowRight]}
          onPress={() => goTo(currentIndex + 1)}
          activeOpacity={0.8}
        >
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.white} />
        </TouchableOpacity>
      )}

      {/* Page counter e.g. "2 / 4" */}
      {photos.length > 1 && (
        <View style={styles.counter}>
          <Text style={styles.counterText}>{`\u200E${currentIndex + 1} / ${photos.length}`}</Text>
        </View>
      )}

      {/* Dot indicators */}
      {photos.length > 1 && (
        <View style={styles.dots}>
          {photos.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', height: CAROUSEL_HEIGHT },
  slide: { width, height: CAROUSEL_HEIGHT },
  placeholder: {
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowLeft: { left: 12 },
  arrowRight: { right: 12 },
  counter: {
    position: 'absolute',
    bottom: 44,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  counterText: {
    color: colors.white,
    fontSize: 12,
    fontFamily: 'Outfit-SemiBold',
  },
  dots: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  dotActive: {
    backgroundColor: colors.white,
    width: 18,
  },
});
