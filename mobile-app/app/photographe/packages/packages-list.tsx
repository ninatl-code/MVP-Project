import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import FooterPresta from '@/components/photographe/FooterPresta';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#222222',
  textLight: '#717171',
  border: '#EBEBEB',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

interface Package {
  id: string;
  titre: string;
  description: string;
  prix_fixe: number;
  duree_minutes: number;
  nb_photos_incluses: number;
  delai_livraison_jours: number;
  actif: boolean;
  created_at: string;
}

export default function PackagesListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      if (!user?.id) {
        Alert.alert('Erreur', 'Utilisateur non authentifié');
        return;
      }

      const { data, error } = await supabase
        .from('packages_types')
        .select('*')
        .eq('photographe_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur chargement packages:', error);
        Alert.alert('Erreur', 'Impossible de charger vos packages');
        return;
      }

      setPackages(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (id: string) => {
    Alert.alert(
      'Supprimer ce package?',
      'Cette action est irréversible',
      [
        { text: 'Annuler', onPress: () => {} },
        {
          text: 'Supprimer',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('packages_types')
                .delete()
                .eq('id', id);

              if (error) throw error;

              setPackages(packages.filter(p => p.id !== id));
              Alert.alert('Succès', 'Package supprimé');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le package');
            }
          },
        },
      ]
    );
  };

  const togglePackageActive = async (pkg: Package) => {
    try {
      const { error } = await supabase
        .from('packages_types')
        .update({ actif: !pkg.actif })
        .eq('id', pkg.id);

      if (error) throw error;

      setPackages(packages.map(p => p.id === pkg.id ? { ...p, actif: !p.actif } : p));
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le package');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes Packages</Text>
        <View style={{ width: 28 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Les packages permettent à vos clients de réserver rapidement vos services avec des conditions pré-définies
          </Text>
        </View>

        {packages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="image-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>Aucun package créé</Text>
            <Text style={styles.emptyText}>
              Créez votre premier package pour permettre à vos clients de réserver rapidement
            </Text>
          </View>
        ) : (
          <View style={styles.packagesList}>
            {packages.map(pkg => (
              <View key={pkg.id} style={styles.packageCard}>
                <View style={styles.packageHeader}>
                  <View style={styles.packageTitle}>
                    <Text style={styles.packageName}>{pkg.titre}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: pkg.actif ? '#D1FAE5' : '#FEE2E2' },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: pkg.actif ? COLORS.success : COLORS.error }]}>
                        {pkg.actif ? 'Actif' : 'Inactif'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.packagePrice}>{pkg.prix_fixe}€</Text>
                </View>

                {pkg.description && (
                  <Text style={styles.packageDescription}>{pkg.description}</Text>
                )}

                <View style={styles.packageDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
                    <Text style={styles.detailText}>{pkg.duree_minutes}min</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="image-outline" size={16} color={COLORS.textLight} />
                    <Text style={styles.detailText}>{pkg.nb_photos_incluses} photos</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="download-outline" size={16} color={COLORS.textLight} />
                    <Text style={styles.detailText}>{pkg.delai_livraison_jours}j</Text>
                  </View>
                </View>

                <View style={styles.packageActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn]}
                    onPress={() => router.push({ pathname: '/photographe/packages/package-edit', params: { id: pkg.id } })}
                  >
                    <Ionicons name="pencil" size={18} color="white" />
                    <Text style={styles.actionBtnText}>Modifier</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.toggleBtn]}
                    onPress={() => togglePackageActive(pkg)}
                  >
                    <Ionicons name={pkg.actif ? 'eye-off' : 'eye'} size={18} color="white" />
                    <Text style={styles.actionBtnText}>{pkg.actif ? 'Désactiver' : 'Activer'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => handleDeletePackage(pkg.id)}
                  >
                    <Ionicons name="trash" size={18} color="white" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.floatingButtonContainer}>
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => router.push('/photographe/packages/package-create')}
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <FooterPresta />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 280,
  },
  packagesList: {
    gap: 12,
  },
  packageCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  packageDescription: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 12,
    lineHeight: 18,
  },
  packageDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  packageActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  editBtn: {
    backgroundColor: COLORS.primary,
  },
  toggleBtn: {
    backgroundColor: COLORS.warning,
  },
  deleteBtn: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 12,
  },
  actionBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 100,
    right: 16,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
