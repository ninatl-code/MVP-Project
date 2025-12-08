import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const TAILLES = {
  classique: ['20x20 cm', '30x30 cm'],
  premium: ['20x20 cm', '30x30 cm', '30x40 cm'],
  livre_photo: ['15x20 cm', '20x20 cm', '21x28 cm'],
  coffret: ['20x20 cm', '30x30 cm'],
};

const COUVERTURES = [
  { id: 'standard', nom: 'Standard', prix: 0 },
  { id: 'cuir', nom: 'Cuir', prix: 15 },
  { id: 'tissu', nom: 'Tissu', prix: 10 },
  { id: 'bois', nom: 'Bois', prix: 20 },
];

const PAGES_OPTIONS = [20, 30, 40, 50, 60, 80, 100];
const PRIX_PAGE = 0.50;

export default function CreateAlbumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const typeId = params.typeId as string;

  const [titre, setTitre] = useState('');
  const [taille, setTaille] = useState(TAILLES[typeId as keyof typeof TAILLES]?.[0] || '');
  const [couverture, setCouverture] = useState(COUVERTURES[0]);
  const [nombrePages, setNombrePages] = useState(20);

  const getPrixBase = () => {
    const prixTypes = {
      classique: 29.99,
      premium: 49.99,
      livre_photo: 19.99,
      coffret: 69.99,
    };
    return prixTypes[typeId as keyof typeof prixTypes] || 29.99;
  };

  const calculerTotal = () => {
    const prixBase = getPrixBase();
    const prixCouverture = couverture.prix;
    const prixPages = (nombrePages - 20) * PRIX_PAGE;
    return prixBase + prixCouverture + prixPages;
  };

  const handleContinuer = () => {
    if (!titre.trim()) {
      alert('Veuillez donner un titre à votre album');
      return;
    }

    router.push({
      pathname: '/shared/livraison/albums/configure',
      params: {
        typeId,
        titre,
        taille,
        couverture: couverture.id,
        nombrePages: nombrePages.toString(),
      },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Créer un album</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Titre de l'album */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Titre de l'album</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Vacances 2024, Mariage de Sophie..."
            value={titre}
            onChangeText={setTitre}
            maxLength={50}
          />
          <Text style={styles.helperText}>{titre.length}/50 caractères</Text>
        </View>

        {/* Taille */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Taille de l'album</Text>
          <View style={styles.optionsRow}>
            {(TAILLES[typeId as keyof typeof TAILLES] || []).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.optionCard,
                  taille === t && styles.optionCardSelected,
                ]}
                onPress={() => setTaille(t)}
              >
                <Ionicons
                  name="resize-outline"
                  size={24}
                  color={taille === t ? '#5C6BC0' : '#666'}
                />
                <Text style={[
                  styles.optionText,
                  taille === t && styles.optionTextSelected,
                ]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Type de couverture */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Type de couverture</Text>
          <View style={styles.couverturesGrid}>
            {COUVERTURES.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.couvertureCard,
                  couverture.id === c.id && styles.couvertureCardSelected,
                ]}
                onPress={() => setCouverture(c)}
              >
                <Text style={styles.couvertureNom}>{c.nom}</Text>
                {c.prix > 0 && (
                  <Text style={styles.couverturePrix}>+{c.prix}€</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Nombre de pages */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nombre de pages</Text>
          <Text style={styles.helperText}>
            20 pages incluses, +{PRIX_PAGE}€ par page supplémentaire
          </Text>
          <View style={styles.pagesGrid}>
            {PAGES_OPTIONS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.pageOption,
                  nombrePages === p && styles.pageOptionSelected,
                ]}
                onPress={() => setNombrePages(p)}
              >
                <Text style={[
                  styles.pageOptionText,
                  nombrePages === p && styles.pageOptionTextSelected,
                ]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Résumé */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Récapitulatif</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Type:</Text>
            <Text style={styles.summaryValue}>
              {typeId.replace('_', ' ').charAt(0).toUpperCase() + typeId.slice(1)}
            </Text>
          </View>

          {titre && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Titre:</Text>
              <Text style={styles.summaryValue}>{titre}</Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Taille:</Text>
            <Text style={styles.summaryValue}>{taille}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Couverture:</Text>
            <Text style={styles.summaryValue}>{couverture.nom}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Pages:</Text>
            <Text style={styles.summaryValue}>{nombrePages} pages</Text>
          </View>

          <View style={[styles.summaryRow, styles.summaryTotal]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{calculerTotal().toFixed(2)}€</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continuerButton} onPress={handleContinuer}>
          <Text style={styles.continuerButtonText}>Continuer</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFF" />
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
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
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
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
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  optionCardSelected: {
    borderColor: '#5C6BC0',
    backgroundColor: '#F3F4FB',
  },
  optionText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  optionTextSelected: {
    color: '#5C6BC0',
    fontWeight: '600',
  },
  couverturesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  couvertureCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  couvertureCardSelected: {
    borderColor: '#5C6BC0',
    backgroundColor: '#F3F4FB',
  },
  couvertureNom: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  couverturePrix: {
    fontSize: 12,
    color: '#5C6BC0',
  },
  pagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  pageOption: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  pageOptionSelected: {
    borderColor: '#5C6BC0',
    backgroundColor: '#F3F4FB',
  },
  pageOptionText: {
    fontSize: 14,
    color: '#666',
  },
  pageOptionTextSelected: {
    color: '#5C6BC0',
    fontWeight: '600',
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
