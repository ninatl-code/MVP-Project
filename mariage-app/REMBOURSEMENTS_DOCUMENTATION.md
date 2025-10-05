# Système de Gestion des Remboursements avec Stripe

## Vue d'ensemble

Ce système gère les remboursements automatiques selon les conditions d'annulation définies par les prestataires, avec intégration complète Stripe et interface d'administration.

## Architecture du Système

### 1. Conditions d'Annulation

Les prestataires peuvent définir 3 types de conditions :

- **Flexible** : Annulation gratuite jusqu'à 24h avant
- **Modéré** : Annulation gratuite jusqu'à 7 jours avant, 50% de remboursement après
- **Strict** : Remboursement uniquement pour cause de force majeure (validation admin)

### 2. Composants Principaux

#### API Endpoints

1. **`/api/stripe/refund.js`**

   - Traitement automatique des remboursements Stripe
   - Validation des conditions d'annulation
   - Calcul du montant de remboursement
   - Enregistrement en base de données

2. **`/api/admin/manual-refund.js`**
   - Approbation manuelle des remboursements (force majeure)
   - Accès restreint aux administrateurs
   - Validation et traitement des cas exceptionnels

#### Interfaces Utilisateur

1. **Clients** (`/remboursements/mes-remboursements.js`)

   - Historique des demandes de remboursement
   - Suivi du statut en temps réel
   - Détails des montants et conditions

2. **Prestataires** (`/prestataires/remboursements.js`)

   - Vue sur les remboursements de leurs services
   - Impact financier par annulation
   - Statistiques de remboursement

3. **Administrateurs** (`/admin/remboursements.js`)
   - Gestion globale des remboursements
   - Approbation des cas de force majeure
   - Statistiques et rapports

#### Base de Données

**Table `remboursements`** :

```sql
CREATE TABLE remboursements (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER REFERENCES reservations(id),
  particulier_id UUID REFERENCES profiles(id),
  prestataire_id UUID REFERENCES profiles(id),
  montant_original DECIMAL(10,2) NOT NULL,
  montant_rembourse DECIMAL(10,2) NOT NULL,
  pourcentage_remboursement INTEGER NOT NULL,
  condition_annulation VARCHAR(20) NOT NULL,
  statut_remboursement VARCHAR(20) DEFAULT 'pending',
  motif_annulation TEXT,
  stripe_refund_id VARCHAR(255),
  date_remboursement TIMESTAMP DEFAULT NOW(),
  date_traitement_admin TIMESTAMP,
  notes_admin TEXT
);
```

## Flux de Fonctionnement

### 1. Annulation par le Client

1. **Déclenchement** : Client clique sur "Annuler" dans `menu.js`
2. **Vérification** : Validation des conditions d'annulation
3. **Modal de confirmation** : Affichage du montant de remboursement calculé
4. **Traitement** : Appel API vers `/api/stripe/refund.js`

### 2. Traitement du Remboursement

```javascript
// Logique de calcul du remboursement
if (condition_annulation === "Flexible") {
  if (heuresAvantPrestation >= 24) {
    pourcentage = 100; // Remboursement intégral
  } else {
    pourcentage = 0; // Pas de remboursement
  }
} else if (condition_annulation === "Modéré") {
  if (heuresAvantPrestation >= 168) {
    // 7 jours
    pourcentage = 100;
  } else if (heuresAvantPrestation >= 24) {
    pourcentage = 50; // Remboursement partiel
  } else {
    pourcentage = 0;
  }
} else if (condition_annulation === "Strict") {
  // Force majeure uniquement - nécessite validation admin
  pourcentage = 0;
  statut = "pending";
}
```

### 3. Intégration Stripe

- **Création du remboursement** : `stripe.refunds.create()`
- **Tracking** : Enregistrement de l'ID Stripe pour suivi
- **Webhooks** : Gestion des confirmations de remboursement

### 4. Gestion Administrative

- **Cas de force majeure** : Validation manuelle requise
- **Remboursements exceptionnels** : Possibilité d'approuver manuellement
- **Suivi complet** : Dashboard avec toutes les transactions

## Configuration Requise

### Variables d'Environnement

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Base de Données Supabase

1. Exécuter le script `database/remboursements_table.sql`
2. Configurer les RLS policies
3. Vérifier les indexes pour les performances

### Webhooks Stripe

Configurer les webhooks pour :

- `charge.succeeded`
- `refund.created`
- `refund.updated`

## Utilisation

### Pour les Clients

1. **Voir les remboursements** : Naviguer vers `/remboursements/mes-remboursements`
2. **Annuler une réservation** : Depuis le menu particulier
3. **Suivre le statut** : Notifications en temps réel

### Pour les Prestataires

1. **Définir les conditions** : Dans la création d'annonce (`prestations.js`)
2. **Suivre les remboursements** : Page dédiée `/prestataires/remboursements`
3. **Analyser l'impact** : Statistiques financières

### Pour les Administrateurs

1. **Gérer les remboursements** : Interface `/admin/remboursements`
2. **Approuver force majeure** : Validation manuelle des cas exceptionnels
3. **Supervision** : Vue globale et statistiques

## Sécurité et Conformité

- **RLS Supabase** : Accès sécurisé par utilisateur
- **Validation côté serveur** : Toutes les conditions vérifiées en backend
- **Audit trail** : Traçabilité complète des opérations
- **Stripe secure** : Gestion sécurisée des paiements

## Maintenance et Monitoring

- **Logs Stripe** : Suivi des transactions
- **Métriques** : Taux de remboursement par condition
- **Alertes** : Notification des échecs de remboursement
- **Rapports** : Analyse financière périodique

## Extensions Possibles

1. **Notifications email** : Confirmation des remboursements
2. **API mobile** : Support pour application mobile
3. **Rapports avancés** : Analytics détaillées
4. **Intégration comptable** : Export pour systèmes comptables
5. **Multi-devise** : Support des devises multiples

## Support et Dépannage

### Erreurs Courantes

1. **Refund failed** : Vérifier la validité du payment_intent Stripe
2. **Database error** : Contrôler les permissions RLS
3. **Amount mismatch** : Valider les calculs de pourcentage

### Logs et Debugging

- Activer les logs Stripe en développement
- Utiliser les outils de debug Supabase
- Monitor les performances des requêtes
