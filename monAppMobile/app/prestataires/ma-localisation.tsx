import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E',
  textLight: '#717171',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B'
};

export default function MaLocalisationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Formulaire
  const [adresse, setAdresse] = useState('');
  const [ville, setVille] = useState('');
  const [codePostal, setCodePostal] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [rayonIntervention, setRayonIntervention] = useState(20);
  const [zonesIntervention, setZonesIntervention] = useState<string[]>([]);
  const [newZone, setNewZone] = useState('');

  // Carte
  const [region, setRegion] = useState({
    latitude: 48.8566,
    longitude: 2.3522,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      setUserId(user.id);

      // Charger les données du profil
      const { data, error } = await supabase
        .from('profiles')
        .select('latitude, longitude, adresse, ville, code_postal, rayon_intervention, zones_intervention')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setLatitude(data.latitude);
        setLongitude(data.longitude);
        setAdresse(data.adresse || '');
        setVille(data.ville || '');
        setCodePostal(data.code_postal || '');
        setRayonIntervention(data.rayon_intervention || 20);
        setZonesIntervention(data.zones_intervention || []);

        if (data.latitude && data.longitude) {
          setRegion({
            latitude: data.latitude,
            longitude: data.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
      }
    } catch (error) {
      console.error('Erreur chargement données:', error);
      Alert.alert('Erreur', 'Impossible de charger vos données');
    } finally {
      setLoading(false);
    }
  };

  const handleGetCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Activez la localisation pour utiliser cette fonctionnalité');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);

      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

      // Géocodage inverse pour obtenir l'adresse
      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      if (addresses.length > 0) {
        const addr = addresses[0];
        setAdresse(`${addr.street || ''} ${addr.streetNumber || ''}`.trim());
        setVille(addr.city || '');
        setCodePostal(addr.postalCode || '');
      }

      Alert.alert('✅', 'Position actuelle détectée');
    } catch (error) {
      console.error('Erreur localisation:', error);
      Alert.alert('Erreur', 'Impossible d\'obtenir votre position');
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setLatitude(latitude);
    setLongitude(longitude);
  };

  const handleAddZone = () => {
    if (newZone.trim()) {
      setZonesIntervention([...zonesIntervention, newZone.trim()]);
      setNewZone('');
    }
  };

  const handleRemoveZone = (index: number) => {
    setZonesIntervention(zonesIntervention.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      if (!userId) throw new Error('Non authentifié');

      // Validation
      if (!adresse || !ville || !codePostal) {
        Alert.alert('Champs requis', 'Veuillez remplir l\'adresse complète');
        return;
      }

      if (!latitude || !longitude) {
        Alert.alert('Position requise', 'Veuillez placer le marqueur sur la carte');
        return;
      }

      setSaving(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          latitude,
          longitude,
          adresse,
          ville,
          code_postal: codePostal,
          rayon_intervention: rayonIntervention,
          zones_intervention: zonesIntervention
        })
        .eq('id', userId);

      if (error) throw error;

      Alert.alert('✅ Enregistré', 'Votre localisation a été mise à jour', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Ma localisation</Text>
        <Text style={styles.subtitle}>
          Définissez votre adresse et votre zone d'intervention
        </Text>
      </View>

      {/* Formulaire adresse */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Adresse</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Adresse complète *</Text>
          <TextInput
            style={styles.input}
            value={adresse}
            onChangeText={setAdresse}
            placeholder="123 rue de la République"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 2 }]}>
            <Text style={styles.label}>Ville *</Text>
            <TextInput
              style={styles.input}
              value={ville}
              onChangeText={setVille}
              placeholder="Paris"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.label}>Code postal *</Text>
            <TextInput
              style={styles.input}
              value={codePostal}
              onChangeText={setCodePostal}
              placeholder="75001"
              keyboardType="numeric"
            />
          </View>
        </View>

        <TouchableOpacity 
          style={styles.locationButton}
          onPress={handleGetCurrentLocation}
        >
          <Ionicons name="locate" size={20} color={COLORS.primary} />
          <Text style={styles.locationButtonText}>Utiliser ma position actuelle</Text>
        </TouchableOpacity>
      </View>

      {/* Carte */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Position sur la carte</Text>
        <Text style={styles.helperText}>
          Placez le marqueur sur votre emplacement exact
        </Text>

        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={region}
            onRegionChangeComplete={setRegion}
            onPress={handleMapPress}
          >
            {latitude && longitude && (
              <Marker
                coordinate={{ latitude, longitude }}
                draggable
                onDragEnd={(e) => {
                  setLatitude(e.nativeEvent.coordinate.latitude);
                  setLongitude(e.nativeEvent.coordinate.longitude);
                }}
              />
            )}
          </MapView>
        </View>

        {latitude && longitude && (
          <View style={styles.coordsInfo}>
            <Text style={styles.coordsText}>
              📍 Lat: {latitude.toFixed(6)}, Lng: {longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>

      {/* Rayon d'intervention */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rayon d'intervention</Text>
        <Text style={styles.helperText}>
          Distance maximale que vous acceptez de parcourir
        </Text>

        <View style={styles.rayonSelector}>
          {[5, 10, 20, 30, 50, 100].map((km) => (
            <TouchableOpacity
              key={km}
              style={[
                styles.rayonButton,
                rayonIntervention === km && styles.rayonButtonActive
              ]}
              onPress={() => setRayonIntervention(km)}
            >
              <Text style={[
                styles.rayonButtonText,
                rayonIntervention === km && styles.rayonButtonTextActive
              ]}>
                {km} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Zones d'intervention */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Villes d'intervention</Text>
        <Text style={styles.helperText}>
          Ajoutez les villes où vous proposez vos services
        </Text>

        <View style={styles.addZoneContainer}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={newZone}
            onChangeText={setNewZone}
            placeholder="Nom de la ville"
            onSubmitEditing={handleAddZone}
          />
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddZone}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {zonesIntervention.length > 0 && (
          <View style={styles.zonesList}>
            {zonesIntervention.map((zone, index) => (
              <View key={index} style={styles.zoneChip}>
                <Text style={styles.zoneChipText}>{zone}</Text>
                <TouchableOpacity onPress={() => handleRemoveZone(index)}>
                  <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Bouton enregistrer */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8
  },
  helperText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 16
  },
  inputGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: '#fff'
  },
  row: {
    flexDirection: 'row',
    gap: 12
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: '#fff'
  },
  locationButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary
  },
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  map: {
    flex: 1
  },
  coordsInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8
  },
  coordsText: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center'
  },
  rayonSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  rayonButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff'
  },
  rayonButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  rayonButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text
  },
  rayonButtonTextActive: {
    color: '#fff'
  },
  addZoneContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center'
  },
  zonesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  zoneChipText: {
    fontSize: 14,
    color: COLORS.text
  },
  footer: {
    padding: 20,
    paddingBottom: 40
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  saveButtonDisabled: {
    opacity: 0.6
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
});
