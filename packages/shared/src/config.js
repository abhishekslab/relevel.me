"use strict";
/**
 * Application Configuration
 *
 * Centralized configuration for defaults and constants.
 * Override via environment variables for different deployments.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.validateConfig = validateConfig;
exports.config = {
    /**
     * Default timezone for users who haven't set one
     * Can be overridden via DEFAULT_TIMEZONE env var
     */
    defaultTimezone: process.env.DEFAULT_TIMEZONE || 'UTC',
    /**
     * Default call time (in HH:MM:SS format) for users who haven't set one
     * Can be overridden via DEFAULT_CALL_TIME env var
     */
    defaultCallTime: process.env.DEFAULT_CALL_TIME || '21:00:00',
    /**
     * Time window (in minutes) for matching call schedules
     * Calls will be initiated if current time is within this window of scheduled time
     */
    callTimeWindowMinutes: parseInt(process.env.CALL_TIME_WINDOW_MINUTES || '5', 10),
    /**
     * Application URL for redirects and links
     */
    appUrl: process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_URL || 'http://localhost:3000',
    /**
     * Deployment mode
     */
    isSelfHosted: process.env.NEXT_PUBLIC_SELF_HOSTED === 'true',
    /**
     * Feature flags
     */
    features: {
        payments: process.env.NEXT_PUBLIC_SELF_HOSTED !== 'true' && process.env.ENABLE_PAYMENTS !== 'false',
        analytics: process.env.NEXT_PUBLIC_SELF_HOSTED === 'true'
            ? process.env.ENABLE_ANALYTICS === 'true' // Opt-in for self-hosted
            : process.env.ENABLE_ANALYTICS !== 'false', // Opt-out for hosted
    },
};
/**
 * Validate required environment variables
 * Call this at application startup to fail fast if config is invalid
 */
function validateConfig() {
    const errors = [];
    // Required for all deployments
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        errors.push('NEXT_PUBLIC_SUPABASE_URL is required');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        errors.push('SUPABASE_SERVICE_ROLE_KEY is required');
    }
    // Required for background workers
    if (!process.env.REDIS_URL) {
        errors.push('REDIS_URL is required for queue workers');
    }
    // Call provider configuration
    const callProvider = process.env.CALL_PROVIDER || 'callkaro';
    if (callProvider === 'callkaro') {
        if (!process.env.CALLKARO_API_KEY) {
            errors.push('CALLKARO_API_KEY is required when using CallKaro');
        }
    }
    else if (callProvider === 'vapi') {
        if (!process.env.VAPI_API_KEY) {
            errors.push('VAPI_API_KEY is required when using Vapi');
        }
    }
    // Payment provider configuration (only for hosted)
    if (exports.config.features.payments) {
        if (!process.env.DODOPAYMENTS_SECRET_KEY) {
            errors.push('DODOPAYMENTS_SECRET_KEY is required when payments are enabled');
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
