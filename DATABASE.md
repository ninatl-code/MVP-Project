# Bricool — Database Schema

## Overview

Bricool uses **Supabase PostgreSQL** as its database. All tables have **Row Level Security (RLS)** enabled. The schema is designed for a multi-role marketplace with clients, providers, and admins.

## Core Tables

### `profiles` — All Users
Stores basic information for every user regardless of role.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Same as Supabase Auth user ID |
| `email` | TEXT | User email |
| `nom` | TEXT | Full name |
| `prenom` | TEXT | First name |
| `telephone` | TEXT | Phone number |
| `role` | TEXT | `particulier`, `photographe`, or `admin` |
| `avatar_url` | TEXT | Profile photo URL (Supabase Storage) |
| `ville` | TEXT | City |
| `code_postal` | TEXT | Postal code |
| `description` | TEXT | Bio/description |
| `is_admin` | BOOLEAN | Admin flag |
| `suspendu` | BOOLEAN | Suspension status |
| `created_at` | TIMESTAMPTZ | Account creation date |

### `profils_prestataire` — Extended Provider Profiles
One-to-one with `profiles` (same `id`). Only exists for provider role.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK/FK) | References `profiles.id` |
| `nom_entreprise` | TEXT | Business name |
| `bio` | TEXT | Professional bio |
| `specialisations` | TEXT[] | Array of specialties |
| `portfolio_photos` | JSONB[] | Portfolio images |
| `tarif_horaire_min` | NUMERIC | Minimum hourly rate (MAD) |
| `tarifs_indicatifs` | JSONB | Rate details by category |
| `rayon_deplacement_km` | INTEGER | Travel radius |
| `note_moyenne` | NUMERIC | Average rating |
| `nb_avis` | INTEGER | Number of reviews |
| `statut_validation` | TEXT | `en_attente`, `valide`, `refuse`, `suspendu` |
| `documents` | JSONB | Verification documents (ID, insurance, etc.) |
| `score_confiance` | INTEGER | Trust score (0-100) |
| `created_at` | TIMESTAMPTZ | Profile creation date |

### `demandes_client` — Client Service Requests
Posted by clients looking for providers.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `client_id` | UUID (FK) | References `profiles.id` |
| `titre` | TEXT | Request title |
| `description` | TEXT | Detailed description |
| `categorie` | TEXT | Service category |
| `lieu` | TEXT | Location |
| `ville` | TEXT | City |
| `code_postal` | TEXT | Postal code |
| `date_souhaitee` | DATE | Desired date |
| `duree_estimee_heures` | NUMERIC | Estimated duration |
| `budget_max` | NUMERIC | Maximum budget (MAD) |
| `nb_personnes` | INTEGER | Number of people |
| `statut` | TEXT | `ouverte`, `en_cours`, `pourvue`, `annulee`, `expiree` |
| `actif` | BOOLEAN | Whether the request is active |
| `created_at` | TIMESTAMPTZ | Creation date |

### `devis` — Provider Quotes
Sent by providers in response to client requests.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `demande_id` | UUID (FK) | References `demandes_client.id` |
| `prestataire_id` | UUID (FK) | References `profiles.id` |
| `client_id` | UUID (FK) | References `profiles.id` |
| `titre` | TEXT | Quote title |
| `description` | TEXT | Quote description |
| `tarif_base` | NUMERIC | Base rate (MAD) |
| `montant_total` | NUMERIC | Total amount (MAD) |
| `duree_prestation_heures` | NUMERIC | Service duration |
| `frais_deplacement` | NUMERIC | Travel fees |
| `remise_montant` | NUMERIC | Discount amount |
| `acompte_percent` | NUMERIC | Deposit percentage |
| `statut` | TEXT | `envoye`, `accepte`, `refuse`, `expire` |
| `date_expiration` | DATE | Quote expiry date |
| `created_at` | TIMESTAMPTZ | Creation date |

### `reservations` — Confirmed Bookings
Created when a client accepts a quote.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `client_id` | UUID (FK) | References `profiles.id` |
| `prestataire_id` | UUID (FK) | References `profiles.id` |
| `package_id` | UUID (FK) | References `packages_types.id` (optional) |
| `date` | DATE | Booking date |
| `heure_debut` | TIMESTAMPTZ | Start time |
| `lieu` | TEXT | Location |
| `montant_total` | NUMERIC | Total amount (MAD) |
| `statut` | TEXT | `pending`, `confirmed`, `in_progress`, `completed`, `cancelled` |
| `created_at` | TIMESTAMPTZ | Creation date |

### `packages_types` — Service Packages
Predefined service bundles offered by providers.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `prestataire_id` | UUID (FK) | References `profiles.id` |
| `titre` | TEXT | Package name |
| `description` | TEXT | Package description |
| `prix_fixe` | NUMERIC | Fixed price (MAD) |
| `prix_barre` | NUMERIC | Strikethrough price |
| `duree_minutes` | INTEGER | Duration in minutes |
| `categorie` | TEXT | Category |
| `specialite` | TEXT | Specialty |
| `services_inclus` | TEXT | Included services |
| `options_disponibles` | TEXT[] | Available options |
| `actif` | BOOLEAN | Whether the package is active |
| `created_at` | TIMESTAMPTZ | Creation date |

## Supporting Tables

### `reviews_presta` — Provider Reviews
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `prestataire_id` | UUID (FK) | Provider being reviewed |
| `client_id` | UUID (FK) | Client who wrote the review |
| `note` | INTEGER | Rating (1-5) |
| `commentaire` | TEXT | Review text |
| `visible` | BOOLEAN | Moderation visibility |
| `created_at` | TIMESTAMPTZ | Creation date |

### `conversations` / `messages` — Chat System
| Table | Key Columns | Description |
|-------|------------|-------------|
| `conversations` | `client_id`, `prestataire_id`, `unread_count_client`, `unread_count_prestataire` | Chat threads |
| `messages` | `conversation_id`, `sender_id`, `content`, `lu` | Individual messages |

### `notifications` — Push Notifications
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID (PK) | Auto-generated |
| `user_id` | UUID (FK) | Recipient |
| `type` | TEXT | Notification type |
| `titre` | TEXT | Title |
| `message` | TEXT | Body |
| `lu` | BOOLEAN | Read status |
| `created_at` | TIMESTAMPTZ | Creation date |

### Admin/Moderation Tables
| Table | Purpose |
|-------|---------|
| `signalements` | User reports (users, messages, reviews, requests) |
| `avertissements` | Admin warnings to users |
| `support_tickets` | Support ticket system |

## Row Level Security (RLS)

All tables have RLS policies. Key rules:
- **profiles**: Users can read all profiles, but only update their own
- **demandes_client**: Clients can CRUD their own requests; providers can read open requests
- **devis**: Providers can CRUD their own quotes; clients can read quotes for their requests
- **reservations**: Both parties can read their own bookings
- **reviews_presta**: Clients can create; admins can moderate visibility
- **signalements**: Users can create reports; only admins can read/update

## Database Migrations

SQL migration files are located in:
- `mobile-app/database/migrations_matching_system.sql`
- `web-app/database/migrations/moderation_system.sql`

Run these in the Supabase SQL Editor to apply schema changes.