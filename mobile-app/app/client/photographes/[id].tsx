import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, Alert, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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

const TABS = [
  { key: 'presentation', label: 'Présentation' },
  { key: 'portfolio', label: 'Portfolio' },
  { key: 'packages', label: 'Packages' },
  { key: 'avis', label: 'Avis' },
];

export default function PhotographePublicProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState('presentation');

  useEffect(() => {
    if (id) {
      fetchAll();
      checkFavorite();
    }
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: base }, { data: extra }] = await Promise.all([
        supabase.from('profiles').select('id, nom, email, telephone, ville, avatar_url, created_at').eq('id', id).single(),
        supabase.from('profils_prestataire').select('*').eq('id', id).maybeSingle(),
      ]);

      setProfile(base && extra ? { ...base, ...extra } : base);

      const [{ data: packs }, { data: revs }] = await Promise.all([
        supabase.from('packages_types').select('*').eq('photographe_id', id).eq('actif', true).order('prix_fixe', { ascending: true }),
        supabase.from('reviews_presta').select('*, auteur:profiles!reviews_presta_client_id_fkey(nom, avatar_url)').eq('prestataire_id', id).order('created_at', { ascending: false }).limit(20),
      ]);

      setPackages(packs || []);
      setPortfolio((extra?.portfolio_photos || []).map((url: string, index: number) => ({ id: String(index), url })));
      setReviews(revs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const checkFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('favoris').select('id').eq('client_id', user.id).eq('prestataire_id', id).maybeSingle();
    setIsFavorite(!!data);
  };

  const toggleFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (isFavorite) {
      await supabase.from('favoris').delete().eq('client_id', user.id).eq('prestataire_id', id);
    } else {
      await supabase.from('favoris').insert({ client_id: user.id, prestataire_id: id });
    }
    setIsFavorite(!isFavorite);
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.note || 0), 0) / reviews.length).toFixed(1)
    : null;

  const handleContact = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/auth/login' as any); return; }
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('client_id', user.id)
      .eq('prestataire_id', id)
      .maybeSingle();
    let conversationId = existing?.id;
    if (!conversationId) {
      const { data: created, error } = await supabase
        .from('conversations')
        .insert({ client_id: user.id, prestataire_id: id })
        .select('id')
        .single();
      if (error) { router.push('/shared/messages/messages-list' as any); return; }
      conversationId = created?.id;
    }
    router.push(`/shared/messages/chat-conversation?id=${conversationId}` as any);
  };

  const getAnciennete = () => {
    if (!profile?.created_at) return null;
    const diff = Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (diff < 1) return 'Nouveau membre';
    if (diff < 12) return `${diff} mois`;
    const years = Math.floor(diff / 12);
    return `${years} an${years > 1 ? 's' : ''}`;
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={{ color: COLORS.textLight }}>Profil introuvable.</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: COLORS.accent }}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView stickyHeaderIndices={[3]}>
        {/* Header photo */}
        <LinearGradient colors={[COLORS.accent, COLORS.primary]} style={styles.heroBanner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleFavorite} style={styles.favBtn}>
            <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={isFavorite ? '#EF4444' : '#fff'} />
          </TouchableOpacity>

          {profile.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={40} color="#fff" />
            </View>
          )}
          <Text style={styles.heroName}>{profile.nom_entreprise || profile.nom || 'Prestataire'}</Text>
          <View style={styles.heroBadgesRow}>
            {profile.statut_validation === 'valide' && (
              <View style={[styles.trustBadge, { backgroundColor: 'rgba(16,185,129,0.2)' }]}>
                <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                <Text style={[styles.trustBadgeText, { color: '#D1FAE5' }]}>Profil approuvé</Text>
              </View>
            )}
            {profile.identite_verifiee && (
              <View style={[styles.trustBadge, { backgroundColor: 'rgba(59,130,246,0.2)' }]}>
                <Ionicons name="shield-checkmark" size={12} color="#93C5FD" />
                <Text style={[styles.trustBadgeText, { color: '#DBEAFE' }]}>Identité vérifiée</Text>
              </View>
            )}
            {profile.entreprise_verifiee && (
              <View style={[styles.trustBadge, { backgroundColor: 'rgba(168,85,247,0.2)' }]}>
                <Ionicons name="business" size={12} color="#E9D5FF" />
                <Text style={[styles.trustBadgeText, { color: '#F3E8FF' }]}>Entreprise vérifiée</Text>
              </View>
            )}
          </View>
          {profile.ville && (
            <View style={styles.heroLocation}>
              <Ionicons name="location-outline" size={14} color="#fff" />
              <Text style={styles.heroLocationText}>{profile.ville}</Text>
            </View>
          )}
          {avgRating && (
            <View style={styles.heroRating}>
              <Ionicons name="star" size={14} color="#FCD34D" />
              <Text style={styles.heroRatingText}>{avgRating} ({reviews.length} avis)</Text>
            </View>
          )}
        </LinearGradient>

        {/* Stats de confiance */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.nb_prestations_completees || 0}</Text>
            <Text style={styles.statLabel}>Prestations</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{avgRating || '–'}</Text>
            <Text style={styles.statLabel}>Note moyenne</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.taux_reponse ? `${profile.taux_reponse}%` : '–'}</Text>
            <Text style={styles.statLabel}>Taux réponse</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{getAnciennete() || '–'}</Text>
            <Text style={styles.statLabel}>Ancienneté</Text>
          </View>
        </View>

        {/* Bouton contacter */}
        <TouchableOpacity style={styles.contactCta} onPress={handleContact}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
          <Text style={styles.contactCtaText}>Contacter</Text>
        </TouchableOpacity>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.tabContent}>
          {/* Présentation */}
          {activeTab === 'presentation' && (
            <>
              {profile.bio && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>À propos</Text>
                  <Text style={styles.cardText}>{profile.bio}</Text>
                </View>
              )}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Contact</Text>
                {profile.telephone && (
                  <View style={styles.infoRow}>
                    <Ionicons name="call-outline" size={16} color={COLORS.textLight} />
                    <Text style={styles.infoText}>{profile.telephone}</Text>
                  </View>
                )}
                {profile.email && (
                  <View style={styles.infoRow}>
                    <Ionicons name="mail-outline" size={16} color={COLORS.textLight} />
                    <Text style={styles.infoText}>{profile.email}</Text>
                  </View>
                )}
              </View>
              {profile.tarif_horaire_min && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Tarif</Text>
                  <Text style={[styles.cardText, { color: COLORS.accent, fontWeight: '700', fontSize: 18 }]}>
                    {profile.tarif_horaire_max
                      ? `${profile.tarif_horaire_min} – ${profile.tarif_horaire_max} MAD/h`
                      : `À partir de ${profile.tarif_horaire_min} MAD/h`}
                  </Text>
                </View>
              )}
              {(profile.equipe?.length > 0 || profile.rayon_deplacement_km || profile.materiel) && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Détails</Text>
                  {profile.equipe?.length > 0 && (
                    <View style={styles.infoRow}>
                      <Ionicons name="people-outline" size={16} color={COLORS.textLight} />
                      <Text style={styles.infoText}>
                        {profile.equipe[0] === 'solo' ? 'Travaille seul(e)' : profile.equipe[0] === 'equipe' ? 'Avec une équipe' : profile.equipe[0] === 'binome' ? 'Avec un binôme' : profile.equipe[0]}
                      </Text>
                    </View>
                  )}
                  {profile.rayon_deplacement_km && (
                    <View style={styles.infoRow}>
                      <Ionicons name="navigate-outline" size={16} color={COLORS.textLight} />
                      <Text style={styles.infoText}>Rayon de déplacement : {profile.rayon_deplacement_km} km</Text>
                    </View>
                  )}
                  {profile.materiel && (
                    <View style={styles.infoRow}>
                      <Ionicons name="camera-outline" size={16} color={COLORS.textLight} />
                      <Text style={styles.infoText}>{profile.materiel}</Text>
                    </View>
                  )}
                </View>
              )}
              {(profile.instagram || profile.facebook || profile.linkedin || profile.site_web) && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Réseaux sociaux</Text>
                  <View style={styles.socialRow}>
                    {profile.instagram && <Ionicons name="logo-instagram" size={22} color="#E4405F" />}
                    {profile.facebook && <Ionicons name="logo-facebook" size={22} color="#1877F2" />}
                    {profile.linkedin && <Ionicons name="logo-linkedin" size={22} color="#0A66C2" />}
                    {profile.site_web && <Ionicons name="globe-outline" size={22} color={COLORS.accent} />}
                  </View>
                </View>
              )}
              <TouchableOpacity
                style={styles.ctaBtn}
                onPress={() => router.push(`/client/demandes/nouvelle-demande` as any)}
              >
                <Ionicons name="paper-plane-outline" size={18} color="#fff" />
                <Text style={styles.ctaBtnText}>Poster une demande</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Portfolio */}
          {activeTab === 'portfolio' && (
            <>
              {portfolio.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="images-outline" size={48} color={COLORS.border} />
                  <Text style={styles.emptyText}>Aucune photo dans le portfolio</Text>
                </View>
              ) : (
                <View style={styles.grid}>
                  {portfolio.map((item: any) => (
                    <Image
                      key={item.id}
                      source={{ uri: item.url || item.photo_url }}
                      style={styles.gridImage}
                    />
                  ))}
                </View>
              )}
            </>
          )}

          {/* Packages */}
          {activeTab === 'packages' && (
            <>
              {packages.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="cube-outline" size={48} color={COLORS.border} />
                  <Text style={styles.emptyText}>Aucun package disponible</Text>
                </View>
              ) : (
                packages.map((pkg: any) => (
                  <View key={pkg.id} style={styles.card}>
                    <Text style={styles.pkgTitle}>{pkg.titre || pkg.nom}</Text>
                    {pkg.description && <Text style={styles.pkgDesc}>{pkg.description}</Text>}
                    <Text style={[styles.pkgPrice, { color: COLORS.accent }]}>
                      {pkg.prix_fixe} MAD
                    </Text>
                  </View>
                ))
              )}
            </>
          )}

          {/* Avis */}
          {activeTab === 'avis' && (
            <>
              {reviews.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="star-outline" size={48} color={COLORS.border} />
                  <Text style={styles.emptyText}>Aucun avis pour l'instant</Text>
                </View>
              ) : (
                reviews.map((rev: any) => (
                  <View key={rev.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewAuthor}>{rev.auteur?.nom || 'Client'}</Text>
                      <View style={styles.starRow}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Ionicons key={i} name="star" size={14} color={i < rev.note ? '#FCD34D' : COLORS.border} />
                        ))}
                      </View>
                    </View>
                    {rev.commentaire && <Text style={styles.reviewText}>{rev.commentaire}</Text>}
                    <Text style={styles.reviewDate}>
                      {new Date(rev.created_at).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 80;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroBanner: {
    paddingTop: 16, paddingBottom: 28, alignItems: 'center', position: 'relative',
  },
  backBtn: { position: 'absolute', top: 16, left: 16, padding: 4 },
  favBtn: { position: 'absolute', top: 16, right: 16, padding: 4 },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, borderWidth: 3, borderColor: '#fff', marginTop: 20 },
  avatarPlaceholder: { backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  heroName: { fontSize: 20, fontWeight: '700', color: '#fff', marginTop: 10 },
  heroLocation: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  heroLocationText: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  heroRating: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  heroRatingText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  tabsContainer: { backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { paddingHorizontal: 16, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  tabText: { fontSize: 14, color: COLORS.textLight, fontWeight: '500' },
  tabTextActive: { color: COLORS.accent, fontWeight: '700' },
  tabContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  cardTitle: { fontSize: 12, color: COLORS.textLight, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardText: { fontSize: 15, color: COLORS.text, lineHeight: 22 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  infoText: { fontSize: 14, color: COLORS.textLight },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.accent, paddingVertical: 15, borderRadius: 12, gap: 8, marginTop: 4,
  },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  gridImage: { width: (width - 40) / 3, height: (width - 40) / 3, borderRadius: 8 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textLight },
  pkgTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  pkgDesc: { fontSize: 14, color: COLORS.textLight, marginBottom: 8 },
  pkgPrice: { fontSize: 18, fontWeight: '700' },
  reviewCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  reviewAuthor: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  starRow: { flexDirection: 'row', gap: 2 },
  reviewText: { fontSize: 14, color: COLORS.textLight, lineHeight: 20 },
  reviewDate: { fontSize: 12, color: COLORS.border, marginTop: 6 },
  heroBadgesRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 8 },
  trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  trustBadgeText: { fontSize: 11, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 12, gap: 8 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.accent },
  statLabel: { fontSize: 11, color: COLORS.textLight, marginTop: 2, textAlign: 'center' },
  contactCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.accent, marginHorizontal: 12, marginTop: 12, marginBottom: 4,
    paddingVertical: 12, borderRadius: 12,
  },
  contactCtaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  socialRow: { flexDirection: 'row', gap: 14, marginTop: 4 },
});
