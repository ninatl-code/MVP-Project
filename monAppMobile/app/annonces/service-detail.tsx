import React, { useEffect, useState } from 'react';
import { 
  View, 
  ScrollView, 
  Image, 
  Pressable, 
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#5C6BC0',
  secondary: '#130183',
  surface: '#E8EAF6',
  background: '#F8F9FB',
  text: '#2C3E50',
  textSecondary: '#7F8C8D',
  white: '#FFFFFF',
};

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchServiceDetails();
    }
  }, [id]);

  const fetchServiceDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('annonces')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setService(data);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Erreur', 'Impossible de charger le service');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </ThemedView>
    );
  }

  if (!service) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText>Service non trouvé</ThemedText>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.backButtonText}>Retour</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButtonHeader} onPress={() => router.back()}>
          <ThemedText style={styles.backIcon}>←</ThemedText>
        </Pressable>
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.title}>{service.nom_annonce || service.title}</ThemedText>
        <ThemedText style={styles.price}>{service.prix || service.price}€</ThemedText>
        
        <View style={styles.locationContainer}>
          <ThemedText style={styles.location}>📍 {service.ville || service.location}</ThemedText>
        </View>

        <View style={styles.categoryContainer}>
          <ThemedText style={styles.category}>{service.type_prestation || service.category}</ThemedText>
        </View>

        <View style={styles.descriptionContainer}>
          <ThemedText style={styles.descriptionTitle}>Description</ThemedText>
          <ThemedText style={styles.description}>
            {service.detail || service.description || 'Aucune description disponible.'}
          </ThemedText>
        </View>

        <Pressable style={styles.bookingButton} onPress={() => Alert.alert('Réservation', 'Fonctionnalité à venir')}>
          <ThemedText style={styles.bookingButtonText}>Réserver maintenant</ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    padding: 16,
    paddingTop: 50,
  },
  backButtonHeader: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    fontWeight: 'bold' as any,
    color: COLORS.text,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as any,
    color: COLORS.text,
    marginBottom: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold' as any,
    color: COLORS.primary,
    marginBottom: 16,
  },
  locationContainer: {
    marginBottom: 16,
  },
  location: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  categoryContainer: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  category: {
    backgroundColor: COLORS.surface,
    color: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontSize: 14,
    fontWeight: '500' as any,
  },
  descriptionContainer: {
    marginBottom: 32,
  },
  descriptionTitle: {
    fontSize: 20,
    fontWeight: '600' as any,
    color: COLORS.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textSecondary,
  },
  bookingButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  bookingButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600' as any,
  },
  backButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  backButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600' as any,
    textAlign: 'center',
  },
});