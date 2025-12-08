import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface TypeAlbum {
  id: string;
  nom: string;
  description: string;
  taillesDisponibles: string[];
  prixDepart: number;
  image?: string;
}

const TYPES_ALBUMS: TypeAlbum[] = [
  {
    id: 'classique',
    nom: 'Album Classique',
    description: 'Album traditionnel avec couverture rigide',
    taillesDisponibles: ['20x20 cm', '30x30 cm'],
    prixDepart: 29.99,
  },
  {
    id: 'premium',
    nom: 'Album Premium',
    description: 'Album haut de gamme avec finition luxueuse',
    taillesDisponibles: ['20x20 cm', '30x30 cm', '30x40 cm'],
    prixDepart: 49.99,
  },
  {
    id: 'livre_photo',
    nom: 'Livre Photo',
    description: 'Livre photo souple et moderne',
    taillesDisponibles: ['15x20 cm', '20x20 cm', '21x28 cm'],
    prixDepart: 19.99,
  },
  {
    id: 'coffret',
    nom: 'Coffret Photo',
    description: 'Album dans un coffret élégant',
    taillesDisponibles: ['20x20 cm', '30x30 cm'],
    prixDepart: 69.99,
  },
];

export default function AlbumsIndexScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<TypeAlbum | null>(null);

  const handleSelectType = (type: TypeAlbum) => {
    router.push({
      pathname: '/shared/livraison/albums/create',
      params: { typeId: type.id },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Albums Photo</Text>
        <TouchableOpacity onPress={() => router.push('/shared/livraison/albums/mes-albums' as any)}>
          <Ionicons name="albums-outline" size={24} color="#5C6BC0" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Ionicons name="albums" size={48} color="#5C6BC0" />
          <Text style={styles.heroTitle}>Créez votre album photo</Text>
          <Text style={styles.heroText}>
            Transformez vos plus beaux souvenirs en un album photo unique et personnalisé
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Choisissez votre type d'album</Text>

        {TYPES_ALBUMS.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={styles.albumCard}
            onPress={() => handleSelectType(type)}
          >
            <View style={styles.albumIconContainer}>
              <Ionicons name="book" size={40} color="#5C6BC0" />
            </View>
            
            <View style={styles.albumInfo}>
              <Text style={styles.albumNom}>{type.nom}</Text>
              <Text style={styles.albumDescription}>{type.description}</Text>
              
              <View style={styles.taillesContainer}>
                <Ionicons name="resize-outline" size={14} color="#666" />
                <Text style={styles.taillesText}>
                  {type.taillesDisponibles.join(', ')}
                </Text>
              </View>

              <Text style={styles.albumPrix}>
                À partir de {type.prixDepart.toFixed(2)}€
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={24} color="#CCC" />
          </TouchableOpacity>
        ))}

        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Nos avantages</Text>
          
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>Qualité professionnelle</Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>Personnalisation complète</Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>Livraison sous 7-10 jours</Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.featureText}>Garantie satisfaction</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  heroCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  heroText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  albumCard: {
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
  albumIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F3F4FB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  albumInfo: {
    flex: 1,
  },
  albumNom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  albumDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  taillesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  taillesText: {
    fontSize: 12,
    color: '#666',
  },
  albumPrix: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5C6BC0',
  },
  featuresCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 20,
    marginTop: 12,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
  },
});
