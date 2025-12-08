import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DevisCardProps {
  devis: any;
  onPress?: () => void;
  variant?: 'client' | 'photographe';
}

const STATUT_COLORS = {
  envoye: '#2196F3',
  lu: '#FF9800',
  accepte: '#4CAF50',
  refuse: '#F44336',
  expire: '#9E9E9E',
};

const STATUT_LABELS = {
  envoye: 'Envoyé',
  lu: 'Lu',
  accepte: 'Accepté',
  refuse: 'Refusé',
  expire: 'Expiré',
};

export default function DevisCard({ devis, onPress, variant = 'client' }: DevisCardProps) {
  const isClient = variant === 'client';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.idContainer}>
          <Ionicons name="document-text" size={16} color="#666" />
          <Text style={styles.idText}>#{devis.id?.substring(0, 8)}</Text>
        </View>
        <View style={[styles.statutBadge, { backgroundColor: STATUT_COLORS[devis.statut as keyof typeof STATUT_COLORS] }]}>
          <Text style={styles.statutText}>
            {STATUT_LABELS[devis.statut as keyof typeof STATUT_LABELS]}
          </Text>
        </View>
      </View>

      <Text style={styles.titre} numberOfLines={1}>
        {isClient ? devis.photographe_nom : devis.demande_titre}
      </Text>

      <View style={styles.infoRow}>
        <Ionicons name="calendar" size={14} color="#666" />
        <Text style={styles.infoText}>
          Envoyé le {new Date(devis.created_at).toLocaleDateString('fr-FR')}
        </Text>
      </View>

      {devis.expire_at && (
        <View style={styles.infoRow}>
          <Ionicons name="time" size={14} color="#FF9800" />
          <Text style={styles.warningText}>
            Expire le {new Date(devis.expire_at).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Montant total</Text>
          <Text style={styles.priceValue}>{devis.montant_total?.toFixed(2)}€</Text>
        </View>
        {!devis.lu_at && isClient && (
          <View style={styles.newBadge}>
            <Text style={styles.newText}>NOUVEAU</Text>
          </View>
        )}
      </View>
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
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  idText: {
    fontSize: 13,
    color: '#666',
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
    fontSize: 13,
    color: '#666',
  },
  warningText: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5C6BC0',
  },
  newBadge: {
    backgroundColor: '#FF5252',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
});
