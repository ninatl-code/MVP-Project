import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView, Platform } from 'react-native';
import { supabase } from '@/lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

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

const TVA_RATE = 0.20; // 20% TVA

interface LineItem {
  id: string;
  description: string;
  quantite: number;
  prix_unitaire: number;
}

interface DevisData {
  id: string;
  client_id: string;
  titre: string;
  montant: number;
  prestations?: string;
  client?: { nom: string; email: string };
}

export default function InvoiceCreate() {
  const [loading, setLoading] = useState(false);
  const [loadingDevis, setLoadingDevis] = useState(false);
  const { devisId } = useLocalSearchParams();
  const router = useRouter();

  // Form state
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [numero, setNumero] = useState('');
  const [dateEmission, setDateEmission] = useState(new Date());
  const [dateEcheance, setDateEcheance] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // +30 jours
  const [showDateEmissionPicker, setShowDateEmissionPicker] = useState(false);
  const [showDateEcheancePicker, setShowDateEcheancePicker] = useState(false);
  
  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantite: 1, prix_unitaire: 0 }
  ]);

  // Notes
  const [notes, setNotes] = useState('');
  const [conditionsPaiement, setConditionsPaiement] = useState('Paiement sous 30 jours\nVirement bancaire ou carte bancaire acceptés\nPénalités de retard: 3 fois le taux d\'intérêt légal');

  useEffect(() => {
    generateInvoiceNumber();
    if (devisId) {
      loadDevisData();
    }
  }, [devisId]);

  const generateInvoiceNumber = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Format: INV-YYYY-MM-XXX
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');

      // Compter le nombre de factures ce mois
      const { data, error } = await supabase
        .from('factures')
        .select('numero')
        .eq('photographe_id', user.id)
        .like('numero', `INV-${year}-${month}-%`)
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastNumero = data[0].numero;
        const match = lastNumero.match(/INV-\d{4}-\d{2}-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const invoiceNumber = `INV-${year}-${month}-${String(nextNumber).padStart(3, '0')}`;
      setNumero(invoiceNumber);
    } catch (error) {
      console.error('Erreur génération numéro:', error);
      setNumero(`INV-${Date.now()}`);
    }
  };

  const loadDevisData = async () => {
    try {
      setLoadingDevis(true);
      const { data, error } = await supabase
        .from('devis')
        .select(`
          *,
          client:profiles!client_id(nom, email, telephone)
        `)
        .eq('id', devisId)
        .single();

      if (error) throw error;

      if (data) {
        const devis = data as DevisData;
        
        // Charger info client
        setClientInfo(Array.isArray(devis.client) ? devis.client[0] : devis.client);

        // Pré-remplir avec prestations du devis
        if (devis.prestations) {
          const prestationsLines = devis.prestations.split('\n').filter(p => p.trim());
          if (prestationsLines.length > 0) {
            const items = prestationsLines.map((prestation, index) => ({
              id: String(index + 1),
              description: prestation,
              quantite: 1,
              prix_unitaire: index === 0 ? devis.montant : 0
            }));
            setLineItems(items);
          }
        } else {
          // Sinon, une ligne avec le montant total
          setLineItems([{
            id: '1',
            description: devis.titre || 'Prestation photographe',
            quantite: 1,
            prix_unitaire: devis.montant
          }]);
        }

        setNotes(`Facture générée à partir du devis accepté\nRéférence devis: ${devis.titre}`);
      }
    } catch (error) {
      console.error('Erreur chargement devis:', error);
      Alert.alert('Erreur', 'Impossible de charger les informations du devis');
    } finally {
      setLoadingDevis(false);
    }
  };

  const addLineItem = () => {
    const newId = String(lineItems.length + 1);
    setLineItems([...lineItems, { id: newId, description: '', quantite: 1, prix_unitaire: 0 }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length === 1) {
      Alert.alert('Attention', 'Vous devez avoir au moins une ligne');
      return;
    }
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotals = () => {
    const montantHT = lineItems.reduce((sum, item) => {
      const lineTotal = item.quantite * item.prix_unitaire;
      return sum + lineTotal;
    }, 0);

    const montantTVA = montantHT * TVA_RATE;
    const montantTTC = montantHT + montantTVA;

    return { montantHT, montantTVA, montantTTC };
  };

  const handleSubmit = async () => {
    try {
      // Validation
      if (!numero.trim()) {
        Alert.alert('Erreur', 'Le numéro de facture est requis');
        return;
      }

      if (!clientInfo) {
        Alert.alert('Erreur', 'Les informations client sont requises');
        return;
      }

      const hasEmptyLines = lineItems.some(item => !item.description.trim() || item.prix_unitaire <= 0);
      if (hasEmptyLines) {
        Alert.alert('Erreur', 'Toutes les lignes doivent avoir une description et un prix');
        return;
      }

      const { montantHT, montantTVA, montantTTC } = calculateTotals();

      if (montantTTC <= 0) {
        Alert.alert('Erreur', 'Le montant total doit être supérieur à 0');
        return;
      }

      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/auth/login');
        return;
      }

      // Récupérer client_id depuis devis ou clientInfo
      let clientId = null;
      if (devisId) {
        const { data: devisData } = await supabase
          .from('devis')
          .select('client_id')
          .eq('id', devisId)
          .single();
        clientId = devisData?.client_id;
      }

      // Préparer les données de la facture
      const factureData = {
        photographe_id: user.id,
        client_id: clientId,
        devis_id: devisId || null,
        numero: numero,
        date_emission: dateEmission.toISOString().split('T')[0],
        date_echeance: dateEcheance.toISOString().split('T')[0],
        montant_ht: montantHT,
        montant_tva: montantTVA,
        montant_total: montantTTC,
        lignes: lineItems,
        notes: notes,
        conditions_paiement: conditionsPaiement,
        statut: 'en_attente',
      };

      const { data, error } = await supabase
        .from('factures')
        .insert([factureData])
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Succès',
        'La facture a été créée avec succès',
        [
          {
            text: 'Voir la facture',
            onPress: () => router.replace(`/photographe/leads/invoice?id=${data.id}` as any)
          },
          {
            text: 'Retour à la liste',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Erreur création facture:', error);
      Alert.alert('Erreur', 'Impossible de créer la facture');
    } finally {
      setLoading(false);
    }
  };

  const { montantHT, montantTVA, montantTTC } = calculateTotals();

  if (loadingDevis) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement des informations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Créer une facture</Text>
        <View style={styles.spacer} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Client Info */}
        {clientInfo && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-outline" size={20} color={COLORS.primary} />
              <Text style={styles.sectionTitle}>Client</Text>
            </View>
            <View style={styles.clientCard}>
              <Text style={styles.clientName}>{clientInfo.nom}</Text>
              <Text style={styles.clientDetail}>{clientInfo.email}</Text>
              {clientInfo.telephone && (
                <Text style={styles.clientDetail}>{clientInfo.telephone}</Text>
              )}
            </View>
          </View>
        )}

        {/* Numéro et Dates */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Informations générales</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Numéro de facture *</Text>
            <TextInput
              style={styles.input}
              value={numero}
              onChangeText={setNumero}
              placeholder="INV-2024-12-001"
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date d'émission *</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDateEmissionPicker(true)}
            >
              <Text style={styles.dateText}>{dateEmission.toLocaleDateString('fr-FR')}</Text>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            {showDateEmissionPicker && (
              <DateTimePicker
                value={dateEmission}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDateEmissionPicker(Platform.OS === 'ios');
                  if (selectedDate) setDateEmission(selectedDate);
                }}
              />
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date d'échéance *</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDateEcheancePicker(true)}
            >
              <Text style={styles.dateText}>{dateEcheance.toLocaleDateString('fr-FR')}</Text>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            {showDateEcheancePicker && (
              <DateTimePicker
                value={dateEcheance}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDateEcheancePicker(Platform.OS === 'ios');
                  if (selectedDate) setDateEcheance(selectedDate);
                }}
              />
            )}
          </View>
        </View>

        {/* Lignes de facture */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Prestations</Text>
          </View>

          {lineItems.map((item, index) => (
            <View key={item.id} style={styles.lineItem}>
              <View style={styles.lineHeader}>
                <Text style={styles.lineNumber}>Ligne {index + 1}</Text>
                {lineItems.length > 1 && (
                  <TouchableOpacity onPress={() => removeLineItem(item.id)}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={[styles.input, styles.textArea]}
                value={item.description}
                onChangeText={(text) => updateLineItem(item.id, 'description', text)}
                placeholder="Description de la prestation"
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={3}
              />

              <View style={styles.lineRow}>
                <View style={styles.lineInput}>
                  <Text style={styles.label}>Quantité</Text>
                  <TextInput
                    style={styles.input}
                    value={String(item.quantite)}
                    onChangeText={(text) => updateLineItem(item.id, 'quantite', parseFloat(text) || 0)}
                    placeholder="1"
                    keyboardType="numeric"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>

                <View style={[styles.lineInput, { flex: 2 }]}>
                  <Text style={styles.label}>Prix unitaire HT (€)</Text>
                  <TextInput
                    style={styles.input}
                    value={String(item.prix_unitaire)}
                    onChangeText={(text) => updateLineItem(item.id, 'prix_unitaire', parseFloat(text) || 0)}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              </View>

              <View style={styles.lineTotal}>
                <Text style={styles.lineTotalLabel}>Total ligne HT:</Text>
                <Text style={styles.lineTotalValue}>
                  {(item.quantite * item.prix_unitaire).toFixed(2)} €
                </Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.addLineButton} onPress={addLineItem}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.addLineText}>Ajouter une ligne</Text>
          </TouchableOpacity>
        </View>

        {/* Totaux */}
        <View style={styles.section}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total HT</Text>
            <Text style={styles.totalValue}>{montantHT.toFixed(2)} €</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TVA (20%)</Text>
            <Text style={styles.totalValue}>{montantTVA.toFixed(2)} €</Text>
          </View>
          <View style={[styles.totalRow, styles.totalRowFinal]}>
            <Text style={styles.totalLabelFinal}>Total TTC</Text>
            <Text style={styles.totalValueFinal}>{montantTTC.toFixed(2)} €</Text>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbox-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Notes</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes additionnelles (optionnel)"
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Conditions de paiement */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Conditions de paiement</Text>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={conditionsPaiement}
            onChangeText={setConditionsPaiement}
            placeholder="Conditions de paiement"
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.submitButtonText}>Créer la facture</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 15,
  },
  spacer: {
    width: 34,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 10,
  },
  clientCard: {
    backgroundColor: COLORS.backgroundLight,
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 5,
  },
  clientDetail: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 3,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
  },
  dateText: {
    fontSize: 15,
    color: COLORS.text,
  },
  lineItem: {
    backgroundColor: COLORS.backgroundLight,
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  lineNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  lineRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  lineInput: {
    flex: 1,
  },
  lineTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  lineTotalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  lineTotalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  addLineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    borderStyle: 'dashed',
  },
  addLineText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.primary,
    marginLeft: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  totalRowFinal: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  totalLabelFinal: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalValueFinal: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    margin: 20,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginLeft: 8,
  },
});
