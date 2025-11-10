import { CallProvider } from './call-provider';
import { CallKaroProvider } from './implementations/callkaro-provider';
import { VapiProvider } from './implementations/vapi-provider';
import { createChildLogger } from '../logger';
import { captureException } from '../sentry';

const logger = createChildLogger({ service: 'CallProviderFactory' });

/**
 * Get the configured call provider instance
 *
 * The provider is determined by the CALL_PROVIDER environment variable.
 * Supported values: 'callkaro', 'vapi'
 * Default: 'callkaro'
 */
export function getCallProvider(): CallProvider {
  const provider = (process.env.CALL_PROVIDER || 'callkaro').toLowerCase();

  logger.debug({ provider }, 'Getting call provider instance');

  switch (provider) {
    case 'callkaro':
      return new CallKaroProvider();

    case 'vapi':
      return new VapiProvider();

    default:
      // LOGGING FIX: Use error instead of warn for invalid provider
      logger.error({ provider, fallback: 'callkaro' }, `Unknown call provider "${provider}", falling back to CallKaro`);
      captureException(new Error(`Unknown call provider: ${provider}`), {
        tags: { component: 'provider_factory', provider }
      });
      return new CallKaroProvider();
  }
}

/**
 * Validate that required environment variables are set for the configured provider
 */
export function validateCallProviderConfig(): { valid: boolean; errors: string[] } {
  const provider = (process.env.CALL_PROVIDER || 'callkaro').toLowerCase();
  const errors: string[] = [];

  switch (provider) {
    case 'callkaro':
      if (!process.env.CALLKARO_API_KEY) {
        errors.push('CALLKARO_API_KEY is required when using CallKaro provider');
      }
      if (!process.env.CALLKARO_AGENT_ID) {
        errors.push('CALLKARO_AGENT_ID is required when using CallKaro provider');
      }
      break;

    case 'vapi':
      if (!process.env.VAPI_API_KEY) {
        errors.push('VAPI_API_KEY is required when using Vapi provider');
      }
      if (!process.env.VAPI_ASSISTANT_ID) {
        errors.push('VAPI_ASSISTANT_ID is required when using Vapi provider');
      }
      break;

    default:
      errors.push(`Unknown call provider: ${provider}. Supported: callkaro, vapi`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
