# Bricool Web App

Next.js web application for the Bricool service marketplace.

## Tech Stack

- **Framework**: Next.js (Pages Router)
- **Language**: JavaScript
- **Styling**: Tailwind CSS + inline styles
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Payments**: Stripe
- **Icons**: Lucide React

## Quick Start

```bash
cd web-app
npm install
npm run dev
```

Opens at `http://localhost:3000`.

## Directory Structure

```
web-app/
├── pages/                      # Page components (Next.js Pages Router)
│   ├── _app.js                 # App wrapper with AuthProvider
│   ├── _document.js            # HTML document customization
│   ├── index.js                # Landing page with hero, categories, FAQ
│   ├── home.js                 # Alternative landing page
│   ├── homepage.js             # Subscription landing page
│   ├── login.js                # Email/password login
│   ├── signup.js               # Registration with role selection
│   ├── messages.js             # Chat interface
│   ├── notifications.js        # Notification center
│   ├── support.js              # Support tickets
│   ├── admin/                  # Admin dashboard
│   │   ├── index.js            # Admin KPI dashboard
│   │   ├── avis/               # Review moderation
│   │   ├── client/             # Client management
│   │   ├── demandes/           # Request moderation
│   │   ├── prestataire/        # Provider validation
│   │   ├── reservations/       # Booking management
│   │   ├── signalements/       # Report management
│   │   └── tickets/            # Support ticket management
│   ├── client/                 # Client pages
│   │   ├── menu.js             # Client dashboard
│   │   ├── profil.js           # Client profile
│   │   ├── notification.js     # Notifications
│   │   ├── avis/               # Reviews
│   │   ├── demandes/           # Request management
│   │   ├── devis/              # Quote viewing
│   │   ├── photographes/       # Provider search
│   │   ├── recherche/          # Advanced search
│   │   └── reservations/       # Bookings
│   ├── photographe/            # Provider pages
│   │   ├── menu.js             # Provider dashboard
│   │   ├── profil.js           # Provider profile
│   │   ├── notification.js     # Notifications
│   │   ├── agenda.js           # Calendar
│   │   ├── packages.js         # Service packages
│   │   ├── factures.js         # Invoices
│   │   ├── avis-dashboard.js   # Review dashboard
│   │   ├── demandes/           # Incoming requests
│   │   ├── devis/              # Quote management
│   │   ├── kpi/                # Analytics
│   │   ├── reservations/       # Bookings
│   │   └── [id]/               # Public provider profile
│   ├── photographes/           # Public provider listing
│   └── api/                    # API routes
│       ├── search-address.js   # Address autocomplete
│       ├── send-email.js       # Email sending
│       ├── admin/              # Admin API endpoints
│       ├── cron/               # Scheduled tasks
│       ├── emails/             # Email templates
│       ├── phone/              # Phone verification
│       ├── storage/            # File upload
│       ├── stripe/             # Stripe webhooks
│       └── support/            # Support ticket API
├── components/                 # Reusable UI components
│   ├── Headerhomepage.js       # Public header with nav
│   ├── HeaderPresta.js         # Provider header
│   ├── CameraSplash.js         # Page transition animation
│   └── layout/                 # Layout components
│       └── AdminLayout.js      # Admin dashboard layout
├── contexts/                   # React Context providers
│   └── AuthContext.js           # Auth state management
├── hooks/                      # Custom React hooks
│   └── useAdminGuard.js        # Admin access control
├── lib/                        # Business logic and API services
│   ├── supabaseClient.js       # Supabase client initialization
│   ├── packageService.js       # Service package CRUD
│   ├── searchService.js        # Provider search logic
│   ├── notificationService.js  # Notification logic
│   ├── moderationService.js    # Content moderation
│   └── photographerService.js  # Provider profile management
├── constants/                  # Shared constants
│   ├── categories.js           # Service categories
│   └── specialites.js          # Specialties mapping
├── styles/                     # Global styles
│   └── globals.css             # CSS custom properties, Tailwind
├── public/                     # Static assets
│   ├── Bricool-logo.png        # Brand logo
│   └── favicon.ico             # Favicon
└── database/                   # SQL migration files
    └── migrations/
        └── moderation_system.sql
```

## Key Concepts

### Authentication
- `contexts/AuthContext.js` manages user session and profile
- `hooks/useAdminGuard.js` protects admin routes
- Login/signup pages use Supabase Auth directly

### Admin Dashboard
- KPI cards: clients, providers, pending validations, requests, bookings, revenue
- Provider validation queue with document review
- Report management (signalements)
- Support ticket system
- Warning/penalty system

### API Routes
- `/api/stripe/` — Stripe webhook handlers
- `/api/send-email.js` — Email notifications
- `/api/cron/` — Scheduled tasks
- `/api/admin/` — Admin-only operations

## Environment Variables

Create a `.env.local` file:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...