# Script de corrections appliquées

## ✅ Corrections effectuées:

### 1. demandes_client
- `particulier_id` → `client_id`
  - ✅ pages/client/demandes/index.js
  - ✅ pages/client/demandes/create.js

### 2. packages → packages_types
- ✅ pages/photographe/packages.js (4 occurrences)
- ✅ pages/photographe/[id]/public.js

## 🔄 Corrections restantes à appliquer:

### 3. favoris.annonce_id → photographe_id
- pages/client/profil.js (lignes 225, 236)

### 4. blocked_slots colonnes
- pages/photographe/agenda.js
  - `date_debut` → `start_datetime` 
  - `date_fin` → `end_datetime`

### 5. conversations colonnes
- pages/client/dashboard.js
- pages/photographe/dashboard.js
  - `participant_1` → `client_id`
  - `participant_2` → `photographe_id`

### 6. reservations colonnes  
- pages/photographe/invoice.js
  - `date_debut` → `start_datetime`
  - `date_fin` → `end_datetime`

### 7. Table annonces
⚠️ **ATTENTION**: Certains fichiers utilisent déjà `prestations_photographe`, d'autres utilisent `annonces`.
Il faut harmoniser vers `packages_types` OU créer une vue/table `annonces`.

Fichiers utilisant `annonces`:
- pages/photographe/profil.js
- pages/client/menu.js
- pages/profil/[id].js
- pages/photographe/messages.js
- pages/photographe/calendar/calendrier.js
- pages/photographe/kpi/kpis.js
- pages/photographe/devis/devis.js
- pages/photographe/reservations/reservations.js

## 📊 Statut
- ✅ Complété: 3 corrections
- 🔄 En attente: 4 corrections urgentes
- ⚠️ À décider: Table annonces (7+ fichiers)
