import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, Image } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import FooterPresta from '../../components/FooterPresta';

interface Annonce {
  id: string;
  titre: string;
  description: string;
  actif: boolean;
  tarif_unit?: number;
  unit_tarif?: string;
  prix_fixe?: number;
  acompte_percent?: number;
  equipement?: string;
  conditions_annulation?: string;
  photos?: string[];
  rate?: number;
  vues?: number;
  created_at?: string;
  prestations?: {
    nom: string;
    type: string;
  };
  zones_intervention?: Array<{
    id: string;
    ville_centre: string;
    rayon_km: number;
    active: boolean;
  }>;
}

export default function PrestationsPrestataire() {
  const [loading, setLoading] = useState(true);
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchAnnonces();
  }, []);

  // Rafraîchir les annonces à chaque fois que la page est affichée
  useFocusEffect(
    useCallback(() => {
      fetchAnnonces();
    }, [])
  );

  const fetchAnnonces = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('annonces')
      .select(`
        id, titre, description, photos, tarif_unit, unit_tarif, prix_fixe, 
        acompte_percent, equipement, actif, conditions_annulation, rate, vues, created_at,
        prestations(nom, type),
        zones_intervention(id, ville_centre, rayon_km, active)
      `)
      .eq('prestataire', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const formattedData = data.map((annonce: any) => ({
        ...annonce,
        prestations: Array.isArray(annonce.prestations) ? annonce.prestations[0] : annonce.prestations,
        zones_intervention: annonce.zones_intervention || []
      }));
      setAnnonces(formattedData);
    }
    setLoading(false);
  };

  const handleCheck = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selId => selId !== id));
    }
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      // Supprimer les zones d'intervention associées
      const { error: zonesError } = await supabase
        .from('zones_intervention')
        .delete()
        .in('annonce_id', selectedIds);
      
      if (zonesError) {
        Alert.alert('Erreur', 'Erreur lors de la suppression des zones');
        return;
      }
      
      // Supprimer les annonces
      const { error } = await supabase
        .from('annonces')
        .delete()
        .in('id', selectedIds);
      
      if (!error) {
        setAnnonces(prev => prev.filter(a => !selectedIds.includes(a.id)));
        setSelectedIds([]);
        Alert.alert('Succès', `${selectedIds.length} annonce(s) supprimée(s)`);
      } else {
        Alert.alert('Erreur', 'Impossible de supprimer les annonces');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
    
    setShowDeleteConfirm(false);
  };

  const handleDisable = async () => {
    if (selectedIds.length === 0) return;
    
    const { error } = await supabase
      .from('annonces')
      .update({ actif: false })
      .in('id', selectedIds);
    
    if (!error) {
      setAnnonces(prev =>
        prev.map(a => selectedIds.includes(a.id) ? { ...a, actif: false } : a)
      );
      setSelectedIds([]);
      Alert.alert('Succès', 'Annonce(s) désactivée(s)');
    } else {
      Alert.alert('Erreur', 'Impossible de désactiver les annonces');
    }
    
    setShowDisableConfirm(false);
  };

  const handleReactivate = async () => {
    if (selectedIds.length === 0) return;
    
    const { error } = await supabase
      .from('annonces')
      .update({ actif: true })
      .in('id', selectedIds);
    
    if (!error) {
      setAnnonces(prev =>
        prev.map(a => selectedIds.includes(a.id) ? { ...a, actif: true } : a)
      );
      setSelectedIds([]);
      Alert.alert('Succès', 'Annonce(s) réactivée(s)');
    } else {
      Alert.alert('Erreur', 'Impossible de réactiver les annonces');
    }
    
    setShowDisableConfirm(false);
  };

  const handleDuplicate = async (annonceId: string) => {
    try {
      const { data: annonceDetails, error: fetchError } = await supabase
        .from('annonces')
        .select(`
          *, 
          prestations(nom, type),
          zones_intervention(id, ville_centre, rayon_km, active)
        `)
        .eq('id', annonceId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Créer la copie de l'annonce
      const { prestation, id, created_at, prestations, zones_intervention, ...annonceData } = annonceDetails;
      const { data: newAnnonce, error: insertError } = await supabase
        .from('annonces')
        .insert({
          ...annonceData,
          titre: `${annonceDetails.titre} (Copie)`,
          prestataire: user.id,
          actif: false,
          prestation: annonceDetails.prestation
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      // Dupliquer les zones d'intervention
      if (zones_intervention && zones_intervention.length > 0) {
        const zonesData = zones_intervention.map((zone: any) => ({
          annonce_id: newAnnonce.id,
          ville_centre: zone.ville_centre,
          rayon_km: zone.rayon_km,
          active: zone.active
        }));
        
        await supabase.from('zones_intervention').insert(zonesData);
      }
      
      Alert.alert('Succès', 'Annonce dupliquée avec succès');
      fetchAnnonces();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de dupliquer l\'annonce');
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
          
          {/* Boutons d'actions groupées */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/annonces/create' as any)}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Ajouter une annonce</Text>
            </TouchableOpacity>
            
            {selectedIds.length > 0 && (
              <View style={styles.bulkActionsContainer}>
                <Text style={styles.selectedCount}>{selectedIds.length} sélectionnée(s)</Text>
                
                <TouchableOpacity
                  style={[styles.bulkActionButton, styles.deleteButton]}
                  onPress={() => setShowDeleteConfirm(true)}
                >
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                  <Text style={styles.bulkActionText}>Supprimer</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.bulkActionButton, styles.disableButton]}
                  onPress={() => setShowDisableConfirm(true)}
                >
                  <Ionicons name="ban-outline" size={18} color="#fff" />
                  <Text style={styles.bulkActionText}>
                    {annonces.find(a => selectedIds.includes(a.id))?.actif ? 'Désactiver' : 'Réactiver'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <ScrollView style={styles.list}>
          {annonces.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📢</Text>
              <Text style={styles.emptyText}>Aucune annonce créée</Text>
            </View>
          ) : (
            annonces.map((annonce) => (
              <View key={annonce.id} style={[styles.card, !annonce.actif && styles.cardInactive]}>
                {/* Checkbox de sélection */}
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => handleCheck(annonce.id, !selectedIds.includes(annonce.id))}
                >
                  <Ionicons
                    name={selectedIds.includes(annonce.id) ? 'checkbox' : 'square-outline'}
                    size={24}
                    color="#5C6BC0"
                  />
                </TouchableOpacity>

                {/* Photos de l'annonce */}
                {annonce.photos && annonce.photos.length > 0 && (
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.photosScrollView}
                    contentContainerStyle={styles.photosContainer}
                  >
                    {annonce.photos.map((photo: any, index: number) => {
                      let photoUri = '';
                      
                      if (typeof photo === 'string') {
                        if (photo.startsWith('data:')) {
                          photoUri = photo;
                        } else if (photo.startsWith('http://') || photo.startsWith('https://')) {
                          photoUri = photo;
                        } else {
                          // Base64 sans préfixe
                          photoUri = `data:image/jpeg;base64,${photo}`;
                        }
                      }
                      
                      return (
                        <View key={index} style={styles.photoWrapper}>
                          {photoUri ? (
                            <Image source={{ uri: photoUri }} style={styles.annoncePhoto} />
                          ) : (
                            <View style={[styles.annoncePhoto, styles.photoPlaceholder]}>
                              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                            </View>
                          )}
                          {index === 0 && (
                            <View style={styles.mainPhotoLabel}>
                              <Text style={styles.mainPhotoText}>Principal</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </ScrollView>
                )}

                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardTitle}>{annonce.titre}</Text>
                    {annonce.prestations && (
                      <Text style={styles.prestationType}>
                        {annonce.prestations.nom} • {annonce.prestations.type}
                      </Text>
                    )}
                    <Text style={styles.cardDescription} numberOfLines={2}>
                      {annonce.description}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: annonce.actif ? '#10B981' : '#9CA3AF' }]}>
                    <Text style={styles.statusText}>
                      {annonce.actif ? 'Actif' : 'Inactif'}
                    </Text>
                  </View>
                </View>

                {/* Tarifs et info */}
                <View style={styles.detailsSection}>
                  {annonce.tarif_unit && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Tarif unitaire:</Text>
                      <Text style={styles.detailValue}>
                        {annonce.tarif_unit} MAD/{annonce.unit_tarif === 'demi_journee' ? 'demi journée' : 
                         annonce.unit_tarif === 'seance' ? 'séance' : annonce.unit_tarif}
                      </Text>
                    </View>
                  )}
                  {annonce.prix_fixe && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Prix fixe:</Text>
                      <Text style={styles.detailValue}>{annonce.prix_fixe} MAD</Text>
                    </View>
                  )}
                  {annonce.acompte_percent && annonce.acompte_percent > 0 && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Acompte:</Text>
                      <Text style={styles.detailValue}>{annonce.acompte_percent}%</Text>
                    </View>
                  )}
                  {annonce.equipement && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Équipement:</Text>
                      <Text style={styles.detailValue} numberOfLines={2}>{annonce.equipement}</Text>
                    </View>
                  )}
                  {annonce.conditions_annulation && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Annulation:</Text>
                      <View style={[
                        styles.conditionBadge,
                        {
                          backgroundColor: annonce.conditions_annulation === 'Flexible' ? '#d1fae5' :
                                         annonce.conditions_annulation === 'Modéré' ? '#fef3c7' : '#fee2e2'
                        }
                      ]}>
                        <Text style={[
                          styles.conditionText,
                          {
                            color: annonce.conditions_annulation === 'Flexible' ? '#065f46' :
                                   annonce.conditions_annulation === 'Modéré' ? '#92400e' : '#991b1b'
                          }
                        ]}>
                          {annonce.conditions_annulation}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Zones d'intervention */}
                {annonce.zones_intervention && annonce.zones_intervention.filter(z => z.active !== false).length > 0 && (
                  <View style={styles.zonesSection}>
                    <Text style={styles.zonesLabel}>Zones d'intervention:</Text>
                    <View style={styles.zonesContainer}>
                      {annonce.zones_intervention.filter(z => z.active !== false).map((zone) => (
                        <View key={zone.id} style={styles.zoneBadge}>
                          <Text style={styles.zoneText}>
                            {zone.ville_centre} ({zone.rayon_km} km)
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Stats */}
                <View style={styles.cardInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>⭐</Text>
                    <Text style={styles.infoText}>{annonce.rate || 0}/5</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoIcon}>👁️</Text>
                    <Text style={styles.infoText}>{annonce.vues || 0} vues</Text>
                  </View>
                </View>

                {/* Date de création */}
                {annonce.created_at && (
                  <View style={styles.dateContainer}>
                    <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                    <Text style={styles.dateText}>
                      Créée le {new Date(annonce.created_at).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })} à {new Date(annonce.created_at).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                )}

                {/* Boutons d'action par annonce */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.previewButton]}
                    onPress={() => router.push({
                      pathname: '/prestataires/annonce-preview',
                      params: { id: annonce.id }
                    } as any)}
                  >
                    <Ionicons name="eye-outline" size={16} color="#5C6BC0" />
                    <Text style={styles.actionButtonText}>Aperçu</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.duplicateButton]}
                    onPress={() => handleDuplicate(annonce.id)}
                  >
                    <Ionicons name="copy-outline" size={16} color="#10B981" />
                    <Text style={[styles.actionButtonText, { color: '#10B981' }]}>Dupliquer</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => router.push({
                      pathname: '/annonces/edit',
                      params: { id: annonce.id }
                    } as any)}
                  >
                    <Ionicons name="pencil-outline" size={16} color="#F59E0B" />
                    <Text style={[styles.actionButtonText, { color: '#F59E0B' }]}>Modifier</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
      
      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="warning-outline" size={48} color="#EF4444" />
            <Text style={styles.modalTitle}>Confirmer la suppression</Text>
            <Text style={styles.modalMessage}>
              Voulez-vous vraiment supprimer {selectedIds.length} annonce(s) ?
              Cette action est irréversible.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleDelete}
              >
                <Text style={styles.modalConfirmText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      
      {/* Modal de confirmation de désactivation/réactivation */}
      {showDisableConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons 
              name="information-circle-outline" 
              size={48} 
              color="#F59E0B" 
            />
            <Text style={styles.modalTitle}>
              {annonces.find(a => selectedIds.includes(a.id))?.actif 
                ? 'Désactiver les annonces' 
                : 'Réactiver les annonces'}
            </Text>
            <Text style={styles.modalMessage}>
              Voulez-vous {annonces.find(a => selectedIds.includes(a.id))?.actif 
                ? 'désactiver' 
                : 'réactiver'} {selectedIds.length} annonce(s) ?
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowDisableConfirm(false)}
              >
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={
                  annonces.find(a => selectedIds.includes(a.id))?.actif 
                    ? handleDisable 
                    : handleReactivate
                }
              >
                <Text style={styles.modalConfirmText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      
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
    padding: 20,
    paddingTop: 70,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    marginBottom: 20
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 16
  },
  actionsContainer: {
    gap: 12
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#5C6BC0',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#5C6BC0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  },
  bulkActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5C6BC0',
    marginRight: 8
  },
  bulkActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  deleteButton: {
    backgroundColor: '#EF4444'
  },
  disableButton: {
    backgroundColor: '#F59E0B'
  },
  bulkActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff'
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
    elevation: 2,
    position: 'relative'
  },
  checkbox: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    padding: 4
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 60
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
    borderRadius: 12,
    position: 'absolute',
    top: 0,
    right: 44
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
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB'
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1
  },
  previewButton: {
    backgroundColor: '#EEF2FF',
    borderColor: '#5C6BC0'
  },
  duplicateButton: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981'
  },
  editButton: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B'
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5C6BC0'
  },
  cardInactive: {
    opacity: 0.6,
    backgroundColor: '#F3F3F3'
  },
  prestationType: {
    fontSize: 13,
    color: '#5C6BC0',
    fontWeight: '500',
    marginBottom: 4
  },
  detailsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB'
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  detailLabel: {
    fontSize: 14,
    color: '#717171',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: 14,
    color: '#222222',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  conditionText: {
    fontSize: 12,
    fontWeight: '600'
  },
  zonesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB'
  },
  zonesLabel: {
    fontSize: 14,
    color: '#717171',
    fontWeight: '500',
    marginBottom: 8
  },
  zonesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  zoneBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a5d6a7'
  },
  zoneText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2e7d32'
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center'
  },
  modalMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6'
  },
  modalConfirmButton: {
    backgroundColor: '#EF4444'
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280'
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
    marginTop: 8
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic'
  },
  photosScrollView: {
    marginBottom: 12
  },
  photosContainer: {
    paddingHorizontal: 0,
    gap: 8
  },
  photoWrapper: {
    position: 'relative',
    marginRight: 8
  },
  annoncePhoto: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F3F4F6'
  },
  photoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  mainPhotoLabel: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(92, 107, 192, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  mainPhotoText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff'
  }
});
