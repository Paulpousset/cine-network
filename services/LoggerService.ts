/**
 * Centralized Logger Service for production readiness.
 * Toggles between console logs in development and crashlytics/analytics in production.
 */

// Placeholder for future Crashlytics integration
// import crashlytics from '@react-native-firebase/crashlytics';

const isProduction = process.env.NODE_ENV === 'production';

export const Logger = {
  log: (...args: any[]) => {
    if (!isProduction) {
      console.log('[LOG]:', ...args);
    }
  },

  info: (...args: any[]) => {
    if (!isProduction) {
      console.info('[INFO]:', ...args);
    }
  },

  warn: (...args: any[]) => {
    if (!isProduction) {
      console.warn('[WARN]:', ...args);
    }
  },

  error: (error: any, context?: string) => {
    if (!isProduction) {
      console.error(`[ERROR${context ? ` in ${context}` : ''}]:`, error);
    } else {
      // Send to Crashlytics or remote logging in production
      // crashlytics().recordError(error instanceof Error ? error : new Error(String(error)));
    }
  },

  debug: (...args: any[]) => {
    if (!isProduction) {
      console.debug('[DEBUG]:', ...args);
    }
  },
};
