# 📦 Guide de Configuration - Marketplace Photo

Ce guide détaille toutes les étapes nécessaires pour configurer l'environnement de développement et déployer l'application en production.

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Installation initiale](#installation-initiale)
3. [Configuration Supabase](#configuration-supabase)
4. [Configuration Stripe](#configuration-stripe)
5. [Configuration Google Maps](#configuration-google-maps)
6. [Variables d'environnement](#variables-denvironnement)
7. [Backend API](#backend-api)
8. [Tests](#tests)
9. [Déploiement](#déploiement)

---

## 🔧 Prérequis

- Node.js 18+ et npm/yarn
- Expo CLI: `npm install -g expo-cli`
- Compte Supabase (gratuit)
- Compte Stripe (mode test gratuit)
- Compte Google Cloud (pour Maps API)
- iOS Simulator (Mac) ou Android Emulator

---

## 📥 Installation initiale

```bash
# Cloner le projet
cd MVP-Project/mobile-app

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Lancer l'app en dev
npx expo start
```

---

## 🗄️ Configuration Supabase

### 1. Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Noter l'URL et la clé ANON KEY

### 2. Créer les tables

Les tables principales sont déjà définies dans votre migration. Assurez-vous d'avoir :

- `profiles` - Profils utilisateurs
- `profils_photographe` - Profils photographes étendus
- `demandes_client` - Demandes de prestation (⚠️ pas `demandes_service`)
- `devis` - Devis des photographes
- `reservations` - Réservations confirmées
- `avis` - Avis clients
- `messages` - Messagerie
- `notifications` - Notifications push

### 3. Créer le bucket de stockage

**Option A : Via l'interface Supabase (Recommandé)**

1. Aller dans Supabase Dashboard > Storage
2. Cliquer sur "New Bucket"
3. Nom : `photos`
4. Cocher "Public bucket"
5. File size limit : `10485760` (10MB)
6. Allowed MIME types : `image/jpeg, image/png, image/webp, image/heic`

**Option B : Via SQL**

```sql
-- Dans Supabase SQL Editor
INSERT INTO storage.buckets (
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types
) VALUES (
  'photos', 
  'photos', 
  true,
  10485760, -- 10MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
);

-- Policies pour le bucket photos
CREATE POLICY "Public read photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');

CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text -- Upload dans son propre dossier
);

CREATE POLICY "Users can update their own photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

⚠️ **Important** : La structure de dossiers recommandée est `photos/{user_id}/{filename}` pour isoler les photos de chaque utilisateur.

### 4. Configurer Row Level Security (RLS)

```sql
-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profils_photographe ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandes_client ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Exemple: Policy pour demandes_client
CREATE POLICY "Users can view their own demandes"
ON demandes_client FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Users can create their own demandes"
ON demandes_client FOR INSERT
WITH CHECK (auth.uid() = client_id);

-- Répéter pour chaque table selon vos règles métier
```

### 5. Ajouter les clés dans .env

```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 💳 Configuration Stripe

### 1. Créer un compte Stripe

1. Aller sur [stripe.com](https://stripe.com)
2. Créer un compte (mode test gratuit)
3. Activer Stripe Connect pour les paiements marketplace

### 2. Récupérer les clés API

Dans votre Dashboard Stripe > Developers > API Keys :

```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx  # ⚠️ BACKEND ONLY
```

### 3. Configurer les webhooks

Dans Dashboard > Developers > Webhooks :

1. Ajouter un endpoint : `https://votre-backend.com/api/stripe/webhook`
2. Sélectionner les événements :
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `account.updated`
3. Copier le webhook secret :

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 4. Activer Stripe Connect

1. Dashboard > Settings > Connect
2. Platform settings > Onboarding
3. Configurer le branding et les URLs de retour

---

## 🗺️ Configuration Google Maps

### 1. Créer un projet Google Cloud

1. Aller sur [console.cloud.google.com](https://console.cloud.google.com)
2. Créer un nouveau projet
3. Activer Google Maps JavaScript API et Places API

### 2. Créer une clé API

1. APIs & Services > Credentials
2. Create Credentials > API Key
3. Restreindre la clé (recommandé) :
   - Restriction d'application : HTTP referrers
   - Restriction d'API : Maps JavaScript API, Places API

```bash
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyxxxxx
```

### 3. Activer la facturation

⚠️ Google Maps nécessite un compte avec facturation activée (300$ de crédit gratuit)

---

## 🔐 Variables d'environnement

Créer un fichier `.env` à la racine du projet mobile :

```bash
# Copier depuis .env.example
cp .env.example .env

# Éditer avec vos vraies valeurs
nano .env
```

**⚠️ Important :** 
- Ne jamais commiter le fichier `.env` (déjà dans .gitignore)
- Les variables avec `EXPO_PUBLIC_` sont exposées côté client
- Les variables sans préfixe sont pour le backend uniquement

---

## 🚀 Backend API

Vous avez 2 options pour le backend :

### Option A : Supabase Edge Functions (Recommandé)

**Avantages :** Serverless, pas de serveur à gérer, intégré à Supabase

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter
supabase login

# Créer les Edge Functions
supabase functions new create-payment
supabase functions new confirm-payment
supabase functions new create-transfer
supabase functions new refund

# Déployer
supabase functions deploy create-payment
```

**Exemple : create-payment Edge Function**

```typescript
// supabase/functions/create-payment/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  try {
    const { amount, photographerId, demandeId } = await req.json()

    // Créer Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convertir en centimes
      currency: 'eur',
      metadata: {
        photographerId,
        demandeId,
      },
      // Transfer automatique au photographe (Stripe Connect)
      transfer_data: {
        destination: photographerId, // Stripe Connect Account ID
      },
      application_fee_amount: Math.round(amount * 0.15 * 100), // 15% commission
    })

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### Option B : Next.js API Routes

**Avantages :** Plus de contrôle, logs détaillés, peut héberger sur Vercel

```typescript
// pages/api/payments/create.ts
import { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { amount, photographerId, demandeId } = req.body

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'eur',
      metadata: { photographerId, demandeId },
      transfer_data: { destination: photographerId },
      application_fee_amount: Math.round(amount * 0.15 * 100),
    })

    res.status(200).json({ clientSecret: paymentIntent.client_secret })
  } catch (error: any) {
    res.status(400).json({ error: error.message })
  }
}
```

**Déploiement Vercel :**

```bash
# Installer Vercel CLI
npm install -g vercel

# Déployer
cd web-app
vercel --prod
```

### Endpoints requis

Votre backend doit exposer ces 4 endpoints :

1. **POST /api/payments/create** - Créer un Payment Intent
2. **POST /api/payments/confirm** - Confirmer un paiement
3. **POST /api/payments/transfer** - Transférer à un photographe
4. **POST /api/payments/refund** - Rembourser un client
5. **POST /api/stripe/webhook** - Webhooks Stripe

---

## 🧪 Tests

### Tests unitaires

```bash
# Installer Jest
npm install --save-dev jest @types/jest

# Lancer les tests
npm test
```

### Tests d'intégration

```bash
# Tester la création de demande
npx expo start
# Naviguer vers Client > Nouvelle demande
# Remplir le formulaire et soumettre

# Vérifier dans Supabase que la demande est créée
```

### Tests de paiement

```bash
# Utiliser les cartes de test Stripe
Carte réussie : 4242 4242 4242 4242
Carte échouée : 4000 0000 0000 0002
Date : N'importe quelle date future
CVC : N'importe quel 3 chiffres
```

---

## 🚀 Déploiement

### Déploiement iOS (TestFlight)

```bash
# 1. Configurer app.json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.votre-entreprise.marketplace-photo",
      "buildNumber": "1.0.0"
    }
  }
}

# 2. Build avec EAS
npm install -g eas-cli
eas login
eas build --platform ios

# 3. Soumettre à TestFlight
eas submit --platform ios
```

### Déploiement Android (Play Store)

```bash
# 1. Configurer app.json
{
  "expo": {
    "android": {
      "package": "com.votre_entreprise.marketplace_photo",
      "versionCode": 1
    }
  }
}

# 2. Build avec EAS
eas build --platform android

# 3. Soumettre au Play Store
eas submit --platform android
```

### Checklist avant production

- [ ] Variables d'environnement configurées
- [ ] Stripe en mode live (pas test)
- [ ] Webhooks Stripe configurés
- [ ] RLS activé sur toutes les tables Supabase
- [ ] Bucket `photos` créé et sécurisé
- [ ] Backend API déployé et fonctionnel
- [ ] Google Maps API avec facturation activée
- [ ] Tests de bout en bout réussis
- [ ] Sentry configuré pour crash reporting
- [ ] Notifications push testées
- [ ] CGU et politique de confidentialité ajoutées

---

## 🆘 Aide & Support

### Problèmes courants

**"Table demandes_service doesn't exist"**
→ Utiliser `demandes_client` partout (bug corrigé)

**"Storage bucket photos not found"**
→ Créer le bucket dans Supabase Storage

**"Google Maps ne s'affiche pas"**
→ Vérifier que la facturation est activée sur Google Cloud

**"Paiement échoué"**
→ Vérifier les clés Stripe et que le backend est déployé

### Ressources

- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Stripe](https://stripe.com/docs)
- [Documentation Expo](https://docs.expo.dev)
- [Google Maps API](https://developers.google.com/maps)

---

## 📞 Contact

Pour toute question : support@votre-marketplace.com
