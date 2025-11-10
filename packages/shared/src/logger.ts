import pino from 'pino';
import type { Logger } from 'pino';

/**
 * Sensitive fields that should be sanitized in logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'api_key',
  'apiKey',
  'secret',
  'authorization',
  'phone',
  'to_number',
  'phoneNumber',
  'email',
  'credit_card',
  'ssn',
];

/**
 * Sanitize sensitive fields in objects
 */
function sanitize(obj: any): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) =>
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive && typeof value === 'string') {
      // Mask sensitive fields but keep some chars for debugging
      if (lowerKey.includes('phone') || lowerKey.includes('number')) {
        // Show last 4 digits of phone numbers
        sanitized[key] = value.length > 4 ? `***${value.slice(-4)}` : '***';
      } else if (lowerKey.includes('email')) {
        // Show first char and domain
        const [local, domain] = value.split('@');
        sanitized[key] = local ? `${local[0]}***@${domain || '***'}` : '***';
      } else {
        // Completely mask other sensitive fields
        sanitized[key] = '[REDACTED]';
      }
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Create the base logger instance
 */
function createLogger(): Logger {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

  const baseConfig: pino.LoggerOptions = {
    level: logLevel,
    // Add useful metadata
    base: {
      env: process.env.NODE_ENV || 'development',
      service: process.env.SERVICE_NAME || 'relevel-me',
    },
    // Redact sensitive fields automatically
    redact: {
      paths: SENSITIVE_FIELDS,
      censor: '[REDACTED]',
    },
    // Custom serializers
    serializers: {
      err: pino.stdSerializers.err,
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    // Pretty print in development
    transport: isDevelopment
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        }
      : undefined,
  };

  return pino(baseConfig);
}

/**
 * The singleton logger instance
 */
export const logger = createLogger();

/**
 * Create a child logger with additional context
 *
 * @param context - Contextual information to add to all logs
 * @example
 * ```typescript
 * const callLogger = createChildLogger({ service: 'CallService' });
 * callLogger.info({ userId: '123', callId: '456' }, 'Call initiated');
 * ```
 */
export function createChildLogger(context: Record<string, any>): Logger {
  return logger.child(sanitize(context));
}

/**
 * Generate a unique request ID for correlation
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a request logger with a unique request ID
 *
 * @param requestId - Optional request ID, will be generated if not provided
 * @example
 * ```typescript
 * const reqLogger = createRequestLogger();
 * reqLogger.info({ userId: '123' }, 'Processing request');
 * ```
 */
export function createRequestLogger(requestId?: string): Logger {
  const id = requestId || generateRequestId();
  return createChildLogger({ requestId: id });
}

/**
 * Log a successful operation
 */
export function logSuccess(
  logger: Logger,
  operation: string,
  data?: Record<string, any>
): void {
  logger.info(sanitize(data || {}), `✓ ${operation}`);
}

/**
 * Log a failed operation
 */
export function logError(
  logger: Logger,
  operation: string,
  error: Error | unknown,
  data?: Record<string, any>
): void {
  const errorData = {
    ...sanitize(data || {}),
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
  logger.error(errorData, `✗ ${operation}`);
}

/**
 * Log an API request
 */
export function logApiRequest(
  logger: Logger,
  method: string,
  url: string,
  data?: Record<string, any>
): void {
  logger.info(sanitize({ method, url, ...data }), `→ API Request: ${method} ${url}`);
}

/**
 * Log an API response
 */
export function logApiResponse(
  logger: Logger,
  method: string,
  url: string,
  status: number,
  duration: number,
  data?: Record<string, any>
): void {
  const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
  logger[level](
    sanitize({ method, url, status, duration, ...data }),
    `← API Response: ${method} ${url} (${status}) ${duration}ms`
  );
}

/**
 * Log a database query
 */
export function logDatabaseQuery(
  logger: Logger,
  operation: string,
  table: string,
  data?: Record<string, any>
): void {
  logger.debug(sanitize({ operation, table, ...data }), `DB: ${operation} on ${table}`);
}

/**
 * Log a database error
 */
export function logDatabaseError(
  logger: Logger,
  operation: string,
  table: string,
  error: Error | unknown,
  data?: Record<string, any>
): void {
  const errorData = {
    operation,
    table,
    ...sanitize(data || {}),
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
  logger.error(errorData, `DB Error: ${operation} on ${table}`);
}

// Export types
export type { Logger };
