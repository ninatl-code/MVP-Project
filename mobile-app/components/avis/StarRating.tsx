import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  star: '#FCD34D',
  starEmpty: '#E5E7EB'
};

interface StarRatingProps {
  rating: number; // Note actuelle (0-5)
  maxStars?: number; // Nombre max d'étoiles (défaut: 5)
  size?: number; // Taille des étoiles (défaut: 24)
  editable?: boolean; // Si les étoiles sont cliquables (défaut: false)
  onRatingChange?: (rating: number) => void; // Callback quand la note change
}

export default function StarRating({
  rating,
  maxStars = 5,
  size = 24,
  editable = false,
  onRatingChange
}: StarRatingProps) {
  const handlePress = (starIndex: number) => {
    if (editable && onRatingChange) {
      onRatingChange(starIndex + 1);
    }
  };

  const renderStar = (index: number) => {
    const isFilled = index < Math.floor(rating);
    const isHalfFilled = index < rating && index >= Math.floor(rating) && rating % 1 !== 0;

    return (
      <TouchableOpacity
        key={index}
        onPress={() => handlePress(index)}
        disabled={!editable}
        activeOpacity={editable ? 0.7 : 1}
        style={styles.starButton}
      >
        {isHalfFilled ? (
          <View style={styles.halfStarContainer}>
            <Ionicons name="star" size={size} color={COLORS.starEmpty} style={styles.starBackground} />
            <View style={[styles.halfStarOverlay, { width: size * 0.5 }]}>
              <Ionicons name="star" size={size} color={COLORS.star} />
            </View>
          </View>
        ) : (
          <Ionicons
            name={isFilled ? 'star' : 'star-outline'}
            size={size}
            color={isFilled ? COLORS.star : COLORS.starEmpty}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: maxStars }, (_, index) => renderStar(index))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  starButton: {
    marginHorizontal: 2
  },
  halfStarContainer: {
    position: 'relative'
  },
  starBackground: {
    position: 'absolute'
  },
  halfStarOverlay: {
    overflow: 'hidden'
  }
});
