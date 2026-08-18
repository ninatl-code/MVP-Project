# Bricool — Multi-Category Service Marketplace

A two-sided marketplace platform connecting clients with service providers across multiple categories (home services, events, transport, digital, education, beauty, etc.).

## Project Overview

Bricool allows clients to post service requests and receive quotes from qualified providers, or search and book providers directly. Providers manage their profiles, respond to requests, send quotes, and manage bookings through a dedicated dashboard.

### Key Features

- **Multi-role platform**: Clients, Providers, and Admins
- **Smart matching**: Algorithm scores providers against client requests (0-100%)
- **Quote system**: Providers send detailed quotes, clients compare and accept
- **Booking & payments**: Stripe integration for secure payments
- **Real-time messaging**: Chat between clients and providers
- **Reviews & ratings**: Star ratings with moderation
- **Admin dashboard**: KPI monitoring, profile validation, report management
- **Multi-profile support**: Users can switch between client and provider roles

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Mobile App** | React Native (Expo SDK 52) + TypeScript + Expo Router |
| **Web App** | Next.js (Pages Router) + JavaScript + Tailwind CSS |
| **Backend/Database** | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| **Payments** | Stripe |
| **Push Notifications** | Expo Push Notifications |
| **Deployment** | Vercel (web), EAS (mobile) |

### Repository Structure

```
MVP-Project/
├── README.md              # This file
├── ARCHITECTURE.md         # System architecture overview
├── DATABASE.md             # Database schema reference
├── DEVELOPMENT.md          # Development setup guide
├── mobile-app/             # React Native (Expo) mobile application
│   ├── README.md           # Mobile app documentation
│   ├── app/                # Screen components (Expo Router file-based routing)
│   ├── components/         # Reusable UI components
│   ├── constants/          # Categories, cities, specialties
│   ├── contexts/           # React Context providers (Auth)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Business logic, API services, utilities
│   ├── assets/             # Images, fonts
│   └── database/           # SQL migration files
└── web-app/                # Next.js web application
    ├── README.md           # Web app documentation
    ├── pages/              # Page components (Next.js file-based routing)
    ├── components/         # Reusable UI components
    ├── contexts/           # React Context providers (Auth)
    ├── hooks/              # Custom React hooks
    ├── lib/                # Business logic, API services, utilities
    ├── constants/          # Shared constants
    ├── styles/             # Global styles
    ├── public/             # Static assets (images, logos)
    └── database/           # SQL migration files
```

### User Roles

1. **Client** (`particulier`) — Searches for providers, posts requests, receives quotes, makes bookings
2. **Provider** (`photographe`) — Manages profile, receives requests, sends quotes, manages calendar
3. **Admin** (`admin`) — Moderates platform, validates profiles, handles reports

### Quick Links

- [Architecture Overview](ARCHITECTURE.md)
- [Database Schema](DATABASE.md)
- [Development Setup](DEVELOPMENT.md)
- [Mobile App Documentation](mobile-app/README.md)
- [Web App Documentation](web-app/README.md)

### License

Proprietary — All rights reserved.