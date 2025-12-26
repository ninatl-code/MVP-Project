/**
 * Service de logging structuré
 * Centralise tous les logs de l'application avec contexte et métadonnées
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  userId?: string;
  action?: string;
  screen?: string;
  [key: string]: any;
}

class Logger {
  private isDevelopment = __DEV__;

  /**
   * Log une information
   */
  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  /**
   * Log un warning
   */
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  /**
   * Log une erreur
   */
  error(message: string, error?: Error, context?: LogContext) {
    this.log('error', message, { ...context, error: this.serializeError(error) });
    
    // En production, envoyer à Sentry
    if (!this.isDevelopment && typeof global.Sentry !== 'undefined') {
      global.Sentry.captureException(error, {
        contexts: { custom: context },
      });
    }
  }

  /**
   * Log de debug (seulement en développement)
   */
  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      this.log('debug', message, context);
    }
  }

  /**
   * Log une action utilisateur
   */
  userAction(action: string, context?: LogContext) {
    this.info(`User action: ${action}`, { ...context, action });
  }

  /**
   * Log une navigation
   */
  navigation(screen: string, context?: LogContext) {
    this.debug(`Navigation to: ${screen}`, { ...context, screen });
  }

  /**
   * Log une requête API
   */
  apiCall(endpoint: string, method: string, context?: LogContext) {
    this.debug(`API ${method}: ${endpoint}`, context);
  }

  /**
   * Log une métrique business
   */
  metric(name: string, value: number, unit?: string, context?: LogContext) {
    this.info(`Metric: ${name} = ${value}${unit || ''}`, { ...context, metric: { name, value, unit } });
  }

  /**
   * Méthode privée de logging
   */
  private log(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...context,
    };

    const emoji = this.getLevelEmoji(level);
    const formattedMessage = `${emoji} [${level.toUpperCase()}] ${message}`;

    switch (level) {
      case 'error':
        console.error(formattedMessage, context);
        break;
      case 'warn':
        console.warn(formattedMessage, context);
        break;
      case 'debug':
        console.log(formattedMessage, context);
        break;
      default:
        console.log(formattedMessage, context);
    }

    // En production, envoyer à un service de logging
    if (!this.isDevelopment) {
      this.sendToLoggingService(logEntry);
    }
  }

  /**
   * Sérialise une erreur pour le logging
   */
  private serializeError(error?: Error) {
    if (!error) return undefined;
    
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  /**
   * Emoji par niveau de log
   */
  private getLevelEmoji(level: LogLevel): string {
    const emojis = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🔍',
    };
    return emojis[level];
  }

  /**
   * Envoie les logs à un service externe (implémentation future)
   */
  private sendToLoggingService(logEntry: any) {
    // TODO: Implémenter l'envoi à Datadog, Logtail, ou autre service
    // fetch('https://your-logging-service.com/logs', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(logEntry),
    // });
  }
}

// Export singleton
export const logger = new Logger();

// Helpers pour logging rapide
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
export const logDebug = logger.debug.bind(logger);
