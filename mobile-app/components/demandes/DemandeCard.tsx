import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DemandeCardProps {
  demande: any;
  onPress?: () => void;
  variant?: 'client' | 'photographe';
}

const STATUT_COLORS = {
  active: '#4CAF50',
  pourvue: '#2196F3',
  expiree: '#9E9E9E',
  annulee: '#F44336',
};

export default function DemandeCard({ demande, onPress, variant = 'client' }: DemandeCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.categorieContainer}>
          <Ionicons name="camera" size={16} color="#5C6BC0" />
          <Text style={styles.categorieText}>{demande.categorie}</Text>
        </View>
        <View style={[styles.statutBadge, { backgroundColor: STATUT_COLORS[demande.statut as keyof typeof STATUT_COLORS] }]}>
          <Text style={styles.statutText}>{demande.statut}</Text>
        </View>
      </View>

      <Text style={styles.titre} numberOfLines={2}>{demande.titre}</Text>

      <View style={styles.infoRow}>
        <Ionicons name="location" size={14} color="#666" />
        <Text style={styles.infoText}>{demande.lieu_ville}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="calendar" size={14} color="#666" />
        <Text style={styles.infoText}>
          {new Date(demande.date_evenement).toLocaleDateString('fr-FR')}
        </Text>
      </View>

      {demande.budget_min && demande.budget_max && (
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>Budget:</Text>
          <Text style={styles.budgetValue}>
            {demande.budget_min}€ - {demande.budget_max}€
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categorieContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categorieText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5C6BC0',
  },
  statutBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statutText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
    textTransform: 'capitalize',
  },
  titre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  budgetLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 8,
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#5C6BC0',
  },
});
