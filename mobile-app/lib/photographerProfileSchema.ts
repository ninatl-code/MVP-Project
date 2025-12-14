/**
 * Schéma complet du profil photographe
 * Tous les champs que le photographe doit renseigner pour un bon matching
 */

export const CATEGORIES = [
  { id: 'portrait', label: 'Portrait / Book' },
  { id: 'event', label: 'Événement (mariage, anniversaire, corporate)' },
  { id: 'product', label: 'Shooting produit' },
  { id: 'real_estate', label: 'Immobilier / Architecture' },
  { id: 'fashion', label: 'Mode / Éditorial' },
  { id: 'family', label: 'Grossesse / Naissance / Famille' },
  { id: 'corporate', label: 'Corporate / Portrait pro' },
  { id: 'reportage', label: 'Reportage (entreprise, artisan, association)' }
];

export const STYLES = [
  { id: 'luminous', label: 'Lumineux / Naturel' },
  { id: 'dark_moody', label: 'Dark & Moody' },
  { id: 'studio', label: 'Studio / Fond uni' },
  { id: 'lifestyle', label: 'Lifestyle / Spontané' },
  { id: 'artistic', label: 'Artistique / Créatif' },
  { id: 'vintage', label: 'Vintage / Argentique' }
];

export const EQUIPMENT = [
  { id: 'drones', label: 'Drones' },
  { id: 'lighting', label: 'Éclairage pro' },
  { id: 'studio', label: 'Studio complet' },
  { id: 'macro', label: 'Macro / Détails' },
  { id: 'wide_angle', label: 'Grand angle' },
  { id: 'stabilizers', label: 'Stabilisateurs' }
];

export const TEAM = [
  { id: 'solo', label: 'En solo' },
  { id: 'assistant', label: 'Avec assistant(s)' },
  { id: 'makeup', label: 'Maquilleur' },
  { id: 'stylist', label: 'Styliste' },
  { id: 'videographer', label: 'Vidéographe' }
];

export const PRICE_RANGES = {
  portrait: { min: 150, max: 800 },
  event: { min: 500, max: 5000 },
  product: { min: 300, max: 2000 },
  real_estate: { min: 200, max: 1500 },
  fashion: { min: 400, max: 3000 },
  family: { min: 250, max: 1200 },
  corporate: { min: 400, max: 2500 },
  reportage: { min: 600, max: 3000 }
};

export interface PhotographerProfile {
  // De profils_photographe
  bio: string;
  specialisations: string[]; // IDs des catégories
  styles_photo: string[]; // IDs des styles
  rayon_deplacement_km: number;
  mobile: boolean;
  studio: boolean;
  adresse_studio?: string;
  materiel: {
    drones: boolean;
    lighting: boolean;
    studio: boolean;
    macro: boolean;
    wide_angle: boolean;
    stabilizers: boolean;
  };
  equipe: {
    solo: boolean;
    nb_assistants: number;
    makeup: boolean;
    stylist: boolean;
    videographer: boolean;
  };
  tarifs_indicatifs: {
    [key: string]: { min: number; max: number };
  };
  disponibilite: {
    weekdays: boolean;
    weekends: boolean;
    evenings: boolean;
  };
  contraintes: string[]; // ex: "pas d'enfants", "fumeur", etc.
  portfolio_photos: string[]; // URLs des photos
  site_web?: string;
}
