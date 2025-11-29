# MVP-Project Copilot Instructions

## Project Overview

This is a **monorepo for a service marketplace platform** ("Shooty") with two applications sharing a common Supabase backend:

1. **monAppMobile/** - Expo/React Native mobile app for clients and service providers
2. **photo-app/** - Next.js web application (Pages Router) for the marketplace

**Status:** Active development - not yet deployed to production

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

**Core Data Model - Annonce-Based Architecture:**

The platform migrated from a profile-centric to an **annonce-centric** model. This is critical:

```
annonces (service listings)
├── id, titre, description
├── photos[] (array of image URLs)
├── tarif_unit, unit_tarif (pricing)
├── rate, nb_avis (ratings)
├── prestataire → profiles (FK)
└── prestation → prestations (FK)

zones_intervention (geographic coverage)
├── annonce_id → annonces (FK)
├── ville_centre, rayon_km
├── latitude, longitude
└── active (boolean)

profiles (users: both clients and providers)
├── id, nom, prenom, email, photo
├── role (particulier | prestataire)
├── stripe_account_id (for providers)
└── push_token (for mobile notifications)

prestations (service categories)
├── id, nom
└── type (service | produit)

reservations (bookings)
├── client_id, prestataire_id, annonce_id
├── status (pending, confirmed, cancelled, completed)
└── montant_acompte, montant_total

messages (chat system)
├── conversation_id, sender_id, receiver_id
└── content, is_read

notifications (system notifications)
├── user_id, type (reservation, message, avis, etc.)
└── is_read, metadata (JSONB)
```

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

**Execute SQL migrations via Supabase SQL Editor:**

1. Storage policies: `photo-app/database/storage_logos_factures.sql`
2. Functions: `photo-app/database/functions/rating_notifications_trigger.sql`

**Core tables** (created via Supabase dashboard or manual SQL):

- `profiles`, `annonces`, `zones_intervention`, `prestations`
- `reservations`, `messages`, `notifications`, `devis`
- `avis` (reviews), `paiements` (payments)

### Testing Geolocation Features

Mobile app has extensive geolocation testing requirements. See `monAppMobile/GUIDE_TEST_GEOLOCALISATION.md`:

**Simulator Setup (iOS):**

- Features → Location → Custom Location (48.8566, 2.3522 for Paris)

**Test Data Pattern:**

```sql
-- Always include zones_intervention with coordinates
INSERT INTO zones_intervention (annonce_id, ville_centre, rayon_km, latitude, longitude)
VALUES (annonce_id, 'Paris', 20, 48.8566, 2.3522);
```

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

### Search Implementation

**Critical Migration Note:** Search was refactored from profile-based to annonce-based (see `monAppMobile/MIGRATION_ANNONCES.md`).

**Current pattern in `carte-prestataires.tsx` and `search.tsx`:**

```typescript
// 1. Query annonces with joins
const query = supabase.from("annonces").select(`
    *, 
    profiles(nom, prenom, photo),
    prestations(nom)
  `);

// 2. Enrich with zones_intervention
const annoncesAvecZones = await Promise.all(
  data.map(async (annonce) => {
    const { data: zones } = await supabase
      .from("zones_intervention")
      .select("ville_centre, rayon_km, latitude, longitude")
      .eq("annonce_id", annonce.id)
      .eq("active", true);

    return { ...annonce, zones_intervention: zones || [] };
  })
);

// 3. Filter by distance if user location available
const filtered = annoncesAvecZones.filter((annonce) =>
  annonce.zones_intervention.some(
    (zone) =>
      calculateDistance(userLat, userLon, zone.latitude, zone.longitude) <=
      rayonKm
  )
);
```

**Never use RPC functions like `search_prestataires_proximite` - they don't exist.**

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

## Common Pitfalls

1. **Don't query `profiles` table for service search** - Use `annonces` with joins to `profiles`
2. **Always include `zones_intervention` for geographic features** - Annonces are location-agnostic without zones
3. **Real-time subscriptions must be cleaned up** - Memory leaks common if `unsubscribe()` not called
4. **Stripe requires onboarded providers** - Check `stripe_account_id` exists before creating payments
5. **Mobile AsyncStorage vs Web localStorage** - Different APIs for same purpose across platforms
6. **View tracking is throttled** - `trackAnnonceView()` uses 60min cooldown to prevent spam

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

- `monAppMobile/GUIDE_TEST_GEOLOCALISATION.md` - Geolocation testing
- `monAppMobile/MIGRATION_ANNONCES.md` - Architecture rationale for annonce-based model
