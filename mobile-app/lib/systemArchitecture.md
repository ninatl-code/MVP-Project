/**
 * ARCHITECTURE SYSTÈME DE MATCHING PHOTOGRAPHE-CLIENT
 * Guide complet du workflow et intégration des données
 */

// ============================================
// 1. INSCRIPTION PHOTOGRAPHE (Existing onboarding)
// ============================================

/**
 * Table: profiles
 * - id: UUID (user.id)
 * - role: 'photographer' | 'client'
 * - nom: string
 * - email: string  
 * - telephone: string
 * - avatar_url: string
 * - created_at: timestamp
 */

/**
 * Table: profils_photographe (enrichissement)
 * ============================================
 */

const PHOTOGRAPHER_PROFILE_STRUCTURE = {
  // Section 1: Informations de base (déjà remplies à l'inscription)
  nom: 'string',
  email: 'string',
  telephone: 'string',
  
  // Section 2: À AJOUTER - Présentation professionnelle
  bio: 'string (max 500 chars)',
  nom_entreprise: 'string', // ex: "Studio Lumineux SARL"
  site_web: 'string', // URL
  annees_experience: 'number', // ex: 8 ans
  
  // Section 3: À AJOUTER - Spécialités & services
  specialisations: 'string[] / TEXT[]', // ['portrait', 'event', 'product', ...]
  styles_photo: 'string[] / TEXT[]', // ['luminous', 'dark_moody', 'studio', ...]
  
  // Section 4: À AJOUTER - Équipement
  materiel: 'JSONB', // {
    //   drones: boolean,
    //   lighting: boolean,
    //   studio_equipment: boolean,
    //   macro_lens: boolean,
    //   wide_angle_lens: boolean,
    //   stabilizers: boolean,
    //   custom: ['autre équipement']
    // }
  
  // Section 5: À AJOUTER - Équipe
  equipe: 'JSONB', // {
    //   solo_only: boolean,
    //   num_assistants: number,
    //   has_makeup_artist: boolean,
    //   has_stylist: boolean,
    //   has_videographer: boolean
    // }
  
  // Section 6: À AJOUTER - Tarification
  tarifs_indicatifs: 'JSONB', // {
    //   portrait: { min: 150, max: 500 },
    //   event: { min: 500, max: 3000 },
    //   product: { min: 200, max: 1000 },
    //   ...
    // }
  tarif_deplacements: 'number', // € par km après X km
  tarif_studio: 'number', // € si photographe loue un studio
  
  // Section 7: À AJOUTER - Localisation & mobilité
  adresse_studio: 'string', // "123 Rue de Paris, 75001 Paris"
  rayon_deplacement_km: 'number', // Distance max de déplacement
  mobile: 'boolean', // Se déplace sur lieu
  studio: 'boolean', // Dispose d'un studio
  
  // Section 8: À AJOUTER - Disponibilité
  disponibilite: 'JSONB', // {
    //   weekdays_available: boolean,
    //   weekends_available: boolean,
    //   evenings_available: boolean,
    //   bookable_months: ['2024-03', '2024-04', ...]
    // }
  delai_min_booking: 'number', // jours avant événement
  
  // Section 9: À AJOUTER - Portfolio & références
  portfolio_photos: 'TEXT[] / string[]', // URLs des photos
  portfolio_categories: 'JSONB', // {
    //   portrait: [photo_urls],
    //   event: [photo_urls],
    //   ...
    // }
  
  // Section 10: À AJOUTER - Réseaux & validation
  instagram: 'string', // @username ou URL
  facebook: 'string', // URL profil
  linkedin: 'string', // URL profil
  
  // Section 11: À AJOUTER - Vérification & notes
  identite_verifiee: 'boolean',
  assurance_pro: 'boolean', // Dispose d'une assurance RC pro
  contraintes: 'TEXT[]', // ['pas d\'événements alcool', 'jours de repos le dimanche', ...]
  
  // Section 12: Intégration paiement (déjà existant)
  stripe_account_id: 'string',
  stripe_onboarding_complete: 'boolean',
  
  // Section 13: Réputations & stats
  rating_moyen: 'number', // 1-5
  nombre_avis: 'number',
  taux_acceptation: 'number', // % demandes acceptées
};

// ============================================
// 2. RECHERCHE CLIENT (New workflow)
// ============================================

/**
 * Table: demandes_client (À CRÉER)
 * ====================================
 */

const CLIENT_BOOKING_REQUEST_STRUCTURE = {
  // Base
  id: 'UUID',
  client_id: 'UUID (FK profiles)',
  photographe_id: 'UUID (FK profiles)', // Rempli après matching
  status: 'pending | matched | accepted | rejected | completed',
  
  // Section 1: Catégorie & style
  categorie: 'string', // 'portrait' | 'event' | 'product' | ...
  styles_recherches: 'TEXT[]', // ['luminous', 'dark_moody', ...]
  
  // Section 2: Lieu
  adresse_evenement: 'string',
  ville: 'string',
  type_lieu: 'string', // 'indoor' | 'outdoor' | 'studio' | 'home' | 'workplace'
  studio_necessaire: 'boolean',
  qui_reserve_studio: 'photographer | client', // null si photographe dispose du sien
  
  // Section 3: Participants
  nombre_personnes_totales: 'number',
  nombre_personnes_photos: 'number',
  presence_enfants: 'boolean',
  age_enfants_min: 'number',
  presence_bebes: 'boolean',
  
  // Section 4: Services
  maquillage_coiffure: 'boolean',
  stylisme_necessaire: 'boolean',
  
  // Section 5: Objectif & usage
  usages: 'JSONB', // {
    //   personnel: ['album', 'imprimés'],
    //   commercial: ['site_web', 'publicité']
    // }
  
  // Section 6: Livrables
  formats_desires: 'TEXT[]', // ['raw', 'jpg_high', 'prints', 'album']
  nombre_photos_voulu: 'number',
  niveau_retouche: 'string', // 'basic' | 'standard' | 'advanced'
  imprimés_desires: 'boolean',
  album_desire: 'boolean',
  
  // Section 7: Budget
  budget_min: 'number',
  budget_max: 'number',
  
  // Section 8: Préférences humaines
  ambiance_recherchee: 'string', // 'naturelle' | 'posée' | 'fun' | 'sérieuse'
  aisance_devant_camera: 'string', // 'timide' | 'neutral' | 'comfortable' | 'professional'
  besoins_specifiques: 'text', // Description libre
  
  // Section 9: Logistique & constraints
  date_evenement: 'date',
  duree_session_heures: 'number',
  contraintes_logistiques: 'TEXT[]', // ['accès handicapé', 'parking limité', ...]
  
  // Section 10: Moodboard
  photos_reference: 'TEXT[]', // URLs
  notes_moodboard: 'text',
  
  // Métadonnées
  created_at: 'timestamp',
  updated_at: 'timestamp',
  date_limite_reponse: 'timestamp', // 48h après création
};

// ============================================
// 3. ALGORITHME DE MATCHING
// ============================================

/**
 * Scoring: 0-100%
 * 
 * Critères obligatoires (knockout):
 * - Spécialisation incluse: YES ou NO (si NO → score = 0%)
 * - Budget photographe couvre budget client: YES ou NO (si NO → score = 0%)
 * - Rayon géographique: YES ou NO (si NO → score = 0%)
 * 
 * Critères de pondération (si knockout OK):
 * - Style photo correspondance: 30 points max
 * - Équipement disponible: 20 points max
 * - Disponibilité exacte: 15 points max
 * - Tarif dans budget client: 15 points max
 * - Notation/avis: 10 points max
 * - Distance proximité: 10 points max
 * ────────────────────────────────────
 * TOTAL: 100 points
 */

const MATCHING_ALGORITHM = {
  phase_1_knockout: [
    {
      name: 'Spécialisation',
      check: 'demande.categorie IN photographe.specialisations',
      failure: 'score = 0%'
    },
    {
      name: 'Budget',
      check: 'demande.budget_min >= photographe.tarif_min_categorie AND demande.budget_max >= photographe.tarif_max_categorie',
      failure: 'score = 0%'
    },
    {
      name: 'Géographie',
      check: 'distance(client_location, photographe_location) <= photographe.rayon_deplacement_km',
      failure: 'score = 0%'
    }
  ],
  
  phase_2_scoring: [
    {
      criterion: 'Style photo',
      max_points: 30,
      calculation: 'COUNT(demande.styles IN photographe.styles) / demande.styles.length * 30'
    },
    {
      criterion: 'Équipement',
      max_points: 20,
      calculation: 'Si demande requiert équipement spécifique: equipment_match_score / total_required * 20'
    },
    {
      criterion: 'Disponibilité',
      max_points: 15,
      calculation: 'Si date_evenement IN photographe.disponibilite: 15 points, sinon 5 points'
    },
    {
      criterion: 'Tarif compétitif',
      max_points: 15,
      calculation: 'Si tarif_photographe <= (budget_max * 0.8): 15 points, <= budget_max: 10 points'
    },
    {
      criterion: 'Notation',
      max_points: 10,
      calculation: 'photographe.rating_moyen / 5 * 10'
    },
    {
      criterion: 'Proximité',
      max_points: 10,
      calculation: 'Si distance < 10km: 10 points, < 50km: 5 points'
    }
  ]
};

// ============================================
// 4. WORKFLOW COMPLET
// ============================================

/**
 * CÔTÉ PHOTOGRAPHE (Professionnel)
 * 
 * 1. INSCRIPTION: Remplir profile (existing) + profils_photographe (new)
 *    - Sections 1-11 du PHOTOGRAPHER_PROFILE_STRUCTURE
 *    - Création de portfolio avec photos categorisées
 *    - Configuration tarifs + disponibilités
 *    - Vérification identité & stripe
 * 
 * 2. TABLEAU DE BORD PHOTOGRAPHE:
 *    - Voir demandes de clients qui matchent avec profil
 *    - Filtrer par: date, budget, localisation, catégorie
 *    - Accepter/Refuser demandes
 *    - Messaging avec clients
 *    - Historique jobs + notes reçues
 * 
 * 3. PAIEMENT:
 *    - Intégration Stripe Connect (déjà partiellement fait)
 *    - Commission: TBD %
 *    - Paiement APRÈS acceptation du client
 */

/**
 * CÔTÉ CLIENT (Non professionnel ou PME)
 * 
 * 1. CRÉATION DEMANDE:
 *    - Remplir formulaire CLIENT_BOOKING_REQUEST_STRUCTURE
 *    - Upload moodboard (photos de référence)
 *    - Validation budget vs besoins
 * 
 * 2. RÉSULTATS DE MATCHING:
 *    - Algorithme retourne TOP 5-10 photographes triés par score
 *    - Afficher score + raison (ex: "+15 style", "+20 équipement")
 *    - Portfolio du photographe
 *    - Tarif estimé
 *    - Rating & nombre avis
 * 
 * 3. SÉLECTION & BOOKING:
 *    - Cliquer "Demander un devis"
 *    - Envoyer message personnalisé (optionnel)
 *    - Attendre réponse du photographe (48h max)
 * 
 * 4. PAIEMENT:
 *    - Acompte: TBD % (avant photo)
 *    - Solde: Après livraison/approbation des photos
 *    - Garantie client: Remboursement si photos non satisfaisantes
 */

export const SYSTEM_ARCHITECTURE = {
  PHOTOGRAPHER_PROFILE: PHOTOGRAPHER_PROFILE_STRUCTURE,
  CLIENT_BOOKING: CLIENT_BOOKING_REQUEST_STRUCTURE,
  MATCHING_ALGORITHM: MATCHING_ALGORITHM
};
