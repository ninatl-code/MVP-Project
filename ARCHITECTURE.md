# Bricool — System Architecture

## Overview

Bricool is a **monorepo** containing two frontend applications that share a single Supabase backend:

```
┌─────────────────────────────────────────────────────────────┐
│                        SUPABASE                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │   Auth   │  │PostgreSQL│  │ Storage  │  │  Realtime  │ │
│  │ (users,  │  │ (tables, │  │ (photos, │  │ (chat,     │ │
│  │  roles)  │  │  RLS)    │  │  files)  │  │  notifs)   │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
┌─────────▼──────────┐   ┌─────────▼──────────┐
│    MOBILE APP       │   │     WEB APP         │
│  React Native/Expo  │   │   Next.js + Tailwind│
│  TypeScript         │   │   JavaScript        │
│  Expo Router        │   │   Pages Router      │
│                     │   │                     │
│  • Client flows     │   │  • Landing page     │
│  • Provider flows   │   │  • Auth pages       │
│  • Push notifs      │   │  • Admin dashboard  │
│  • Camera/Gallery   │   │  • Provider tools   │
└─────────────────────┘   └─────────────────────┘
```

## Data Flow

### Authentication Flow
1. User signs up/in via Supabase Auth (email/password)
2. Supabase returns JWT + session
3. `AuthContext` stores session, fetches user profiles from `profiles` table
4. User can have multiple profiles (client + provider) — switch via `switchProfile()`
5. All API calls use the Supabase client which auto-attaches the JWT

### Request → Quote → Booking Flow
```
Client posts request (demandes_client)
    │
    ▼
Matching algorithm scores providers (matchingService.ts)
    │
    ▼
Providers notified (notificationService.ts)
    │
    ▼
Provider sends quote (devis table)
    │
    ▼
Client compares quotes, accepts one
    │
    ▼
Booking created (reservations table)
    │
    ▼
Payment processed (Stripe)
    │
    ▼
Service delivered → Review submitted
```

## Key Architecture Decisions

### 1. Supabase as Backend
- **No custom API server** — All database operations go through Supabase client SDK
- **Row Level Security (RLS)** — Database-level access control per user role
- **Real-time subscriptions** — Used for chat messages and notifications
- **Storage** — Supabase Storage for profile photos, portfolio images, documents

### 2. File-Based Routing
- **Mobile**: Expo Router (`app/` directory structure maps to routes)
- **Web**: Next.js Pages Router (`pages/` directory structure maps to routes)

### 3. Shared Business Logic
- Both apps use the same Supabase project
- Some service files exist in both `mobile-app/lib/` and `web-app/lib/` with similar logic
- Database schema is shared (migrations in both `database/` folders)

### 4. Multi-Profile System
- One Supabase Auth user can have multiple `profiles` rows (different roles)
- `AuthContext` manages `activeRole` and `profileId`
- User can switch between client and provider views without re-authenticating

## Component Architecture (Mobile)

```
app/
├── _layout.tsx          # Root layout (providers, navigation)
├── index.tsx            # Entry point — redirects based on auth/role
├── auth/                # Authentication screens
│   ├── login.tsx
│   └── signup.tsx
├── client/              # Client-facing screens
│   ├── menu.tsx         # Client dashboard/home
│   ├── search/          # Provider search
│   ├── demandes/        # Request management
│   ├── devis/           # Quote viewing
│   ├── reservations/    # Booking management
│   ├── profil/          # Client profile
│   └── Avis/            # Reviews
├── photographe/         # Provider-facing screens
│   ├── menu.tsx         # Provider dashboard
│   ├── demandes/        # Incoming requests
│   ├── devis/           # Quote creation/management
│   ├── packages/        # Service packages
│   ├── kpis/            # Analytics
│   ├── calendar/        # Availability
│   ├── invoices/        # Invoicing
│   ├── profil/          # Provider profile
│   └── review/          # Review management
└── shared/              # Shared screens (both roles)
    ├── messages/        # Chat
    ├── payments/        # Payment processing
    └── support/         # Support tickets
```

## Security Model

- **Authentication**: Supabase Auth with email/password
- **Authorization**: Row Level Security (RLS) policies on all tables
- **Admin access**: `is_admin` flag on profiles, checked via RLS
- **File uploads**: Supabase Storage with bucket-level policies
- **API keys**: Stripe keys stored as environment variables, never in client code