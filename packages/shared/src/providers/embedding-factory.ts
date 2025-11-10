/**
 * Embedding Provider Factory
 *
 * Factory pattern for creating embedding provider instances based on environment configuration.
 * Supports: OpenAI, HuggingFace, and local (Xenova) providers.
 * Uses dynamic imports to avoid loading unnecessary dependencies.
 */

import type { EmbeddingProvider } from './embedding-provider';

/**
 * Get the configured embedding provider instance
 *
 * The provider is determined by the EMBEDDING_PROVIDER environment variable.
 * Supported values: 'openai', 'huggingface', 'local'
 * Default: 'local' (no API costs, works offline)
 */
export async function getEmbeddingProvider(): Promise<EmbeddingProvider> {
  const provider = (process.env.EMBEDDING_PROVIDER || 'local').toLowerCase();

  switch (provider) {
    case 'openai':
      if (!process.env.OPENAI_API_KEY) {
        console.warn(
          '[EmbeddingProviderFactory] OPENAI_API_KEY not set, falling back to local provider'
        );
        const { LocalEmbeddingProvider } = await import('./local-embedding');
        return new LocalEmbeddingProvider();
      }

      const { OpenAIEmbeddingProvider } = await import('./openai-embedding');
      return new OpenAIEmbeddingProvider({
        apiKey: process.env.OPENAI_API_KEY,
        model: (process.env.OPENAI_EMBEDDING_MODEL as any) || 'text-embedding-3-small',
        dimensions: process.env.OPENAI_EMBEDDING_DIMS
          ? parseInt(process.env.OPENAI_EMBEDDING_DIMS, 10)
          : undefined,
      });

    case 'huggingface':
      if (!process.env.HUGGINGFACE_API_KEY) {
        console.warn(
          '[EmbeddingProviderFactory] HUGGINGFACE_API_KEY not set, falling back to local provider'
        );
        const { LocalEmbeddingProvider } = await import('./local-embedding');
        return new LocalEmbeddingProvider();
      }

      const { HuggingFaceEmbeddingProvider } = await import('./huggingface-embedding');
      return new HuggingFaceEmbeddingProvider({
        apiKey: process.env.HUGGINGFACE_API_KEY,
        model: process.env.HUGGINGFACE_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
        dimensions: process.env.HUGGINGFACE_EMBEDDING_DIMS
          ? parseInt(process.env.HUGGINGFACE_EMBEDDING_DIMS, 10)
          : undefined,
      });

    case 'local':
      const { LocalEmbeddingProvider: LocalProvider } = await import('./local-embedding');
      return new LocalProvider({
        model: process.env.LOCAL_EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2',
        dimensions: process.env.LOCAL_EMBEDDING_DIMS
          ? parseInt(process.env.LOCAL_EMBEDDING_DIMS, 10)
          : undefined,
        cacheDir: process.env.LOCAL_EMBEDDING_CACHE_DIR,
      });

    default:
      console.warn(
        `[EmbeddingProviderFactory] Unknown embedding provider "${provider}", falling back to local`
      );
      const { LocalEmbeddingProvider: DefaultProvider } = await import('./local-embedding');
      return new DefaultProvider();
  }
}

/**
 * Validate that required environment variables are set for the configured provider
 */
export function validateEmbeddingProviderConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
  const provider = (process.env.EMBEDDING_PROVIDER || 'local').toLowerCase();
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (provider) {
    case 'openai':
      if (!process.env.OPENAI_API_KEY) {
        errors.push('OPENAI_API_KEY is required when using OpenAI provider');
      }
      if (process.env.OPENAI_EMBEDDING_DIMS) {
        const dims = parseInt(process.env.OPENAI_EMBEDDING_DIMS, 10);
        if (isNaN(dims) || dims < 1) {
          warnings.push('OPENAI_EMBEDDING_DIMS should be a positive integer');
        }
      }
      break;

    case 'huggingface':
      if (!process.env.HUGGINGFACE_API_KEY) {
        errors.push('HUGGINGFACE_API_KEY is required when using HuggingFace provider');
      }
      if (process.env.HUGGINGFACE_EMBEDDING_DIMS) {
        const dims = parseInt(process.env.HUGGINGFACE_EMBEDDING_DIMS, 10);
        if (isNaN(dims) || dims < 1) {
          warnings.push('HUGGINGFACE_EMBEDDING_DIMS should be a positive integer');
        }
      }
      break;

    case 'local':
      // Local provider requires no API keys - just optional config
      if (process.env.LOCAL_EMBEDDING_DIMS) {
        const dims = parseInt(process.env.LOCAL_EMBEDDING_DIMS, 10);
        if (isNaN(dims) || dims < 1) {
          warnings.push('LOCAL_EMBEDDING_DIMS should be a positive integer');
        }
      }
      break;

    default:
      errors.push(`Unknown embedding provider: ${provider}. Supported: openai, huggingface, local`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get provider info for debugging/logging
 */
export async function getEmbeddingProviderInfo(): Promise<{
  provider: string;
  model: string;
  dimensions: number;
  supportsBatching: boolean;
}> {
  const embeddingProvider = await getEmbeddingProvider();
  return {
    provider: embeddingProvider.name,
    model: embeddingProvider.modelName,
    dimensions: embeddingProvider.dimensions,
    supportsBatching: embeddingProvider.supportsBatching,
  };
}
