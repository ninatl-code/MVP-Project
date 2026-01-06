# Rapport d'Analyse - Incohérences Schéma Base de Données

**Date:** 2026-01-06  
**Analyse:** web-app vs existingdatabase.md

---

## 🔴 PROBLÈMES CRITIQUES

### 1. Tables inexistantes utilisées dans le code

| Table utilisée | Table correcte | Occurrences | Impact |
|----------------|----------------|-------------|--------|
| `annonces` | ❌ N'existe pas | ~20 fichiers | **CRITIQUE** - Toute la fonctionnalité prestations cassée |
| `commandes` | ❌ N'existe pas | 5+ fichiers | **CRITIQUE** - Commandes impossibles |
| `packages` | `packages_types` | 8+ fichiers | **ÉLEVÉ** - Mauvais nom de table |
| `services` | ❌ N'existe pas | 10+ fichiers | **CRITIQUE** - Services non disponibles |
| `disponibilites` | `blocked_slots` | 5+ fichiers | **ÉLEVÉ** - Calendrier cassé |
| `zones_intervention` | ❌ N'existe pas | 3+ fichiers | **MOYEN** - Recherche géographique |
| `notification_preferences` | ❌ N'existe pas | 2 fichiers | **MOYEN** - Préférences notifications |

### 2. Colonnes mal nommées

| Fichier | Table | Colonne utilisée | Colonne correcte |
|---------|-------|------------------|------------------|
| favoris.js | `favoris` | `annonce_id` | ❌ N'existe pas |
| messages/*.js | `messages` | `read`, `expediteur_id` | `lu_at`, `sender_id` |
| demandes/*.js | `demandes_client` | `particulier_id` | `client_id` |
| reservations/*.js | `reservations` | `date_debut`, `date_fin` | `start_datetime`, `end_datetime` |
| conversations/*.js | `conversations` | `participant_1`, `participant_2` | `client_id`, `photographe_id` |

---

## 📋 CORRECTIONS NÉCESSAIRES

### Option A: Créer les tables manquantes (Recommandé si logique métier valide)

```sql
-- Créer la table annonces si elle doit exister
CREATE TABLE annonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photographe_id UUID REFERENCES profiles(id),
  titre TEXT NOT NULL,
  description TEXT,
  photos TEXT[],
  tarif_unit NUMERIC,
  -- autres colonnes...
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Créer la table commandes si différente de albums_commandes
CREATE TABLE commandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  particulier_id UUID REFERENCES profiles(id),
  -- colonnes nécessaires...
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Option B: Corriger le code pour utiliser les tables existantes (Plus rapide)

**Mappings à appliquer:**

1. `annonces` → Utiliser `prestations_photographe` ou créer la table
2. `commandes` → Utiliser `albums_commandes` ou créer séparément
3. `packages` → `packages_types`
4. `services` → `prestations_photographe` ou créer
5. `disponibilites` → `blocked_slots`
6. `zones_intervention` → Ajouter colonnes dans `profils_photographe`

---

## 🎯 PLAN D'ACTION PRIORITAIRE

### Phase 1: Corrections immédiates (1-2h)
1. ✅ Remplacer `packages` par `packages_types`
2. ✅ Corriger colonnes messages: `read` → `lu_at`, `expediteur_id` → `sender_id`
3. ✅ Corriger `particulier_id` → `client_id` dans demandes_client
4. ✅ Corriger `date_debut`/`date_fin` → `start_datetime`/`end_datetime`

### Phase 2: Décisions architecture (2-4h)
1. ⚠️ Décider: Créer table `annonces` ou utiliser existante?
2. ⚠️ Décider: Créer table `commandes` distincte de `albums_commandes`?
3. ⚠️ Décider: Gérer `services` via prestations ou nouvelle table?
4. ⚠️ Créer migrations SQL nécessaires

### Phase 3: Implémentation (4-8h)
1. 🔧 Appliquer corrections code sur toutes les pages
2. 🔧 Tester chaque fonctionnalité
3. 🔧 Valider avec tests E2E

---

## 📁 FICHIERS À CORRIGER (par priorité)

### Priorité 1 - Cassent l'application
- `/pages/recherche/index.js` - table annonces
- `/pages/client/prestations.js` - table annonces
- `/pages/photographe/packages.js` - table packages
- `/pages/shared/messages/index.js` - colonnes messages

### Priorité 2 - Fonctionnalités importantes
- `/pages/client/demandes/*.js` - particulier_id
- `/pages/photographe/reservations/*.js` - date_debut/fin
- `/pages/photographe/agenda.js` - disponibilites

### Priorité 3 - Fonctionnalités secondaires
- `/pages/profil/[id].js` - favoris
- `/pages/photographe/mediatheque.js` - storage
- `/pages/shared/profil/settings.js` - notification_preferences

---

## 🔍 DÉTAILS TECHNIQUES

### Tables existantes confirmées (extrait)
- `profiles` ✅
- `profils_photographe` ✅
- `reservations` ✅
- `messages` ✅
- `conversations` ✅
- `demandes_client` ✅
- `packages_types` ✅
- `blocked_slots` ✅
- `favoris` ✅
- `avis` ✅

### Tables manquantes à créer ou remplacer
- `annonces` ❌
- `commandes` ❌ (albums_commandes existe)
- `services` ❌
- `disponibilites` ❌ (blocked_slots existe)
- `zones_intervention` ❌
- `notification_preferences` ❌

---

## 💡 RECOMMANDATION FINALE

**Approche suggérée:** Corriger le code pour utiliser les tables existantes en priorité, puis créer uniquement les tables vraiment nécessaires après validation de la logique métier.

**Temps estimé:** 8-16h de travail pour tout corriger et tester.
