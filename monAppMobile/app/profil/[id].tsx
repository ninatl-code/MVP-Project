import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Dimensions } from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import HeaderPresta from '../../components/HeaderPresta';
import HeaderParti from '../../components/HeaderParti';

interface Profile {
  id: string;
  nom: string;
  bio?: string;
  photos?: any;
  role: string;
  created_at: string;
  email?: string;
  telephone?: string;
  plan?: string;
  event_date?: string;
  villes?: {
    ville: string;
  };
}

interface Annonce {
  id: string;
  titre: string;
  description: string;
  photos?: any[];
  tarif_unit?: number;
  unit_tarif?: string;
  rate?: number;
  created_at: string;
  actif: boolean;
}

interface Avis {
  id: string;
  note: number;
  commentaire: string;
  created_at: string;
  profiles?: {
    nom: string;
    photos?: any;
  };
}

export default function ProfilPage() {
  const { id } = useLocalSearchParams();
  const navigation = useNavigation();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchProfileData();
      getCurrentUser();
    }
  }, [id]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      setCurrentUser({ ...user, role: userProfile?.role });
    } else {
      setCurrentUser(user);
    }
  };

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          villes(ville)
        `)
        .eq('id', id)
        .single();

      if (profileError) {
        setError('Profil non trouvé');
        return;
      }

      setProfile(profileData);

      if (profileData.role === 'prestataire') {
        const { data: annoncesData } = await supabase
          .from('annonces')
          .select(`
            id,
            titre,
            description,
            photos,
            tarif_unit,
            unit_tarif,
            rate,
            created_at,
            actif
          `)
          .eq('prestataire', id)
          .eq('actif', true)
          .order('created_at', { ascending: false });
        
        setAnnonces(annoncesData || []);

        const { data: avisData } = await supabase
          .from('avis')
          .select(`
            *,
            profiles!avis_user_id_fkey(nom, photos)
          `)
          .eq('prestataire_id', id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        setAvis(avisData || []);
      }

    } catch (err) {
      setError('Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {Array.from({ length: 5 }, (_, i) => (
          <Text key={i} style={[styles.star, i < rating ? styles.starFilled : styles.starEmpty]}>
            ★
          </Text>
        ))}
      </View>
    );
  };

  const getPhotoUrl = (photos: any) => {
    if (!photos) return null;
    
    if (typeof photos === 'string' && photos.startsWith('data:')) {
      return photos;
    }
    
    if (Array.isArray(photos) && photos.length > 0) {
      const photo = photos[0];
      if (typeof photo === 'string' && photo.startsWith('data:')) {
        return photo;
      }
    }
    
    return null;
  };

  const renderHeader = () => {
    if (!currentUser) return <HeaderParti />;
    return currentUser.role === 'prestataire' ? <HeaderPresta /> : <HeaderParti />;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1F2937" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Profil non trouvé</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!profile) return null;

  const isPrestataire = profile.role === 'prestataire';
  const photoUrl = getPhotoUrl(profile.photos);
  const moyenneAvis = avis.length > 0 ? avis.reduce((sum, a) => sum + a.note, 0) / avis.length : 0;

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView style={styles.scrollView}>
        {/* Header du profil */}
        <View style={styles.profileHeader}>
          <View style={styles.profileHeaderContent}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {photoUrl ? (
                <Image 
                  source={{ uri: photoUrl }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>👤</Text>
                </View>
              )}
              <View style={[styles.badge, isPrestataire ? styles.badgePrestataire : styles.badgeClient]}>
                <Text style={styles.badgeText}>
                  {isPrestataire ? 'Prestataire' : 'Client'}
                </Text>
              </View>
            </View>

            {/* Informations principales */}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile.nom || 'Utilisateur'}
              </Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📅</Text>
                <Text style={styles.infoText}>
                  Membre depuis {formatDate(profile.created_at)}
                </Text>
              </View>
              
              {isPrestataire && avis.length > 0 && (
                <View style={styles.ratingRow}>
                  {renderStars(Math.round(moyenneAvis))}
                  <Text style={styles.ratingText}>
                    {moyenneAvis.toFixed(1)} ({avis.length} avis)
                  </Text>
                </View>
              )}

              {profile.villes?.ville && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoIcon}>📍</Text>
                  <Text style={styles.infoText}>{profile.villes.ville}</Text>
                </View>
              )}

              {profile.bio && (
                <Text style={styles.bio}>{profile.bio}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {isPrestataire ? (
            // Vue Prestataire
            <View style={styles.prestataireLayout}>
              {/* Statistiques */}
              <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>Statistiques</Text>
                
                <View style={styles.statItem}>
                  <View style={styles.statLeft}>
                    <Text style={styles.statIcon}>📦</Text>
                    <Text style={styles.statLabel}>Annonces</Text>
                  </View>
                  <Text style={styles.statValue}>{annonces.length}</Text>
                </View>
                
                <View style={styles.statItem}>
                  <View style={styles.statLeft}>
                    <Text style={styles.statIcon}>⭐</Text>
                    <Text style={styles.statLabel}>Avis</Text>
                  </View>
                  <Text style={styles.statValue}>{avis.length}</Text>
                </View>
                
                {moyenneAvis > 0 && (
                  <View style={styles.statItem}>
                    <View style={styles.statLeft}>
                      <Text style={styles.statIcon}>🏆</Text>
                      <Text style={styles.statLabel}>Note moyenne</Text>
                    </View>
                    <Text style={styles.statValue}>{moyenneAvis.toFixed(1)}/5</Text>
                  </View>
                )}
              </View>

              {/* Derniers avis */}
              {avis.length > 0 && (
                <View style={styles.avisCard}>
                  <Text style={styles.cardTitle}>Derniers avis</Text>
                  {avis.slice(0, 3).map((a) => (
                    <View key={a.id} style={styles.avisItem}>
                      <View style={styles.avisHeader}>
                        <Text style={styles.avisAuthor}>
                          {a.profiles?.nom || 'Client'}
                        </Text>
                        {renderStars(a.note)}
                      </View>
                      <Text style={styles.avisComment}>{a.commentaire}</Text>
                      <Text style={styles.avisDate}>{formatDate(a.created_at)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Annonces */}
              <View style={styles.annoncesCard}>
                <Text style={styles.cardTitle}>Annonces</Text>
                {annonces.length > 0 ? (
                  <View style={styles.annoncesGrid}>
                    {annonces.map((annonce) => (
                      <TouchableOpacity 
                        key={annonce.id} 
                        style={styles.annonceCard}
                        onPress={() => (navigation as any).navigate('annonces/[id]', { id: annonce.id })}
                        activeOpacity={0.8}
                      >
                        <View style={styles.annonceImage}>
                          {annonce.photos && Array.isArray(annonce.photos) && annonce.photos.length > 0 ? (
                            <Image 
                              source={{ 
                                uri: annonce.photos[0].startsWith('data:') 
                                  ? annonce.photos[0] 
                                  : `data:image/jpeg;base64,${annonce.photos[0]}`
                              }}
                              style={styles.annonceImageStyle}
                            />
                          ) : (
                            <Text style={styles.annonceImagePlaceholder}>📷</Text>
                          )}
                        </View>
                        <View style={styles.annonceContent}>
                          <Text style={styles.annonceTitle} numberOfLines={1}>{annonce.titre}</Text>
                          <Text style={styles.annonceDescription} numberOfLines={2}>
                            {annonce.description}
                          </Text>
                          <View style={styles.annonceFooter}>
                            <Text style={styles.annoncePrice}>
                              {annonce.tarif_unit ? `${annonce.tarif_unit} MAD/${annonce.unit_tarif}` : 'Sur devis'}
                            </Text>
                            <View style={styles.annonceRating}>
                              <Text style={styles.starYellow}>★</Text>
                              <Text style={styles.annonceRatingText}>{annonce.rate || 5}</Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateIcon}>📦</Text>
                    <Text style={styles.emptyStateText}>Aucune annonce disponible</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            // Vue Particulier
            <View style={styles.clientLayout}>
              <View style={styles.clientCard}>
                <Text style={styles.clientTitle}>Informations du client</Text>
                
                <View style={styles.clientInfoGrid}>
                  <View style={styles.clientInfoBox}>
                    <Text style={styles.clientInfoIcon}>📅</Text>
                    <Text style={styles.clientInfoLabel}>Membre depuis</Text>
                    <Text style={styles.clientInfoValue}>{formatDate(profile.created_at)}</Text>
                  </View>
                  
                  <View style={styles.clientInfoBox}>
                    <Text style={styles.clientInfoIcon}>✅</Text>
                    <Text style={styles.clientInfoLabel}>Statut</Text>
                    <Text style={[styles.clientInfoValue, { color: '#10B981' }]}>Client vérifié</Text>
                  </View>
                </View>

                <View style={styles.clientInfoGrid}>
                  {profile.plan && (
                    <View style={[styles.clientInfoBox, { backgroundColor: '#F3E8FF' }]}>
                      <Text style={styles.clientInfoIcon}>📦</Text>
                      <Text style={styles.clientInfoLabel}>Plan</Text>
                      <Text style={[styles.clientInfoValue, { color: '#7C3AED' }]}>Plan {profile.plan}</Text>
                    </View>
                  )}
                  
                  {profile.event_date && (
                    <View style={[styles.clientInfoBox, { backgroundColor: '#FCE7F3' }]}>
                      <Text style={styles.clientInfoIcon}>💕</Text>
                      <Text style={styles.clientInfoLabel}>Date de mariage</Text>
                      <Text style={[styles.clientInfoValue, { color: '#EC4899' }]}>
                        {formatDate(profile.event_date)}
                      </Text>
                    </View>
                  )}
                </View>

                {(profile.email || profile.telephone) && (
                  <View style={styles.clientContactSection}>
                    {profile.email && (
                      <View style={styles.clientContactItem}>
                        <Text style={styles.clientContactIcon}>✉️</Text>
                        <Text style={styles.clientContactText}>{profile.email}</Text>
                      </View>
                    )}
                    {profile.telephone && profile.telephone !== '0' && (
                      <View style={styles.clientContactItem}>
                        <Text style={styles.clientContactIcon}>📞</Text>
                        <Text style={styles.clientContactText}>{profile.telephone}</Text>
                      </View>
                    )}
                  </View>
                )}

                {profile.bio && (
                  <View style={styles.clientBioSection}>
                    <Text style={styles.clientBioLabel}>À propos</Text>
                    <Text style={styles.clientBioText}>{profile.bio}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get('window');
const isLargeScreen = width > 768;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  scrollView: {
    flex: 1
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24
  },
  backButton: {
    backgroundColor: '#1F2937',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  profileHeader: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  profileHeaderContent: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    padding: 24,
    flexDirection: isLargeScreen ? 'row' : 'column',
    gap: 24
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center'
  },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5
  },
  avatarPlaceholder: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarPlaceholderText: {
    fontSize: 64
  },
  badge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12
  },
  badgePrestataire: {
    backgroundColor: '#3B82F6'
  },
  badgeClient: {
    backgroundColor: '#10B981'
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  profileInfo: {
    flex: 1
  },
  profileName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  infoIcon: {
    fontSize: 16
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280'
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2
  },
  star: {
    fontSize: 16
  },
  starFilled: {
    color: '#FBBF24'
  },
  starEmpty: {
    color: '#D1D5DB'
  },
  ratingText: {
    fontSize: 14,
    color: '#6B7280'
  },
  bio: {
    fontSize: 16,
    color: '#374151',
    marginTop: 12,
    maxWidth: 600
  },
  content: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    padding: 24
  },
  prestataireLayout: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  statIcon: {
    fontSize: 20
  },
  statLabel: {
    fontSize: 16,
    color: '#374151'
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
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
  avisItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6'
  },
  avisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  avisAuthor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
  },
  avisComment: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4
  },
  avisDate: {
    fontSize: 12,
    color: '#9CA3AF'
  },
  annoncesCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  annoncesGrid: {
    flexDirection: isLargeScreen ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 24
  },
  annonceCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    width: isLargeScreen ? '48%' : '100%',
    backgroundColor: '#fff'
  },
  annonceImage: {
    height: 192,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center'
  },
  annonceImageStyle: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  annonceImagePlaceholder: {
    fontSize: 48,
    color: '#9CA3AF'
  },
  annonceContent: {
    padding: 16
  },
  annonceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8
  },
  annonceDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12
  },
  annonceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  annoncePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827'
  },
  annonceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  starYellow: {
    fontSize: 16,
    color: '#FBBF24'
  },
  annonceRatingText: {
    fontSize: 14,
    color: '#111827'
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
    color: '#D1D5DB'
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280'
  },
  clientLayout: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%'
  },
  clientCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  clientTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 24
  },
  clientInfoGrid: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24
  },
  clientInfoBox: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 12
  },
  clientInfoIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  clientInfoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4
  },
  clientInfoValue: {
    fontSize: 14,
    color: '#6B7280'
  },
  clientContactSection: {
    gap: 16,
    marginBottom: 24
  },
  clientContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12
  },
  clientContactIcon: {
    fontSize: 20
  },
  clientContactText: {
    fontSize: 16,
    color: '#374151'
  },
  clientBioSection: {
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 12
  },
  clientBioLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12
  },
  clientBioText: {
    fontSize: 14,
    color: '#6B7280'
  }
});
