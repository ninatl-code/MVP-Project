import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabaseClient';
import StarRating from '@/components/avis/StarRating';
import FooterParti from '@/components/client/FooterParti';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#222222',
  textLight: '#717171',
  border: '#EBEBEB',
};

interface AvisItem {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  provider_response?: string;
  prestataire?: { nom: string; avatar_url?: string };
}

export default function MesAvisScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avis, setAvis] = useState<AvisItem[]>([]);

  const loadAvis = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('reviews_presta')
        .select('*, prestataire:profiles!reviews_presta_prestataire_id_fkey(nom, avatar_url)')
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvis(data || []);
    } catch (error) {
      console.error('Erreur chargement avis:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    loadAvis();
  }, [loadAvis]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAvis();
  };

  const renderItem = ({ item }: { item: AvisItem }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.prestataireNom}>{item.prestataire?.nom || 'Prestataire'}</Text>
        <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('fr-FR')}</Text>
      </View>
      <StarRating rating={item.rating || 0} size={18} />
      {!!item.comment && <Text style={styles.comment}>{item.comment}</Text>}
      {!!item.provider_response && (
        <View style={styles.responseBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={COLORS.primary} />
          <Text style={styles.responseText}>{item.provider_response}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes avis</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <FlatList
        data={avis}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="star-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Aucun avis</Text>
            <Text style={styles.emptyText}>Vous n'avez pas encore laissé d'avis</Text>
          </View>
        }
      />
      <FooterParti />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prestataireNom: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  date: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  comment: {
    fontSize: 14,
    color: COLORS.text,
    marginTop: 8,
    lineHeight: 20,
  },
  responseBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 12,
    padding: 10,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
  },
  responseText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textLight,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});
