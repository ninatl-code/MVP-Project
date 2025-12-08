import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const LIVRAISON_OPTIONS = [
  { id: 'standard', nom: 'Standard (7-10 jours)', prix: 0, delai: '7-10 jours' },
  { id: 'express', nom: 'Express (3-5 jours)', prix: 9.99, delai: '3-5 jours' },
  { id: 'urgent', nom: 'Urgent (24-48h)', prix: 19.99, delai: '24-48h' },
];

export default function CommanderAlbumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const [livraison, setLivraison] = useState(LIVRAISON_OPTIONS[0]);
  const [adresse, setAdresse] = useState('');
  const [ville, setVille] = useState('');
  const [codePostal, setCodePostal] = useState('');
  const [telephone, setTelephone] = useState('');
  const [instructions, setInstructions] = useState('');

  // Calcul du prix (simplifié)
  const prixBase = 29.99; // À remplacer par le vrai calcul
  const fraisLivraison = livraison.prix;
  const total = prixBase + fraisLivraison;

  const handleValider = () => {
    // Validation
    if (!adresse.trim() || !ville.trim() || !codePostal.trim() || !telephone.trim()) {
      Alert.alert('Informations manquantes', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    Alert.alert(
      'Confirmer la commande',
      `Montant total: ${total.toFixed(2)}€\n\nVoulez-vous procéder au paiement ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Payer',
          onPress: () => {
            router.push({
              pathname: '/shared/paiement',
              params: {
                type: 'album',
                montant: total.toString(),
                ...params,
              },
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Livraison & Paiement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Résumé album */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Récapitulatif de votre album</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Titre:</Text>
            <Text style={styles.summaryValue}>{params.titre}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taille:</Text>
            <Text style={styles.summaryValue}>{params.taille}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pages:</Text>
            <Text style={styles.summaryValue}>{params.nombrePages} pages</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Photos:</Text>
            <Text style={styles.summaryValue}>{params.photosCount} photos</Text>
          </View>
        </View>

        {/* Mode de livraison */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mode de livraison</Text>
          {LIVRAISON_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.livraisonCard,
                livraison.id === option.id && styles.livraisonCardSelected,
              ]}
              onPress={() => setLivraison(option)}
            >
              <View style={styles.livraisonInfo}>
                <View style={[
                  styles.radio,
                  livraison.id === option.id && styles.radioSelected,
                ]}>
                  {livraison.id === option.id && (
                    <View style={styles.radioDot} />
                  )}
                </View>
                <View style={styles.livraisonText}>
                  <Text style={styles.livraisonNom}>{option.nom}</Text>
                  <Text style={styles.livraisonDelai}>Délai: {option.delai}</Text>
                </View>
              </View>
              <Text style={styles.livraisonPrix}>
                {option.prix === 0 ? 'Gratuit' : `${option.prix.toFixed(2)}€`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Adresse de livraison */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adresse de livraison</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Adresse *</Text>
            <TextInput
              style={styles.input}
              placeholder="Numéro et nom de rue"
              value={adresse}
              onChangeText={setAdresse}
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Code postal *</Text>
              <TextInput
                style={styles.input}
                placeholder="75001"
                value={codePostal}
                onChangeText={setCodePostal}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 2 }]}>
              <Text style={styles.inputLabel}>Ville *</Text>
              <TextInput
                style={styles.input}
                placeholder="Paris"
                value={ville}
                onChangeText={setVille}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Téléphone *</Text>
            <TextInput
              style={styles.input}
              placeholder="06 12 34 56 78"
              value={telephone}
              onChangeText={setTelephone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Instructions de livraison (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ex: Code d'accès, étage, etc."
              value={instructions}
              onChangeText={setInstructions}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Total */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Album</Text>
            <Text style={styles.totalValue}>{prixBase.toFixed(2)}€</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Livraison</Text>
            <Text style={styles.totalValue}>
              {fraisLivraison === 0 ? 'Gratuit' : `${fraisLivraison.toFixed(2)}€`}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.totalFinal]}>
            <Text style={styles.totalFinalLabel}>Total</Text>
            <Text style={styles.totalFinalValue}>{total.toFixed(2)}€</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={24} color="#4CAF50" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>Paiement sécurisé</Text>
            <Text style={styles.infoDescription}>
              Vos informations sont protégées et cryptées
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.payerButton} onPress={handleValider}>
          <Ionicons name="lock-closed" size={20} color="#FFF" />
          <Text style={styles.payerButtonText}>
            Payer {total.toFixed(2)}€
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  livraisonCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  livraisonCardSelected: {
    borderColor: '#5C6BC0',
    backgroundColor: '#F3F4FB',
  },
  livraisonInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioSelected: {
    borderColor: '#5C6BC0',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#5C6BC0',
  },
  livraisonText: {
    flex: 1,
  },
  livraisonNom: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  livraisonDelai: {
    fontSize: 12,
    color: '#666',
  },
  livraisonPrix: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5C6BC0',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
  },
  totalCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#333',
  },
  totalFinal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  totalFinalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalFinalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5C6BC0',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 100,
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 12,
    color: '#2E7D32',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    padding: 16,
  },
  payerButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payerButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
});
