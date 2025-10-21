import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { supabase } from '../../../lib/supabaseClient';
import Header from '../../../components/HeaderParti';

export default function AvisPage() {
  const { id: annonceId } = useLocalSearchParams();
  const navigation = useNavigation();
  const [annonce, setAnnonce] = useState<any>(null);
  const [avis, setAvis] = useState<any[]>([]);
  const [avisOriginal, setAvisOriginal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date_desc');
  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  useEffect(() => {
    if (annonceId) {
      fetchAnnonceAndAvis();
    }
  }, [annonceId]);

  const fetchAnnonceAndAvis = async () => {
    setLoading(true);
    
    try {
      const { data: annonceData, error: annonceError } = await supabase
        .from('annonces')
        .select(`
          *,
          prestataire:prestataire(nom, photos)
        `)
        .eq('id', annonceId)
        .single();

      if (annonceError) {
        console.error('Erreur annonce:', annonceError);
        return;
      }

      if (annonceData.ville) {
        const { data: villeData } = await supabase
          .from("villes")
          .select("id, ville")
          .eq("id", annonceData.ville)
          .single();
        
        if (villeData) {
          annonceData.villeInfo = villeData;
        }
      }

      setAnnonce(annonceData);

      const { data: avisData, error: avisError } = await supabase
        .from('avis')
        .select(`
          *,
          particulier:particulier_id(nom, photos)
        `)
        .eq('annonce_id', annonceId)
        .order('created_at', { ascending: false });

      if (avisError) {
        console.error('Erreur lors de la récupération des avis:', avisError);
      } else {
        setAvisOriginal(avisData || []);
        setAvis(avisData || []);
        calculateStats(avisData || []);
        
        if (avisData && avisData.length > 0) {
          const moyenne = avisData.reduce((sum, avis) => sum + avis.note, 0) / avisData.length;
          await updateAnnonceRate(annonceId as string, moyenne);
        }
      }

    } catch (error) {
      console.error('Erreur lors du chargement:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (avisOriginal.length > 0) {
      applySorting();
    }
  }, [sortBy, avisOriginal]);

  const applySorting = () => {
    const sorted = [...avisOriginal].sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'note_desc':
          return b.note - a.note;
        case 'note_asc':
          return a.note - b.note;
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
    setAvis(sorted);
  };

  const calculateStats = (avisData: any[]) => {
    if (avisData.length === 0) {
      setStats({ average: 0, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
      return;
    }

    const total = avisData.length;
    const sum = avisData.reduce((acc, avis) => acc + avis.note, 0);
    const average = sum / total;

    const distribution: any = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    avisData.forEach(avis => {
      if (distribution.hasOwnProperty(avis.note)) {
        distribution[avis.note]++;
      }
    });

    setStats({ average, total, distribution });
  };

  const updateAnnonceRate = async (annonceId: string, moyenne: number) => {
    const { error } = await supabase
      .from('annonces')
      .update({ rate: Math.round(moyenne * 10) / 10 })
      .eq('id', annonceId);

    if (error) {
      console.error('Erreur mise à jour rate:', error);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Text key={star} style={styles.star}>
            {star <= rating ? '⭐' : '☆'}
          </Text>
        ))}
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const cycleSortBy = () => {
    const options = ['date_desc', 'date_asc', 'note_desc', 'note_asc'];
    const currentIndex = options.indexOf(sortBy);
    const nextIndex = (currentIndex + 1) % options.length;
    setSortBy(options[nextIndex]);
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'date_desc': return '📅 Plus récents';
      case 'date_asc': return '📅 Plus anciens';
      case 'note_desc': return '⭐ Meilleures notes';
      case 'note_asc': return '⭐ Notes plus faibles';
      default: return 'Trier';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Chargement des avis...</Text>
      </View>
    );
  }

  if (!annonce) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Annonce non trouvée</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Header />
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Avis clients</Text>
            <Text style={styles.subtitle}>{annonce.titre}</Text>
            <View style={styles.headerInfo}>
              <Text style={styles.infoText}>🏢 {annonce.prestataire?.nom}</Text>
              <Text style={styles.infoText}>📍 {annonce.villeInfo?.ville || 'Non spécifié'}</Text>
              <Text style={styles.infoText}>💰 {annonce.prix ? `${annonce.prix}€` : 'Sur demande'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {/* Statistiques */}
          <View style={styles.statsCard}>
            <View style={styles.averageSection}>
              <Text style={styles.averageScore}>
                {stats.average > 0 ? stats.average.toFixed(1) : '—'}
              </Text>
              {renderStars(Math.round(stats.average))}
              <Text style={styles.totalAvis}>
                {stats.total} avis client{stats.total > 1 ? 's' : ''}
              </Text>
            </View>

            {/* Distribution */}
            {stats.total > 0 && (
              <View style={styles.distribution}>
                <Text style={styles.distributionTitle}>📊 Répartition des notes</Text>
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = stats.distribution[rating as keyof typeof stats.distribution];
                  const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  
                  return (
                    <View key={rating} style={styles.distributionRow}>
                      <Text style={styles.ratingLabel}>{rating} ⭐</Text>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
                      </View>
                      <Text style={styles.countLabel}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Prestataire */}
            <View style={styles.prestataireSection}>
              <Text style={styles.prestataireTitle}>Prestataire</Text>
              <View style={styles.prestataireInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>👤</Text>
                </View>
                <View>
                  <Text style={styles.prestataireName}>{annonce.prestataire?.nom || 'Prestataire'}</Text>
                  <Text style={styles.prestataireService}>{annonce.titre}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Liste des avis */}
          <View style={styles.avisList}>
            {stats.total === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyTitle}>Aucun avis pour le moment</Text>
                <Text style={styles.emptyText}>
                  Cette annonce n'a pas encore reçu d'avis. Soyez le premier à partager votre expérience !
                </Text>
                <View style={styles.emptyButtons}>
                  <TouchableOpacity 
                    style={styles.primaryButton} 
                    onPress={() => (navigation as any).navigate(`annonces/${annonceId}`)}
                  >
                    <Text style={styles.primaryButtonText}>Voir l'annonce</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.secondaryButtonText}>Retour</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.avisHeader}>
                  <Text style={styles.avisTitle}>Tous les avis ({stats.total})</Text>
                  <TouchableOpacity style={styles.sortButton} onPress={cycleSortBy}>
                    <Text style={styles.sortButtonText}>{getSortLabel()}</Text>
                  </TouchableOpacity>
                </View>

                {avis.map((avisItem) => (
                  <View key={avisItem.id} style={styles.avisCard}>
                    <View style={styles.avisCardHeader}>
                      <View style={styles.avisUser}>
                        <View style={styles.userAvatar}>
                          <Text style={styles.userAvatarText}>👤</Text>
                        </View>
                        <View>
                          <Text style={styles.userName}>{avisItem.particulier?.nom || 'Client anonyme'}</Text>
                          <Text style={styles.avisDate}>📅 {formatDate(avisItem.created_at)}</Text>
                        </View>
                      </View>
                      <View style={styles.avisRating}>
                        {renderStars(avisItem.note)}
                        <Text style={styles.avisScore}>{avisItem.note}/5</Text>
                      </View>
                    </View>

                    {avisItem.commentaire && (
                      <View style={styles.commentBox}>
                        <Text style={styles.commentText}>"{avisItem.commentaire}"</Text>
                      </View>
                    )}

                    <View style={styles.avisBadges}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {avisItem.commande_id ? '📦 Commande' : '📅 Réservation'}
                        </Text>
                      </View>
                      {avisItem.note >= 4 && (
                        <View style={[styles.badge, styles.badgeRecommended]}>
                          <Text style={styles.badgeRecommendedText}>⭐ Recommandé</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB'
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280'
  },
  errorText: {
    color: '#6B7280',
    marginBottom: 16
  },
  button: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600'
  },
  header: {
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 16
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center'
  },
  backIcon: {
    fontSize: 20
  },
  headerContent: {
    flex: 1
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4
  },
  subtitle: {
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 8
  },
  headerInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280'
  },
  content: {
    padding: 24,
    gap: 24
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  averageSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  averageScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12
  },
  star: {
    fontSize: 24
  },
  totalAvis: {
    color: '#6B7280'
  },
  distribution: {
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  distributionTitle: {
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    width: 40
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FBBF24'
  },
  countLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 32,
    textAlign: 'right'
  },
  prestataireSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16
  },
  prestataireTitle: {
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12
  },
  prestataireInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  avatar: {
    width: 48,
    height: 48,
    backgroundColor: '#E5E7EB',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: 24
  },
  prestataireName: {
    fontWeight: '500',
    color: '#111827'
  },
  prestataireService: {
    fontSize: 14,
    color: '#6B7280'
  },
  avisList: {
    gap: 24
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 48,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 24
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 400
  },
  emptyButtons: {
    flexDirection: 'row',
    gap: 12
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600'
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600'
  },
  avisHeader: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  avisTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827'
  },
  sortButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151'
  },
  avisCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  avisCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  avisUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  userAvatar: {
    width: 40,
    height: 40,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  userAvatarText: {
    fontSize: 20
  },
  userName: {
    fontWeight: '500',
    color: '#111827'
  },
  avisDate: {
    fontSize: 14,
    color: '#6B7280'
  },
  avisRating: {
    alignItems: 'flex-end'
  },
  avisScore: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 4
  },
  commentBox: {
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16
  },
  commentText: {
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 24
  },
  avisBadges: {
    flexDirection: 'row',
    gap: 8
  },
  badge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E40AF'
  },
  badgeRecommended: {
    backgroundColor: '#D1FAE5'
  },
  badgeRecommendedText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#065F46'
  }
});
