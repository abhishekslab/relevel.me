/**
 * OpenAI Embedding Provider
 *
 * Uses OpenAI's text-embedding models for generating embeddings.
 * Supports: text-embedding-3-small (1536 dims), text-embedding-3-large (3072 dims)
 */

import type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  BatchEmbeddingRequest,
  BatchEmbeddingResponse,
} from './embedding-provider';

// Lazy import to avoid loading OpenAI SDK unless actually used
type OpenAI = any;

export interface OpenAIEmbeddingConfig {
  apiKey: string;
  model?: 'text-embedding-3-small' | 'text-embedding-3-large' | 'text-embedding-ada-002';
  dimensions?: number;  // Optional: reduce dimensions for smaller storage
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: any;
  private model: string;
  private dims: number;
  private config: OpenAIEmbeddingConfig;
  private initialized = false;

  readonly name = 'openai';
  readonly supportsBatching = true;
  readonly maxTokens = 8191;  // Max tokens for text-embedding-3-small/large

  constructor(config: OpenAIEmbeddingConfig) {
    this.config = config;
    this.model = config.model || 'text-embedding-3-small';

    // Default dimensions based on model
    const defaultDims: Record<string, number> = {
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
      'text-embedding-ada-002': 1536,
    };

    this.dims = config.dimensions || defaultDims[this.model] || 1536;
  }

  private async initialize() {
    if (this.initialized) return;

    try {
      const { default: OpenAI } = await import('openai');
      this.client = new OpenAI({
        apiKey: this.config.apiKey,
      });
      this.initialized = true;
    } catch (error) {
      throw new Error('OpenAI SDK not installed. Run: npm install openai');
    }
  }

  get modelName(): string {
    return this.model;
  }

  get dimensions(): number {
    return this.dims;
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    await this.initialize();

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: request.text,
        dimensions: this.dims,
      });

      return {
        embedding: response.data[0].embedding,
        model: this.model,
        dims: this.dims,
        metadata: {
          ...request.metadata,
          usage: response.usage,
        },
      };
    } catch (error) {
      console.error('[OpenAI Embedding] Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async embedBatch(request: BatchEmbeddingRequest): Promise<BatchEmbeddingResponse> {
    await this.initialize();

    try {
      // OpenAI supports up to 2048 inputs in a single batch
      const maxBatchSize = 2048;

      if (request.texts.length > maxBatchSize) {
        // Process in chunks
        const chunks: string[][] = [];
        for (let i = 0; i < request.texts.length; i += maxBatchSize) {
          chunks.push(request.texts.slice(i, i + maxBatchSize));
        }

        const allEmbeddings: number[][] = [];
        let totalUsage = { prompt_tokens: 0, total_tokens: 0 };

        for (const chunk of chunks) {
          const response = await this.client.embeddings.create({
            model: this.model,
            input: chunk,
            dimensions: this.dims,
          });

          allEmbeddings.push(...response.data.map((d: any) => d.embedding));
          totalUsage.prompt_tokens += response.usage.prompt_tokens;
          totalUsage.total_tokens += response.usage.total_tokens;
        }

        return {
          embeddings: allEmbeddings,
          model: this.model,
          dims: this.dims,
          metadata: {
            ...request.metadata,
            usage: totalUsage,
            batches: chunks.length,
          },
        };
      } else {
        // Single batch
        const response = await this.client.embeddings.create({
          model: this.model,
          input: request.texts,
          dimensions: this.dims,
        });

        return {
          embeddings: response.data.map((d: any) => d.embedding),
          model: this.model,
          dims: this.dims,
          metadata: {
            ...request.metadata,
            usage: response.usage,
          },
        };
      }
    } catch (error) {
      console.error('[OpenAI Embedding] Error generating batch embeddings:', error);
      throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
