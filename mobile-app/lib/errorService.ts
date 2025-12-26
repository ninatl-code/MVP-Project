/**
 * Service de gestion centralisée des erreurs
 * Uniformise le handling des erreurs dans toute l'application
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Codes d'erreur standardisés
 */
export const ERROR_CODES = {
  // Database
  DB_NOT_FOUND: 'DB_NOT_FOUND',
  DB_CONSTRAINT: 'DB_CONSTRAINT',
  DB_CONNECTION: 'DB_CONNECTION',
  
  // Authentication
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  
  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Business logic
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  
  // Network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  
  // Unknown
  UNKNOWN: 'UNKNOWN',
} as const;

/**
 * Convertit une erreur brute en AppError
 */
export function handleError(error: any): AppError {
  // Déjà une AppError
  if (error instanceof AppError) {
    return error;
  }

  // Erreur Supabase PostgreSQL
  if (error.code?.startsWith('PGRST')) {
    switch (error.code) {
      case 'PGRST204':
        return new AppError(
          error.message,
          ERROR_CODES.DB_NOT_FOUND,
          'Cette ressource est introuvable',
          404
        );
      
      case 'PGRST116':
        return new AppError(
          error.message,
          ERROR_CODES.DB_CONSTRAINT,
          'Cette opération viole une contrainte de données',
          400
        );
      
      default:
        return new AppError(
          error.message,
          ERROR_CODES.DB_CONNECTION,
          'Erreur de connexion à la base de données',
          500
        );
    }
  }

  // Erreur Supabase Auth
  if (error.name === 'AuthApiError' || error.status === 401) {
    return new AppError(
      error.message,
      ERROR_CODES.AUTH_INVALID,
      'Identifiants incorrects ou session expirée',
      401
    );
  }

  // Erreur réseau
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new AppError(
      error.message,
      ERROR_CODES.NETWORK_ERROR,
      'Impossible de se connecter au serveur. Vérifiez votre connexion internet.',
      503
    );
  }

  // Erreur Stripe
  if (error.type === 'StripeCardError') {
    return new AppError(
      error.message,
      'STRIPE_CARD_ERROR',
      'Votre carte a été refusée. Veuillez vérifier vos informations.',
      400
    );
  }

  // Erreur inconnue
  return new AppError(
    error.message || 'Une erreur est survenue',
    ERROR_CODES.UNKNOWN,
    'Une erreur inattendue est survenue. Veuillez réessayer.',
    500
  );
}

/**
 * Gère une erreur et affiche un message à l'utilisateur
 */
export function showError(error: any, context?: string): AppError {
  const appError = handleError(error);
  
  console.error(`[ERROR] ${context || 'Unknown context'}:`, {
    code: appError.code,
    message: appError.message,
    userMessage: appError.userMessage,
    statusCode: appError.statusCode,
  });

  return appError;
}

/**
 * Wrapper pour les opérations async avec gestion d'erreur
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw showError(error, context);
  }
}
