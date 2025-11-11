import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter } from 'expo-router';
import FooterPresta from '../../components/FooterPresta';

interface Annonce {
  id: string;
  titre: string;
  description: string;
  actif: boolean;
  tarif_unit?: number;
  unit_tarif?: string;
  rate?: number;
  vues?: number;
}

export default function PrestationsPrestataire() {
  const [loading, setLoading] = useState(true);
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchAnnonces();
  }, []);

  const fetchAnnonces = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('annonces')
      .select('*')
      .eq('prestataire', user.id)
      .order('created_at', { ascending: false });

    if (!error) setAnnonces(data || []);
    setLoading(false);
  };

  const toggleActif = async (annonceId: string, currentActif: boolean) => {
    const { error } = await supabase
      .from('annonces')
      .update({ actif: !currentActif })
      .eq('id', annonceId);

    if (!error) {
      fetchAnnonces();
      Alert.alert('Succès', `Annonce ${!currentActif ? 'activée' : 'désactivée'}`);
    } else {
      Alert.alert('Erreur', 'Impossible de modifier l\'annonce');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5C6BC0" />
        </View>
        <FooterPresta />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Mes Annonces</Text>
        </View>

        <ScrollView style={styles.list}>
          {annonces.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📢</Text>
              <Text style={styles.emptyText}>Aucune annonce créée</Text>
            </View>
          ) : (
            annonces.map((annonce) => (
              <View key={annonce.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardTitle}>{annonce.titre}</Text>
                    <Text style={styles.cardDescription} numberOfLines={2}>
                      {annonce.description}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.statusBadge, { backgroundColor: annonce.actif ? '#10B981' : '#9CA3AF' }]}
                    onPress={() => toggleActif(annonce.id, annonce.actif)}
                  >
                    <Text style={styles.statusText}>
                      {annonce.actif ? 'Actif' : 'Inactif'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.cardInfo}>
                  {annonce.tarif_unit && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoIcon}>💰</Text>
                      <Text style={styles.infoText}>
                        {annonce.tarif_unit} MAD/{annonce.unit_tarif}
                      </Text>
                    </View>
                  )}
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>⭐</Text>
                    <Text style={styles.infoText}>{annonce.rate || 0}/5</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>👁️</Text>
                    <Text style={styles.infoText}>{annonce.vues || 0} vues</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
      <FooterPresta />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB'
  },
  content: {
    flex: 1,
    padding: 24,
    paddingBottom: 100, // Espace pour le footer
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    marginBottom: 24
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E'
  },
  list: {
    flex: 1
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600'
  },
  cardInfo: {
    flexDirection: 'row',
    gap: 16
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  infoIcon: {
    fontSize: 14
  },
  infoText: {
    fontSize: 14,
    color: '#374151'
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF'
  }
});
