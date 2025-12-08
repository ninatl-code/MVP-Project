# Audit Mobile App - Refactorisation Demand-Driven

**Date:** 8 décembre 2025  
**Contexte:** Migration de supply-driven (annonces) vers demand-driven (demandes → devis)

---

## 📊 Résumé Exécutif

**État actuel:** Le dossier `mobile-app/` contient l'ancienne architecture basée sur `annonces` (listings photographes) et doit être complètement refactorisé pour le nouveau modèle `demandes_client` → `devis` → `reservations`.

**Tables obsolètes utilisées:**
- `annonces` (remplacée par `profils_photographe` + `demandes_client`)
- `zones_intervention` (remplacée par localisation dans `profiles`)

**Tables nouvelles à intégrer:**
- `profils_photographe` (enriched profiles)
- `demandes_client` (client requests - CORE)
- `devis` (enhanced quotes)
- `packages_types` (optional standardized services)
- `tirages_commandes` (print orders)
- `albums_commandes` (album orders)
- `galeries_livraison` (enhanced delivery galleries)

---

## 🗂️ Structure Actuelle

```
mobile-app/
├── app/
│   ├── annonces/                  ❌ DOSSIER VIDE - À SUPPRIMER
│   ├── api/                       ✅ À CONSERVER (peu de modifications)
│   ├── auth/                      ✅ À CONSERVER (inchangé)
│   ├── client/                    ⚠️ À REFACTORISER COMPLÈTEMENT
│   │   ├── Achievements/
│   │   ├── Avis/
│   │   ├── packages/
│   │   ├── reservations/
│   │   └── search/                ⚠️ RECHERCHE ANNONCES → PHOTOGRAPHES
│   ├── photographe/               ⚠️ À REFACTORISER COMPLÈTEMENT
│   │   ├── annonces/              ❌ SUPPRIMER (ancien système)
│   │   ├── calendar/              ✅ CONSERVER
│   │   ├── cancellation-policies.tsx ✅ CONSERVER
│   │   ├── devis/                 ⚠️ ADAPTER (ancien format)
│   │   ├── integrations.tsx       ✅ CONSERVER
│   │   ├── kpis/                  ⚠️ ADAPTER (métriques annonces → demandes/devis)
│   │   ├── leads/                 ⚠️ RENOMMER → demandes/
│   │   ├── ma-localisation.tsx    ✅ CONSERVER
│   │   ├── media-library.tsx      ✅ CONSERVER
│   │   ├── menu.tsx               ⚠️ ADAPTER (stats annonces → stats demandes/devis)
│   │   ├── messages.tsx           ✅ CONSERVER
│   │   ├── notification.tsx       ✅ CONSERVER
│   │   ├── packages/              ⚠️ ADAPTER (lier à packages_types)
│   │   ├── profil/                ⚠️ ADAPTER (ajouter champs profils_photographe)
│   │   ├── remboursements.tsx     ✅ CONSERVER
│   │   ├── reservations/          ⚠️ ADAPTER (lier demande_id, devis_id)
│   │   └── review/                ✅ CONSERVER
│   ├── shared/                    ⚠️ À ADAPTER
│   │   ├── mes-remboursements.tsx ⚠️ ADAPTER (remplacer annonces)
│   │   ├── paiement/              ⚠️ ADAPTER (checkouts liés aux réservations)
│   │   └── payments.tsx           ⚠️ ADAPTER (remplacer annonces)
│   ├── index.tsx                  ✅ CONSERVER (routing de base)
│   ├── loading.tsx                ✅ CONSERVER
│   ├── modal.tsx                  ✅ CONSERVER
│   ├── search.tsx                 ❌ SUPPRIMER (doublon avec client/search/)
│   └── _layout.tsx                ⚠️ ADAPTER (route annonces → demandes)
├── components/
│   ├── avis/                      ✅ CONSERVER
│   ├── client/                    ⚠️ À ADAPTER
│   ├── photographe/               ⚠️ À ADAPTER
│   ├── ui/                        ✅ CONSERVER
│   └── RealTimeNotifications.jsx  ⚠️ ADAPTER (nouveaux event types)
├── lib/
│   ├── AuthContext.tsx            ✅ CONSERVER
│   ├── constants.ts               ✅ CONSERVER
│   ├── loggerService.ts           ✅ CONSERVER
│   ├── marketplacePaymentService.ts ⚠️ ADAPTER (remplacer annonces)
│   ├── notificationService.ts     ⚠️ ADAPTER (nouveaux event types)
│   ├── paymentService.ts          ⚠️ ADAPTER (remplacer annonces)
│   ├── supabaseClient.ts          ✅ CONSERVER (mettre à jour projet)
│   └── viewTracking.ts            ❌ SUPPRIMER (trackAnnonceView obsolète)
└── autres fichiers                ✅ CONSERVER (config, assets, etc.)
```

---

## 🔴 FICHIERS À SUPPRIMER

### Dossiers vides
- **`app/annonces/`** - Dossier vide (ancien système annonces)

### Fichiers obsolètes
- **`app/search.tsx`** - Doublon avec `client/search/search.tsx`
- **`lib/viewTracking.ts`** - Fonction `trackAnnonceView()` obsolète (pas de vues sur profils photographes)

### Sous-dossiers à supprimer
- **`app/photographe/annonces/`** - Ancien système de création/gestion d'annonces (6 fichiers)
  - `annonce-preview.tsx`
  - `edit.tsx`
  - `index.tsx`
  - `preview.tsx`
  - `[id].tsx`
  - `_layout.tsx`

**Total: 8 fichiers/dossiers à supprimer**

---

## 🟢 FICHIERS À CONSERVER (sans modification)

### Infrastructure
- `app/index.tsx` - Routing de base (check role)
- `app/loading.tsx` - Écran de chargement
- `app/modal.tsx` - Modal générique
- `app/_layout.tsx` - **SAUF** route `annonces` à retirer
- `app/api/*` - Routes API (peu impactées)
- `app/auth/*` - Authentification (inchangée)

### Composants UI
- `components/ui/*` - Tous les composants UI (Button, Card, SearchBar, etc.)
- `components/avis/*` - Système d'avis (inchangé)

### Modules photographe (peu impactés)
- `app/photographe/calendar/` - Calendrier (inchangé)
- `app/photographe/cancellation-policies.tsx` - Politiques d'annulation
- `app/photographe/integrations.tsx` - Intégrations (Stripe, etc.)
- `app/photographe/ma-localisation.tsx` - Géolocalisation
- `app/photographe/media-library.tsx` - Bibliothèque média
- `app/photographe/messages.tsx` - Messagerie
- `app/photographe/notification.tsx` - Notifications
- `app/photographe/remboursements.tsx` - Remboursements
- `app/photographe/review/*` - Reviews

### Services
- `lib/AuthContext.tsx` - Contexte d'authentification
- `lib/constants.ts` - Constantes (couleurs, spacing, etc.)
- `lib/loggerService.ts` - Logger
- `lib/supabaseClient.ts` - **METTRE À JOUR URL projet Supabase**

**Total: ~50 fichiers à conserver**

---

## 🟡 FICHIERS À MODIFIER

### Priorité CRITIQUE (workflow principal)

#### 1. **`app/client/search/search.tsx`** (833 lignes)
**Problème:** Recherche basée sur table `annonces` avec `zones_intervention`

**Modifications:**
```typescript
// ❌ AVANT (ligne 106+)
const { data: annonces } = await supabase
  .from('annonces')
  .select(`*, profiles(*), prestations(*)`)
  .eq('actif', true);

// Enrichissement avec zones_intervention
const annoncesAvecZones = await Promise.all(...)

// ✅ APRÈS
const { data: photographes } = await supabase
  .from('profils_photographe')
  .select(`
    *,
    profiles!inner(id, nom, prenom, email, ville, latitude, longitude, avatar_url)
  `)
  .eq('mobile', true); // Peut se déplacer

// Filtrage par distance
const nearbyPhotographers = photographes.filter(p => {
  const distance = calculateDistance(
    userLat, userLon,
    p.profiles.latitude, p.profiles.longitude
  );
  return distance <= p.rayon_deplacement_km;
});

// Filtrage par catégorie
if (selectedPrestation !== 'all') {
  filtered = filtered.filter(p => 
    p.specialisations.includes(selectedPrestation)
  );
}

// Filtrage par prix
if (priceRange.min || priceRange.max) {
  filtered = filtered.filter(p =>
    p.tarif_horaire_min >= Number(priceRange.min || 0) &&
    p.tarif_horaire_max <= Number(priceRange.max || 999999)
  );
}
```

**Interface à changer:**
```typescript
// ❌ AVANT
interface Annonce {
  id: string;
  titre: string;
  tarif_min: number;
  // ...
  zones_intervention?: string[];
}

// ✅ APRÈS
interface PhotographeProfile {
  id: string;
  bio: string;
  specialisations: string[];
  mobile: boolean;
  rayon_deplacement_km: number;
  tarif_horaire_min: number;
  tarif_horaire_max: number;
  note_moyenne: number;
  nb_avis: number;
  portfolio_photos: string[];
  portfolio_principal: string;
  profiles: {
    nom: string;
    prenom: string;
    ville: string;
    latitude: number;
    longitude: number;
    avatar_url: string;
  };
}
```

**Lignes impactées:** ~150-200 lignes (20-25% du fichier)

---

#### 2. **`app/photographe/menu.tsx`** (397 lignes)
**Problème:** Stats basées sur table `annonces`

**Modifications:**
```typescript
// ❌ AVANT (ligne 71+)
const { count: annoncesCount } = await supabase
  .from('annonces')
  .select('*', { count: 'exact', head: true })
  .eq('prestataire', userId);

// ✅ APRÈS
// Stats demandes reçues
const { count: demandesRecues } = await supabase
  .from('demandes_client')
  .select('*', { count: 'exact', head: true })
  .contains('photographes_notifies', [userId]);

// Stats devis envoyés
const { count: devisEnvoyes } = await supabase
  .from('devis')
  .select('*', { count: 'exact', head: true })
  .eq('photographe_id', userId);

// Stats devis acceptés
const { count: devisAcceptes } = await supabase
  .from('devis')
  .select('*', { count: 'exact', head: true })
  .eq('photographe_id', userId)
  .eq('statut', 'accepte');

// Mettre à jour profils_photographe avec ces stats
await supabase
  .from('profils_photographe')
  .update({
    nb_demandes_recues: demandesRecues,
    nb_devis_envoyes: devisEnvoyes,
    taux_conversion: Math.round((devisAcceptes / devisEnvoyes) * 100)
  })
  .eq('id', userId);
```

**État du UI:**
```typescript
// ❌ AVANT
const [stats, setStats] = useState({
  reservations: 0,
  devis: 0,
  annonces: 0,  // À supprimer
  messages: 0,
  chiffreAffaires: 0
});

// ✅ APRÈS
const [stats, setStats] = useState({
  reservations: 0,
  demandes_recues: 0,  // Nouveau
  devis_envoyes: 0,    // Nouveau
  devis_acceptes: 0,   // Nouveau
  taux_conversion: 0,  // Nouveau (%)
  messages: 0,
  chiffreAffaires: 0
});
```

**Lignes impactées:** ~50-80 lignes (12-20% du fichier)

---

#### 3. **`app/photographe/devis/devis.tsx`** (868 lignes)
**Problème:** Ancien format devis (basique), pas de lien avec demandes

**Modifications:**
```typescript
// ❌ AVANT (ligne 73+)
const { data, error } = await supabase
  .from('devis')
  .select(`
    id, status, created_at, montant, comment_client, comment_presta,
    date, particulier_id, annonce_id,
    client:profiles!particulier_id(nom, email, telephone),
    annonces(titre)
  `)
  .eq('prestataire_id', user.id);

// ✅ APRÈS
const { data, error } = await supabase
  .from('devis')
  .select(`
    *,
    demande:demandes_client!demande_id(
      id, titre, categorie, date_souhaitee, lieu, ville,
      budget_min, budget_max, nb_photos_souhaitees,
      description, statut
    ),
    client:profiles!client_id(nom, prenom, email, telephone, avatar_url)
  `)
  .eq('photographe_id', user.id)
  .order('created_at', { ascending: false });
```

**Interface à changer:**
```typescript
// ❌ AVANT
interface Devis {
  id: string;
  status: string;
  montant?: number;
  comment_client: string;
  comment_presta?: string;
  annonce_id: string;
  annonces?: { titre: string };
}

// ✅ APRÈS
interface Devis {
  id: string;
  demande_id: string;
  photographe_id: string;
  client_id: string;
  titre: string;
  description: string;
  message_personnalise: string;
  
  // Tarification
  tarif_base: number;
  frais_deplacement: number;
  frais_additionnels: Record<string, number>;
  montant_total: number;
  acompte_percent: number;
  
  // Prestation
  duree_prestation_heures: number;
  nb_photos_livrees: number;
  delai_livraison_jours: number;
  
  // Livraison
  modes_livraison_inclus: string[];
  plateforme_livraison: string;
  tirages_inclus: boolean;
  album_inclus: boolean;
  
  // Statut
  statut: 'envoye' | 'lu' | 'accepte' | 'refuse' | 'expire';
  date_expiration: string;
  
  // Relations
  demande: {
    id: string;
    titre: string;
    categorie: string;
    date_souhaitee: string;
    lieu: string;
    ville: string;
    budget_min: number;
    budget_max: number;
    description: string;
    statut: string;
  };
  client: {
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    avatar_url: string;
  };
}
```

**Fonctionnalité à ajouter:** Formulaire de création de devis (répondre à une demande)

**Lignes impactées:** ~200-300 lignes (25-35% du fichier)

---

#### 4. **`app/photographe/profil/`**
**Problème:** Profil basique, manque tous les champs de `profils_photographe`

**Modifications à apporter:**
- Ajouter formulaire enrichi pour `profils_photographe`
- Sections: Bio, Entreprise, Spécialisations, Matériel, Portfolio, Tarifs, Services
- Upload multiple pour portfolio (portfolio_photos[], photos_par_categorie)
- Gestion documents de vérification (SIRET, KBIS, assurance)
- Configuration mobilité (rayon_deplacement_km, frais)
- Tarifs indicatifs par catégorie (fourchettes)
- Services additionnels (tirages, albums avec grilles tarifaires)

**Nouveaux fichiers à créer:**
- `profil/portfolio.tsx` - Gestion portfolio
- `profil/verification.tsx` - Upload documents vérification
- `profil/tarifs.tsx` - Configuration tarifs indicatifs
- `profil/services.tsx` - Services additionnels (tirages, albums)

---

#### 5. **`app/photographe/leads/invoice.tsx`** (222 lignes)
**Problème:** Références à table `annonces`

**Modifications:**
```typescript
// ❌ AVANT (ligne 29)
const { data, error } = await supabase
  .from('factures')
  .select('*, reservations(annonces(titre)), profiles!factures_client_id_fkey(nom)')
  .eq('prestataire_id', user.id);

// ✅ APRÈS
const { data, error } = await supabase
  .from('factures')
  .select(`
    *,
    reservation:reservations!reservation_id(
      id, titre, date, lieu,
      demande:demandes_client!demande_id(titre, categorie),
      devis:devis!devis_id(montant_total)
    ),
    client:profiles!client_id(nom, prenom, email)
  `)
  .eq('photographe_id', user.id)
  .order('created_at', { ascending: false });
```

**Lignes impactées:** ~10-20 lignes (5-10% du fichier)

---

#### 6. **`app/photographe/kpis/`**
**Problème:** Métriques basées sur annonces (vues, clics, etc.)

**Modifications:**
- Remplacer métriques annonces par métriques demandes/devis
- Nouvelles métriques:
  - Nb demandes reçues
  - Nb devis envoyés
  - Taux de réponse (%)
  - Taux de conversion (%)
  - Temps de réponse moyen (heures)
  - Chiffre d'affaires par catégorie
  - Note moyenne évolution

---

#### 7. **`app/shared/payments.tsx`** + **`app/shared/paiement/checkout.tsx`**
**Problème:** Références à table `annonces`

**Modifications:**
```typescript
// ❌ AVANT
const serviceName = payment.annonces?.titre || 'Service inconnu';
const providerName = payment.annonces?.profiles?.nom || 'Prestataire';

// ✅ APRÈS
const serviceName = payment.reservation?.titre || 'Service inconnu';
const providerName = payment.reservation?.photographe?.nom || 'Photographe';

// Query à adapter
const { data } = await supabase
  .from('paiements')
  .select(`
    *,
    reservation:reservations!reservation_id(
      id, titre, date,
      photographe:profils_photographe!photographe_id(
        profiles!inner(nom, prenom)
      )
    )
  `)
  .eq('client_id', userId);
```

---

#### 8. **`app/shared/mes-remboursements.tsx`**
**Problème:** Références à `reservations.annonces`

**Modifications:**
```typescript
// ❌ AVANT (ligne 50)
.select('*, reservations(annonces(titre, prestataire)), profiles(*)')

// ✅ APRÈS
.select(`
  *,
  reservation:reservations!reservation_id(
    id, titre, date,
    demande:demandes_client!demande_id(titre, categorie),
    photographe:profils_photographe!photographe_id(
      profiles!inner(nom, prenom)
    )
  ),
  client:profiles!client_id(nom, prenom)
`)
```

---

#### 9. **`components/RealTimeNotifications.jsx`**
**Problème:** Types de notifications à mettre à jour

**Modifications:**
```typescript
// Ajouter nouveaux types
const NOTIFICATION_TYPES = {
  // Existants
  'reservation': '📅',
  'message': '💬',
  'avis': '⭐',
  'payment': '💳',
  'cancellation': '❌',
  
  // Nouveaux
  'new_demande': '📋',        // Client crée demande
  'new_devis': '💼',          // Photographe envoie devis
  'devis_lu': '👁️',           // Client lit devis
  'devis_accepte': '✅',      // Client accepte devis
  'devis_refuse': '❌',       // Client refuse devis
  'demande_pourvue': '🎯',    // Demande pourvue (autre photographe)
  'galerie_ready': '📸',      // Galerie livrée
  'tirages_expedies': '📦',   // Tirages expédiés
  'album_expedie': '📦',      // Album expédié
};
```

---

#### 10. **`lib/paymentService.ts`** + **`lib/marketplacePaymentService.ts`**
**Problème:** Références à table `annonces` (ligne 94, 128)

**Modifications:**
```typescript
// ❌ AVANT
.select('*, annonces(...), profiles(...)')

// ✅ APRÈS
.select(`
  *,
  reservation:reservations!reservation_id(
    id, titre, montant_total, source,
    demande:demandes_client!demande_id(titre, categorie),
    devis:devis!devis_id(montant_total),
    photographe:profils_photographe!photographe_id(
      stripe_account_id,
      profiles!inner(nom, prenom, email)
    )
  )
`)
```

---

#### 11. **`lib/notificationService.ts`**
**Problème:** Manque nouveaux types de notifications

**Modifications:**
```typescript
// Ajouter fonctions
export async function notifyNewDemande(photographeId: string, demandeId: string) {
  // Notifier photographe qu'une nouvelle demande correspond à son profil
}

export async function notifyNewDevis(clientId: string, devisId: string) {
  // Notifier client qu'il a reçu un nouveau devis
}

export async function notifyDevisAccepted(photographeId: string, devisId: string) {
  // Notifier photographe que son devis a été accepté
}

export async function notifyGalerieReady(clientId: string, galerieId: string) {
  // Notifier client que sa galerie est prête
}
```

---

#### 12. **`app/_layout.tsx`**
**Problème:** Route `annonces` à retirer

**Modifications:**
```typescript
// ❌ AVANT (ligne 29)
<Stack.Screen name="annonces" options={{ headerShown: false }} />

// ✅ APRÈS
// Supprimer cette ligne (dossier annonces/ vide)

// Ajouter routes pour nouvelles fonctionnalités
<Stack.Screen name="demandes" options={{ headerShown: false }} />
<Stack.Screen name="devis" options={{ headerShown: false }} />
```

---

### Récapitulatif modifications

| Fichier | Lignes totales | Lignes à modifier | % Impact | Priorité |
|---------|----------------|-------------------|----------|----------|
| `client/search/search.tsx` | 833 | ~200 | 24% | 🔴 CRITIQUE |
| `photographe/menu.tsx` | 397 | ~70 | 18% | 🔴 CRITIQUE |
| `photographe/devis/devis.tsx` | 868 | ~300 | 35% | 🔴 CRITIQUE |
| `photographe/profil/*` | Variable | Nouveau module | 100% | 🔴 CRITIQUE |
| `photographe/leads/invoice.tsx` | 222 | ~15 | 7% | 🟡 MOYEN |
| `photographe/kpis/*` | Variable | ~50% fichiers | 50% | 🟡 MOYEN |
| `shared/payments.tsx` | Variable | ~30 | 15% | 🟡 MOYEN |
| `shared/paiement/checkout.tsx` | Variable | ~40 | 20% | 🟡 MOYEN |
| `shared/mes-remboursements.tsx` | Variable | ~20 | 10% | 🟡 MOYEN |
| `components/RealTimeNotifications.jsx` | Variable | ~50 | 15% | 🟡 MOYEN |
| `lib/paymentService.ts` | Variable | ~30 | 20% | 🟡 MOYEN |
| `lib/marketplacePaymentService.ts` | Variable | ~30 | 20% | 🟡 MOYEN |
| `lib/notificationService.ts` | Variable | ~80 | 30% | 🟡 MOYEN |
| `app/_layout.tsx` | Variable | ~5 | 2% | 🟢 FAIBLE |

**Total estimé: ~900-1100 lignes de code à modifier sur ~5000-6000 lignes totales (~18% de la codebase)**

---

## 🆕 FICHIERS À AJOUTER

### 1. Flux Client - Création de demandes

**`app/client/demandes/`** (nouveau dossier)
- **`create-demande.tsx`** - Formulaire complet création demande
  - Informations de base (titre, catégorie, description)
  - Localisation (lieu, date)
  - Budget (min, max, flexible)
  - Besoins photo (nb photos, style, durée)
  - Options livraison (modes, tirages, album)
  - Upload photos inspiration
- **`mes-demandes.tsx`** - Liste des demandes du client
  - Filtres par statut (ouverte, en_cours, pourvue)
  - Nb devis reçus par demande
- **`demande-detail.tsx`** - Détails d'une demande
  - Infos demande
  - Liste des devis reçus (comparaison)
  - Accepter/refuser devis

### 2. Flux Client - Consultation devis

**`app/client/devis/`** (nouveau dossier)
- **`devis-list.tsx`** - Liste tous les devis reçus
- **`devis-detail.tsx`** - Détail complet d'un devis
  - Tarification détaillée
  - Services inclus
  - Options de livraison
  - Portfolio du photographe
  - Boutons: Accepter / Refuser / Contacter
- **`devis-comparaison.tsx`** - Comparateur de devis (côte à côte)

### 3. Flux Photographe - Demandes

**`app/photographe/demandes/`** (renommer `leads/`)
- **`demandes-list.tsx`** - Liste demandes matchées
  - Filtres par catégorie, budget, date, distance
  - Badge "Nouveau" pour demandes non vues
- **`demande-detail.tsx`** - Détail demande client
  - Infos complètes client + demande
  - Photos inspiration
  - Bouton "Envoyer un devis"

### 4. Flux Photographe - Création devis

**`app/photographe/devis/`** (modifier existant)
- **`create-devis.tsx`** - Formulaire création devis personnalisé
  - Réponse à une demande spécifique
  - Tarification détaillée (base, déplacement, additionnels, remises)
  - Prestation (durée, nb photos, délai livraison)
  - Post-production (retouches, formats)
  - Livraison (modes, plateforme, USB, tirages, album)
  - Conditions (acompte, validité, annulation)
  - Upload portfolio similar work
  - Génération PDF devis
- **`devis-list.tsx`** - Liste devis envoyés (à adapter)
- **`devis-detail.tsx`** - Détail devis envoyé (tracking statut)

### 5. Flux Photographe - Profil enrichi

**`app/photographe/profil/`** (compléter)
- **`portfolio.tsx`** - Gestion portfolio
  - Upload/suppression photos
  - Organisation par catégorie
  - Photo de couverture
  - Vidéo de présentation
- **`verification.tsx`** - Documents de vérification
  - Upload SIRET, KBIS, assurance
  - Statut validation admin
- **`tarifs.tsx`** - Configuration tarifs indicatifs
  - Fourchettes par catégorie (min/max)
  - Tarif horaire
  - Acompte par défaut
- **`services.tsx`** - Services additionnels
  - Propose tirages (oui/non)
  - Grille tarifaire tirages (JSONB)
  - Propose albums (oui/non)
  - Grille tarifaire albums (JSONB)
  - Partenaire impression

### 6. Flux Livraison (Client + Photographe)

**`app/shared/livraison/`** (nouveau dossier)
- **`galerie.tsx`** - Galerie photos livrées
  - Affichage grid photos
  - Téléchargement individuel / ZIP
  - Formats disponibles (haute qualité, web, RAW)
  - Watermark preview
  - Sélection photos pour tirages/album
- **`tirages/`**
  - **`commander-tirages.tsx`** - Formulaire commande tirages
  - **`tirages-list.tsx`** - Liste commandes tirages
  - **`tirages-detail.tsx`** - Détail commande (suivi)
- **`albums/`**
  - **`commander-album.tsx`** - Formulaire commande album
  - **`album-builder.tsx`** - Mise en page album (drag & drop)
  - **`albums-list.tsx`** - Liste commandes albums
  - **`albums-detail.tsx`** - Détail commande (suivi, validation)

### 7. Composants partagés

**`components/demandes/`** (nouveau dossier)
- **`DemandeCard.tsx`** - Card affichage demande
- **`DemandeForm.tsx`** - Formulaire demande réutilisable
- **`DemandeFilters.tsx`** - Filtres liste demandes

**`components/devis/`** (nouveau dossier)
- **`DevisCard.tsx`** - Card affichage devis
- **`DevisComparator.tsx`** - Comparateur 2-3 devis
- **`DevisForm.tsx`** - Formulaire devis réutilisable
- **`DevisPDFViewer.tsx`** - Viewer PDF devis

**`components/photographe/`** (compléter)
- **`PhotographeCard.tsx`** - Card profil photographe
- **`PortfolioGallery.tsx`** - Galerie portfolio (grid + lightbox)
- **`VerificationBadge.tsx`** - Badge vérification identité
- **`SpecializationTags.tsx`** - Tags spécialisations

### 8. Services

**`lib/`** (ajouter)
- **`demandeService.ts`** - CRUD demandes + matching
- **`devisService.ts`** - CRUD devis + génération PDF
- **`galerieService.ts`** - Upload/download galeries
- **`tirageService.ts`** - Commandes tirages
- **`albumService.ts`** - Commandes albums
- **`matchingService.ts`** - Algorithme matching demandes ↔ photographes

### Récapitulatif fichiers à ajouter

| Catégorie | Nb fichiers | Priorité |
|-----------|-------------|----------|
| Client - Demandes | 3 | 🔴 CRITIQUE |
| Client - Devis | 3 | 🔴 CRITIQUE |
| Photographe - Demandes | 2 | 🔴 CRITIQUE |
| Photographe - Devis | 3 | 🔴 CRITIQUE |
| Photographe - Profil | 4 | 🔴 CRITIQUE |
| Livraison | 8 | 🟡 MOYEN |
| Composants partagés | 10 | 🟡 MOYEN |
| Services | 6 | 🟡 MOYEN |

**Total: ~39 nouveaux fichiers**

---

## 📋 Plan d'Action Recommandé

### Phase 1: Nettoyage (1-2h)
1. ✅ Supprimer dossier `app/annonces/`
2. ✅ Supprimer dossier `app/photographe/annonces/`
3. ✅ Supprimer fichier `app/search.tsx`
4. ✅ Supprimer fichier `lib/viewTracking.ts`
5. ✅ Mettre à jour `app/_layout.tsx` (retirer route annonces)

### Phase 2: Infrastructure (2-3h)
1. ✅ Créer services de base:
   - `lib/demandeService.ts`
   - `lib/devisService.ts`
   - `lib/matchingService.ts`
2. ✅ Mettre à jour `lib/supabaseClient.ts` (nouveau projet Supabase)
3. ✅ Mettre à jour `lib/notificationService.ts` (nouveaux types)
4. ✅ Mettre à jour `components/RealTimeNotifications.jsx`

### Phase 3: Profil Photographe (4-6h)
1. ✅ Créer `app/photographe/profil/portfolio.tsx`
2. ✅ Créer `app/photographe/profil/verification.tsx`
3. ✅ Créer `app/photographe/profil/tarifs.tsx`
4. ✅ Créer `app/photographe/profil/services.tsx`
5. ✅ Adapter `app/photographe/menu.tsx` (stats demandes/devis)

### Phase 4: Flux Demandes (6-8h)
1. ✅ Créer `app/client/demandes/create-demande.tsx` (formulaire complet)
2. ✅ Créer `app/client/demandes/mes-demandes.tsx`
3. ✅ Créer `app/client/demandes/demande-detail.tsx`
4. ✅ Créer `app/photographe/demandes/demandes-list.tsx`
5. ✅ Créer `app/photographe/demandes/demande-detail.tsx`
6. ✅ Adapter `app/client/search/search.tsx` (recherche photographes)

### Phase 5: Flux Devis (6-8h)
1. ✅ Créer `app/photographe/devis/create-devis.tsx` (formulaire complet)
2. ✅ Adapter `app/photographe/devis/devis.tsx` (liste)
3. ✅ Créer `app/client/devis/devis-list.tsx`
4. ✅ Créer `app/client/devis/devis-detail.tsx`
5. ✅ Créer `app/client/devis/devis-comparaison.tsx`

### Phase 6: Réservations & Paiements (4-6h)
1. ✅ Adapter `app/photographe/reservations/` (lier demande_id, devis_id)
2. ✅ Adapter `app/client/reservations/` (idem)
3. ✅ Adapter `app/shared/paiement/checkout.tsx`
4. ✅ Adapter `app/shared/payments.tsx`
5. ✅ Adapter `lib/paymentService.ts`
6. ✅ Adapter `lib/marketplacePaymentService.ts`

### Phase 7: Livraison (6-8h)
1. ✅ Créer `app/shared/livraison/galerie.tsx`
2. ✅ Créer module tirages (3 fichiers)
3. ✅ Créer module albums (4 fichiers)
4. ✅ Créer services `galerieService.ts`, `tirageService.ts`, `albumService.ts`

### Phase 8: Composants UI (4-6h)
1. ✅ Créer composants demandes (3 fichiers)
2. ✅ Créer composants devis (4 fichiers)
3. ✅ Créer composants photographe (4 fichiers)

### Phase 9: Tests & Debug (8-12h)
1. ✅ Tester flux complet client (demande → devis → réservation → livraison)
2. ✅ Tester flux complet photographe (profil → demande → devis → session → livraison)
3. ✅ Tester notifications real-time
4. ✅ Tester paiements Stripe
5. ✅ Debug erreurs

### Phase 10: Polish & Optimisation (4-6h)
1. ✅ Optimiser performances (pagination, caching)
2. ✅ Améliorer UX (loading states, error handling)
3. ✅ Ajouter animations (transitions, gestures)
4. ✅ Documentation code

**TOTAL ESTIMÉ: 44-65 heures (5-8 jours de travail)**

---

## ⚠️ Points d'Attention

### 1. Migration données
- Si data existante dans old Supabase project, créer script de migration:
  - `profiles` → `profiles` (inchangé)
  - `annonces` → `profils_photographe` (enrichir données)
  - PAS de migration `zones_intervention` (obsolète)

### 2. Stripe Connect
- Les photographes ont déjà `stripe_account_id` dans `profiles`
- Sera copié dans `profils_photographe` lors création profil enrichi

### 3. Notifications push
- Tokens stockés dans `profiles.push_token` (inchangé)
- Ajouter nouveaux event types dans notificationService

### 4. Images & Storage
- Créer nouveaux buckets Supabase:
  - `portfolios` - Photos portfolio photographes
  - `demandes` - Photos inspiration clients
  - `galeries` - Photos livrées
  - `documents` - SIRET, KBIS, assurance
  - `devis` - PDFs devis
- Garder buckets existants:
  - `avatars`
  - `factures`

### 5. Performance
- Implémenter pagination (20 items/page) sur:
  - Liste demandes
  - Liste devis
  - Liste photographes
  - Galeries photos
- Utiliser cache pour profils photographes (AsyncStorage)
- Lazy loading portfolio images

### 6. RLS Policies
- Vérifier policies Supabase pour nouvelles tables
- Clients peuvent voir leurs demandes + devis reçus
- Photographes peuvent voir demandes matchées + leurs devis
- Profils photographes publics en lecture

---

## 🎯 Métriques de Succès

**Code:**
- ❌ 0 références à table `annonces` (sauf migrations)
- ❌ 0 références à table `zones_intervention`
- ✅ Tous les queries utilisent nouvelles tables
- ✅ 100% des workflows fonctionnels (demande → devis → réservation → livraison)

**Fonctionnel:**
- ✅ Client peut créer demande complète
- ✅ Photographe reçoit notification demandes matchées
- ✅ Photographe peut envoyer devis personnalisé
- ✅ Client peut comparer devis
- ✅ Acceptation devis crée réservation
- ✅ Workflow livraison complet (galerie + tirages + albums)

**Performance:**
- ✅ Temps chargement liste < 2s
- ✅ Recherche photographes < 1s
- ✅ Upload portfolio < 5s/image
- ✅ Téléchargement galerie < 10s (10 photos HD)

---

## 📚 Ressources

- **Schéma BDD:** `.github/schema_refonte_complete.sql`
- **Instructions Copilot:** `.github/copilot-instructions.md` (mis à jour)
- **Documentation Supabase:** https://supabase.com/docs
- **Expo Router:** https://docs.expo.dev/router/introduction/
- **React Native:** https://reactnative.dev/docs/getting-started

---

**Fin du rapport d'audit**
