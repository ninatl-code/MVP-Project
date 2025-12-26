/**
 * Service de validation pour les formulaires
 * Fournit des validations réutilisables et des messages d'erreur
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface DemandeData {
  category?: string;
  style?: string[];
  location_type?: string;
  usage_type?: string;
  description?: string;
  budget?: number;
  date?: Date;
  address?: string;
  latitude?: number;
  longitude?: number;
  moodboard_urls?: string[];
}

/**
 * Valide les données d'une demande client
 */
export function validateDemande(data: DemandeData): ValidationResult {
  const errors: Record<string, string> = {};

  // Catégorie obligatoire
  if (!data.category || data.category.trim() === '') {
    errors.category = 'La catégorie est obligatoire';
  }

  // Budget: si fourni, doit être positif
  if (data.budget !== undefined && data.budget !== null) {
    if (data.budget < 0) {
      errors.budget = 'Le budget ne peut pas être négatif';
    }
    if (data.budget > 1000000) {
      errors.budget = 'Le budget semble irréaliste';
    }
  }

  // Date: si fournie, ne doit pas être dans le passé
  if (data.date) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const selectedDate = new Date(data.date);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < now) {
      errors.date = 'La date ne peut pas être dans le passé';
    }
  }

  // Localisation: si latitude/longitude fournie, vérifier cohérence
  if (data.latitude !== undefined && data.longitude !== undefined) {
    if (data.latitude < -90 || data.latitude > 90) {
      errors.location = 'Latitude invalide';
    }
    if (data.longitude < -180 || data.longitude > 180) {
      errors.location = 'Longitude invalide';
    }
  }

  // Description: si fournie, longueur minimale
  if (data.description && data.description.trim().length > 0) {
    if (data.description.trim().length < 10) {
      errors.description = 'La description doit faire au moins 10 caractères';
    }
    if (data.description.length > 2000) {
      errors.description = 'La description est trop longue (max 2000 caractères)';
    }
  }

  // Moodboard: vérifier nombre de photos
  if (data.moodboard_urls && data.moodboard_urls.length > 10) {
    errors.moodboard = 'Vous ne pouvez ajouter que 10 photos maximum';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valide une adresse email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valide un numéro de téléphone français
 */
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
  return phoneRegex.test(phone);
}

/**
 * Valide un mot de passe
 */
export function validatePassword(password: string): ValidationResult {
  const errors: Record<string, string> = {};

  if (password.length < 8) {
    errors.password = 'Le mot de passe doit faire au moins 8 caractères';
  }
  if (!/[A-Z]/.test(password)) {
    errors.password = 'Le mot de passe doit contenir au moins une majuscule';
  }
  if (!/[a-z]/.test(password)) {
    errors.password = 'Le mot de passe doit contenir au moins une minuscule';
  }
  if (!/[0-9]/.test(password)) {
    errors.password = 'Le mot de passe doit contenir au moins un chiffre';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valide un profil photographe
 */
export interface PhotographeProfile {
  business_name?: string;
  description?: string;
  hourly_rate?: number;
  siret?: string;
  portfolio_urls?: string[];
}

export function validatePhotographeProfile(data: PhotographeProfile): ValidationResult {
  const errors: Record<string, string> = {};

  // Nom d'entreprise
  if (!data.business_name || data.business_name.trim().length < 2) {
    errors.business_name = 'Le nom d\'entreprise doit faire au moins 2 caractères';
  }

  // Description
  if (data.description && data.description.trim().length > 0) {
    if (data.description.trim().length < 50) {
      errors.description = 'La description doit faire au moins 50 caractères';
    }
    if (data.description.length > 1000) {
      errors.description = 'La description est trop longue (max 1000 caractères)';
    }
  }

  // Tarif horaire
  if (data.hourly_rate !== undefined && data.hourly_rate !== null) {
    if (data.hourly_rate < 20) {
      errors.hourly_rate = 'Le tarif horaire minimum est de 20€';
    }
    if (data.hourly_rate > 1000) {
      errors.hourly_rate = 'Le tarif horaire semble irréaliste';
    }
  }

  // SIRET (14 chiffres)
  if (data.siret && data.siret.trim().length > 0) {
    const siretClean = data.siret.replace(/\s/g, '');
    if (!/^\d{14}$/.test(siretClean)) {
      errors.siret = 'Le SIRET doit contenir 14 chiffres';
    }
  }

  // Portfolio
  if (data.portfolio_urls && data.portfolio_urls.length > 20) {
    errors.portfolio = 'Vous ne pouvez ajouter que 20 photos maximum au portfolio';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sanitize une string (retire balises HTML, trim)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Retire balises HTML
    .trim();
}

/**
 * Valide et sanitize une string
 */
export function validateAndSanitize(input: string, minLength = 0, maxLength = 1000): {
  value: string;
  isValid: boolean;
  error?: string;
} {
  const sanitized = sanitizeString(input);
  
  if (sanitized.length < minLength) {
    return {
      value: sanitized,
      isValid: false,
      error: `Doit faire au moins ${minLength} caractères`,
    };
  }
  
  if (sanitized.length > maxLength) {
    return {
      value: sanitized,
      isValid: false,
      error: `Ne peut pas dépasser ${maxLength} caractères`,
    };
  }
  
  return {
    value: sanitized,
    isValid: true,
  };
}
