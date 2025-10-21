import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { supabase } from '../../../lib/supabaseClient';

export default function SuccessPage() {
  const { id, session_id } = useLocalSearchParams();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Paiement en cours de validation...');
  const [details, setDetails] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!session_id) return;

    async function fetchPaiement() {
      setLoading(true);
      const { data, error } = await supabase
        .from('paiements')
        .select('*')
        .eq('stripe_session_id', session_id)
        .single();

      if (error || !data) {
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            setMessage(`Vérification du paiement... (tentative ${retryCount + 2}/4)`);
          }, 2000);
          return;
        }
        
        setMessage('❌ Paiement non retrouvé ou en attente de validation.');
        setDetails(null);
        console.error('Erreur récupération paiement:', error);
      } else {
        setMessage('✅ Paiement validé ! Merci pour votre commande.');
        setDetails(data);
      }
      setLoading(false);
    }

    fetchPaiement();
  }, [session_id, retryCount]);

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'succeeded': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'failed': return '#EF4444';
      case 'rembourse': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getStatusText = (statut: string) => {
    switch (statut) {
      case 'succeeded': return 'Paiement réussi';
      case 'pending': return 'En attente';
      case 'failed': return 'Échec';
      case 'rembourse': return 'Remboursé';
      default: return statut;
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        {details ? 'Paiement réussi !' : 'Vérification du paiement'}
      </Text>
      
      <Text style={styles.message}>{message}</Text>
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EC4899" />
          <Text style={styles.loadingText}>Vérification en cours...</Text>
        </View>
      )}
      
      {!details && !loading && retryCount >= 3 && (
        <View style={styles.warningBox}>
          <Text style={styles.warningTitle}>Que faire maintenant ?</Text>
          <Text style={styles.warningItem}>• Votre paiement peut être en cours de traitement</Text>
          <Text style={styles.warningItem}>• Vérifiez votre email pour la confirmation</Text>
          <Text style={styles.warningItem}>• Contactez le support si le problème persiste</Text>
        </View>
      )}

      {details && (
        <View style={styles.detailsBox}>
          <Text style={styles.detailsTitle}>Détails du paiement</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Montant payé :</Text>
            <Text style={styles.detailValue}>{details.montant} MAD</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Email :</Text>
            <Text style={styles.detailValue}>{details.email}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Statut :</Text>
            <Text style={[styles.detailValue, { color: getStatusColor(details.statut), fontWeight: '600' }]}>
              {getStatusText(details.statut)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date :</Text>
            <Text style={styles.detailValue}>
              {new Date(details.created_at).toLocaleString('fr-FR')}
            </Text>
          </View>
          {details.stripe_session_id && (
            <Text style={styles.sessionId}>
              ID Session : {details.stripe_session_id.substring(0, 20)}...
            </Text>
          )}
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => (navigation as any).navigate(`annonces/${id}`)}
        >
          <Text style={styles.primaryButtonText}>Retour à l'annonce</Text>
        </TouchableOpacity>
        {details && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => (navigation as any).navigate('particuliers/menu')}
          >
            <Text style={styles.secondaryButtonText}>Mes commandes</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 16,
    textAlign: 'center'
  },
  message: {
    fontSize: 18,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16
  },
  loadingContainer: {
    marginTop: 16,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 8,
    color: '#9CA3AF'
  },
  warningBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FBBF24',
    borderRadius: 8,
    maxWidth: 400
  },
  warningTitle: {
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8
  },
  warningItem: {
    fontSize: 14,
    color: '#92400E',
    marginTop: 4
  },
  detailsBox: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    padding: 24,
    maxWidth: 400,
    width: '100%'
  },
  detailsTitle: {
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 12,
    fontSize: 16
  },
  detailRow: {
    marginBottom: 8
  },
  detailLabel: {
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 2
  },
  detailValue: {
    color: '#6B7280'
  },
  sessionId: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
    width: '100%',
    maxWidth: 400
  },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: '#EC4899',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: '#6B7280',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  secondaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  }
});
