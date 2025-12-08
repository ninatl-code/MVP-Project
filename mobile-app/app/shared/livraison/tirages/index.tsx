import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Format {
  id: string;
  nom: string;
  dimensions: string;
  prixUnitaire: number;
  description?: string;
}

const FORMATS_DISPONIBLES: Format[] = [
  { id: '10x15', nom: '10x15 cm', dimensions: '10x15', prixUnitaire: 0.15, description: 'Format standard' },
  { id: '13x18', nom: '13x18 cm', dimensions: '13x18', prixUnitaire: 0.25, description: 'Format carte postale' },
  { id: '15x21', nom: '15x21 cm', dimensions: '15x21', prixUnitaire: 0.35, description: 'Format A5' },
  { id: '20x30', nom: '20x30 cm', dimensions: '20x30', prixUnitaire: 0.75, description: 'Format A4' },
  { id: '30x40', nom: '30x40 cm', dimensions: '30x40', prixUnitaire: 1.50, description: 'Grand format' },
  { id: '40x60', nom: '40x60 cm', dimensions: '40x60', prixUnitaire: 3.50, description: 'Très grand format' },
];

const FINITIONS = [
  { id: 'mat', nom: 'Mat', prix: 0 },
  { id: 'brillant', nom: 'Brillant', prix: 0 },
  { id: 'satin', nom: 'Satin', prix: 0.10 },
];

const PAPIERS = [
  { id: 'standard', nom: 'Standard', prix: 0 },
  { id: 'premium', nom: 'Premium', prix: 0.20 },
  { id: 'professionnel', nom: 'Professionnel', prix: 0.50 },
];

export default function TiragesScreen() {
  const router = useRouter();
  const [selectedFormat, setSelectedFormat] = useState<Format | null>(null);
  const [selectedFinition, setSelectedFinition] = useState(FINITIONS[0]);
  const [selectedPapier, setSelectedPapier] = useState(PAPIERS[0]);
  const [quantite, setQuantite] = useState('1');

  const calculerTotal = () => {
    if (!selectedFormat) return 0;
    const qty = parseInt(quantite) || 1;
    return (selectedFormat.prixUnitaire + selectedFinition.prix + selectedPapier.prix) * qty;
  };

  const handleContinuer = () => {
    if (!selectedFormat) {
      alert('Veuillez sélectionner un format');
      return;
    }

    router.push({
      pathname: '/shared/livraison/tirages/configure',
      params: {
        format: selectedFormat.id,
        finition: selectedFinition.id,
        papier: selectedPapier.id,
        quantite,
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tirages Photo</Text>
        <TouchableOpacity onPress={() => router.push('/shared/livraison/tirages/mes-commandes')}>
          <Ionicons name="list" size={24} color="#5C6BC0" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Description */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#5C6BC0" />
          <Text style={styles.infoText}>
            Commandez des tirages de vos photos de qualité professionnelle. Livraison sous 5-7 jours.
          </Text>
        </View>

        {/* Sélection du format */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Format</Text>
          <View style={styles.formatsGrid}>
            {FORMATS_DISPONIBLES.map((format) => (
              <TouchableOpacity
                key={format.id}
                style={[
                  styles.formatCard,
                  selectedFormat?.id === format.id && styles.formatCardSelected,
                ]}
                onPress={() => setSelectedFormat(format)}
              >
                <View style={styles.formatIcon}>
                  <Ionicons
                    name="image-outline"
                    size={32}
                    color={selectedFormat?.id === format.id ? '#5C6BC0' : '#666'}
                  />
                </View>
                <Text style={styles.formatNom}>{format.nom}</Text>
                <Text style={styles.formatDimensions}>{format.dimensions}</Text>
                {format.description && (
                  <Text style={styles.formatDescription}>{format.description}</Text>
                )}
                <Text style={styles.formatPrix}>{format.prixUnitaire.toFixed(2)}€</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Finition */}
        {selectedFormat && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Finition</Text>
              <View style={styles.optionsRow}>
                {FINITIONS.map((finition) => (
                  <TouchableOpacity
                    key={finition.id}
                    style={[
                      styles.optionCard,
                      selectedFinition.id === finition.id && styles.optionCardSelected,
                    ]}
                    onPress={() => setSelectedFinition(finition)}
                  >
                    <Text style={styles.optionNom}>{finition.nom}</Text>
                    {finition.prix > 0 && (
                      <Text style={styles.optionPrix}>+{finition.prix.toFixed(2)}€</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Type de papier */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Type de papier</Text>
              <View style={styles.optionsRow}>
                {PAPIERS.map((papier) => (
                  <TouchableOpacity
                    key={papier.id}
                    style={[
                      styles.optionCard,
                      selectedPapier.id === papier.id && styles.optionCardSelected,
                    ]}
                    onPress={() => setSelectedPapier(papier)}
                  >
                    <Text style={styles.optionNom}>{papier.nom}</Text>
                    {papier.prix > 0 && (
                      <Text style={styles.optionPrix}>+{papier.prix.toFixed(2)}€</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quantité */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quantité</Text>
              <View style={styles.quantityContainer}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantite(String(Math.max(1, parseInt(quantite) - 1)))}
                >
                  <Ionicons name="remove" size={24} color="#5C6BC0" />
                </TouchableOpacity>
                <TextInput
                  style={styles.quantityInput}
                  value={quantite}
                  onChangeText={setQuantite}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantite(String(parseInt(quantite) + 1))}
                >
                  <Ionicons name="add" size={24} color="#5C6BC0" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Résumé */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Récapitulatif</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Format:</Text>
                <Text style={styles.summaryValue}>{selectedFormat.nom}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Finition:</Text>
                <Text style={styles.summaryValue}>{selectedFinition.nom}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Papier:</Text>
                <Text style={styles.summaryValue}>{selectedPapier.nom}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Quantité:</Text>
                <Text style={styles.summaryValue}>{quantite}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryTotal]}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>{calculerTotal().toFixed(2)}€</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {selectedFormat && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.continuerButton} onPress={handleContinuer}>
            <Text style={styles.continuerButtonText}>Continuer</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 12,
    lineHeight: 20,
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
  formatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  formatCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  formatCardSelected: {
    borderColor: '#5C6BC0',
    backgroundColor: '#F3F4FB',
  },
  formatIcon: {
    marginBottom: 8,
  },
  formatNom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  formatDimensions: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  formatDescription: {
    fontSize: 11,
    color: '#999',
    marginBottom: 8,
    textAlign: 'center',
  },
  formatPrix: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5C6BC0',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: '#5C6BC0',
    backgroundColor: '#F3F4FB',
  },
  optionNom: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  optionPrix: {
    fontSize: 12,
    color: '#5C6BC0',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 8,
  },
  quantityButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityInput: {
    width: 80,
    height: 48,
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 80,
  },
  summaryTitle: {
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
  summaryTotal: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5C6BC0',
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
  continuerButton: {
    flexDirection: 'row',
    backgroundColor: '#5C6BC0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continuerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
