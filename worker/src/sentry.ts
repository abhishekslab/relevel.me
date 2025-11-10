import { initSentry as initSharedSentry } from '@relevel-me/shared';

/**
 * Initialize Sentry for the worker process
 */
export function initSentry() {
  initSharedSentry({
    // Worker-specific options
    serverName: 'relevel-worker',
  });
}
