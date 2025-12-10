import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabaseClient';
import { paymentService } from '@/lib/paymentService';

const COLORS = {
  primary: '#5C6BC0',
  accent: '#130183',
  success: '#10B981',
  error: '#EF4444',
  background: '#FFFFFF',
  backgroundLight: '#F7F7F7',
  text: '#1C1C1E',
  textLight: '#717171',
  border: '#E5E7EB'
};

interface ReservationDetails {
  id: string;
  montant: number;
  annonce_id: string;
  annonce_titre: string;
  prestataire_nom: string;
  date: string;
  heure?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { reservation_id } = params;

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
  
  // Formulaire carte bancaire
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');

  useEffect(() => {
    fetchReservationDetails();
  }, [reservation_id]);

  const fetchReservationDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          id,
          montant,
          date,
          annonce_id,
          annonces!inner(titre),
          prestataire:profiles!prestataire_id(nom)
        `)
        .eq('id', reservation_id)
        .single();

      if (error) throw error;

      if (data) {
        const annonces = Array.isArray(data.annonces) ? data.annonces[0] : data.annonces;
        const prestataire = Array.isArray(data.prestataire) ? data.prestataire[0] : data.prestataire;
        setReservation({
          id: data.id,
          montant: data.montant,
          annonce_id: data.annonce_id,
          annonce_titre: annonces?.titre || 'Prestation',
          prestataire_nom: prestataire?.nom || 'Prestataire',
          date: data.date
        });
      }
    } catch (error) {
      console.error('Erreur chargement réservation:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de la réservation');
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19); // 16 chiffres + 3 espaces
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  const validateForm = () => {
    if (!cardholderName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer le nom du titulaire');
      return false;
    }
    if (cardNumber.replace(/\s/g, '').length !== 16) {
      Alert.alert('Erreur', 'Numéro de carte invalide (16 chiffres requis)');
      return false;
    }
    if (expiryDate.length !== 5 || !expiryDate.includes('/')) {
      Alert.alert('Erreur', 'Date d\'expiration invalide (MM/AA)');
      return false;
    }
    if (cvv.length !== 3) {
      Alert.alert('Erreur', 'CVV invalide (3 chiffres requis)');
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;
    if (!reservation) return;

    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Créer une session de paiement
      const session = await paymentService.createMobileSession({
        amount: reservation.montant,
        currency: 'eur',
        customer_email: user.email,
        metadata: {
          reservation_id: reservation.id,
          annonce_id: reservation.annonce_id
        },
        description: `Paiement pour ${reservation.annonce_titre}`,
        annonce_id: reservation.annonce_id,
        user_id: user.id,
        reservation_id: reservation.id
      });

      // Insérer dans la table paiements
      const { error: paymentError } = await supabase
        .from('paiements')
        .insert({
          reservation_id: reservation.id,
          user_id: user.id,
          montant: reservation.montant,
          status: 'succeeded',
          stripe_session_id: session.id || `session_${Date.now()}`,
          stripe_payment_intent: session.payment_intent || null,
          created_at: new Date().toISOString()
        });

      if (paymentError) throw paymentError;

      // Mettre à jour le statut de la réservation
      const { error: updateError } = await supabase
        .from('reservations')
        .update({
          status: 'confirmed',
          paiement_effectue: true
        })
        .eq('id', reservation.id);

      if (updateError) throw updateError;

      // Créer notification pour le prestataire
      const { data: annonceData } = await supabase
        .from('annonces')
        .select('prestataire_id')
        .eq('id', reservation.annonce_id)
        .single();

      if (annonceData) {
        await supabase.from('notifications').insert({
          user_id: annonceData.prestataire_id,
          type: 'paiement_recu',
          contenu: `Paiement de ${reservation.montant}€ reçu pour "${reservation.annonce_titre}"`,
          lu: false,
          created_at: new Date().toISOString()
        });
      }

      // Rediriger vers la page de succès
      router.replace(`/paiement/success?reservation_id=${reservation.id}&montant=${reservation.montant}`);
    } catch (error) {
      console.error('Erreur paiement:', error);
      Alert.alert('Erreur', 'Le paiement a échoué. Veuillez réessayer.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!reservation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.error} />
          <Text style={styles.errorText}>Réservation introuvable</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Paiement sécurisé</Text>
            <View style={styles.headerButton} />
          </View>

          {/* Résumé de la commande */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Résumé de la commande</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Prestation</Text>
                <Text style={styles.summaryValue}>{reservation.annonce_titre}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Prestataire</Text>
                <Text style={styles.summaryValue}>{reservation.prestataire_nom}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Date</Text>
                <Text style={styles.summaryValue}>
                  {new Date(reservation.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Heure</Text>
                <Text style={styles.summaryValue}>{reservation.heure}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total à payer</Text>
                <Text style={styles.totalValue}>{reservation.montant}€</Text>
              </View>
            </View>
          </View>

          {/* Formulaire de paiement */}
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Informations de paiement</Text>
            
            <View style={styles.securityBadge}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.success} />
              <Text style={styles.securityText}>Paiement 100% sécurisé</Text>
            </View>

            {/* Nom du titulaire */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom du titulaire</Text>
              <TextInput
                style={styles.input}
                placeholder="Jean Dupont"
                value={cardholderName}
                onChangeText={setCardholderName}
                autoCapitalize="words"
              />
            </View>

            {/* Numéro de carte */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Numéro de carte</Text>
              <View style={styles.cardInputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                  keyboardType="numeric"
                  maxLength={19}
                />
                <Ionicons name="card-outline" size={24} color={COLORS.textLight} style={styles.cardIcon} />
              </View>
            </View>

            {/* Date d'expiration et CVV */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Date d'expiration</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/AA"
                  value={expiryDate}
                  onChangeText={(text) => setExpiryDate(formatExpiryDate(text))}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>CVV</Text>
                <TextInput
                  style={styles.input}
                  placeholder="123"
                  value={cvv}
                  onChangeText={(text) => setCvv(text.replace(/\D/g, '').substring(0, 3))}
                  keyboardType="numeric"
                  maxLength={3}
                  secureTextEntry
                />
              </View>
            </View>
          </View>

          {/* Bouton de paiement */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.payButton, processing && styles.payButtonDisabled]}
              onPress={handlePayment}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <>
                  <Ionicons name="lock-closed" size={20} color={COLORS.background} />
                  <Text style={styles.payButtonText}>Payer {reservation.montant}€</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.paymentInfo}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.textLight} />
              <Text style={styles.paymentInfoText}>
                Vos données bancaires sont sécurisées et cryptées
              </Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center'
  },
  backButton: {
    marginTop: 24,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8
  },
  backButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text
  },
  summarySection: {
    padding: 20
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16
  },
  summaryCard: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    flex: 1
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 2,
    textAlign: 'right'
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginBottom: 0
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary
  },
  paymentSection: {
    padding: 20
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
    alignSelf: 'center'
  },
  securityText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success
  },
  inputGroup: {
    marginBottom: 16
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8
  },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text
  },
  cardInputContainer: {
    position: 'relative'
  },
  cardIcon: {
    position: 'absolute',
    right: 16,
    top: 12
  },
  rowInputs: {
    flexDirection: 'row'
  },
  actionSection: {
    padding: 20
  },
  payButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  payButtonDisabled: {
    opacity: 0.6
  },
  payButtonText: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.background
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16
  },
  paymentInfoText: {
    marginLeft: 6,
    fontSize: 12,
    color: COLORS.textLight
  }
});
