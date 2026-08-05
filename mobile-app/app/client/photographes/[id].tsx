import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, Image, Alert, Dimensions
} from 'react-native';
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

      const [{ data: packs }, { data: portf }, { data: revs }] = await Promise.all([
        supabase.from('packages_types').select('*').eq('prestataire_id', id).eq('actif', true).order('prix_fixe', { ascending: true }),
        supabase.from('portfolio').select('*').eq('prestataire_id', id).order('created_at', { ascending: false }).limit(12),
        supabase.from('reviews_presta').select('*, auteur:profiles!reviews_presta_auteur_id_fkey(nom, avatar_url)').eq('prestataire_id', id).order('created_at', { ascending: false }).limit(20),
      ]);

      setPackages(packs || []);
      setPortfolio(portf || []);
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
      <ScrollView stickyHeaderIndices={[1]}>
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
                    À partir de {profile.tarif_horaire_min} MAD/h
                  </Text>
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
});
