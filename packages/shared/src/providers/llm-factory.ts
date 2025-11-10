import { LLMProvider } from './llm-provider';
import { OllamaProvider } from './implementations/ollama-provider';
import { OpenRouterProvider } from './implementations/openrouter-provider';
import { createChildLogger } from '../logger';
import { captureException } from '../sentry';

const logger = createChildLogger({ service: 'LLMProviderFactory' });

/**
 * Get the configured LLM provider instance
 *
 * The provider is determined by the LLM_PROVIDER environment variable.
 * Supported values: 'ollama', 'openrouter', 'auto'
 * Default: 'auto' (tries Ollama, falls back to OpenRouter)
 */
export function getLLMProvider(): LLMProvider {
  const provider = (process.env.LLM_PROVIDER || 'auto').toLowerCase();

  logger.debug({ provider }, 'Getting LLM provider instance');

  switch (provider) {
    case 'ollama':
      return new OllamaProvider();

    case 'openrouter':
      return new OpenRouterProvider();

    case 'auto':
      // Smart fallback: Try Ollama first (dev), fall back to OpenRouter (production)
      if (process.env.OPENROUTER_API_KEY) {
        logger.info('Auto mode: Using OpenRouter (API key found)');
        return new OpenRouterProvider();
      } else {
        logger.info('Auto mode: Using Ollama (local inference)');
        return new OllamaProvider();
      }

    default:
      logger.error({ provider, fallback: 'auto' }, `Unknown LLM provider "${provider}", using auto mode`);
      captureException(new Error(`Unknown LLM provider: ${provider}`), {
        tags: { component: 'llm_provider_factory', provider },
      });
      // Fall back to auto mode
      if (process.env.OPENROUTER_API_KEY) {
        return new OpenRouterProvider();
      }
      return new OllamaProvider();
  }
}

/**
 * Validate that required environment variables are set for the configured provider
 */
export function validateLLMProviderConfig(): { valid: boolean; errors: string[] } {
  const provider = (process.env.LLM_PROVIDER || 'ollama').toLowerCase();
  const errors: string[] = [];

  switch (provider) {
    case 'ollama':
      // Ollama doesn't require API keys, but we should check if base URL is reachable
      // This is a soft validation - we'll just warn about missing config
      if (!process.env.OLLAMA_BASE_URL) {
        logger.debug('OLLAMA_BASE_URL not set, using default http://localhost:11434');
      }
      break;

    case 'openrouter':
      if (!process.env.OPENROUTER_API_KEY) {
        errors.push('OPENROUTER_API_KEY is required when using OpenRouter provider');
      }
      break;

    default:
      errors.push(`Unknown LLM provider: ${provider}. Supported: ollama, openrouter`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
