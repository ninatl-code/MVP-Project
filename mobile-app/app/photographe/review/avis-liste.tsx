import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#F8F9FB',
  text: '#1C1C1E',
  textLight: '#717171',
  border: '#E5E7EB',
  star: '#FFC107',
  success: '#10B981'
};

interface AvisStats {
  note_globale_moyenne: number;
  note_qualite_moyenne: number;
  note_ponctualite_moyenne: number;
  note_communication_moyenne: number;
  note_rapport_qualite_prix_moyenne: number;
  total_avis: number;
  total_avec_photos: number;
  total_recommandations: number;
  avis_5_etoiles: number;
  avis_4_etoiles: number;
  avis_3_etoiles: number;
  avis_2_etoiles: number;
  avis_1_etoile: number;
}

interface Avis {
  id: string;
  particulier_nom: string;
  particulier_photo: string;
  note_globale: number;
  note_qualite: number;
  note_ponctualite: number;
  note_communication: number;
  note_rapport_qualite_prix: number;
  titre: string;
  commentaire: string;
  photos: string[];
  reponse_presta: string; // Nom de la colonne existante
  reponse_date: string;
  recommande: boolean;
  created_at: string;
  reactions_utiles: number;
  reactions_pas_utiles: number;
}

export default function AvisPrestatairePage() {
  const { prestataireId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AvisStats | null>(null);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [filter, setFilter] = useState<'recent' | 'note_desc' | 'note_asc' | 'utiles'>('recent');
  const [noteFilter, setNoteFilter] = useState(0);
  const [photoFilter, setPhotoFilter] = useState(false);
  const [badge, setBadge] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [prestataireId, filter, noteFilter, photoFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Charger les stats
      const { data: statsData } = await supabase
        .from('statistiques_avis')
        .select('*')
        .eq('prestataire_id', prestataireId)
        .single();

      if (statsData) {
        setStats(statsData);
      }

      // Charger les avis via RPC
      const { data: avisData } = await supabase.rpc('get_avis_prestataire', {
        p_prestataire_id: prestataireId,
        p_order_by: filter,
        p_note_min: noteFilter,
        p_avec_photos: photoFilter,
        p_limit: 20,
        p_offset: 0
      });

      if (avisData) {
        setAvis(avisData);
      }

      // Charger le badge
      const { data: badgeData } = await supabase.rpc('get_prestataire_badge', {
        p_prestataire_id: prestataireId
      });

      setBadge(badgeData);

    } catch (error) {
      console.error('Erreur chargement avis:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (note: number, size: number = 16) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= note ? 'star' : star - 0.5 <= note ? 'star-half' : 'star-outline'}
            size={size}
            color={COLORS.star}
          />
        ))}
      </View>
    );
  };

  const renderProgressBar = (count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${percentage}%` }]} />
      </View>
    );
  };

  const getBadgeInfo = (badgeType: string | null) => {
    switch (badgeType) {
      case 'elite':
        return { label: '👑 Elite', color: '#FFD700' };
      case 'excellence':
        return { label: '⭐ Excellence', color: '#FF6B6B' };
      case 'confiance':
        return { label: '✅ Confiance', color: COLORS.success };
      case 'verifie':
        return { label: '✓ Vérifié', color: COLORS.primary };
      default:
        return null;
    }
  };

  const renderAvisItem = ({ item }: { item: Avis }) => (
    <View style={styles.avisCard}>
      {/* Header */}
      <View style={styles.avisHeader}>
        <Image
          source={{ uri: item.particulier_photo || 'https://via.placeholder.com/40' }}
          style={styles.clientPhoto}
        />
        <View style={styles.avisHeaderInfo}>
          <Text style={styles.clientName}>{item.particulier_nom}</Text>
          <Text style={styles.avisDate}>
            {new Date(item.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </Text>
        </View>
        {item.recommande && (
          <View style={styles.recommendeBadge}>
            <Ionicons name="thumbs-up" size={14} color={COLORS.success} />
            <Text style={styles.recommendeText}>Recommande</Text>
          </View>
        )}
      </View>

      {/* Note globale */}
      <View style={styles.noteSection}>
        {renderStars(item.note_globale, 20)}
        <Text style={styles.noteValue}>{item.note_globale.toFixed(1)}/5</Text>
      </View>

      {/* Titre */}
      {item.titre && <Text style={styles.avisTitle}>{item.titre}</Text>}

      {/* Commentaire */}
      <Text style={styles.avisCommentaire}>{item.commentaire}</Text>

      {/* Notes détaillées */}
      {(item.note_qualite || item.note_ponctualite || item.note_communication || item.note_rapport_qualite_prix) && (
        <View style={styles.notesDetail}>
          {item.note_qualite > 0 && (
            <View style={styles.noteDetailItem}>
              <Text style={styles.noteDetailLabel}>Qualité</Text>
              {renderStars(item.note_qualite, 12)}
            </View>
          )}
          {item.note_ponctualite > 0 && (
            <View style={styles.noteDetailItem}>
              <Text style={styles.noteDetailLabel}>Ponctualité</Text>
              {renderStars(item.note_ponctualite, 12)}
            </View>
          )}
          {item.note_communication > 0 && (
            <View style={styles.noteDetailItem}>
              <Text style={styles.noteDetailLabel}>Communication</Text>
              {renderStars(item.note_communication, 12)}
            </View>
          )}
          {item.note_rapport_qualite_prix > 0 && (
            <View style={styles.noteDetailItem}>
              <Text style={styles.noteDetailLabel}>Rapport qualité/prix</Text>
              {renderStars(item.note_rapport_qualite_prix, 12)}
            </View>
          )}
        </View>
      )}

      {/* Photos */}
      {item.photos && item.photos.length > 0 && (
        <ScrollView horizontal style={styles.photosScroll} showsHorizontalScrollIndicator={false}>
          {item.photos.map((photo, index) => (
            <Image key={index} source={{ uri: photo }} style={styles.avisPhoto} />
          ))}
        </ScrollView>
      )}

      {/* Réponse du prestataire */}
      {item.reponse_presta && (
        <View style={styles.reponseContainer}>
          <View style={styles.reponseHeader}>
            <Ionicons name="chatbox-ellipses" size={16} color={COLORS.primary} />
            <Text style={styles.reponseTitle}>Réponse du prestataire</Text>
          </View>
          <Text style={styles.reponseText}>{item.reponse_presta}</Text>
          {item.reponse_date && (
            <Text style={styles.reponseDate}>
              {new Date(item.reponse_date).toLocaleDateString('fr-FR')}
            </Text>
          )}
        </View>
      )}

      {/* Réactions */}
      <View style={styles.reactionsContainer}>
        <TouchableOpacity style={styles.reactionButton}>
          <Ionicons name="thumbs-up-outline" size={18} color={COLORS.textLight} />
          <Text style={styles.reactionText}>Utile ({item.reactions_utiles})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reactionButton}>
          <Ionicons name="thumbs-down-outline" size={18} color={COLORS.textLight} />
          <Text style={styles.reactionText}>({item.reactions_pas_utiles})</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.noAvisText}>Aucun avis pour le moment</Text>
      </View>
    );
  }

  const badgeInfo = getBadgeInfo(badge);

  return (
    <View style={styles.container}>
      {/* Header avec stats */}
      <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.headerGradient}>
        <View style={styles.statsHeader}>
          <View style={styles.noteGlobaleSection}>
            <Text style={styles.noteGlobaleValue}>{stats.note_globale_moyenne.toFixed(1)}</Text>
            {renderStars(stats.note_globale_moyenne, 24)}
            <Text style={styles.totalAvisText}>{stats.total_avis} avis</Text>
            {badgeInfo && (
              <View style={[styles.badgeContainer, { backgroundColor: badgeInfo.color }]}>
                <Text style={styles.badgeText}>{badgeInfo.label}</Text>
              </View>
            )}
          </View>

          {/* Répartition des notes */}
          <View style={styles.repartitionSection}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats[`avis_${star}_etoile${star > 1 ? 's' : ''}` as keyof AvisStats] as number;
              return (
                <View key={star} style={styles.repartitionRow}>
                  <Text style={styles.repartitionLabel}>{star}★</Text>
                  {renderProgressBar(count, stats.total_avis)}
                  <Text style={styles.repartitionCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Notes par critères */}
        <View style={styles.criteresSection}>
          {stats.note_qualite_moyenne > 0 && (
            <View style={styles.critereItem}>
              <Text style={styles.critereLabel}>Qualité</Text>
              <Text style={styles.critereValue}>{stats.note_qualite_moyenne.toFixed(1)}</Text>
            </View>
          )}
          {stats.note_ponctualite_moyenne > 0 && (
            <View style={styles.critereItem}>
              <Text style={styles.critereLabel}>Ponctualité</Text>
              <Text style={styles.critereValue}>{stats.note_ponctualite_moyenne.toFixed(1)}</Text>
            </View>
          )}
          {stats.note_communication_moyenne > 0 && (
            <View style={styles.critereItem}>
              <Text style={styles.critereLabel}>Communication</Text>
              <Text style={styles.critereValue}>{stats.note_communication_moyenne.toFixed(1)}</Text>
            </View>
          )}
          {stats.note_rapport_qualite_prix_moyenne > 0 && (
            <View style={styles.critereItem}>
              <Text style={styles.critereLabel}>Rapport qualité/prix</Text>
              <Text style={styles.critereValue}>{stats.note_rapport_qualite_prix_moyenne.toFixed(1)}</Text>
            </View>
          )}
        </View>

        {/* Autres stats */}
        <View style={styles.metaStats}>
          <View style={styles.metaStatItem}>
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.metaStatText}>{stats.total_avec_photos} avec photos</Text>
          </View>
          <View style={styles.metaStatItem}>
            <Ionicons name="thumbs-up" size={20} color="#fff" />
            <Text style={styles.metaStatText}>{stats.total_recommandations} recommandations</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterButton, filter === 'recent' && styles.filterButtonActive]}
            onPress={() => setFilter('recent')}
          >
            <Text style={[styles.filterButtonText, filter === 'recent' && styles.filterButtonTextActive]}>
              Plus récents
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filter === 'note_desc' && styles.filterButtonActive]}
            onPress={() => setFilter('note_desc')}
          >
            <Text style={[styles.filterButtonText, filter === 'note_desc' && styles.filterButtonTextActive]}>
              Mieux notés
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filter === 'utiles' && styles.filterButtonActive]}
            onPress={() => setFilter('utiles')}
          >
            <Text style={[styles.filterButtonText, filter === 'utiles' && styles.filterButtonTextActive]}>
              Plus utiles
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, photoFilter && styles.filterButtonActive]}
            onPress={() => setPhotoFilter(!photoFilter)}
          >
            <Ionicons name="camera" size={16} color={photoFilter ? '#fff' : COLORS.primary} />
            <Text style={[styles.filterButtonText, photoFilter && styles.filterButtonTextActive]}>
              Avec photos
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Liste des avis */}
      <FlatList
        data={avis}
        renderItem={renderAvisItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.avisList}
        ListEmptyComponent={
          <Text style={styles.noAvisText}>Aucun avis pour les critères sélectionnés</Text>
        }
      />
    </View>
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
    alignItems: 'center'
  },
  headerGradient: {
    padding: 20,
    paddingTop: 48
  },
  statsHeader: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20
  },
  noteGlobaleSection: {
    alignItems: 'center',
    flex: 1
  },
  noteGlobaleValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2
  },
  totalAvisText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8
  },
  badgeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff'
  },
  repartitionSection: {
    flex: 1,
    gap: 4
  },
  repartitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  repartitionLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    width: 24
  },
  progressBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.star
  },
  repartitionCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    width: 30,
    textAlign: 'right'
  },
  criteresSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16
  },
  critereItem: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  critereLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2
  },
  critereValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  metaStats: {
    flexDirection: 'row',
    gap: 16
  },
  metaStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metaStatText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)'
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text
  },
  filterButtonTextActive: {
    color: '#fff'
  },
  avisList: {
    padding: 16,
    gap: 16
  },
  avisCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  avisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  clientPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12
  },
  avisHeaderInfo: {
    flex: 1
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2
  },
  avisDate: {
    fontSize: 12,
    color: COLORS.textLight
  },
  recommendeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  recommendeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success
  },
  noteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  noteValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text
  },
  avisTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8
  },
  avisCommentaire: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 12
  },
  notesDetail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12
  },
  noteDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  noteDetailLabel: {
    fontSize: 11,
    color: COLORS.textLight
  },
  photosScroll: {
    marginVertical: 12
  },
  avisPhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8
  },
  reponseContainer: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary
  },
  reponseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6
  },
  reponseTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary
  },
  reponseText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
    marginBottom: 4
  },
  reponseDate: {
    fontSize: 11,
    color: COLORS.textLight
  },
  reactionsContainer: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 12
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  reactionText: {
    fontSize: 13,
    color: COLORS.textLight
  },
  noAvisText: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 40
  }
});
