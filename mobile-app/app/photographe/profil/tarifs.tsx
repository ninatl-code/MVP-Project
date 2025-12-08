import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';

interface TarifPackage {
  id: string;
  nom: string;
  description: string;
  duree_heures: number;
  prix: number;
  inclus: string[];
  actif: boolean;
}

export default function TarifsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [budgetMin, setBudgetMin] = useState('');
  const [packages, setPackages] = useState<TarifPackage[]>([]);
  const [editingPackage, setEditingPackage] = useState<TarifPackage | null>(null);
  const [showPackageForm, setShowPackageForm] = useState(false);

  // Form states
  const [nomPackage, setNomPackage] = useState('');
  const [descPackage, setDescPackage] = useState('');
  const [dureePackage, setDureePackage] = useState('');
  const [prixPackage, setPrixPackage] = useState('');
  const [inclusItems, setInclusItems] = useState<string[]>(['']);

  useEffect(() => {
    loadTarifs();
  }, []);

  const loadTarifs = async () => {
    try {
      setLoading(true);

      const { data: profil, error: profilError } = await supabase
        .from('profils_photographe')
        .select('budget_min_prestation')
        .eq('user_id', user?.id)
        .single();

      if (profilError) throw profilError;

      setBudgetMin(profil?.budget_min_prestation?.toString() || '');

      const { data: packagesData, error: packagesError } = await supabase
        .from('packages_types')
        .select('*')
        .eq('photographe_id', user?.id)
        .order('prix', { ascending: true });

      if (packagesError) throw packagesError;

      setPackages(packagesData || []);
    } catch (error: any) {
      console.error('❌ Erreur chargement tarifs:', error);
      Alert.alert('Erreur', 'Impossible de charger les tarifs');
    } finally {
      setLoading(false);
    }
  };

  const saveBudgetMin = async () => {
    if (!budgetMin.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un budget minimum');
      return;
    }

    const budget = parseFloat(budgetMin);
    if (isNaN(budget) || budget < 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide');
      return;
    }

    try {
      const { error } = await supabase
        .from('profils_photographe')
        .update({ budget_min_prestation: budget })
        .eq('user_id', user?.id);

      if (error) throw error;

      Alert.alert('Succès', 'Budget minimum enregistré');
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde budget:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer le budget');
    }
  };

  const openPackageForm = (pkg?: TarifPackage) => {
    if (pkg) {
      setEditingPackage(pkg);
      setNomPackage(pkg.nom);
      setDescPackage(pkg.description);
      setDureePackage(pkg.duree_heures.toString());
      setPrixPackage(pkg.prix.toString());
      setInclusItems(pkg.inclus);
    } else {
      setEditingPackage(null);
      setNomPackage('');
      setDescPackage('');
      setDureePackage('');
      setPrixPackage('');
      setInclusItems(['']);
    }
    setShowPackageForm(true);
  };

  const savePackage = async () => {
    if (!nomPackage.trim() || !prixPackage.trim() || !dureePackage.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const prix = parseFloat(prixPackage);
    const duree = parseFloat(dureePackage);

    if (isNaN(prix) || prix <= 0 || isNaN(duree) || duree <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir des valeurs valides');
      return;
    }

    const inclusFiltered = inclusItems.filter((item) => item.trim() !== '');

    try {
      if (editingPackage) {
        // Update existing package
        const { error } = await supabase
          .from('packages_types')
          .update({
            nom: nomPackage,
            description: descPackage,
            duree_heures: duree,
            prix,
            inclus: inclusFiltered,
          })
          .eq('id', editingPackage.id);

        if (error) throw error;
        Alert.alert('Succès', 'Package mis à jour');
      } else {
        // Create new package
        const { error } = await supabase.from('packages_types').insert({
          photographe_id: user?.id,
          nom: nomPackage,
          description: descPackage,
          duree_heures: duree,
          prix,
          inclus: inclusFiltered,
          actif: true,
        });

        if (error) throw error;
        Alert.alert('Succès', 'Package créé');
      }

      setShowPackageForm(false);
      loadTarifs();
    } catch (error: any) {
      console.error('❌ Erreur sauvegarde package:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le package');
    }
  };

  const togglePackageActif = async (pkg: TarifPackage) => {
    try {
      const { error } = await supabase
        .from('packages_types')
        .update({ actif: !pkg.actif })
        .eq('id', pkg.id);

      if (error) throw error;

      loadTarifs();
    } catch (error: any) {
      console.error('❌ Erreur toggle package:', error);
      Alert.alert('Erreur', 'Impossible de modifier le package');
    }
  };

  const deletePackage = async (pkgId: string) => {
    Alert.alert('Confirmer', 'Voulez-vous supprimer ce package ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('packages_types')
              .delete()
              .eq('id', pkgId);

            if (error) throw error;

            Alert.alert('Succès', 'Package supprimé');
            loadTarifs();
          } catch (error: any) {
            console.error('❌ Erreur suppression package:', error);
            Alert.alert('Erreur', 'Impossible de supprimer le package');
          }
        },
      },
    ]);
  };

  const addInclusItem = () => {
    setInclusItems([...inclusItems, '']);
  };

  const updateInclusItem = (index: number, value: string) => {
    const newItems = [...inclusItems];
    newItems[index] = value;
    setInclusItems(newItems);
  };

  const removeInclusItem = (index: number) => {
    if (inclusItems.length > 1) {
      const newItems = inclusItems.filter((_, i) => i !== index);
      setInclusItems(newItems);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5C6BC0" />
      </View>
    );
  }

  if (showPackageForm) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={() => setShowPackageForm(false)}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.formTitle}>
            {editingPackage ? 'Modifier le package' : 'Nouveau package'}
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Nom du package *</Text>
          <TextInput
            style={styles.input}
            value={nomPackage}
            onChangeText={setNomPackage}
            placeholder="Ex: Package Mariage"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={descPackage}
            onChangeText={setDescPackage}
            placeholder="Décrivez votre package..."
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Durée (heures) *</Text>
          <TextInput
            style={styles.input}
            value={dureePackage}
            onChangeText={setDureePackage}
            placeholder="Ex: 8"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Prix (€) *</Text>
          <TextInput
            style={styles.input}
            value={prixPackage}
            onChangeText={setPrixPackage}
            placeholder="Ex: 500"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Inclus</Text>
          {inclusItems.map((item, index) => (
            <View key={index} style={styles.inclusRow}>
              <TextInput
                style={[styles.input, styles.inclusInput]}
                value={item}
                onChangeText={(value) => updateInclusItem(index, value)}
                placeholder="Ex: 200 photos retouchées"
              />
              {inclusItems.length > 1 && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeInclusItem(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#F44336" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={addInclusItem}>
            <Ionicons name="add-circle-outline" size={20} color="#5C6BC0" />
            <Text style={styles.addButtonText}>Ajouter un élément</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveButton} onPress={savePackage}>
            <Text style={styles.saveButtonText}>
              {editingPackage ? 'Mettre à jour' : 'Créer le package'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mes Tarifs</Text>

      {/* Budget minimum */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="cash-outline" size={24} color="#5C6BC0" />
          <Text style={styles.cardTitle}>Budget minimum</Text>
        </View>
        <Text style={styles.cardDescription}>
          Montant minimum pour accepter une prestation
        </Text>
        <TextInput
          style={styles.input}
          value={budgetMin}
          onChangeText={setBudgetMin}
          placeholder="Ex: 300"
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.primaryButton} onPress={saveBudgetMin}>
          <Text style={styles.primaryButtonText}>Enregistrer</Text>
        </TouchableOpacity>
      </View>

      {/* Packages */}
      <View style={styles.packagesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes packages</Text>
          <TouchableOpacity
            style={styles.addPackageButton}
            onPress={() => openPackageForm()}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {packages.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>Aucun package défini</Text>
            <Text style={styles.emptySubtext}>
              Créez des packages pour faciliter vos devis
            </Text>
          </View>
        ) : (
          packages.map((pkg) => (
            <View key={pkg.id} style={styles.packageCard}>
              <View style={styles.packageHeader}>
                <View style={styles.packageTitleRow}>
                  <Text style={styles.packageName}>{pkg.nom}</Text>
                  <Switch
                    value={pkg.actif}
                    onValueChange={() => togglePackageActif(pkg)}
                    trackColor={{ false: '#ccc', true: '#5C6BC0' }}
                  />
                </View>
                <Text style={styles.packagePrice}>{pkg.prix}€</Text>
              </View>

              {pkg.description && (
                <Text style={styles.packageDescription}>{pkg.description}</Text>
              )}

              <View style={styles.packageInfo}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.packageInfoText}>{pkg.duree_heures}h</Text>
              </View>

              {pkg.inclus && pkg.inclus.length > 0 && (
                <View style={styles.inclusList}>
                  {pkg.inclus.map((item, index) => (
                    <View key={index} style={styles.inclusItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={styles.inclusText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.packageActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openPackageForm(pkg)}
                >
                  <Ionicons name="pencil-outline" size={20} color="#5C6BC0" />
                  <Text style={styles.editButtonText}>Modifier</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deletePackage(pkg.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#F44336" />
                  <Text style={styles.deleteButtonText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={24} color="#5C6BC0" />
        <Text style={styles.infoText}>
          Les packages facilitent la création de devis. Vous pourrez les personnaliser
          lors de chaque proposition.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#5C6BC0',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  packagesSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  addPackageButton: {
    backgroundColor: '#5C6BC0',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  packageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  packageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  packageName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5C6BC0',
    marginLeft: 12,
  },
  packageDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  packageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageInfoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  inclusList: {
    marginBottom: 12,
  },
  inclusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  inclusText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  packageActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  editButtonText: {
    fontSize: 14,
    color: '#5C6BC0',
    fontWeight: '600',
    marginLeft: 6,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
    marginLeft: 6,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 16,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  inclusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inclusInput: {
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 14,
    color: '#5C6BC0',
    fontWeight: '600',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 12,
    lineHeight: 20,
  },
});
