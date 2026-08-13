import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/lib/constants';

interface ServicesData {
  specialisations: string[];
  materiel: string[];
  rayon_deplacement_km: number;
  disponibilite: { weekdays: boolean; weekends: boolean; evenings: boolean };
}

const CATEGORIES = [
  'Mariage',
  'Portrait',
  'Événementiel',
  'Corporate',
  'Produit',
  'Architecture',
  'Nature',
  'Sport',
  'Mode',
  'Culinaire',
];

const MATERIEL_OPTIONS = [
  'Canon',
  'Nikon',
  'Sony',
  'Fujifilm',
  'Drone',
  'Éclairage studio',
  'Flash cobra',
  'Softbox',
  'Réflecteurs',
  'Steadicam',
];

export default function ServicesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ServicesData>({
    specialisations: [],
    materiel: [],
    rayon_deplacement_km: 50,
    disponibilite: { weekdays: true, weekends: true, evenings: false },
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('profils_prestataire')
        .select('specialisations, materiel, rayon_deplacement_km, disponibilite')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setServices({
          specialisations: data.specialisations || [],
          materiel: data.materiel || [],
          rayon_deplacement_km: data.rayon_deplacement_km || 50,
          disponibilite: {
            weekdays: data.disponibilite?.weekdays ?? true,
            weekends: data.disponibilite?.weekends ?? true,
            evenings: data.disponibilite?.evenings ?? false,
          },
        });
      }
    } catch (error: any) {
      console.error('❌ Erreur chargement services:', error);
      Alert.alert('Erreur', 'Impossible de charger les services');
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (field: keyof ServicesData, item: string) => {
    setServices((prev) => {
      const currentArray = prev[field] as string[];
      const newArray = currentArray.includes(item)
        ? currentArray.filter((i) => i !== item)
        : [...currentArray, item];
      return { ...prev, [field]: newArray };
    });
  };

  const updateRayonDeplacement = (delta: number) => {
    setServices((prev) => ({
      ...prev,
      rayon_deplacement_km: Math.max(0, Math.min(500, prev.rayon_deplacement_km + delta)),
    }));
  };

  const toggleDisponibilite = (field: keyof ServicesData['disponibilite']) => {
    setServices((prev) => ({
      ...prev,
      disponibilite: { ...prev.disponibilite, [field]: !prev.disponibilite[field] },
    }));
  };

  const saveServices = async () => {
    if (services.specialisations.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins une spécialisation');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('profils_prestataire')
        .update({
          specialisations: services.specialisations,
          materiel: services.materiel,
          rayon_deplacement_km: services.rayon_deplacement_km,
          disponibilite: services.disponibilite,
        })
        .eq('id', user?.id);

      if (error) throw error;

      Alert.alert('Succès', 'Services enregistrés');
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde services:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer les services');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Services</Text>
        <View style={styles.spacer} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Spécialisations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="camera-outline" size={24} color="#5C6BC0" />
            <Text style={styles.sectionTitle}>Spécialisations *</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Sélectionnez les types de prestations que vous proposez
          </Text>
          <View style={styles.chipsContainer}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.chip,
                  services.specialisations.includes(cat) && styles.chipSelected,
                ]}
                onPress={() => toggleItem('specialisations', cat)}
              >
                <Text
                  style={[
                    styles.chipText,
                    services.specialisations.includes(cat) && styles.chipTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Matériel */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="construct-outline" size={24} color="#5C6BC0" />
            <Text style={styles.sectionTitle}>Matériel</Text>
          </View>
          <View style={styles.chipsContainer}>
            {MATERIEL_OPTIONS.map((mat) => (
              <TouchableOpacity
                key={mat}
                style={[
                  styles.chip,
                  services.materiel.includes(mat) && styles.chipSelected,
                ]}
                onPress={() => toggleItem('materiel', mat)}
              >
                <Text
                  style={[
                    styles.chipText,
                    services.materiel.includes(mat) && styles.chipTextSelected,
                  ]}
                >
                  {mat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Rayon de déplacement */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="navigate-outline" size={24} color="#5C6BC0" />
            <Text style={styles.sectionTitle}>Rayon de déplacement</Text>
          </View>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => updateRayonDeplacement(-10)}
            >
              <Ionicons name="remove" size={24} color="#5C6BC0" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{services.rayon_deplacement_km} km</Text>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => updateRayonDeplacement(10)}
            >
              <Ionicons name="add" size={24} color="#5C6BC0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Disponibilité */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={24} color="#5C6BC0" />
            <Text style={styles.sectionTitle}>Disponibilité</Text>
          </View>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => toggleDisponibilite('weekdays')}
          >
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Semaine</Text>
              <Text style={styles.optionDescription}>Disponible du lundi au vendredi</Text>
            </View>
            <View style={[styles.toggle, services.disponibilite.weekdays && styles.toggleActive]}>
              <View
                style={[
                  styles.toggleButton,
                  services.disponibilite.weekdays && styles.toggleButtonActive,
                ]}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => toggleDisponibilite('weekends')}
          >
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Weekends</Text>
              <Text style={styles.optionDescription}>Disponible le samedi et dimanche</Text>
            </View>
            <View style={[styles.toggle, services.disponibilite.weekends && styles.toggleActive]}>
              <View
                style={[
                  styles.toggleButton,
                  services.disponibilite.weekends && styles.toggleButtonActive,
                ]}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => toggleDisponibilite('evenings')}
          >
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Soirées</Text>
              <Text style={styles.optionDescription}>Disponible en soirée</Text>
            </View>
            <View style={[styles.toggle, services.disponibilite.evenings && styles.toggleActive]}>
              <View
                style={[
                  styles.toggleButton,
                  services.disponibilite.evenings && styles.toggleButtonActive,
                ]}
              />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveServices}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  spacer: {
    width: 34,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#5C6BC0',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  counterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 32,
    minWidth: 100,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionInfo: {
    flex: 1,
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    padding: 3,
  },
  toggleActive: {
    backgroundColor: '#5C6BC0',
  },
  toggleButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  toggleButtonActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
