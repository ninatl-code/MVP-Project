# Bricool — Development Setup Guide

## Prerequisites

- **Node.js** 18+ and **npm** 9+
- **Expo CLI** (`npm install -g expo-cli`) for mobile development
- **Expo Go** app on your phone (iOS/Android) for testing
- A **Supabase** project (free tier works)
- A **Stripe** account (test mode for development)

## Environment Variables

### Mobile App (`mobile-app/.env`)
Create a `.env` file in `mobile-app/`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Web App (`web-app/.env.local`)
Create a `.env.local` file in `web-app/`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

## Getting Started

### 1. Clone and Install

```bash
git clone <repo-url>
cd MVP-Project

# Install mobile app dependencies
cd mobile-app
npm install

# Install web app dependencies
cd ../web-app
npm install
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration files:
   - `mobile-app/database/migrations_matching_system.sql`
   - `web-app/database/migrations/moderation_system.sql`
3. Enable Row Level Security (RLS) on all tables
4. Set up Storage buckets: `photos`, `documents`
5. Copy your project URL and anon key to the `.env` files

### 3. Stripe Setup

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your publishable key and secret key from the dashboard
3. Add them to the `.env` files
4. Set up webhook endpoints pointing to your deployed API routes

### 4. Run the Apps

**Mobile App:**
```bash
cd mobile-app
npx expo start
```
Scan the QR code with Expo Go, or press `a` for Android emulator / `i` for iOS simulator.

**Web App:**
```bash
cd web-app
npm run dev
```
Opens at `http://localhost:3000`.

## Project Structure

```
MVP-Project/
├── mobile-app/                 # React Native (Expo) app
│   ├── app/                    # Screens (Expo Router file-based routing)
│   │   ├── _layout.tsx         # Root layout with providers
│   │   ├── index.tsx           # Entry point (auth redirect)
│   │   ├── auth/               # Login, signup
│   │   ├── client/             # Client screens
│   │   ├── photographe/        # Provider screens
│   │   └── shared/             # Shared screens (chat, payments)
│   ├── components/             # Reusable UI components
│   │   ├── client/             # Client-specific components
│   │   ├── photographe/        # Provider-specific components
│   │   ├── demandes/           # Request-related components
│   │   └── ui/                 # Generic UI components
│   ├── constants/              # Static data (categories, cities, specialties)
│   ├── contexts/               # React Context providers
│   │   └── AuthContext.tsx      # Authentication state management
│   ├── hooks/                  # Custom React hooks
│   ├── lib/                    # Business logic & API services
│   │   ├── supabaseClient.ts   # Supabase client initialization
│   │   ├── demandeService.ts   # Request CRUD operations
│   │   ├── devisService.ts     # Quote CRUD operations
│   │   ├── matchingService.ts  # Provider matching algorithm
│   │   ├── notificationService.ts # Push notification logic
│   │   ├── paymentService.ts   # Stripe payment integration
│   │   └── constants.ts        # Design system tokens (colors, typography)
│   ├── assets/                 # Images, fonts
│   └── database/               # SQL migration files
│
└── web-app/                    # Next.js web app
    ├── pages/                  # Pages (Next.js Pages Router)
    │   ├── _app.js             # App wrapper
    │   ├── index.js            # Landing page
    │   ├── login.js            # Login page
    │   ├── signup.js           # Signup page
    │   ├── admin/              # Admin dashboard pages
    │   ├── client/             # Client pages
    │   └── photographe/        # Provider pages
    ├── components/             # Reusable UI components
    ├── contexts/               # React Context providers
    ├── hooks/                  # Custom React hooks
    ├── lib/                    # Business logic & API services
    ├── constants/              # Shared constants
    ├── styles/                 # Global CSS
    ├── public/                 # Static assets
    └── database/               # SQL migration files
```

## Key Files to Understand

### Authentication
- `mobile-app/contexts/AuthContext.tsx` — Manages user session, profile switching, sign in/out
- `web-app/contexts/AuthContext.js` — Same for web app

### Core Business Logic
- `mobile-app/lib/demandeService.ts` — CRUD for client requests
- `mobile-app/lib/devisService.ts` — CRUD for provider quotes
- `mobile-app/lib/matchingService.ts` — Algorithm that scores providers against requests
- `mobile-app/lib/notificationService.ts` — Push notification sending
- `web-app/lib/notificationService.js` — Web notification logic

### Design System
- `mobile-app/lib/constants.ts` — Colors, typography, spacing, shadows, animations
- `web-app/styles/globals.css` — Global CSS with CSS custom properties

## Common Tasks

### Adding a New Screen (Mobile)
1. Create a new `.tsx` file in the appropriate `app/` subdirectory
2. The file name becomes the route (e.g., `app/client/new-page.tsx` → `/client/new-page`)
3. Import and use shared components from `components/`
4. Use `useAuth()` from `contexts/AuthContext` for user data
5. Use `supabase` from `lib/supabaseClient` for database operations

### Adding a New Page (Web)
1. Create a new `.js` file in the appropriate `pages/` subdirectory
2. The file name becomes the route (e.g., `pages/client/new-page.js` → `/client/new-page`)
3. Use the same patterns as existing pages

### Adding a New Database Table
1. Write a SQL migration in `database/` folder
2. Run it in Supabase SQL Editor
3. Add RLS policies for the new table
4. Create a service file in `lib/` for CRUD operations

## Testing

- **Mobile**: Test on physical device with Expo Go for best results (camera, notifications)
- **Web**: `npm run dev` and test in browser
- **Stripe**: Use test card `4242 4242 4242 4242` with any future expiry date

## Deployment

### Mobile (EAS)
```bash
cd mobile-app
npx eas build --platform ios    # or android
npx eas submit                  # Submit to stores
```

### Web (Vercel)
```bash
cd web-app
npm run build
# Deploy to Vercel via CLI or GitHub integration