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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';

interface ServicesData {
  specialisations: string[];
  materiel: string[];
  logiciels_retouche: string[];
  styles_photo: string[];
  langues_parlees: string[];
  rayon_deplacement_km: number;
  disponibilite_generale: boolean;
  accepte_urgences: boolean;
  delai_livraison_jours: number;
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

const LOGICIELS = [
  'Lightroom',
  'Photoshop',
  'Capture One',
  'DxO PhotoLab',
  'Affinity Photo',
];

const STYLES = [
  'Naturel',
  'Artistique',
  'Vintage',
  'Moderne',
  'Noir et blanc',
  'Coloré',
  'Minimaliste',
  'Dramatique',
];

const LANGUES = ['Français', 'Anglais', 'Espagnol', 'Allemand', 'Italien', 'Arabe'];

export default function ServicesScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState<ServicesData>({
    specialisations: [],
    materiel: [],
    logiciels_retouche: [],
    styles_photo: [],
    langues_parlees: ['Français'],
    rayon_deplacement_km: 50,
    disponibilite_generale: true,
    accepte_urgences: false,
    delai_livraison_jours: 7,
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('profils_photographe')
        .select(
          'specialisations, materiel, logiciels_retouche, styles_photo, langues_parlees, rayon_deplacement_km, disponibilite_generale, accepte_urgences, delai_livraison_jours'
        )
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setServices({
          specialisations: data.specialisations || [],
          materiel: data.materiel || [],
          logiciels_retouche: data.logiciels_retouche || [],
          styles_photo: data.styles_photo || [],
          langues_parlees: data.langues_parlees || ['Français'],
          rayon_deplacement_km: data.rayon_deplacement_km || 50,
          disponibilite_generale: data.disponibilite_generale ?? true,
          accepte_urgences: data.accepte_urgences ?? false,
          delai_livraison_jours: data.delai_livraison_jours || 7,
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

  const updateDelaiLivraison = (delta: number) => {
    setServices((prev) => ({
      ...prev,
      delai_livraison_jours: Math.max(1, Math.min(60, prev.delai_livraison_jours + delta)),
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
        .from('profils_photographe')
        .update({
          specialisations: services.specialisations,
          materiel: services.materiel,
          logiciels_retouche: services.logiciels_retouche,
          styles_photo: services.styles_photo,
          langues_parlees: services.langues_parlees,
          rayon_deplacement_km: services.rayon_deplacement_km,
          disponibilite_generale: services.disponibilite_generale,
          accepte_urgences: services.accepte_urgences,
          delai_livraison_jours: services.delai_livraison_jours,
        })
        .eq('user_id', user?.id);

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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mes Services</Text>

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

        {/* Logiciels */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="color-wand-outline" size={24} color="#5C6BC0" />
            <Text style={styles.sectionTitle}>Logiciels de retouche</Text>
          </View>
          <View style={styles.chipsContainer}>
            {LOGICIELS.map((log) => (
              <TouchableOpacity
                key={log}
                style={[
                  styles.chip,
                  services.logiciels_retouche.includes(log) && styles.chipSelected,
                ]}
                onPress={() => toggleItem('logiciels_retouche', log)}
              >
                <Text
                  style={[
                    styles.chipText,
                    services.logiciels_retouche.includes(log) && styles.chipTextSelected,
                  ]}
                >
                  {log}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Styles */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="brush-outline" size={24} color="#5C6BC0" />
            <Text style={styles.sectionTitle}>Styles de photo</Text>
          </View>
          <View style={styles.chipsContainer}>
            {STYLES.map((style) => (
              <TouchableOpacity
                key={style}
                style={[
                  styles.chip,
                  services.styles_photo.includes(style) && styles.chipSelected,
                ]}
                onPress={() => toggleItem('styles_photo', style)}
              >
                <Text
                  style={[
                    styles.chipText,
                    services.styles_photo.includes(style) && styles.chipTextSelected,
                  ]}
                >
                  {style}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Langues */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="language-outline" size={24} color="#5C6BC0" />
            <Text style={styles.sectionTitle}>Langues parlées</Text>
          </View>
          <View style={styles.chipsContainer}>
            {LANGUES.map((langue) => (
              <TouchableOpacity
                key={langue}
                style={[
                  styles.chip,
                  services.langues_parlees.includes(langue) && styles.chipSelected,
                ]}
                onPress={() => toggleItem('langues_parlees', langue)}
              >
                <Text
                  style={[
                    styles.chipText,
                    services.langues_parlees.includes(langue) && styles.chipTextSelected,
                  ]}
                >
                  {langue}
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

        {/* Délai de livraison */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="time-outline" size={24} color="#5C6BC0" />
            <Text style={styles.sectionTitle}>Délai de livraison</Text>
          </View>
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => updateDelaiLivraison(-1)}
            >
              <Ionicons name="remove" size={24} color="#5C6BC0" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>
              {services.delai_livraison_jours} jour{services.delai_livraison_jours > 1 ? 's' : ''}
            </Text>
            <TouchableOpacity
              style={styles.counterButton}
              onPress={() => updateDelaiLivraison(1)}
            >
              <Ionicons name="add" size={24} color="#5C6BC0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Options */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="options-outline" size={24} color="#5C6BC0" />
            <Text style={styles.sectionTitle}>Options</Text>
          </View>
          
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() =>
              setServices((prev) => ({
                ...prev,
                disponibilite_generale: !prev.disponibilite_generale,
              }))
            }
          >
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Disponible pour nouvelles demandes</Text>
              <Text style={styles.optionDescription}>
                Recevoir des notifications de nouvelles demandes
              </Text>
            </View>
            <View
              style={[
                styles.toggle,
                services.disponibilite_generale && styles.toggleActive,
              ]}
            >
              <View
                style={[
                  styles.toggleButton,
                  services.disponibilite_generale && styles.toggleButtonActive,
                ]}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() =>
              setServices((prev) => ({ ...prev, accepte_urgences: !prev.accepte_urgences }))
            }
          >
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Accepter les urgences</Text>
              <Text style={styles.optionDescription}>
                Prestations à réaliser sous 48h
              </Text>
            </View>
            <View style={[styles.toggle, services.accepte_urgences && styles.toggleActive]}>
              <View
                style={[
                  styles.toggleButton,
                  services.accepte_urgences && styles.toggleButtonActive,
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
