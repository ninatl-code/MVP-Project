# Bricool Mobile App

React Native (Expo) mobile application for the Bricool service marketplace.

## Tech Stack

- **Framework**: React Native with Expo SDK 52
- **Language**: TypeScript
- **Routing**: Expo Router (file-based)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Payments**: Stripe
- **Notifications**: Expo Push Notifications

## Quick Start

```bash
cd mobile-app
npm install
npx expo start
```

Scan the QR code with Expo Go on your phone.

## Directory Structure

```
mobile-app/
├── app/                        # Screen components (Expo Router)
│   ├── _layout.tsx             # Root layout with SafeAreaProvider, AuthProvider
│   ├── index.tsx               # Entry point — redirects based on auth/role
│   ├── auth/                   # Authentication screens
│   │   ├── _layout.tsx
│   │   ├── login.tsx           # Email/password login
│   │   └── signup.tsx          # Registration with role selection
│   ├── client/                 # Client-facing screens
│   │   ├── _layout.tsx
│   │   ├── menu.tsx            # Client dashboard with stats and quick actions
│   │   ├── notification.tsx    # Notification center
│   │   ├── search/             # Provider search with filters
│   │   ├── demandes/           # Request creation and management
│   │   ├── devis/              # Quote viewing and comparison
│   │   ├── reservations/       # Booking management
│   │   ├── profil/             # Client profile and settings
│   │   ├── photographes/       # Provider detail view
│   │   ├── Avis/               # Reviews
│   │   └── Achievements/       # Loyalty program
│   ├── photographe/            # Provider-facing screens
│   │   ├── _layout.tsx
│   │   ├── menu.tsx            # Provider dashboard with KPIs
│   │   ├── notification.tsx    # Notification center
│   │   ├── demandes/           # Incoming request inbox
│   │   ├── devis/              # Quote creation and management
│   │   ├── packages/           # Service package CRUD
│   │   ├── kpis/               # Analytics dashboard
│   │   ├── calendar/           # Availability calendar
│   │   ├── invoices/           # Invoice creation and listing
│   │   ├── profil/             # Provider profile (extended)
│   │   ├── reservations/       # Booking management
│   │   └── review/             # Review dashboard
│   └── shared/                 # Shared screens (both roles)
│       ├── messages/           # Real-time chat
│       ├── paiement/           # Payment checkout
│       ├── avis/               # Review submission
│       └── support/            # Support tickets
├── components/                 # Reusable UI components
│   ├── client/                 # Client-specific (FooterParti)
│   ├── photographe/            # Provider-specific (FooterPresta)
│   ├── demandes/               # DemandeCard for request display
│   └── ui/                     # Generic UI (Button, Card, Input, etc.)
├── constants/                  # Static data
│   ├── categories.ts           # Service categories with icons
│   ├── villes.ts               # Moroccan cities list
│   └── specialite.ts           # Specialties per category + templates
├── contexts/                   # React Context providers
│   └── AuthContext.tsx          # Auth state, profile switching, session management
├── hooks/                      # Custom React hooks
├── lib/                        # Business logic and API services
│   ├── supabaseClient.ts       # Supabase client initialization
│   ├── demandeService.ts       # Client request CRUD
│   ├── devisService.ts         # Provider quote CRUD
│   ├── matchingService.ts      # Provider matching algorithm (0-100% scoring)
│   ├── notificationService.ts  # Push notification logic
│   ├── paymentService.ts       # Stripe payment integration
│   ├── constants.ts            # Design system tokens (colors, typography, spacing)
│   └── useStatusBarStyle.ts    # Status bar style hook
├── assets/                     # Images, fonts
│   └── images/                 # Logo, placeholder images
└── database/                   # SQL migration files
    └── migrations_matching_system.sql
```

## Key Concepts

### Authentication Flow
1. User signs up/in via `auth/login.tsx` or `auth/signup.tsx`
2. Supabase Auth creates session
3. `AuthContext` loads user profiles from `profiles` table
4. User can have multiple profiles (client + provider)
5. `index.tsx` redirects to the appropriate menu based on `activeRole`

### Multi-Profile System
- One Supabase Auth user → multiple `profiles` rows
- `AuthContext.switchProfile(profileId)` switches active role
- `availableProfiles` array lists all user profiles
- Switch modals in both client and provider menus

### Navigation
- **Client tabs**: Menu, Messages, Alerts, Profile (FooterParti)
- **Provider tabs**: Menu, Messages, Stats, Alerts, Profile (FooterPresta)
- Stack navigation within each tab for detail screens

### Design System
All design tokens are in `lib/constants.ts`:
- `COLORS` — Primary (#5C6BC0), Accent (#130183), Success, Warning, Error
- `TYPOGRAPHY` — Font sizes and weights
- `SPACING` — Margin/padding scale
- `BORDER_RADIUS` — Border radius tokens
- `SHADOWS` — Shadow presets
- `ANIMATIONS` — Animation durations and easings

## Environment Variables

Create a `.env` file:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...