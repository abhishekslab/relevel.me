import * as Sentry from '@sentry/node';
import { logger } from './logger';

/**
 * Initialize Sentry for Node.js environments (worker, API routes)
 *
 * @param options - Additional Sentry options
 */
export function initSentry(options: Partial<Sentry.NodeOptions> = {}) {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    logger.warn('SENTRY_DSN not set, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // Adjust in production based on volume
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Attach stack traces to all messages
    attachStacktrace: true,
    // Send default PII (user IP, etc)
    sendDefaultPii: false,
    // Integrate with logger
    beforeSend(event, hint) {
      // Log errors to console as well
      if (event.exception) {
        logger.error(
          {
            eventId: event.event_id,
            error: hint.originalException,
          },
          'Sentry error captured'
        );
      }
      return event;
    },
    // Automatically capture unhandled promise rejections
    // (enabled by default in newer Sentry versions)
    ...options,
  });

  logger.info({ environment: process.env.NODE_ENV }, 'Sentry initialized');
}

/**
 * Capture an exception with Sentry
 *
 * @param error - The error to capture
 * @param context - Additional context
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, any>
): void {
  if (context) {
    Sentry.setContext('additional', context);
  }

  if (error instanceof Error) {
    Sentry.captureException(error);
  } else {
    Sentry.captureException(new Error(String(error)));
  }
}

/**
 * Capture a message with Sentry
 *
 * @param message - The message to capture
 * @param level - The severity level
 * @param context - Additional context
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
): void {
  if (context) {
    Sentry.setContext('additional', context);
  }

  Sentry.captureMessage(message, level);
}

/**
 * Set user context for Sentry
 *
 * @param user - User information
 */
export function setUser(user: { id: string; email?: string; username?: string }): void {
  Sentry.setUser(user);
}

/**
 * Clear user context
 */
export function clearUser(): void {
  Sentry.setUser(null);
}

/**
 * Add a breadcrumb for debugging
 *
 * @param message - Breadcrumb message
 * @param data - Additional data
 * @param category - Breadcrumb category
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, any>,
  category: string = 'default'
): void {
  Sentry.addBreadcrumb({
    message,
    data,
    category,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a new span for performance monitoring
 *
 * @param name - Span name
 * @param op - Operation type
 * @param callback - Function to execute within the span
 */
export async function withSpan<T>(
  name: string,
  op: string = 'default',
  callback: () => Promise<T>
): Promise<T> {
  return await Sentry.startSpan(
    {
      name,
      op,
    },
    callback
  );
}

// Re-export Sentry for direct use if needed
export { Sentry };
