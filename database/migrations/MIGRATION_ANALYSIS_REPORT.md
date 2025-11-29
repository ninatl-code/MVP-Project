# 📊 Rapport d'Analyse des Migrations - Base de Données Existante

**Date**: $(date)  
**Objectif**: Adapter les schémas Phase 1/2/3 pour une base de données existante

---

## 🎯 Résumé Exécutif

### Tables Existantes: 8

- ✅ **PAYMENT_METHOD** (2 colonnes)
- ✅ **abonnements** (7 colonnes)
- ✅ **annonces** (28 colonnes)
- ✅ **avis** (23 colonnes)
- ✅ **blocked_slots** (6 colonnes)
- ✅ **conversations** (7 colonnes)
- ✅ **devis** (28 colonnes)
- ✅ **dynamic_pricing_rules** (9 colonnes)

### Convention de Nommage

- **Existant**: Français (`prestataire_id`, `particulier_id`, `annonce_id`)
- **Schémas initiaux**: Anglais (`provider_id`, `client_id`, `service_id`)
- **Solution**: Utiliser les noms français dans tous les nouveaux schémas

---

## 📈 Statistiques de Migration

### Phase 1

| Action                 | Quantité | Détails                                                                                                                                                                                                                            |
| ---------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tables à créer**     | 12       | provider_availability, instant_booking_settings, review_reminders, verification_documents, verification_history, saved_searches, search_history, price_alerts, search_analytics, featured_placements, ad_campaigns, ad_impressions |
| **Tables existantes**  | 2        | `blocked_slots` (ajouter 3 colonnes), `avis` (ajouter 9 colonnes)                                                                                                                                                                  |
| **Colonnes à ajouter** | 12       | Sur blocked_slots: start_datetime, end_datetime, reason<br>Sur avis: reviewer_id, reviewee_id, reviewer_role, professionalism_rating, value_rating, cooperation_rating, title, provider_response, responded_at                     |
| **Index à créer**      | 15+      | Sur created_at, status, FK, etc.                                                                                                                                                                                                   |

### Phase 2

| Action                 | Quantité | Détails                                                                                                                                                                                        |
| ---------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tables à créer**     | 7        | pricing_rules (merge avec dynamic_pricing_rules), provider_analytics, service_analytics, analytics_snapshots, cancellation_policies, cancellation_requests, messages (adapter à conversations) |
| **Tables existantes**  | 2        | `dynamic_pricing_rules` (déjà OK), `conversations` (ajouter colonnes pour messages)                                                                                                            |
| **Colonnes à ajouter** | 8        | Sur conversations: status, unread_count, metadata<br>Sur dynamic_pricing_rules: priority, description                                                                                          |
| **Index à créer**      | 10+      | Sur analytics, timestamps, FK                                                                                                                                                                  |

### Phase 3

| Action                 | Quantité | Détails                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tables à créer**     | 22       | user_preferences, ai_recommendations, recommendation_feedback, loyalty_points, loyalty_transactions, achievements, user_achievements, rewards_catalog, reward_redemptions, referrals, media_library, media_tags, media_albums, integrations, integration_logs, webhooks, webhook_deliveries, api_keys, api_usage, rate_limits, audit_logs, feature_flags |
| **Tables existantes**  | 0        | Aucune table Phase 3 n'existe                                                                                                                                                                                                                                                                                                                            |
| **Colonnes à ajouter** | 0        | Toutes les tables sont nouvelles                                                                                                                                                                                                                                                                                                                         |
| **FK à adapter**       | 50+      | Tous les `provider_id` → `prestataire_id`, `service_id` → `annonce_id`, `client_id` → `particulier_id`                                                                                                                                                                                                                                                   |

---

## 🔄 Actions Effectuées

### ✅ Phase 1 Schema (phase1_schema.sql)

- [x] Ajout header indiquant compatibilité avec DB existante
- [x] Conversion `blocked_slots`: CREATE TABLE → ALTER TABLE ADD COLUMN
- [x] Conversion `reviews` → utilisation table `avis` existante + ajout colonnes
- [x] Renommage `provider_id` → `prestataire_id` dans provider_availability
- [x] Renommage `provider_id` → `prestataire_id` dans instant_booking_settings
- [x] Adaptation des contraintes pour utiliser colonnes existantes (`note_communication`, `note_ponctualite`)
- [x] Migration de données : `date` → `start_datetime`, `motif` → `reason`

### ⏳ Phase 2 Schema (phase2_schema.sql) - À FAIRE

- [ ] Merger `pricing_rules` avec `dynamic_pricing_rules` existant
- [ ] Adapter `message_threads` pour utiliser `conversations` existant
- [ ] Créer table `messages` liée à `conversations` (pas `message_threads`)
- [ ] Renommer tous les `provider_id` → `prestataire_id`
- [ ] Renommer tous les `service_id` → `annonce_id`
- [ ] Créer nouvelles tables : cancellation_policies, analytics_snapshots, etc.

### ⏳ Phase 3 Schema (phase3_schema.sql) - À FAIRE

- [ ] Renommer 50+ FK : `provider_id` → `prestataire_id`
- [ ] Renommer 30+ FK : `service_id` → `annonce_id`
- [ ] Renommer 20+ FK : `client_id` → `particulier_id`
- [ ] Vérifier toutes les références de tables (annonces, avis, conversations)
- [ ] Créer les 22 nouvelles tables

---

## 🛠️ Actions Manuelles Requises

### 1. Vérification Préalable

```sql
-- Backup complet avant migration
pg_dump your_database > backup_$(date +%Y%m%d).sql

-- Vérifier les FK existants
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

### 2. Ordre d'Exécution

1. **Phase 1** : `phase1_schema.sql` (modifié ✅)
2. **Phase 2** : `phase2_schema.sql` (à modifier ⏳)
3. **Phase 3** : `phase3_schema.sql` (à modifier ⏳)

### 3. Test sur Environnement Staging

- [ ] Copier la base de production vers staging
- [ ] Exécuter Phase 1
- [ ] Vérifier intégrité des données
- [ ] Exécuter Phase 2
- [ ] Vérifier intégrité des données
- [ ] Exécuter Phase 3
- [ ] Tests d'intégration complets

### 4. Mise à Jour du Code TypeScript

Fichiers à modifier (7 composants mobiles):

- [ ] `ai-recommendations.tsx` : `.from('reviews')` → `.from('avis')`
- [ ] `loyalty-dashboard.tsx` : Ajouter FK `prestataire_id`
- [ ] `media-library.tsx` : Utiliser `annonce_id` au lieu de `service_id`
- [ ] `integrations.tsx` : Utiliser `prestataire_id`
- [ ] `preferences.tsx` : Utiliser `particulier_id`
- [ ] `achievements.tsx` : Utiliser `particulier_id`
- [ ] `rewards-catalog.tsx` : Utiliser `particulier_id`

---

## ⚠️ Points d'Attention

### Conflits de Colonnes

1. **blocked_slots**

   - Existant: `date`, `motif`, `prestataire_id`, `annonce_id`
   - Ajouté: `start_datetime`, `end_datetime`, `reason`
   - Migration: Copier `date` → `start_datetime`, `motif` → `reason`

2. **avis (reviews)**

   - Existant: `note`, `commentaire`, `note_qualite`, `note_ponctualite`, `photos`
   - Ajouté: `reviewer_id`, `reviewee_id`, `reviewer_role`, `title`, `provider_response`
   - Mapping: `note` = overall_rating, `commentaire` = comment

3. **dynamic_pricing_rules**
   - Existant: 9 colonnes complètes
   - Action: Ajouter colonnes manquantes seulement (priority, description)

### Foreign Keys

- ❌ **NE PAS** utiliser `profiles(id)` si cette table n'existe pas
- ✅ **Vérifier** la table users/profiles réelle dans votre DB
- ✅ **Remplacer** par le bon nom de table

---

## 📋 Checklist de Validation

### Avant Migration

- [ ] Backup complet effectué
- [ ] Environnement staging disponible
- [ ] Liste des FK existants documentée
- [ ] Nom de la table users/profiles vérifié

### Après Phase 1

- [ ] Aucune donnée perdue dans `blocked_slots`
- [ ] Aucune donnée perdue dans `avis`
- [ ] 12 nouvelles tables créées
- [ ] Tous les index créés
- [ ] RLS policies activées

### Après Phase 2

- [ ] Pricing rules fusionnés correctement
- [ ] Conversations table enrichie
- [ ] Analytics tables créées
- [ ] Aucun conflit de FK

### Après Phase 3

- [ ] 22 nouvelles tables créées
- [ ] Tous les FK utilisent noms français
- [ ] Tests d'intégration passent
- [ ] Code TypeScript mis à jour

---

## 🎯 Prochaines Étapes

1. **Finaliser Phase 1** ✅ (En cours - 60% fait)
2. **Mettre à jour Phase 2** ⏳ (Prochain)
3. **Mettre à jour Phase 3** ⏳ (Après Phase 2)
4. **Tester sur staging** ⏳
5. **Mettre à jour code TypeScript** ⏳
6. **Déployer en production** ⏳

---

## 📞 Support

En cas de problème:

1. Vérifier les logs SQL
2. Rollback via backup
3. Contacter l'équipe DevOps

**Auteur**: GitHub Copilot  
**Version**: 1.0  
**Dernière mise à jour**: $(date)
