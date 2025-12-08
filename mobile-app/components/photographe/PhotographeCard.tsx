import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PhotographeCardProps {
  photographe: any;
  onPress?: () => void;
  showDistance?: boolean;
  distance?: number;
}

export default function PhotographeCard({ 
  photographe, 
  onPress, 
  showDistance = false,
  distance 
}: PhotographeCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Image 
        source={photographe.photo_profil ? { uri: photographe.photo_profil } : require('@/assets/images/default-avatar.png')}
        style={styles.avatar}
      />
      
      <View style={styles.content}>
        <Text style={styles.nom}>{photographe.prenom} {photographe.nom}</Text>
        
        {photographe.specialisations && (
          <View style={styles.specialisationsRow}>
            {photographe.specialisations.slice(0, 2).map((spec: string, index: number) => (
              <View key={index} style={styles.specBadge}>
                <Text style={styles.specText}>{spec}</Text>
              </View>
            ))}
            {photographe.specialisations.length > 2 && (
              <Text style={styles.moreText}>+{photographe.specialisations.length - 2}</Text>
            )}
          </View>
        )}

        <View style={styles.infoRow}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color="#FFB300" />
            <Text style={styles.ratingText}>
              {photographe.note_moyenne?.toFixed(1) || '5.0'}
            </Text>
            <Text style={styles.reviewCount}>
              ({photographe.nombre_avis || 0})
            </Text>
          </View>

          {showDistance && distance && (
            <>
              <View style={styles.separator} />
              <View style={styles.distanceContainer}>
                <Ionicons name="location" size={14} color="#666" />
                <Text style={styles.distanceText}>{distance}km</Text>
              </View>
            </>
          )}
        </View>

        {photographe.tarif_horaire && (
          <Text style={styles.tarif}>
            À partir de {photographe.tarif_horaire}€/heure
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={24} color="#CCC" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  content: {
    flex: 1,
  },
  nom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  specialisationsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  specBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  specText: {
    fontSize: 11,
    color: '#1976D2',
    fontWeight: '500',
  },
  moreText: {
    fontSize: 11,
    color: '#999',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  separator: {
    width: 1,
    height: 12,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 12,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 13,
    color: '#666',
  },
  tarif: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5C6BC0',
  },
});
