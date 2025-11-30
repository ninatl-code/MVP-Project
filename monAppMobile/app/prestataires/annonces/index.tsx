import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, FlatList, Image, Alert, Modal, TextInput, ScrollView, Switch } from 'react-native';
import { supabase } from '../../../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import FooterPresta from '../../../components/FooterPresta';

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
  info: '#3B82F6'
};

// Fonction pour normaliser les URLs de photos
function normalizePhotoUrl(photoUrl: string | null | undefined): string | null {
  if (!photoUrl || typeof photoUrl !== 'string') return null;
  
  // Si c'est déjà une URL complète, la retourner
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
    return photoUrl;
  }
  
  // Si c'est déjà une data URL, la retourner
  if (photoUrl.startsWith('data:')) {
    return photoUrl;
  }
  
  // Si c'est du base64 sans préfixe, ajouter le préfixe
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  if (photoUrl.length > 100 && base64Regex.test(photoUrl.slice(0, 100))) {
    // Détecter le type MIME depuis les premiers caractères
    let mimeType = 'image/jpeg'; // Par défaut
    if (photoUrl.startsWith('iVBOR')) {
      mimeType = 'image/png';
    } else if (photoUrl.startsWith('/9j/')) {
      mimeType = 'image/jpeg';
    }
    return `data:${mimeType};base64,${photoUrl}`;
  }
  
  return null;
}

interface Annonce {
  id: string;
  titre: string;
  description: string;
  photo_couverture?: string;
  tarif_unit?: number;
  unit_tarif?: string;
  actif: boolean;
  vues?: number;
  prestation?: number;
  prestation_nom?: string;
  equipement?: string;
  conditions_annulation?: string;
  acompte_percent?: number;
  prix_fixe?: boolean;
  nb_heure?: number;
}

export default function AnnoncesPrestataire() {
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAnnonce, setEditingAnnonce] = useState<Annonce | null>(null);
  const [prestations, setPrestations] = useState<any[]>([]);
  const router = useRouter();

  // Form states
  const [titre, setTitre] = useState('');
  const [description, setDescription] = useState('');
  const [tarif, setTarif] = useState('');
  const [unitTarif, setUnitTarif] = useState('heure');
  const [prixFixe, setPrixFixe] = useState(false);
  const [actif, setActif] = useState(true);
  const [equipement, setEquipement] = useState('');
  const [conditionsAnnulation, setConditionsAnnulation] = useState('');
  const [acompte, setAcompte] = useState('');
  const [selectedPrestation, setSelectedPrestation] = useState<number | null>(null);
  const [nbHeure, setNbHeure] = useState('');

  useEffect(() => {
    fetchAnnonces();
    fetchPrestations();
  }, []);

  const fetchPrestations = async () => {
    const { data } = await supabase.from('prestations').select('id, nom').order('nom', { ascending: true });
    if (data) setPrestations(data);
  };

  const fetchAnnonces = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace('/login');
      return;
    }

    console.log('🔍 Fetching annonces for user:', user.id);
    
    // OPTIMISATION: Requête minimale avec photo de couverture
    const { data, error } = await supabase
      .from('annonces')
      .select(`
        id,
        titre,
        description,
        photo_couverture,
        tarif_unit,
        unit_tarif,
        actif,
        vues,
        prestation,
        prestations(nom)
      `)
      .eq('prestataire', user.id)
      .order('created_at', { ascending: false });

    console.log('📢 Annonces fetched:', {
      count: data?.length || 0,
      error: error?.message || null,
      firstAnnonce: data?.[0] ? {
        id: data[0].id,
        titre: data[0].titre,
        actif: data[0].actif,
        prestation: data[0].prestation
      } : null
    });

    if (error) {
      console.error('❌ Error fetching annonces:', error);
      Alert.alert('Erreur', `Impossible de charger les annonces: ${error.message}`);
      setAnnonces([]);
    } else if (data) {
      const formatted = data.map((a: any) => ({
        ...a,
        prestation_nom: Array.isArray(a.prestations) ? a.prestations[0]?.nom : a.prestations?.nom
      }));
      setAnnonces(formatted);
      console.log('✅ Annonces chargées et formatées:', {
        total: formatted.length,
        actives: formatted.filter((a: Annonce) => a.actif).length,
        inactives: formatted.filter((a: Annonce) => !a.actif).length
      });
      if (formatted.length === 0) {
        console.log('⚠️ Aucune annonce trouvée pour cet utilisateur. Vérifiez la base de données.');
      }
    } else {
      console.log('⚠️ Aucune donnée retournée');
      setAnnonces([]);
    }

    setLoading(false);
  };

  const handleEdit = (annonce: Annonce) => {
    setEditingAnnonce(annonce);
    setTitre(annonce.titre);
    setDescription(annonce.description || '');
    setTarif(String(annonce.tarif_unit || ''));
    setUnitTarif(annonce.unit_tarif || 'heure');
    setPrixFixe(annonce.prix_fixe || false);
    setActif(annonce.actif);
    setEquipement(annonce.equipement || '');
    setConditionsAnnulation(annonce.conditions_annulation || '');
    setAcompte(String(annonce.acompte_percent || ''));
    setSelectedPrestation(annonce.prestation || null);
    setNbHeure(String(annonce.nb_heure || ''));
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAnnonce || !titre.trim()) {
      Alert.alert('Erreur', 'Le titre est obligatoire');
      return;
    }

    const { error } = await supabase
      .from('annonces')
      .update({
        titre,
        description,
        tarif_unit: tarif ? parseFloat(tarif) : null,
        unit_tarif: unitTarif,
        prix_fixe: prixFixe,
        actif,
        equipement,
        conditions_annulation: conditionsAnnulation,
        acompte_percent: acompte ? parseFloat(acompte) : null,
        prestation: selectedPrestation,
        nb_heure: nbHeure ? parseFloat(nbHeure) : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingAnnonce.id);

    if (error) {
      console.error('Error updating annonce:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour l\'annonce');
      return;
    }

    Alert.alert('Succès', 'Annonce mise à jour avec succès');
    setShowEditModal(false);
    fetchAnnonces();
  };

  const handleDuplicate = async (annonce: Annonce) => {
    Alert.alert(
      'Dupliquer l\'annonce',
      `Voulez-vous dupliquer "${annonce.titre}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Dupliquer',
          onPress: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Charger les détails complets uniquement lors de la duplication
            const { data: fullAnnonce } = await supabase
              .from('annonces')
              .select('photos, equipement, conditions_annulation, acompte_percent, prix_fixe, nb_heure')
              .eq('id', annonce.id)
              .single();

            const { error } = await supabase.from('annonces').insert({
              titre: `${annonce.titre} (copie)`,
              description: annonce.description,
              tarif_unit: annonce.tarif_unit,
              unit_tarif: annonce.unit_tarif,
              photos: fullAnnonce?.photos || [],
              actif: false,
              prestation: annonce.prestation,
              equipement: fullAnnonce?.equipement,
              conditions_annulation: fullAnnonce?.conditions_annulation,
              acompte_percent: fullAnnonce?.acompte_percent,
              prix_fixe: fullAnnonce?.prix_fixe,
              nb_heure: fullAnnonce?.nb_heure,
              prestataire: user.id
            });

            if (error) {
              Alert.alert('Erreur', 'Impossible de dupliquer l\'annonce');
            } else {
              Alert.alert('Succès', 'Annonce dupliquée avec succès');
              fetchAnnonces();
            }
          }
        }
      ]
    );
  };

  const handleToggleActive = async (annonce: Annonce) => {
    const { error } = await supabase
      .from('annonces')
      .update({ actif: !annonce.actif, updated_at: new Date().toISOString() })
      .eq('id', annonce.id);

    if (error) {
      Alert.alert('Erreur', 'Impossible de changer le statut');
    } else {
      fetchAnnonces();
    }
  };

  const handleDelete = (annonce: Annonce) => {
    Alert.alert(
      'Supprimer l\'annonce',
      `Êtes-vous sûr de vouloir supprimer "${annonce.titre}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('annonces').delete().eq('id', annonce.id);
            if (error) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'annonce');
            } else {
              Alert.alert('Succès', 'Annonce supprimée');
              fetchAnnonces();
            }
          }
        }
      ]
    );
  };

  const filteredAnnonces = annonces.filter(a => {
    if (filter === 'active') return a.actif;
    if (filter === 'inactive') return !a.actif;
    return true;
  });

  const renderAnnonceItem = ({ item }: { item: Annonce }) => (
    <View style={styles.annonceCard}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={() => router.push(`/prestataires/annonces/${item.id}` as any)}
      >
        {/* Photo de couverture */}
        {item.photo_couverture ? (
          <Image
            source={{ uri: normalizePhotoUrl(item.photo_couverture) || undefined }}
            style={styles.thumbnail}
          />
        ) : (
          <View style={[styles.thumbnail, styles.noImage]}>
            <Ionicons name="camera-outline" size={32} color={COLORS.textLight} />
          </View>
        )}

          <View style={styles.cardInfo}>
            <View style={styles.cardHeader}>
              <Text style={styles.annonceTitle} numberOfLines={2}>{item.titre}</Text>
              <View style={[styles.statusDot, { backgroundColor: item.actif ? COLORS.success : COLORS.textLight }]} />
            </View>

            {item.prestation_nom && (
              <Text style={styles.category}>{item.prestation_nom}</Text>
            )}

            <Text style={styles.annonceDescription} numberOfLines={2}>{item.description}</Text>

            <View style={styles.cardFooter}>
              <Text style={styles.price}>
                {item.tarif_unit ? `${item.tarif_unit}€/${item.unit_tarif}` : 'Sur devis'}
              </Text>
              <View style={styles.stats}>
                <Ionicons name="eye-outline" size={14} color={COLORS.textLight} />
                <Text style={styles.statsText}>{item.vues || 0}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit(item)}>
            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleDuplicate(item)}>
            <Ionicons name="copy-outline" size={20} color={COLORS.info} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleToggleActive(item)}>
            <Ionicons name={item.actif ? 'eye-off-outline' : 'eye-outline'} size={20} color={COLORS.warning} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item)}>
            <Ionicons name="trash-outline" size={20} color={COLORS.error} />
          </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={[COLORS.primary, COLORS.accent]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mes Annonces</Text>
          <Text style={styles.headerSubtitle}>{filteredAnnonces.length} annonce{filteredAnnonces.length > 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/prestataires/prestations' as any)}>
          <Ionicons name="add-circle" size={28} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Filtres */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Toutes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>Actives</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'inactive' && styles.filterButtonActive]}
          onPress={() => setFilter('inactive')}
        >
          <Text style={[styles.filterText, filter === 'inactive' && styles.filterTextActive]}>Inactives</Text>
        </TouchableOpacity>
      </View>

      {/* Liste */}
      {filteredAnnonces.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="megaphone-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>Aucune annonce</Text>
          <Text style={styles.emptySubtitle}>
            {filter === 'all' ? 'Créez votre première annonce' : `Aucune annonce ${filter === 'active' ? 'active' : 'inactive'}`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredAnnonces}
          renderItem={renderAnnonceItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Modal Edition */}
      <Modal visible={showEditModal} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Modifier l'annonce</Text>
            <TouchableOpacity onPress={handleSaveEdit} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Titre *</Text>
              <TextInput
                style={styles.input}
                value={titre}
                onChangeText={setTitre}
                placeholder="Titre de votre annonce"
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Prestation</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {prestations.map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.chip, selectedPrestation === p.id && styles.chipActive]}
                    onPress={() => setSelectedPrestation(p.id)}
                  >
                    <Text style={[styles.chipText, selectedPrestation === p.id && styles.chipTextActive]}>
                      {p.nom}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Décrivez votre prestation..."
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Prix fixe</Text>
                <Switch value={prixFixe} onValueChange={setPrixFixe} />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Tarif</Text>
                <TextInput
                  style={styles.input}
                  value={tarif}
                  onChangeText={setTarif}
                  placeholder="0"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>Unité</Text>
                <TextInput
                  style={styles.input}
                  value={unitTarif}
                  onChangeText={setUnitTarif}
                  placeholder="heure"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Acompte (%)</Text>
              <TextInput
                style={styles.input}
                value={acompte}
                onChangeText={setAcompte}
                placeholder="0"
                placeholderTextColor={COLORS.textLight}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre d'heures</Text>
              <TextInput
                style={styles.input}
                value={nbHeure}
                onChangeText={setNbHeure}
                placeholder="0"
                placeholderTextColor={COLORS.textLight}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Équipement fourni</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={equipement}
                onChangeText={setEquipement}
                placeholder="Équipement inclus..."
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Conditions d'annulation</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={conditionsAnnulation}
                onChangeText={setConditionsAnnulation}
                placeholder="Vos conditions d'annulation..."
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchRow}>
                <Text style={styles.label}>Annonce active</Text>
                <Switch value={actif} onValueChange={setActif} />
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <FooterPresta />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 8 },
  headerContent: { flex: 1, marginHorizontal: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  addButton: { padding: 8 },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  filterButton: { flex: 1, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: COLORS.backgroundLight, alignItems: 'center' },
  filterButtonActive: { backgroundColor: COLORS.text },
  filterText: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  filterTextActive: { color: 'white' },
  listContent: { padding: 16, paddingBottom: 80 },
  annonceCard: { backgroundColor: 'white', borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  cardContent: { flexDirection: 'row', padding: 12 },
  thumbnail: { width: 100, height: 100, borderRadius: 8 },
  noImage: { backgroundColor: COLORS.backgroundLight, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  annonceTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, flex: 1, marginRight: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  category: { fontSize: 12, color: COLORS.primary, fontWeight: '500', marginTop: 4 },
  annonceDescription: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  price: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statsText: { fontSize: 12, color: COLORS.textLight },
  cardActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border, paddingVertical: 8, paddingHorizontal: 12, justifyContent: 'space-around' },
  actionButton: { padding: 8 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: COLORS.textLight, marginTop: 8, textAlign: 'center' },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, flex: 1, textAlign: 'center' },
  saveButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.primary, borderRadius: 8 },
  saveButtonText: { fontSize: 14, fontWeight: '600', color: 'white' },
  modalBody: { flex: 1, padding: 16 },
  formGroup: { marginBottom: 16 },
  formRow: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  input: { backgroundColor: COLORS.backgroundLight, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, fontSize: 15, color: COLORS.text },
  textArea: { height: 100, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.backgroundLight, borderRadius: 20, marginRight: 8 },
  chipActive: { backgroundColor: COLORS.primary },
  chipText: { fontSize: 14, color: COLORS.text },
  chipTextActive: { color: 'white', fontWeight: '600' }
});
