/**
 * Schéma complet de la demande client
 * Tous les critères pour un matching optimal avec les photographes
 */

export const BOOKING_CATEGORIES = [
  { id: 'portrait', label: 'Portrait / Book' },
  { id: 'event', label: 'Événement (mariage, anniversaire, corporate)' },
  { id: 'product', label: 'Shooting produit' },
  { id: 'real_estate', label: 'Immobilier / Architecture' },
  { id: 'fashion', label: 'Mode / Éditorial' },
  { id: 'family', label: 'Grossesse / Naissance / Famille' },
  { id: 'corporate', label: 'Corporate / Portrait pro' },
  { id: 'reportage', label: 'Reportage (entreprise, artisan, association)' }
];

export const PHOTO_STYLES = [
  { id: 'luminous', label: 'Lumineux / Naturel' },
  { id: 'dark_moody', label: 'Dark & Moody' },
  { id: 'studio', label: 'Studio / Fond uni' },
  { id: 'lifestyle', label: 'Lifestyle / Spontané' },
  { id: 'artistic', label: 'Artistique / Créatif' },
  { id: 'vintage', label: 'Vintage / Argentique' }
];

export const LOCATION_TYPES = [
  { id: 'indoor', label: 'Intérieur' },
  { id: 'outdoor', label: 'Extérieur' },
  { id: 'studio', label: 'Studio' },
  { id: 'home', label: 'Domicile' },
  { id: 'workplace', label: 'Entreprise' }
];

export const USAGE_TYPES = [
  { id: 'personal', label: 'Usage personnel (album, imprimés)' },
  { id: 'social', label: 'Réseaux sociaux' },
  { id: 'website', label: 'Site web' },
  { id: 'advertising', label: 'Publicité / Marketing' },
  { id: 'commercial', label: 'Usage commercial (vente produits)' }
];

export const DELIVERABLE_FORMATS = [
  { id: 'raw', label: 'RAW' },
  { id: 'jpg_high', label: 'JPG Haute Qualité' },
  { id: 'jpg_web', label: 'JPG Web' },
  { id: 'prints', label: 'Tirages imprimés' },
  { id: 'album', label: 'Album photo' }
];

export const RETOUCHING_LEVELS = [
  { id: 'basic', label: 'Basique (crop, lumière, couleurs)' },
  { id: 'standard', label: 'Standard (+ retouche peau, yeux)' },
  { id: 'advanced', label: 'Avancée (retouche créative complète)' }
];

export const CLIENT_COMFORT_LEVELS = [
  { id: 'shy', label: 'Timide / Stressé par la photo' },
  { id: 'neutral', label: 'Neutre / Normal' },
  { id: 'comfortable', label: 'À l\'aise devant la caméra' },
  { id: 'professional', label: 'Expérience photo (modèle, etc.)' }
];

export interface ClientBookingRequest {
  // Catégorie & style
  category: string; // ID de catégorie
  photo_styles: string[]; // IDs des styles recherchés
  
  // Lieu
  location_address: string;
  location_city: string;
  location_type: string; // ID du type
  studio_needed: boolean;
  studio_provider?: 'photographer' | 'client'; // Qui réserve le studio?
  
  // Participants
  total_people: number; // Nombre total de personnes impliquées
  people_in_photos: number; // Combien de personnes sur les photos
  has_children: boolean;
  children_age?: number;
  has_babies: boolean;
  
  // Services additionnels
  needs_makeup: boolean;
  needs_hair: boolean;
  needs_stylist: boolean;
  
  // Objectif & usage
  usage_types: string[]; // IDs des usages
  rights_personal: boolean;
  rights_commercial: boolean;
  
  // Livrables
  deliverable_formats: string[]; // IDs des formats
  num_photos_desired: number;
  retouching_level: string; // ID du niveau
  prints_wanted: boolean;
  album_wanted: boolean;
  
  // Budget
  budget_min: number;
  budget_max: number;
  
  // Préférences humaines
  desired_atmosphere: string; // naturelle, posée, fun, sérieuse
  client_comfort_level: string; // ID du niveau
  special_requirements?: string;
  
  // Moodboard
  reference_photos?: string[]; // URLs de photos de référence
  moodboard_notes?: string;
  
  // Logistique
  event_date?: string;
  session_duration_hours?: number;
  special_constraints?: string[]; // ex: "accès handicapé", "parking", etc.
}
