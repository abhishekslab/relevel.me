/**
 * @relevel-me/shared
 * Shared utilities and services for relevel.me
 */

// Configuration
export * from './config';

// Call providers
export * from './providers/call-provider';
export * from './providers/factory';

// Embedding providers
// Only export the interface and factory - providers are lazy-loaded
export * from './providers/embedding-provider';
export * from './providers/embedding-factory';

// Services
export * from './services/call-service';

// Queue types and client
export * from './queue/types';
export * from './queue/client';
