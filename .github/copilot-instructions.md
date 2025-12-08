# MVP-Project Copilot Instructions

## Project Overview

This is a **monorepo for a photographer-client marketplace platform** ("Shooty") with two applications sharing a common Supabase backend:

1. **mobile-app/** - Expo/React Native mobile app for clients and photographers (NEW - refactored)
2. **web-app/** - Next.js web application for the marketplace (NEW - refactored)

**⚠️ DEPRECATED FOLDERS (DO NOT USE):**
- `monAppMobile/` - Old mobile app (replaced by `mobile-app/`)
- `photo-app/` - Old web app (replaced by `web-app/`)

**Status:** Major refactoring in progress - migrating from supply-driven to demand-driven marketplace model

**Date of last major update:** December 8, 2025

## Architecture Fundamentals

### Shared Supabase Backend

**Critical Connection Details:**

- Both apps connect to the same Supabase instance
- Supabase client configuration lives in `lib/supabaseClient.{ts,js}` in each app
- Mobile uses AsyncStorage for session persistence, web uses default localStorage

**⚠️ TODO: Migrate to Environment Variables**
Currently, Supabase credentials are hardcoded in `supabaseClient` files. Before deployment:

1. Create `.env.local` files in each app root
2. Add to `.gitignore`
3. Update `supabaseClient.ts/js`:

   ```typescript
   // Mobile: expo-constants
   import Constants from "expo-constants";
   const supabaseUrl = Constants.expoConfig.extra.supabaseUrl;

   // Web: process.env
   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
   ```

## 🔄 NEW BUSINESS MODEL: Demand-Driven Marketplace

**CRITICAL ARCHITECTURAL CHANGE (December 2025):**

The platform has been **completely refactored** from a supply-driven model (photographers create listings → clients browse) to a **demand-driven model** (clients create requests → photographers respond with personalized quotes).

### Core Workflow

```
CLIENT FLOW:
1. Browse photographer profiles (enriched with portfolios, equipment, specializations)
2. Create "demande" (detailed request: date, location, budget, requirements)
3. Receive multiple personalized "devis" (quotes) from photographers
4. Compare quotes and select preferred photographer
5. Confirm reservation → Pay acompte → Session happens → Pay solde
6. Receive photos (online gallery, USB, prints, album)
7. Leave review

PHOTOGRAPHER FLOW:
1. Create enriched profile (portfolio, equipment, specializations, verification)
2. Receive matched client "demandes" based on location, availability, budget
3. Send personalized "devis" with detailed pricing, services, delivery options
4. If accepted: Confirm reservation → Shoot → Deliver photos
5. Optional: Offer standardized "packages" (quick bookings like CV photos, headshots)
```

### New Database Schema

**Complete SQL schema:** `.github/schema_refonte_complete.sql`

**Core Tables:**

```
profiles (base user table)
├── id, role (particulier | photographe | admin)
├── nom, prenom, email, telephone, avatar_url
├── localisation (ville, code_postal, lat/lon)
└── notification_settings (JSONB)

profils_photographe (enriched photographer profiles - NEW)
├── id → profiles (FK)
├── bio, nom_entreprise, site_web, reseaux_sociaux
├── specialisations[] (mariage, portrait, corporate, etc.)
├── statut_pro, siret, documents_verification
├── materiel (JSONB: cameras, lenses, drones, etc.)
├── mobile, studio, rayon_deplacement_km
├── portfolio_photos[], photos_par_categorie (JSONB)
├── tarifs_indicatifs (JSONB: fourchettes de prix)
├── note_moyenne, nb_avis, nb_prestations_completees
├── taux_reponse, taux_conversion, temps_reponse_moyen
├── propose_tirages, propose_albums, tarifs_tirages/albums (JSONB)
└── stripe_account_id, plan_id (subscription)

demandes_client (client requests - NEW CORE TABLE)
├── id, client_id → profiles
├── titre, description, categorie
├── lieu, ville, date_souhaitee, duree_estimee_heures
├── budget_min, budget_max, budget_flexible
├── nb_photos_souhaitees, style_souhaite[]
├── modes_livraison_souhaites[] (telechargement, usb, cloud, etc.)
├── tirages_souhaites, format_tirages[], album_souhaite
├── statut (ouverte | en_cours | pourvue | annulee | expiree)
├── nb_devis_recus, devis_accepte_id
└── photographes_notifies[], photographes_interesses[]

devis (photographer quotes - ENHANCED)
├── id, demande_id → demandes_client
├── photographe_id → profils_photographe
├── client_id → profiles
├── titre, description, message_personnalise
├── tarif_base, frais_deplacement, frais_additionnels (JSONB)
├── montant_total, acompte_percent
├── duree_prestation_heures, nb_photos_livrees
├── delai_livraison_jours, retouches_incluses
├── modes_livraison_inclus[], plateforme_livraison
├── tirages_inclus, nb_tirages_inclus, format_tirages_inclus[]
├── album_inclus, type_album, frais_album
├── statut (envoye | lu | accepte | refuse | expire)
├── date_expiration, duree_validite_jours
└── devis_pdf_url, portfolio_joint[]

packages_types (optional standardized services)
├── id, photographe_id → profils_photographe
├── titre, description, categorie
├── prix_fixe, duree_minutes
├── nb_photos_incluses, delai_livraison_jours
├── modes_livraison[], tirages_inclus
└── reservation_instantanee (boolean)

reservations (bookings - UPDATED)
├── id, client_id, photographe_id
├── source (demande | package | direct)
├── demande_id, devis_id, package_id (nullable FKs)
├── date, heure_debut, heure_fin, lieu, ville
├── montant_total, acompte_paye, solde_paye
├── statut (pending | confirmed | completed | cancelled)
├── date_livraison_numerique, galerie_livraison_id
├── mode_livraison[], usb_envoyee, numero_suivi_usb
├── tirages_commandes, tirages_livres, numero_suivi_tirages
└── album_commande, album_livre, numero_suivi_album

tirages_commandes (print orders - NEW)
├── id, reservation_id, client_id, photographe_id
├── photos_selectionnees[], specifications (JSONB)
├── nb_tirages_total, montant_total
├── adresse_livraison (JSONB)
├── statut (en_attente | en_production | expedie | livre)
└── transporteur, numero_suivi

albums_commandes (photo album orders - NEW)
├── id, reservation_id, client_id, photographe_id
├── type_album, format_album, nb_pages
├── photos_selectionnees[], mise_en_page (JSONB)
├── maquette_url (PDF preview)
├── validee_par_client, modifications_demandees
├── statut (en_conception | en_production | expedie | livre)
└── transporteur, numero_suivi

galeries_livraison (photo delivery galleries - ENHANCED)
├── id, reservation_id, photographe_id, client_id
├── photos[], videos[], photos_metadata (JSONB)
├── lien_partage, mot_de_passe, expire_at
├── autoriser_telechargement_zip, formats_disponibles (JSONB)
├── watermark_actif, telechargements_details (JSONB)
└── taille_totale_mo

conversations + messages (messaging system - unchanged)
avis (reviews - unchanged)
paiements (payments - unchanged)
notifications (system notifications - unchanged)
favoris (client favorites photographers - unchanged)
blocked_slots (photographer availability - unchanged)
```

**Key Schema Features:**
- **23 tables** total (vs 40+ in old schema)
- **JSONB fields** for flexibility (tarifs, services, metadata)
- **Array fields** for multi-select (specialisations, modes_livraison, format_tirages)
- **Tracking fields** (nb_devis_recus, taux_reponse, temps_reponse_moyen)
- **Complete delivery tracking** (USB, prints, albums with numero_suivi)

### Real-Time Subscriptions Pattern

All apps use Supabase Realtime extensively. **Standard pattern:**

```typescript
// Example from monAppMobile/components/RealTimeNotifications.jsx
const channel = supabase
  .channel("unique-channel-name")
  .on(
    "postgres_changes",
    {
      event: "INSERT" | "UPDATE" | "DELETE" | "*",
      schema: "public",
      table: "notifications",
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      // Handle the change
    }
  )
  .subscribe();

// Always cleanup
return () => {
  channel.unsubscribe();
};
```

**Tables with active real-time listeners:**

- `notifications` - User notifications
- `messages` - Chat messages
- `reservations` - Booking status changes
- `devis` - Quote updates

## Development Workflows

### Starting the Applications

**monAppMobile (Expo):**

```bash
cd monAppMobile
npm start              # Development server
npm run android        # Android emulator
npm run ios            # iOS simulator
```

**photo-app (Next.js):**

```bash
cd photo-app
npm run dev            # http://localhost:3000
npm run build
npm start
```

### Database Setup

**NEW FRESH SUPABASE PROJECT** (created December 2025)

**Execute complete schema via Supabase SQL Editor:**

1. **Complete schema:** `.github/schema_refonte_complete.sql`
   - Creates all 23 tables
   - Sets up Row Level Security (RLS) policies
   - Creates triggers (updated_at automation)
   - Inserts seed data (plans, prestations)
   - Creates utility views (demandes_ouvertes_avec_stats, photographes_avec_stats)

**Key tables created:**
- `profiles`, `profils_photographe` (NEW)
- `demandes_client` (NEW - core), `devis` (enhanced)
- `packages_types` (NEW - optional), `reservations` (updated)
- `tirages_commandes` (NEW), `albums_commandes` (NEW)
- `galeries_livraison` (enhanced), `conversations`, `messages`
- `avis`, `paiements`, `remboursements`, `notifications`, `favoris`
- `prestations`, `plans`, `abonnements`, `villes`

**Storage Buckets to create:**
- `avatars` - User profile photos
- `portfolios` - Photographer portfolio images
- `demandes` - Client request inspiration photos
- `galeries` - Delivered photo galleries
- `documents` - SIRET, KBIS, insurance documents
- `devis` - Quote PDFs
- `factures` - Invoice PDFs

### Testing Workflows

**Client Journey (Mobile-First):**
1. Sign up as `particulier` → Complete profile
2. Browse photographer profiles (search by location, specialization, budget)
3. Create demande: Fill form (date, location, budget, requirements, delivery preferences)
4. Receive notifications when photographers send devis
5. Compare devis (pricing, services, delivery options, photographer ratings)
6. Accept devis → Create reservation → Pay acompte (30%)
7. Session happens → Receive gallery link → Download photos
8. Optional: Order prints/album
9. Pay solde → Leave review

**Photographer Journey (Mobile + Web):**
1. Sign up as `photographe` → Complete enriched profile
2. Upload portfolio, set equipment, specializations, tarifs indicatifs
3. Verify identity (upload SIRET, documents)
4. Receive matched demandes notifications (based on location, budget, availability)
5. Review demande details → Send personalized devis
6. If accepted: Confirm reservation → Block calendar
7. Shoot session → Upload photos to gallery
8. Client downloads → Receive payment (minus 10-15% commission)
9. Optional: Process print/album orders

**Test Data Pattern:**

```sql
-- Create test photographer
INSERT INTO profiles (id, role, nom, prenom, email, ville, latitude, longitude)
VALUES ('uuid-here', 'photographe', 'Dupont', 'Jean', 'jean@example.com', 'Paris', 48.8566, 2.3522);

INSERT INTO profils_photographe (id, specialisations, mobile, rayon_deplacement_km, tarif_horaire_min, tarif_horaire_max)
VALUES ('uuid-here', '{mariage,portrait}', true, 50, 150, 300);

-- Create test client demande
INSERT INTO demandes_client (client_id, titre, categorie, ville, date_souhaitee, budget_min, budget_max, nb_photos_souhaitees, statut)
VALUES ('client-uuid', 'Séance photo portrait professionnel', 'portrait', 'Paris', '2025-12-15', 200, 400, 30, 'ouverte');
```

**Geolocation Testing (Mobile):**
- Simulator: Features → Location → Custom Location (48.8566, 2.3522 for Paris)
- Search photographers by distance (uses `rayon_deplacement_km` from profils_photographe)
- Match demandes to photographers within delivery radius

## Project-Specific Conventions

### Shared Code Pattern

**Duplicated utilities between mobile and web:**

- `lib/supabaseClient` - Identical logic, different imports (AsyncStorage vs localStorage)
- `lib/viewTracking` - Throttled view counting for annonces (60min default)
- `components/RealTimeNotifications` - Real-time subscription management

**When modifying shared logic, update BOTH apps.**

### Authentication Context

Both mobile and web apps use AuthContext pattern:

```typescript
// monAppMobile/contexts/AuthContext.tsx
// photo-app - inline in pages/_app.js (no separate context file)

// Standard hooks:
const { user, session, loading, signIn, signOut } = useAuth();
```

**Mobile-specific:** Auth state persists in AsyncStorage automatically via Supabase config.

### API Route Pattern (Next.js apps)

**Stripe Payment Integration:**

- Create checkout: `pages/api/stripe/create-checkout.js`
- Webhooks: `pages/api/stripe/webhook.js`
- Commission model: 10% platform fee via `application_fee_amount`
- Connect accounts: Providers must have `stripe_account_id` in profiles

**Standard API handler structure:**

```javascript
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  // Logic here
  res.status(200).json({ data });
}
```

### Search & Matching Implementation

**NEW: Photographer Profile Search (Client-side)**

Clients browse enriched photographer profiles (NOT annonces anymore):

```typescript
// Search photographers by location, specialization, budget
const { data: photographes } = await supabase
  .from('profils_photographe')
  .select(`
    *,
    profiles(id, nom, prenom, email, ville, avatar_url)
  `)
  .contains('specialisations', [categoryFilter]) // Array contains
  .eq('mobile', true) // Can travel
  .gte('tarif_horaire_max', budgetMin)
  .lte('tarif_horaire_min', budgetMax);

// Filter by distance if user location
const nearbyPhotographers = photographes.filter(photo => {
  const distance = calculateDistance(
    userLat, userLon, 
    photo.profiles.latitude, photo.profiles.longitude
  );
  return distance <= photo.rayon_deplacement_km;
});
```

**NEW: Demande Matching Algorithm (Photographer-side)**

Photographers receive demandes matched to their profile:

```typescript
// Get open demandes matching photographer criteria
const { data: demandes } = await supabase
  .from('demandes_client')
  .select(`
    *,
    profiles(nom, prenom, ville, latitude, longitude)
  `)
  .eq('statut', 'ouverte')
  .gte('budget_max', photographerPreferences.budget_min)
  .in('categorie', photographerSpecializations);

// Filter by delivery radius
const matchedDemandes = demandes.filter(demande => {
  const distance = calculateDistance(
    photographerLat, photographerLon,
    demande.latitude, demande.longitude
  );
  return distance <= photographerDeliveryRadius;
});

// Update demande with notified photographers
await supabase
  .from('demandes_client')
  .update({ 
    photographes_notifies: [...existing, photographerId] 
  })
  .eq('id', demandeId);
```

**Search filters:**
- **Location:** Distance calculation based on `rayon_deplacement_km`
- **Specialization:** Array matching on `specialisations[]`
- **Budget:** Range queries on `tarif_horaire_min/max` or `budget_min/max`
- **Date:** Check `blocked_slots` and `calendrier_disponibilite`
- **Services:** JSONB queries on `services_additionnels`, `propose_tirages`, `propose_albums`
- **Rating:** Order by `note_moyenne DESC, nb_avis DESC`

### Notification Service (Mobile)

Push notifications use Expo Notifications API:

```typescript
// monAppMobile/lib/notificationService.ts

// Register device
const token = await registerForPushNotificationsAsync();
await savePushToken(userId, token);

// Send notification (server-side via Supabase edge function)
await sendPushNotification(userId, {
  type: "reservation",
  title: "...",
  body: "...",
});
```

**Notification types:** `reservation`, `message`, `reminder`, `cancellation`, `payment`, `avis`

## Testing Strategy (Recommended)

**Currently no tests exist.** Before production deployment, implement:

**Mobile (monAppMobile):**

```bash
npm install --save-dev jest @testing-library/react-native
```

- Unit tests: Auth flows, payment logic, view tracking
- Component tests: RealTimeNotifications, search filters
- E2E: Detox for critical user journeys (sign up → search → book)

**Web (photo-app):**

```bash
npm install --save-dev jest @testing-library/react playwright
```

- Unit tests: API routes (Stripe, reservations)
- Component tests: Search, booking flow
- E2E: Playwright for payment integration, real-time chat

**Priority tests:**

1. Authentication (sign up, login, session persistence)
2. Payment flow (Stripe checkout, webhooks)
3. Real-time features (notifications, messages)
4. Search with zones_intervention

## Common Pitfalls & Best Practices

### ⚠️ Critical Mistakes to Avoid

1. **DON'T use old table `annonces`** - This table is DEPRECATED. Use `profils_photographe` for search and `demandes_client` as core workflow.

2. **DON'T forget to check demande `statut`** - Only show demandes with `statut='ouverte'` to photographers. Mark as `'pourvue'` when devis accepted.

3. **Real-time subscriptions MUST be cleaned up** - Memory leaks common if `channel.unsubscribe()` not called in cleanup.

4. **Stripe requires onboarded photographers** - Check `stripe_account_id` exists before creating checkout session.

5. **JSONB queries require proper syntax:**
   ```typescript
   // ✅ Correct: Array contains
   .contains('specialisations', ['mariage'])
   
   // ✅ Correct: JSONB path query
   .eq('services_additionnels->retouche_pro', true)
   
   // ❌ Wrong: Can't query arrays as strings
   .eq('specialisations', 'mariage')
   ```

6. **Mobile AsyncStorage vs Web localStorage** - Different APIs, same purpose across platforms.

7. **Always track delivery modes in reservations** - Use `mode_livraison[]` array to record actual delivery methods (telechargement, usb, tirages, album).

8. **Devis expiration must be enforced** - Check `date_expiration` before allowing acceptance. Auto-update `statut='expire'` via cron job.

9. **Photographer matching should respect preferences** - Check `profils_photographe.preferences` JSONB for `distance_max_km`, `budget_min`, `categories_preferees`.

10. **Galerie links should expire** - Set `galeries_livraison.expire_at` (default 90 days). Notify client before expiration.

### ✅ Best Practices

**State Management:**
- Use optimistic updates for UI responsiveness
- Show loading states during async operations
- Handle errors gracefully with user-friendly messages

**Notifications:**
- Send push notification when demande receives new devis
- Notify photographer when devis is read/accepted/refused
- Remind client to pay solde after session
- Alert photographer when galerie is accessed

**Performance:**
- Paginate demandes/devis lists (20 items per page)
- Cache photographer profiles in AsyncStorage/localStorage
- Lazy load portfolio images
- Use Supabase storage CDN URLs (auto-optimized)

**Security:**
- Always use RLS policies (enabled on all core tables)
- Validate user role before showing photographer-only features
- Never expose Stripe secret keys in client code
- Sanitize user input before storing (XSS prevention)

## API Design Conventions

**No versioning during development** - APIs in `pages/api/` follow flat structure without `/v1/` prefixes.

**When to version (post-deployment):**

- Breaking changes to request/response format
- Use `/api/v2/endpoint` for new versions
- Maintain old versions for backwards compatibility

**Current API structure:**

```
pages/api/
├── stripe/          # Payment integration
├── reservations/    # Booking management
├── admin/           # Admin operations
├── storage/         # File uploads
└── cron/            # Scheduled tasks
```

## File Naming Conventions

- **Mobile routes:** `app/*.tsx` (Expo Router file-based routing)
- **Web routes:** `pages/*.js` (Next.js Pages Router)
- **API routes:** `pages/api/**/*.js`
- **Components:** PascalCase (e.g., `RealTimeNotifications.jsx`)
- **Utilities:** camelCase (e.g., `supabaseClient.ts`)

## Environment Variables

**Currently hardcoded** - Migrate before production deployment:

**monAppMobile (.env → app.config.js):**

```
EXPO_PUBLIC_SUPABASE_URL=https://...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
EXPO_PUBLIC_API_URL=http://localhost:3000
```

**photo-app (.env.local):**

```
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Deployment (Future)

**Not yet deployed.** Recommended platforms:

**photo-app (Next.js):**

- Platform: Vercel (zero-config deployment)
- Environment: Add all `.env.local` vars in Vercel dashboard
- Custom domain: Configure in Vercel + update Stripe webhooks

**monAppMobile (Expo):**

- Build: `eas build --platform ios|android`
- Submit: `eas submit` to App Store / Play Store
- OTA Updates: `eas update` for quick fixes
- Required: EAS account, `eas.json` configuration

## Key Documentation Files

When unclear about specific features, consult:

- **`.github/schema_refonte_complete.sql`** - Complete database schema (SINGLE SOURCE OF TRUTH)
- **`.github/copilot-instructions.md`** - This file (architectural overview, workflows)
- `monAppMobile/GUIDE_TEST_GEOLOCALISATION.md` - OLD but still relevant for geolocation testing patterns
- `monAppMobile/MIGRATION_ANNONCES.md` - OLD architecture history (explains why we migrated)

## Quick Reference: Key Queries

**Get photographer with full stats:**
```sql
SELECT p.*, pp.*, sa.*
FROM profiles p
JOIN profils_photographe pp ON p.id = pp.id
LEFT JOIN statistiques_avis sa ON p.id = sa.photographe_id
WHERE p.id = $photographerId;
```

**Get open demandes for photographer:**
```sql
SELECT d.*, p.nom, p.prenom, p.avatar_url
FROM demandes_client d
JOIN profiles p ON d.client_id = p.id
WHERE d.statut = 'ouverte'
  AND d.visible_publiquement = true
  AND d.categorie = ANY($photographerSpecializations)
  AND d.budget_max >= $photographerBudgetMin
ORDER BY d.created_at DESC;
```

**Get devis for a demande:**
```sql
SELECT dv.*, pp.*, p.nom, p.prenom, p.avatar_url, pp.note_moyenne, pp.nb_avis
FROM devis dv
JOIN profils_photographe pp ON dv.photographe_id = pp.id
JOIN profiles p ON pp.id = p.id
WHERE dv.demande_id = $demandeId
  AND dv.statut != 'expire'
ORDER BY dv.created_at DESC;
```

**Create reservation from accepted devis:**
```sql
INSERT INTO reservations (
  client_id, photographe_id, source, demande_id, devis_id,
  titre, date, lieu, ville, montant_total, acompte_montant, statut
)
SELECT 
  d.client_id, dv.photographe_id, 'demande', d.id, dv.id,
  d.titre, d.date_souhaitee, d.lieu, d.ville, 
  dv.montant_total, dv.acompte_montant, 'pending'
FROM demandes_client d
JOIN devis dv ON d.id = dv.demande_id
WHERE dv.id = $acceptedDevisId;
```

## Migration Checklist (For Developers)

When refactoring existing code from old model to new:

- [ ] Replace `annonces` queries with `profils_photographe` queries
- [ ] Remove `zones_intervention` joins (location now in `profiles` table)
- [ ] Add `demandes_client` CRUD operations
- [ ] Implement `devis` creation flow (photographer → client)
- [ ] Update reservation creation to link `demande_id` + `devis_id`
- [ ] Add delivery mode selection (téléchargement, USB, tirages, album)
- [ ] Implement `galeries_livraison` with download tracking
- [ ] Add `tirages_commandes` and `albums_commandes` flows (if applicable)
- [ ] Update notifications to include new events (new_demande, new_devis, devis_accepte)
- [ ] Refactor search/filters to use new schema fields
- [ ] Update RLS policies if creating new tables/views
- [ ] Test role-based access (particulier can't access photographer-only features)
