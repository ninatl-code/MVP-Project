import { supabase } from './supabaseClient';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

type LogLevel = 'info' | 'warning' | 'error' | 'critical';
type UserType = 'particulier' | 'prestataire';

interface LogOptions {
  level?: LogLevel;
  screen?: string;
  metadata?: Record<string, any>;
  errorMessage?: string;
  errorStack?: string;
}

class LoggerService {
  private async getDeviceInfo() {
    return {
      brand: Device.brand,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      platform: Device.platformApiLevel,
      appVersion: Constants.expoConfig?.version || '1.0.0',
    };
  }

  private async getUserInfo(): Promise<{ userId: string | null; userType: UserType | null }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { userId: null, userType: null };

      const { data: profile } = await supabase
        .from('profiles')
        .select('type')
        .eq('id', user.id)
        .single();

      return {
        userId: user.id,
        userType: profile?.type || null,
      };
    } catch (error) {
      return { userId: null, userType: null };
    }
  }

  async log(action: string, options: LogOptions = {}) {
    try {
      const { userId, userType } = await this.getUserInfo();
      const deviceInfo = await this.getDeviceInfo();

      const logEntry = {
        user_id: userId,
        user_type: userType,
        level: options.level || 'info',
        action,
        screen: options.screen,
        metadata: options.metadata,
        error_message: options.errorMessage,
        error_stack: options.errorStack,
        device_info: deviceInfo,
      };

      const { error } = await supabase
        .from('app_logs')
        .insert(logEntry);

      if (error) {
        console.error('Failed to log to Supabase:', error);
      }
    } catch (error) {
      // Ne pas bloquer l'app si le logging échoue
      console.error('Logger error:', error);
    }
  }

  // Méthodes pratiques pour différents niveaux
  async info(action: string, screen?: string, metadata?: Record<string, any>) {
    return this.log(action, { level: 'info', screen, metadata });
  }

  async warning(action: string, screen?: string, metadata?: Record<string, any>) {
    return this.log(action, { level: 'warning', screen, metadata });
  }

  async error(action: string, error: Error, screen?: string, metadata?: Record<string, any>) {
    return this.log(action, {
      level: 'error',
      screen,
      metadata,
      errorMessage: error.message,
      errorStack: error.stack,
    });
  }

  async critical(action: string, error: Error, screen?: string, metadata?: Record<string, any>) {
    return this.log(action, {
      level: 'critical',
      screen,
      metadata,
      errorMessage: error.message,
      errorStack: error.stack,
    });
  }

  // Logs métier spécifiques
  async logAuth(action: 'signup' | 'login' | 'logout', userType: UserType, success: boolean) {
    return this.info(`auth_${action}`, 'auth', { user_type: userType, success });
  }

  async logBooking(action: 'create' | 'cancel' | 'confirm', bookingId: string, metadata?: Record<string, any>) {
    return this.info(`booking_${action}`, 'bookings', { booking_id: bookingId, ...metadata });
  }

  async logPayment(action: 'initiate' | 'success' | 'failed', amount: number, metadata?: Record<string, any>) {
    return this.info(`payment_${action}`, 'payments', { amount, ...metadata });
  }

  async logSearch(query: string, resultsCount: number) {
    return this.info('search', 'search', { query, results_count: resultsCount });
  }

  async logNotification(type: string, opened: boolean) {
    return this.info('notification', 'notifications', { type, opened });
  }

  async logScreenView(screenName: string) {
    return this.info('screen_view', screenName);
  }
}

export const logger = new LoggerService();
