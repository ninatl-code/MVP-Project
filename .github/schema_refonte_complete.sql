-- ============================================================
-- REFONTE COMPLÈTE - NOUVEAU SCHÉMA BDD
-- Marketplace Photographes (Demand-driven model)
-- Date: 2025-12-08
-- ============================================================
-- Ce script crée toutes les tables nécessaires pour le nouveau modèle
-- où les clients créent des demandes et les photographes répondent avec des devis
-- ============================================================
-- EXTENSIONS & TYPES
-- ============================================================
-- Extensions PostgreSQL nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
-- Pour géolocalisation avancée (optionnel)
-- Types énumérés
CREATE TYPE unite_tarif AS ENUM ('heure', 'jour', 'forfait', 'photo');
CREATE TYPE statut_demande AS ENUM (
    'ouverte',
    'en_cours',
    'pourvue',
    'annulee',
    'expiree'
);
CREATE TYPE statut_devis AS ENUM ('envoye', 'lu', 'accepte', 'refuse', 'expire');
CREATE TYPE statut_reservation AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
CREATE TYPE type_utilisateur AS ENUM ('particulier', 'photographe', 'admin');
-- ============================================================
-- TABLE 1: PROFILES (Base commune auth.users)
-- ============================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role type_utilisateur NOT NULL DEFAULT 'particulier',
    -- Informations de base
    nom TEXT NOT NULL,
    prenom TEXT,
    email TEXT UNIQUE NOT NULL,
    telephone TEXT,
    avatar_url TEXT,
    -- Localisation
    adresse TEXT,
    ville TEXT,
    code_postal TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    -- Notifications
    push_token TEXT,
    notifications_enabled BOOLEAN DEFAULT true,
    notification_settings JSONB DEFAULT '{
    "new_message": true,
    "new_reservation": true,
    "reservation_confirmed": true,
    "reminder_24h": true,
    "reminder_2h": true,
    "payment_received": true,
    "new_avis": true,
    "cancellation": true
  }'::jsonb,
    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);
-- Index pour performances
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_ville ON profiles(ville);
-- ============================================================
-- TABLE 2: PROFILS_PHOTOGRAPHE (Nouveau modèle enrichi)
-- ============================================================
CREATE TABLE profils_photographe (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    -- Informations professionnelles
    bio TEXT,
    nom_entreprise TEXT,
    site_web TEXT,
    -- Réseaux sociaux
    instagram TEXT,
    facebook TEXT,
    linkedin TEXT,
    -- Spécialisations (multi-select)
    specialisations TEXT [] NOT NULL DEFAULT '{}',
    -- ['mariage', 'portrait', 'corporate', 'evenementiel', 'produit', 'immobilier', 'nouveau-ne', 'grossesse', 'famille']
    categories TEXT [] NOT NULL DEFAULT '{}',
    -- Types de photos proposées
    -- Statut professionnel
    statut_pro BOOLEAN DEFAULT false,
    siret TEXT,
    numero_tva TEXT,
    documents_siret TEXT,
    -- URL document
    documents_kbis TEXT,
    -- URL document
    documents_assurance TEXT,
    -- URL assurance pro
    -- Vérification identité
    identite_verifiee BOOLEAN DEFAULT false,
    document_identite_url TEXT,
    date_verification TIMESTAMPTZ,
    statut_validation TEXT DEFAULT 'pending',
    -- 'pending', 'approved', 'rejected'
    -- Matériel et équipement
    materiel JSONB DEFAULT '{
    "cameras": [],
    "lenses": [],
    "lighting": [],
    "drones": false,
    "stabilisateurs": false
  }'::jsonb,
    -- Équipe
    equipe JSONB DEFAULT '{
    "solo": true,
    "nb_assistants": 0,
    "styliste": false,
    "maquilleur": false,
    "videographe": false
  }'::jsonb,
    -- Infrastructure et mobilité
    mobile BOOLEAN DEFAULT true,
    studio BOOLEAN DEFAULT false,
    studio_adresse TEXT,
    studio_photos TEXT [],
    -- URLs photos du studio
    rayon_deplacement_km INTEGER DEFAULT 50,
    frais_deplacement_base NUMERIC(10, 2),
    -- Frais de base pour déplacement
    frais_deplacement_par_km NUMERIC(10, 2),
    -- Frais par km supplémentaire
    -- Services additionnels proposés
    services_additionnels JSONB DEFAULT '{
    "retouche_pro": true,
    "retouche_beaute": false,
    "impression_album": false,
    "livraison_express": false,
    "video": false,
    "drone": false,
    "maquillage": false,
    "stylisme": false
  }'::jsonb,
    -- Portfolio
    portfolio_photos TEXT [] DEFAULT '{}',
    -- URLs photos générales
    portfolio_principal TEXT,
    -- Photo de couverture
    photos_par_categorie JSONB DEFAULT '{}'::jsonb,
    -- {mariage: [url1, url2], portrait: [...]}
    video_presentation_url TEXT,
    -- URL vidéo de présentation
    -- Tarifs indicatifs (fourchettes, pas de prix fixes)
    tarifs_indicatifs JSONB DEFAULT '{}'::jsonb,
    -- {mariage: {min: 800, max: 2500, unite: "forfait"}}
    tarif_horaire_min NUMERIC(10, 2),
    tarif_horaire_max NUMERIC(10, 2),
    acompte_percent INTEGER DEFAULT 30,
    -- Conditions et modalités
    conditions_annulation TEXT,
    delai_annulation_jours INTEGER DEFAULT 7,
    modalites_paiement TEXT [] DEFAULT '{}'::text [],
    -- ['especes', 'carte', 'virement', 'cheque']
    -- Disponibilité
    calendrier_disponibilite JSONB DEFAULT '{}'::jsonb,
    -- {lundi: {available: true, slots: []}}
    jours_travailles TEXT [] DEFAULT '{}'::text [],
    -- ['lundi', 'mardi', ...]
    horaires_preference JSONB,
    -- {debut: "09:00", fin: "19:00"}
    -- Préférences de travail
    preferences JSONB DEFAULT '{
    "distance_max_km": 50,
    "budget_min": 200,
    "duree_min_heure": 2,
    "categories_preferees": [],
    "accepte_weekend": true,
    "accepte_soiree": true
  }'::jsonb,
    -- Statistiques et scoring
    note_moyenne NUMERIC(3, 2) DEFAULT 0,
    nb_avis INTEGER DEFAULT 0,
    nb_prestations_completees INTEGER DEFAULT 0,
    nb_demandes_recues INTEGER DEFAULT 0,
    nb_devis_envoyes INTEGER DEFAULT 0,
    taux_reponse INTEGER DEFAULT 100,
    -- Pourcentage de réponse aux leads
    taux_conversion INTEGER DEFAULT 0,
    -- Pourcentage devis acceptés
    temps_reponse_moyen INTEGER,
    -- En heures
    -- Badge et certifications
    badges TEXT [] DEFAULT '{}'::text [],
    -- ['verified', 'top_rated', 'quick_responder', 'pro']
    certifications TEXT [] DEFAULT '{}'::text [],
    -- Certifications professionnelles
    -- Abonnement
    plan_id BIGINT,
    -- Référence vers table plans
    plan_actif BOOLEAN DEFAULT false,
    -- Services d'impression et livraison
    propose_tirages BOOLEAN DEFAULT false,
    propose_albums BOOLEAN DEFAULT false,
    partenaire_impression TEXT,
    -- Labo photo partenaire
    tarifs_tirages JSONB DEFAULT '{}'::jsonb,
    -- Grille tarifaire tirages
    tarifs_albums JSONB DEFAULT '{}'::jsonb,
    -- Grille tarifaire albums
    delai_production_tirages_jours INTEGER DEFAULT 7,
    delai_production_album_jours INTEGER DEFAULT 14,
    -- Stripe
    stripe_account_id TEXT,
    -- Pour paiements directs
    stripe_onboarding_complete BOOLEAN DEFAULT false,
    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index
CREATE INDEX idx_profils_photographe_specialisations ON profils_photographe USING GIN (specialisations);
CREATE INDEX idx_profils_photographe_mobile ON profils_photographe(mobile);
CREATE INDEX idx_profils_photographe_statut_pro ON profils_photographe(statut_pro);
CREATE INDEX idx_profils_photographe_note_moyenne ON profils_photographe(note_moyenne DESC);
CREATE INDEX idx_profils_photographe_taux_reponse ON profils_photographe(taux_reponse DESC);
-- ============================================================
-- TABLE 3: DEMANDES_CLIENT (Cœur du nouveau système)
-- ============================================================
CREATE TABLE demandes_client (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Informations de base
    titre TEXT NOT NULL,
    description TEXT NOT NULL,
    categorie TEXT NOT NULL,
    -- 'mariage', 'portrait', 'corporate', 'evenementiel', etc.
    -- Détails événement
    type_evenement TEXT,
    -- 'mariage', 'bapteme', 'anniversaire', 'corporate', 'conference'
    nb_personnes INTEGER,
    est_public BOOLEAN DEFAULT false,
    -- Événement public ou privé
    -- Localisation
    lieu TEXT NOT NULL,
    adresse_complete TEXT,
    ville TEXT NOT NULL,
    code_postal TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    lieu_exact_requis BOOLEAN DEFAULT false,
    -- Besoin de connaître lieu exact avant devis
    -- Date et durée
    date_souhaitee DATE NOT NULL,
    heure_debut TIME,
    heure_fin TIME,
    duree_estimee_heures NUMERIC(5, 2),
    -- Durée estimée en heures
    flexibilite_date BOOLEAN DEFAULT false,
    dates_alternatives DATE [],
    -- Si flexible sur les dates
    -- Besoins photo/vidéo
    type_prestation TEXT [] NOT NULL DEFAULT '{}',
    -- ['photo', 'video', 'photo_video']
    style_souhaite TEXT [] DEFAULT '{}',
    -- ['naturel', 'pose', 'reportage', 'artistique', 'noir_blanc']
    nb_photos_souhaitees INTEGER,
    -- Nombre de photos livrées souhaitées
    nb_videos_souhaitees INTEGER,
    -- Post-production
    retouche_souhaitee BOOLEAN DEFAULT true,
    niveau_retouche TEXT,
    -- 'basique', 'standard', 'avancee', 'beaute'
    livraison_urgente BOOLEAN DEFAULT false,
    delai_livraison_jours INTEGER DEFAULT 14,
    -- Modes de livraison
    modes_livraison_souhaites TEXT [] DEFAULT '{}',
    -- ['telechargement', 'usb', 'cloud', 'disque_dur', 'dvd']
    plateforme_livraison_preferee TEXT,
    -- 'google_drive', 'dropbox', 'wetransfer', 'galerie_privee'
    livraison_physique_adresse TEXT,
    -- Adresse pour envoi USB/DVD
    -- Tirages et impressions
    tirages_souhaites BOOLEAN DEFAULT false,
    nb_tirages INTEGER,
    -- Nombre de photos à imprimer
    format_tirages TEXT [] DEFAULT '{}',
    -- ['10x15', '13x18', '20x30', '30x45', '40x60', 'A4', 'A3', 'A2']
    type_papier_souhaite TEXT,
    -- 'mat', 'brillant', 'satin', 'fine_art'
    encadrement_souhaite BOOLEAN DEFAULT false,
    livraison_tirages_adresse TEXT,
    -- Adresse livraison tirages
    -- Album photo
    album_souhaite BOOLEAN DEFAULT false,
    type_album TEXT,
    -- 'traditionnel', 'luxe', 'livre_photo', 'magazine'
    nb_pages_album INTEGER,
    format_album TEXT,
    -- '20x20', '30x30', '40x40', 'A4_portrait', 'A4_paysage'
    -- Formats numériques
    format_fichiers_souhaites TEXT [] DEFAULT '{}',
    -- ['jpeg_haute_qualite', 'png', 'raw', 'tiff']
    -- Budget
    budget_min NUMERIC(10, 2),
    budget_max NUMERIC(10, 2),
    budget_indicatif NUMERIC(10, 2),
    -- Budget cible si pas de fourchette
    budget_flexible BOOLEAN DEFAULT true,
    monnaie TEXT DEFAULT 'EUR',
    -- Services additionnels souhaités
    services_souhaites JSONB DEFAULT '{
    "maquillage": false,
    "coiffure": false,
    "stylisme": false,
    "location_studio": false,
    "drone": false,
    "impression_album": false,
    "tirage_photos": false
  }'::jsonb,
    -- Contraintes et préférences
    contraintes_horaires TEXT,
    -- Ex: "Doit être disponible de 14h à 18h"
    preferences_photographe TEXT,
    -- Ex: "Cherche photographe femme", "Style vintage"
    langues_souhaitees TEXT [],
    -- ['francais', 'anglais', 'espagnol']
    -- Photos de référence/inspiration
    photos_inspiration TEXT [] DEFAULT '{}',
    -- URLs photos d'exemple
    references_portfolio TEXT [] DEFAULT '{}',
    -- URLs portfolios aimés
    instructions_speciales TEXT,
    -- Statut et workflow
    statut statut_demande DEFAULT 'ouverte',
    date_limite_reponse DATE,
    -- Date limite pour recevoir devis
    date_expiration DATE,
    -- Date d'expiration automatique
    nb_devis_recus INTEGER DEFAULT 0,
    nb_devis_lus INTEGER DEFAULT 0,
    devis_accepte_id UUID,
    -- ID du devis accepté (si pourvue)
    -- Matching et notifications
    photographes_notifies UUID [] DEFAULT '{}',
    -- IDs photographes qui ont reçu notification
    photographes_interesses UUID [] DEFAULT '{}',
    -- IDs photographes qui ont consulté
    photographes_invites UUID [] DEFAULT '{}',
    -- IDs photographes invités manuellement
    criteres_matching JSONB,
    -- Critères utilisés pour matching auto
    -- Visibilité
    visible_publiquement BOOLEAN DEFAULT true,
    -- Visible dans recherche publique
    visible_uniquement_invites BOOLEAN DEFAULT false,
    -- Métadonnées
    source TEXT DEFAULT 'web',
    -- 'web', 'mobile', 'api'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    fermee_at TIMESTAMPTZ,
    pourvue_at TIMESTAMPTZ
);
-- Index
CREATE INDEX idx_demandes_client_client_id ON demandes_client(client_id);
CREATE INDEX idx_demandes_client_statut ON demandes_client(statut);
CREATE INDEX idx_demandes_client_categorie ON demandes_client(categorie);
CREATE INDEX idx_demandes_client_date_souhaitee ON demandes_client(date_souhaitee);
CREATE INDEX idx_demandes_client_ville ON demandes_client(ville);
CREATE INDEX idx_demandes_client_budget ON demandes_client(budget_min, budget_max);
CREATE INDEX idx_demandes_client_created_at ON demandes_client(created_at DESC);
-- ============================================================
-- TABLE 4: DEVIS (Réponses des photographes)
-- ============================================================
CREATE TABLE devis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    demande_id UUID NOT NULL REFERENCES demandes_client(id) ON DELETE CASCADE,
    photographe_id UUID NOT NULL REFERENCES profils_photographe(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    -- Proposition
    titre TEXT NOT NULL,
    description TEXT NOT NULL,
    message_personnalise TEXT,
    -- Message d'accompagnement au client
    -- Tarification détaillée
    tarif_base NUMERIC(10, 2) NOT NULL,
    frais_deplacement NUMERIC(10, 2) DEFAULT 0,
    frais_additionnels JSONB DEFAULT '{}'::jsonb,
    -- {maquillage: 150, assistant: 200, location_materiel: 100}
    remise_montant NUMERIC(10, 2) DEFAULT 0,
    remise_percent NUMERIC(5, 2) DEFAULT 0,
    montant_total NUMERIC(10, 2) NOT NULL,
    monnaie TEXT DEFAULT 'EUR',
    -- Détails de la prestation proposée
    duree_prestation_heures NUMERIC(5, 2) NOT NULL,
    nb_photos_livrees INTEGER NOT NULL,
    nb_videos_livrees INTEGER DEFAULT 0,
    delai_livraison_jours INTEGER NOT NULL,
    -- Post-production incluse
    retouches_incluses INTEGER,
    -- Nombre de photos retouchées
    niveau_retouche TEXT,
    -- 'basique', 'standard', 'avancee'
    -- Livraison numérique
    modes_livraison_inclus TEXT [] DEFAULT '{}',
    -- ['telechargement', 'usb', 'cloud']
    plateforme_livraison TEXT DEFAULT 'galerie_privee',
    -- Plateforme utilisée
    duree_acces_galerie_jours INTEGER DEFAULT 90,
    -- Durée d'accès à la galerie en ligne
    livraison_usb_incluse BOOLEAN DEFAULT false,
    type_usb TEXT,
    -- 'usb_standard', 'usb_personnalise', 'disque_dur'
    frais_livraison_physique NUMERIC(10, 2) DEFAULT 0,
    -- Formats fichiers
    formats_fichiers_livres TEXT [] DEFAULT '{}',
    -- ['jpeg_haute_qualite', 'png', 'raw']
    resolution_fichiers TEXT DEFAULT 'haute',
    -- 'web', 'haute', 'print'
    -- Tirages inclus
    tirages_inclus BOOLEAN DEFAULT false,
    nb_tirages_inclus INTEGER DEFAULT 0,
    format_tirages_inclus TEXT [] DEFAULT '{}',
    -- ['10x15', '13x18', '20x30']
    type_papier TEXT,
    -- 'mat', 'brillant', 'satin', 'fine_art'
    encadrement_inclus BOOLEAN DEFAULT false,
    frais_tirages NUMERIC(10, 2) DEFAULT 0,
    -- Album inclus
    album_inclus BOOLEAN DEFAULT false,
    type_album TEXT,
    -- 'traditionnel', 'luxe', 'livre_photo'
    nb_pages_album INTEGER,
    format_album TEXT,
    frais_album NUMERIC(10, 2) DEFAULT 0,
    -- Options tirages supplémentaires
    tarif_tirage_supplementaire JSONB DEFAULT '{}'::jsonb,
    -- {'10x15': 2.5, '20x30': 15, '30x45': 35}
    -- Services inclus dans le devis
    services_inclus JSONB DEFAULT '{
    "deplacement": true,
    "retouche": true,
    "second_photographe": false,
    "video": false,
    "drone": false,
    "album": false
  }'::jsonb,
    -- Options supplémentaires (payantes)
    options_supplementaires JSONB DEFAULT '[]'::jsonb,
    -- [{nom: "Album 30 pages", prix: 200}, {...}]
    -- Conditions commerciales
    acompte_percent INTEGER DEFAULT 30,
    acompte_montant NUMERIC(10, 2),
    modalites_paiement TEXT [] DEFAULT '{}',
    echeancier_paiement JSONB,
    -- {acompte: {montant: 300, date: "..."}, solde: {...}}
    conditions_annulation TEXT,
    penalites_annulation JSONB,
    -- {7j: 50%, 3j: 75%, 24h: 100%}
    -- Disponibilité confirmée
    dates_disponibles DATE [],
    -- Dates où le photographe est disponible
    horaires_proposes JSONB,
    -- {debut: "14:00", fin: "18:00"}
    -- Fichiers joints
    devis_pdf_url TEXT,
    -- PDF du devis
    portfolio_joint TEXT [] DEFAULT '{}',
    -- Photos similaires à la demande
    contrat_url TEXT,
    -- URL contrat type
    -- Validité du devis
    date_expiration DATE,
    -- Date d'expiration du devis
    duree_validite_jours INTEGER DEFAULT 15,
    -- Statut et workflow
    statut statut_devis DEFAULT 'envoye',
    lu_at TIMESTAMPTZ,
    accepte_at TIMESTAMPTZ,
    refuse_at TIMESTAMPTZ,
    expire_at TIMESTAMPTZ,
    -- Réponse client
    reponse_client TEXT,
    -- Message si refusé
    raison_refus TEXT,
    -- Métadonnées
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index
CREATE INDEX idx_devis_demande_id ON devis(demande_id);
CREATE INDEX idx_devis_photographe_id ON devis(photographe_id);
CREATE INDEX idx_devis_client_id ON devis(client_id);
CREATE INDEX idx_devis_statut ON devis(statut);
CREATE INDEX idx_devis_created_at ON devis(created_at DESC);
-- ============================================================
-- TABLE 5: PACKAGES_TYPES (Prestations standardisées - optionnel)
-- ============================================================
CREATE TABLE packages_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photographe_id UUID NOT NULL REFERENCES profils_photographe(id) ON DELETE CASCADE,
    -- Informations package
    titre TEXT NOT NULL,
    description TEXT NOT NULL,
    categorie TEXT NOT NULL,
    -- 'portrait-pro', 'photos-cv', 'produit-ecom', 'headshot'
    -- Tarification fixe
    prix_fixe NUMERIC(10, 2) NOT NULL,
    monnaie TEXT DEFAULT 'EUR',
    -- Détails de la prestation
    duree_minutes INTEGER NOT NULL,
    nb_photos_incluses INTEGER NOT NULL,
    nb_photos_retouchees INTEGER,
    delai_livraison_jours INTEGER DEFAULT 7,
    -- Inclusions
    retouches_incluses BOOLEAN DEFAULT true,
    -- Livraison
    modes_livraison TEXT [] DEFAULT '{telechargement}'::text [],
    formats_fichiers TEXT [] DEFAULT '{jpeg_haute_qualite}'::text [],
    livraison_usb_incluse BOOLEAN DEFAULT false,
    -- Tirages
    tirages_inclus INTEGER DEFAULT 0,
    format_tirages TEXT [] DEFAULT '{}',
    services_inclus JSONB DEFAULT '{}'::jsonb,
    -- Options
    options_disponibles JSONB DEFAULT '[]'::jsonb,
    -- Options payantes
    -- Photos d'exemple
    photos_exemple TEXT [] DEFAULT '{}',
    -- Conditions
    conditions TEXT,
    lieu_prestation TEXT,
    -- 'studio', 'domicile', 'exterieur'
    deplacement_inclus BOOLEAN DEFAULT false,
    -- Disponibilité
    reservation_instantanee BOOLEAN DEFAULT true,
    duree_validite_jours INTEGER,
    -- Si offre limitée dans le temps
    stock_limite INTEGER,
    -- Si nombre limité de packages
    nb_vendus INTEGER DEFAULT 0,
    -- Statut
    actif BOOLEAN DEFAULT true,
    visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index
CREATE INDEX idx_packages_photographe_id ON packages_types(photographe_id);
CREATE INDEX idx_packages_categorie ON packages_types(categorie);
CREATE INDEX idx_packages_actif ON packages_types(actif);
-- ============================================================
-- TABLE 6: PRESTATIONS (Catégories de services)
-- ============================================================
CREATE TABLE prestations (
    id BIGSERIAL PRIMARY KEY,
    nom TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icone TEXT,
    -- Nom de l'icône
    type TEXT DEFAULT 'service',
    -- 'service' ou 'produit'
    ordre INTEGER DEFAULT 0,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Données de base
INSERT INTO prestations (nom, slug, description, type)
VALUES (
        'Mariage',
        'mariage',
        'Photographie de mariage et cérémonies',
        'service'
    ),
    (
        'Portrait',
        'portrait',
        'Portraits individuels et de famille',
        'service'
    ),
    (
        'Corporate',
        'corporate',
        'Photos professionnelles et événements d''entreprise',
        'service'
    ),
    (
        'Événementiel',
        'evenementiel',
        'Couverture photo d''événements',
        'service'
    ),
    (
        'Grossesse',
        'grossesse',
        'Séances photo de grossesse et maternité',
        'service'
    ),
    (
        'Nouveau-né',
        'nouveau-ne',
        'Photos de bébés et nouveau-nés',
        'service'
    ),
    (
        'Famille',
        'famille',
        'Photos de famille et générations',
        'service'
    ),
    (
        'Produit',
        'produit',
        'Photographie de produits pour e-commerce',
        'service'
    ),
    (
        'Immobilier',
        'immobilier',
        'Photos d''intérieurs et biens immobiliers',
        'service'
    ),
    (
        'Culinaire',
        'culinaire',
        'Photographie culinaire et food',
        'service'
    );
-- ============================================================
-- TABLE 7: RESERVATIONS (Mise à jour)
-- ============================================================
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Acteurs
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    photographe_id UUID NOT NULL REFERENCES profils_photographe(id) ON DELETE CASCADE,
    -- Source de la réservation
    source TEXT DEFAULT 'demande',
    -- 'demande', 'package', 'direct'
    demande_id UUID REFERENCES demandes_client(id) ON DELETE
    SET NULL,
        devis_id UUID REFERENCES devis(id) ON DELETE
    SET NULL,
        package_id UUID REFERENCES packages_types(id) ON DELETE
    SET NULL,
        -- Informations réservation
        titre TEXT NOT NULL,
        description TEXT,
        categorie TEXT NOT NULL,
        -- Date et lieu
        date DATE NOT NULL,
        heure_debut TIME,
        heure_fin TIME,
        duree_heures NUMERIC(5, 2),
        lieu TEXT NOT NULL,
        adresse_complete TEXT,
        ville TEXT,
        -- Détails prestation
        nb_photos_prevues INTEGER,
        nb_videos_prevues INTEGER,
        services_inclus JSONB DEFAULT '{}'::jsonb,
        -- Tarification
        montant_total NUMERIC(10, 2) NOT NULL,
        acompte_montant NUMERIC(10, 2),
        acompte_paye BOOLEAN DEFAULT false,
        solde_montant NUMERIC(10, 2),
        solde_paye BOOLEAN DEFAULT false,
        monnaie TEXT DEFAULT 'EUR',
        -- Paiements
        paiement_acompte_id UUID,
        paiement_solde_id UUID,
        -- Statut
        statut statut_reservation DEFAULT 'pending',
        -- Dates importantes
        date_confirmation TIMESTAMPTZ,
        date_annulation TIMESTAMPTZ,
        motif_annulation TEXT,
        annule_par UUID,
        -- ID de celui qui a annulé
        -- Livraison numérique
        photos_livrees TEXT [] DEFAULT '{}',
        date_livraison_numerique TIMESTAMPTZ,
        galerie_livraison_id UUID,
        mode_livraison TEXT [] DEFAULT '{}',
        -- Modes utilisés
        lien_telechargement TEXT,
        usb_envoyee BOOLEAN DEFAULT false,
        date_envoi_usb TIMESTAMPTZ,
        numero_suivi_usb TEXT,
        -- Tirages et impressions
        tirages_commandes BOOLEAN DEFAULT false,
        tirages_imprimes BOOLEAN DEFAULT false,
        date_impression_tirages TIMESTAMPTZ,
        tirages_expedies BOOLEAN DEFAULT false,
        date_expedition_tirages TIMESTAMPTZ,
        numero_suivi_tirages TEXT,
        tirages_livres BOOLEAN DEFAULT false,
        date_livraison_tirages TIMESTAMPTZ,
        -- Album
        album_commande BOOLEAN DEFAULT false,
        album_produit BOOLEAN DEFAULT false,
        date_production_album TIMESTAMPTZ,
        album_expedie BOOLEAN DEFAULT false,
        date_expedition_album TIMESTAMPTZ,
        numero_suivi_album TEXT,
        album_livre BOOLEAN DEFAULT false,
        date_livraison_album TIMESTAMPTZ,
        -- Métadonnées
        notes_client TEXT,
        notes_photographe TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index
CREATE INDEX idx_reservations_client_id ON reservations(client_id);
CREATE INDEX idx_reservations_photographe_id ON reservations(photographe_id);
CREATE INDEX idx_reservations_date ON reservations(date);
CREATE INDEX idx_reservations_statut ON reservations(statut);
CREATE INDEX idx_reservations_demande_id ON reservations(demande_id);
-- ============================================================
-- TABLE 8: AVIS (Reviews)
-- ============================================================
CREATE TABLE avis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    -- Acteurs
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewer_role TEXT NOT NULL,
    -- 'client' ou 'photographe'
    -- Note globale
    note_globale NUMERIC(3, 2) NOT NULL CHECK (
        note_globale >= 1
        AND note_globale <= 5
    ),
    -- Notes détaillées (pour avis client → photographe)
    note_qualite NUMERIC(3, 2) CHECK (
        note_qualite >= 1
        AND note_qualite <= 5
    ),
    note_ponctualite NUMERIC(3, 2) CHECK (
        note_ponctualite >= 1
        AND note_ponctualite <= 5
    ),
    note_communication NUMERIC(3, 2) CHECK (
        note_communication >= 1
        AND note_communication <= 5
    ),
    note_rapport_qualite_prix NUMERIC(3, 2) CHECK (
        note_rapport_qualite_prix >= 1
        AND note_rapport_qualite_prix <= 5
    ),
    -- Contenu
    titre TEXT,
    commentaire TEXT NOT NULL,
    photos TEXT [] DEFAULT '{}',
    -- Photos jointes à l'avis
    -- Recommandation
    recommande BOOLEAN,
    -- Réponse
    reponse_presta TEXT,
    reponse_date TIMESTAMPTZ,
    -- Modération
    visible BOOLEAN DEFAULT true,
    signale BOOLEAN DEFAULT false,
    motif_signalement TEXT,
    verifie BOOLEAN DEFAULT false,
    -- Avis vérifié (vraie prestation)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index
CREATE INDEX idx_avis_reviewee_id ON avis(reviewee_id);
CREATE INDEX idx_avis_reviewer_id ON avis(reviewer_id);
CREATE INDEX idx_avis_reservation_id ON avis(reservation_id);
CREATE INDEX idx_avis_note_globale ON avis(note_globale DESC);
-- ============================================================
-- TABLE 9: MESSAGES (Conversations)
-- ============================================================
CREATE TABLE conversations (
    id BIGSERIAL PRIMARY KEY,
    -- Participants
    client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    photographe_id UUID REFERENCES profils_photographe(id) ON DELETE CASCADE,
    -- Contexte
    demande_id UUID REFERENCES demandes_client(id) ON DELETE
    SET NULL,
        reservation_id UUID REFERENCES reservations(id) ON DELETE
    SET NULL,
        -- Dernier message
        last_message_text TEXT,
        last_message_at TIMESTAMPTZ,
        last_message_sender_id UUID,
        -- Compteurs non lus
        unread_count_client INTEGER DEFAULT 0,
        unread_count_photographe INTEGER DEFAULT 0,
        -- Archivage
        is_archived_by_client BOOLEAN DEFAULT false,
        is_archived_by_photographe BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    contenu TEXT NOT NULL,
    attachments TEXT [] DEFAULT '{}',
    lu BOOLEAN DEFAULT false,
    lu_at TIMESTAMPTZ,
    -- Soft delete
    deleted_by_sender BOOLEAN DEFAULT false,
    deleted_by_receiver BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index
CREATE INDEX idx_conversations_client_id ON conversations(client_id);
CREATE INDEX idx_conversations_photographe_id ON conversations(photographe_id);
CREATE INDEX idx_conversations_demande_id ON conversations(demande_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
-- ============================================================
-- TABLE 10: PAIEMENTS
-- ============================================================
CREATE TABLE paiements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    -- Acteurs
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    photographe_id UUID NOT NULL REFERENCES profils_photographe(id) ON DELETE CASCADE,
    -- Montant
    montant NUMERIC(10, 2) NOT NULL,
    monnaie TEXT DEFAULT 'EUR',
    type_paiement TEXT,
    -- 'acompte', 'solde', 'total'
    -- Méthode
    methode TEXT,
    -- 'stripe', 'carte', 'virement', 'especes'
    -- Stripe
    stripe_session_id TEXT,
    stripe_payment_intent_id TEXT,
    stripe_charge_id TEXT,
    stripe_response TEXT,
    -- Statut
    statut TEXT DEFAULT 'pending',
    -- 'pending', 'completed', 'failed', 'refunded'
    -- Dates
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ
);
-- Index
CREATE INDEX idx_paiements_reservation_id ON paiements(reservation_id);
CREATE INDEX idx_paiements_client_id ON paiements(client_id);
CREATE INDEX idx_paiements_photographe_id ON paiements(photographe_id);
CREATE INDEX idx_paiements_statut ON paiements(statut);
-- ============================================================
-- TABLE 11: REMBOURSEMENTS
-- ============================================================
CREATE TABLE remboursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES profiles(id),
    photographe_id UUID NOT NULL REFERENCES profils_photographe(id),
    -- Montants
    montant_original NUMERIC(10, 2) NOT NULL,
    pourcentage_remboursement INTEGER NOT NULL,
    montant_rembourse NUMERIC(10, 2) NOT NULL,
    -- Stripe
    stripe_charge_id TEXT,
    stripe_refund_id TEXT,
    stripe_status TEXT DEFAULT 'pending',
    -- Raison
    motif_annulation TEXT NOT NULL,
    condition_appliquee TEXT,
    force_majeure BOOLEAN DEFAULT false,
    -- Dates
    date_annulation TIMESTAMPTZ DEFAULT NOW(),
    date_reservation TIMESTAMPTZ,
    date_remboursement TIMESTAMPTZ,
    -- Statut
    statut TEXT DEFAULT 'processing',
    -- 'processing', 'completed', 'failed'
    -- Notes admin
    notes_admin TEXT,
    email_notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index
CREATE INDEX idx_remboursements_reservation_id ON remboursements(reservation_id);
CREATE INDEX idx_remboursements_statut ON remboursements(statut);
-- ============================================================
-- TABLE 12: FAVORIS
-- ============================================================
CREATE TABLE favoris (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    photographe_id UUID NOT NULL REFERENCES profils_photographe(id) ON DELETE CASCADE,
    notes TEXT,
    -- Notes personnelles du client
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, photographe_id)
);
-- Index
CREATE INDEX idx_favoris_client_id ON favoris(client_id);
CREATE INDEX idx_favoris_photographe_id ON favoris(photographe_id);
-- ============================================================
-- TABLE 13: NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    -- 'new_demande', 'new_devis', 'devis_accepte', 'new_message', 'reservation_confirmed', etc.
    titre TEXT NOT NULL,
    contenu TEXT NOT NULL,
    -- Liens
    demande_id UUID REFERENCES demandes_client(id) ON DELETE CASCADE,
    devis_id UUID REFERENCES devis(id) ON DELETE CASCADE,
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    -- Statut
    lu BOOLEAN DEFAULT false,
    lu_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_lu ON notifications(lu);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
-- ============================================================
-- TABLE 14: BLOCKED_SLOTS (Disponibilités photographe)
-- ============================================================
CREATE TABLE blocked_slots (
    id BIGSERIAL PRIMARY KEY,
    photographe_id UUID NOT NULL REFERENCES profils_photographe(id) ON DELETE CASCADE,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    reason TEXT,
    -- 'reservation', 'conges', 'indisponible', 'personnel'
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index
CREATE INDEX idx_blocked_slots_photographe_id ON blocked_slots(photographe_id);
CREATE INDEX idx_blocked_slots_dates ON blocked_slots(start_datetime, end_datetime);
-- ============================================================
-- TABLE 15: GALERIES_LIVRAISON (Photos livrées)
-- ============================================================
CREATE TABLE galeries_livraison (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    photographe_id UUID NOT NULL REFERENCES profils_photographe(id),
    client_id UUID NOT NULL REFERENCES profiles(id),
    -- Contenu
    photos TEXT [] DEFAULT '{}',
    videos TEXT [] DEFAULT '{}',
    message_accompagnement TEXT,
    -- Métadonnées fichiers
    photos_metadata JSONB DEFAULT '{}'::jsonb,
    -- {photo_url: {format: 'jpeg', taille_mo: 5.2, resolution: '4000x6000'}}
    taille_totale_mo NUMERIC(10, 2),
    -- Accès
    statut TEXT DEFAULT 'en_attente',
    -- 'en_attente', 'valide', 'refuse'
    expire_at TIMESTAMPTZ,
    lien_partage TEXT,
    -- Lien unique de partage
    mot_de_passe TEXT,
    -- Mot de passe optionnel
    -- Options de téléchargement
    autoriser_telechargement BOOLEAN DEFAULT true,
    autoriser_telechargement_individuel BOOLEAN DEFAULT true,
    autoriser_telechargement_zip BOOLEAN DEFAULT true,
    telechargements_count INTEGER DEFAULT 0,
    telechargements_details JSONB DEFAULT '[]'::jsonb,
    -- [{date, ip, user_agent, fichiers: []}]
    -- Formats disponibles
    formats_disponibles JSONB DEFAULT '{"haute_qualite": true, "web": true, "raw": false}'::jsonb,
    -- Watermark
    watermark_actif BOOLEAN DEFAULT false,
    watermark_texte TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index
CREATE INDEX idx_galeries_reservation_id ON galeries_livraison(reservation_id);
CREATE INDEX idx_galeries_client_id ON galeries_livraison(client_id);
-- ============================================================
-- TABLE 16: TIRAGES_COMMANDES (Commandes de tirages photo)
-- ============================================================

CREATE TABLE tirages_commandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photographe_id UUID NOT NULL REFERENCES profils_photographe(id) ON DELETE CASCADE,
  
  -- Détails de la commande
  photos_selectionnees TEXT[] NOT NULL,  -- URLs des photos à imprimer
  
  -- Spécifications par photo
  specifications JSONB NOT NULL,  -- [{photo_url: '...', format: '20x30', quantite: 2, papier: 'mat', encadrement: false}]
  
  -- Totaux
  nb_tirages_total INTEGER NOT NULL,
  montant_tirages NUMERIC(10,2) NOT NULL,
  montant_encadrement NUMERIC(10,2) DEFAULT 0,
  frais_expedition NUMERIC(10,2) DEFAULT 0,
  montant_total NUMERIC(10,2) NOT NULL,
  
  -- Adresse de livraison
  adresse_livraison JSONB NOT NULL,  -- {nom, prenom, adresse, code_postal, ville, pays, telephone}
  
  -- Statut de production
  statut TEXT DEFAULT 'en_attente',  -- 'en_attente', 'en_production', 'produit', 'expedie', 'livre', 'annule'
  
  -- Suivi
  date_commande TIMESTAMPTZ DEFAULT NOW(),
  date_production TIMESTAMPTZ,
  date_expedition TIMESTAMPTZ,
  date_livraison TIMESTAMPTZ,
  transporteur TEXT,
  numero_suivi TEXT,
  
  -- Paiement
  paiement_id UUID,
  paye BOOLEAN DEFAULT false,
  
  -- Notes
  instructions_speciales TEXT,
  notes_photographe TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_tirages_commandes_reservation_id ON tirages_commandes(reservation_id);
CREATE INDEX idx_tirages_commandes_client_id ON tirages_commandes(client_id);
CREATE INDEX idx_tirages_commandes_statut ON tirages_commandes(statut);

-- ============================================================
-- TABLE 17: ALBUMS_COMMANDES (Commandes d'albums photo)
-- ============================================================

CREATE TABLE albums_commandes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  photographe_id UUID NOT NULL REFERENCES profils_photographe(id) ON DELETE CASCADE,
  
  -- Type d'album
  type_album TEXT NOT NULL,  -- 'traditionnel', 'luxe', 'livre_photo', 'magazine'
  format_album TEXT NOT NULL,  -- '20x20', '30x30', '40x40', 'A4_portrait', 'A4_paysage'
  nb_pages INTEGER NOT NULL,
  
  -- Sélection et mise en page
  photos_selectionnees TEXT[] NOT NULL,
  mise_en_page JSONB,  -- Structure de l'album page par page
  couverture_photo_url TEXT,
  texte_couverture TEXT,
  
  -- Options
  type_couverture TEXT,  -- 'souple', 'rigide', 'cuir', 'tissu'
  type_papier TEXT,  -- 'mat', 'brillant', 'satin', 'fine_art'
  coffret_inclus BOOLEAN DEFAULT false,
  
  -- Tarification
  montant_album NUMERIC(10,2) NOT NULL,
  montant_options NUMERIC(10,2) DEFAULT 0,
  frais_expedition NUMERIC(10,2) DEFAULT 0,
  montant_total NUMERIC(10,2) NOT NULL,
  
  -- Adresse de livraison
  adresse_livraison JSONB NOT NULL,
  
  -- Validation et production
  statut TEXT DEFAULT 'en_conception',  -- 'en_conception', 'en_attente_validation', 'valide', 'en_production', 'produit', 'expedie', 'livre', 'annule'
  maquette_url TEXT,  -- PDF de prévisualisation
  validee_par_client BOOLEAN DEFAULT false,
  date_validation_client TIMESTAMPTZ,
  modifications_demandees TEXT,
  
  -- Suivi
  date_commande TIMESTAMPTZ DEFAULT NOW(),
  date_production TIMESTAMPTZ,
  date_expedition TIMESTAMPTZ,
  date_livraison TIMESTAMPTZ,
  transporteur TEXT,
  numero_suivi TEXT,
  
  -- Paiement
  paiement_id UUID,
  paye BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_albums_commandes_reservation_id ON albums_commandes(reservation_id);
CREATE INDEX idx_albums_commandes_client_id ON albums_commandes(client_id);
CREATE INDEX idx_albums_commandes_statut ON albums_commandes(statut);

-- ============================================================
-- TABLE 18: FACTURES
-- ============================================================
CREATE TABLE factures (
    id BIGSERIAL PRIMARY KEY,
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    photographe_id UUID NOT NULL REFERENCES profils_photographe(id),
    num_facture TEXT UNIQUE NOT NULL,
    facture TEXT [],
    -- URLs PDF
    montant_ht NUMERIC(10, 2),
    montant_tva NUMERIC(10, 2),
    montant_ttc NUMERIC(10, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index
CREATE INDEX idx_factures_reservation_id ON factures(reservation_id);
CREATE INDEX idx_factures_num_facture ON factures(num_facture);
-- ============================================================
-- TABLE 19: ABONNEMENTS (Plans photographes)
-- ============================================================
CREATE TABLE plans (
    id BIGSERIAL PRIMARY KEY,
    nom TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    prix_mensuel NUMERIC(10, 2) NOT NULL,
    prix_annuel NUMERIC(10, 2),
    -- Limites
    nb_demandes_max_mois INTEGER,
    -- Nombre de leads/mois (null = illimité)
    nb_devis_max_mois INTEGER,
    commission_percent NUMERIC(5, 2),
    -- Commission plateforme
    -- Features
    features JSONB DEFAULT '{}'::jsonb,
    actif BOOLEAN DEFAULT true,
    ordre INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE abonnements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photographe_id UUID NOT NULL REFERENCES profils_photographe(id) ON DELETE CASCADE,
    plan_id BIGINT REFERENCES plans(id),
    statut TEXT DEFAULT 'actif',
    -- 'actif', 'suspendu', 'annule', 'expire'
    date_debut DATE NOT NULL,
    date_fin DATE,
    renouvellement_auto BOOLEAN DEFAULT true,
    -- Stripe
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index
CREATE INDEX idx_abonnements_photographe_id ON abonnements(photographe_id);
CREATE INDEX idx_abonnements_statut ON abonnements(statut);
-- ============================================================
-- TABLE 20: VILLES (Référentiel)
-- ============================================================
CREATE TABLE villes (
    id BIGSERIAL PRIMARY KEY,
    nom TEXT NOT NULL,
    code_postal TEXT,
    departement TEXT,
    region TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    UNIQUE(nom, code_postal)
);
-- Index
CREATE INDEX idx_villes_nom ON villes(nom);
CREATE INDEX idx_villes_code_postal ON villes(code_postal);
-- ============================================================
-- TABLE 21: STATISTIQUES_AVIS (Vue matérialisée)
-- ============================================================
CREATE TABLE statistiques_avis (
    photographe_id UUID PRIMARY KEY REFERENCES profils_photographe(id) ON DELETE CASCADE,
    note_globale_moyenne NUMERIC(3, 2),
    note_qualite_moyenne NUMERIC(3, 2),
    note_ponctualite_moyenne NUMERIC(3, 2),
    note_communication_moyenne NUMERIC(3, 2),
    note_rapport_qualite_prix_moyenne NUMERIC(3, 2),
    total_avis INTEGER DEFAULT 0,
    total_avec_photos INTEGER DEFAULT 0,
    total_recommandations INTEGER DEFAULT 0,
    avis_5_etoiles INTEGER DEFAULT 0,
    avis_4_etoiles INTEGER DEFAULT 0,
    avis_3_etoiles INTEGER DEFAULT 0,
    avis_2_etoiles INTEGER DEFAULT 0,
    avis_1_etoile INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================================
-- TABLE 22: INSTANT_BOOKING_SETTINGS (Optionnel)
-- ============================================================
CREATE TABLE instant_booking_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photographe_id UUID NOT NULL UNIQUE REFERENCES profils_photographe(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    -- Délais
    buffer_minutes INTEGER DEFAULT 60,
    -- Temps buffer entre 2 prestations
    advance_notice_hours INTEGER DEFAULT 24,
    -- Préavis minimum
    max_advance_days INTEGER DEFAULT 90,
    -- Réservation max à l'avance
    -- Conditions auto-accept
    auto_accept_conditions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- ============================================================
-- TABLE 23: CANCELLATION_POLICIES (Politiques d'annulation)
-- ============================================================
CREATE TABLE cancellation_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    photographe_id UUID NOT NULL REFERENCES profils_photographe(id) ON DELETE CASCADE,
    policy_name TEXT NOT NULL,
    policy_type TEXT NOT NULL,
    -- 'flexible', 'modere', 'strict', 'personnalise'
    -- Règles de remboursement
    refund_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- [{jours_avant: 7, remboursement_percent: 100}, ...]
    cancellation_fee_percentage NUMERIC(5, 2) DEFAULT 0,
    cancellation_fee_fixed NUMERIC(10, 2) DEFAULT 0,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index
CREATE INDEX idx_cancellation_policies_photographe_id ON cancellation_policies(photographe_id);
-- ============================================================
-- FONCTIONS UTILITAIRES
-- ============================================================
-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Appliquer le trigger sur toutes les tables concernées
CREATE TRIGGER update_profiles_updated_at BEFORE
UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profils_photographe_updated_at BEFORE
UPDATE ON profils_photographe FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_demandes_client_updated_at BEFORE
UPDATE ON demandes_client FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_devis_updated_at BEFORE
UPDATE ON devis FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reservations_updated_at BEFORE
UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tirages_commandes_updated_at BEFORE
UPDATE ON tirages_commandes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_albums_commandes_updated_at BEFORE
UPDATE ON albums_commandes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Activer RLS sur les tables principales
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profils_photographe ENABLE ROW LEVEL SECURITY;
ALTER TABLE demandes_client ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE avis ENABLE ROW LEVEL SECURITY;
ALTER TABLE favoris ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- Exemples de policies (à adapter selon besoins)
-- Profiles: chaque user peut voir et modifier son propre profil
CREATE POLICY "Users can view own profile" ON profiles FOR
SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR
UPDATE USING (auth.uid() = id);
-- Profils photographe: publics en lecture, modifiable par propriétaire
CREATE POLICY "Public profiles are viewable by everyone" ON profils_photographe FOR
SELECT USING (true);
CREATE POLICY "Photographers can update own profile" ON profils_photographe FOR
UPDATE USING (auth.uid() = id);
-- Demandes: visibles par créateur et photographes matchés
CREATE POLICY "Clients can view own demandes" ON demandes_client FOR
SELECT USING (auth.uid() = client_id);
CREATE POLICY "Public demandes are viewable by photographers" ON demandes_client FOR
SELECT USING (
        visible_publiquement = true
        OR auth.uid() = ANY(photographes_notifies)
        OR auth.uid() = ANY(photographes_invites)
    );
-- Devis: visible par client et photographe concernés
CREATE POLICY "Clients can view devis for their demandes" ON devis FOR
SELECT USING (auth.uid() = client_id);
CREATE POLICY "Photographers can view own devis" ON devis FOR
SELECT USING (auth.uid() = photographe_id);
-- Messages: visibles par sender et receiver
CREATE POLICY "Users can view own messages" ON messages FOR
SELECT USING (
        auth.uid() = sender_id
        OR auth.uid() = receiver_id
    );
-- ============================================================
-- VUES UTILES
-- ============================================================
-- Vue: Demandes ouvertes avec nb devis
CREATE VIEW demandes_ouvertes_avec_stats AS
SELECT d.*,
    COUNT(dv.id) as nb_devis_total,
    AVG(dv.montant_total) as montant_moyen_devis,
    MIN(dv.montant_total) as montant_min_devis,
    MAX(dv.montant_total) as montant_max_devis
FROM demandes_client d
    LEFT JOIN devis dv ON d.id = dv.demande_id
WHERE d.statut = 'ouverte'
GROUP BY d.id;
-- Vue: Photographes avec stats
CREATE VIEW photographes_avec_stats AS
SELECT p.*,
    pp.note_moyenne,
    pp.nb_prestations_completees,
    pp.taux_reponse,
    pp.specialisations,
    sa.total_avis,
    sa.total_recommandations
FROM profiles p
    INNER JOIN profils_photographe pp ON p.id = pp.id
    LEFT JOIN statistiques_avis sa ON p.id = sa.photographe_id
WHERE p.role = 'photographe';
-- ============================================================
-- DONNÉES DE TEST (Optionnel - à supprimer en production)
-- ============================================================
-- Insérer quelques plans de base
INSERT INTO plans (
        nom,
        slug,
        prix_mensuel,
        prix_annuel,
        nb_demandes_max_mois,
        commission_percent
    )
VALUES ('Gratuit', 'gratuit', 0, 0, 5, 25),
    ('Starter', 'starter', 29, 290, 20, 20),
    ('Pro', 'pro', 79, 790, 100, 15),
    ('Premium', 'premium', 149, 1490, NULL, 10);
-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
-- Afficher résumé des tables créées
SELECT schemaname,
    tablename,
    pg_size_pretty(
        pg_total_relation_size(schemaname || '.' || tablename)
    ) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;