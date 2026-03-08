import React from 'react';
import { ScrollView, View, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '../../theme/colors';

const { width } = Dimensions.get('window');

interface PhotoCarouselProps {
  photos: Array<{ id: string; photo_url: string }>;
}

export function PhotoCarousel({ photos }: PhotoCarouselProps) {
  if (!photos.length) {
    return <View style={[styles.image, styles.placeholder]} />;
  }

  return (
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
      {photos.map((photo) => (
        <Image
          key={photo.id}
          source={{ uri: photo.photo_url }}
          style={styles.image}
          contentFit="cover"
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  image: {
    width,
    height: 250,
  },
  placeholder: {
    backgroundColor: colors.background,
  },
});
