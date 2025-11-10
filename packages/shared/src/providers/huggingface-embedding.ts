/**
 * HuggingFace Embedding Provider
 *
 * Uses HuggingFace Inference API for generating embeddings.
 * Supports any embedding model hosted on HuggingFace (e.g., sentence-transformers/all-MiniLM-L6-v2)
 */

import type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  BatchEmbeddingRequest,
  BatchEmbeddingResponse,
} from './embedding-provider';

export interface HuggingFaceEmbeddingConfig {
  apiKey: string;
  model?: string;  // Default: sentence-transformers/all-MiniLM-L6-v2
  dimensions?: number;  // Must match the model's output dimensions
}

// Model dimension mappings
const MODEL_DIMENSIONS: Record<string, number> = {
  'sentence-transformers/all-MiniLM-L6-v2': 384,
  'sentence-transformers/all-mpnet-base-v2': 768,
  'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2': 384,
  'BAAI/bge-small-en-v1.5': 384,
  'BAAI/bge-base-en-v1.5': 768,
  'BAAI/bge-large-en-v1.5': 1024,
};

export class HuggingFaceEmbeddingProvider implements EmbeddingProvider {
  private client: any;
  private model: string;
  private dims: number;
  private config: HuggingFaceEmbeddingConfig;
  private initialized = false;

  readonly name = 'huggingface';
  readonly supportsBatching = true;
  readonly maxTokens = 512;  // Typical for sentence transformers

  constructor(config: HuggingFaceEmbeddingConfig) {
    this.config = config;
    this.model = config.model || 'sentence-transformers/all-MiniLM-L6-v2';
    this.dims = config.dimensions || MODEL_DIMENSIONS[this.model] || 384;
  }

  private async initialize() {
    if (this.initialized) return;

    try {
      const { HfInference } = await import('@huggingface/inference');
      this.client = new HfInference(this.config.apiKey);
      this.initialized = true;
    } catch (error) {
      throw new Error('@huggingface/inference not installed. Run: npm install @huggingface/inference');
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
      const result = await this.client.featureExtraction({
        model: this.model,
        inputs: request.text,
      });

      // HuggingFace returns various types - normalize to number[]
      let embedding: number[];

      if (Array.isArray(result)) {
        // If it's an array, check if it's nested
        if (Array.isArray(result[0])) {
          // Take the first embedding if it's a batch
          embedding = result[0] as number[];
        } else {
          embedding = result as number[];
        }
      } else if (ArrayBuffer.isView(result)) {
        // Handle typed arrays (Float32Array, Float64Array, etc.)
        embedding = Array.from(result as any);
      } else if (typeof result === 'number') {
        embedding = [result];
      } else {
        throw new Error('Unexpected result type from HuggingFace API');
      }

      return {
        embedding,
        model: this.model,
        dims: this.dims,
        metadata: request.metadata,
      };
    } catch (error) {
      console.error('[HuggingFace Embedding] Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async embedBatch(request: BatchEmbeddingRequest): Promise<BatchEmbeddingResponse> {
    try {
      // Process texts in parallel with rate limiting
      // HuggingFace Inference API has rate limits, so we batch carefully
      const batchSize = 10;  // Conservative batch size
      const embeddings: number[][] = [];

      for (let i = 0; i < request.texts.length; i += batchSize) {
        const batch = request.texts.slice(i, i + batchSize);

        // Process batch in parallel
        const batchResults: number[][] = await Promise.all(
          batch.map(async (text): Promise<number[]> => {
            const result = await this.client.featureExtraction({
              model: this.model,
              inputs: text,
            });

            // Normalize result to number[]
            if (Array.isArray(result)) {
              if (Array.isArray(result[0])) {
                return result[0] as number[];
              }
              return result as number[];
            } else if (ArrayBuffer.isView(result)) {
              return Array.from(result as any);
            } else if (typeof result === 'number') {
              return [result];
            }
            throw new Error('Unexpected result type from HuggingFace API');
          })
        );

        embeddings.push(...batchResults);

        // Small delay between batches to respect rate limits
        if (i + batchSize < request.texts.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return {
        embeddings,
        model: this.model,
        dims: this.dims,
        metadata: {
          ...request.metadata,
          batches: Math.ceil(request.texts.length / batchSize),
        },
      };
    } catch (error) {
      console.error('[HuggingFace Embedding] Error generating batch embeddings:', error);
      throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
