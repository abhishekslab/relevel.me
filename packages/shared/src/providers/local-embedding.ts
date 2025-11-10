/**
 * Local Embedding Provider
 *
 * Uses Xenova Transformers.js to run embedding models locally in Node.js.
 * No external API calls required - models are downloaded and cached locally.
 * Supports: Xenova/all-MiniLM-L6-v2, Xenova/paraphrase-multilingual-MiniLM-L12-v2, etc.
 */

import { pipeline, env, type FeatureExtractionPipeline } from '@xenova/transformers';
import type {
  EmbeddingProvider,
  EmbeddingRequest,
  EmbeddingResponse,
  BatchEmbeddingRequest,
  BatchEmbeddingResponse,
} from './embedding-provider';

export interface LocalEmbeddingConfig {
  model?: string;  // Default: Xenova/all-MiniLM-L6-v2
  dimensions?: number;  // Must match the model's output dimensions
  cacheDir?: string;  // Optional: custom cache directory for models
}

// Model dimension mappings
const MODEL_DIMENSIONS: Record<string, number> = {
  'Xenova/all-MiniLM-L6-v2': 384,
  'Xenova/all-mpnet-base-v2': 768,
  'Xenova/paraphrase-multilingual-MiniLM-L12-v2': 384,
  'Xenova/bge-small-en-v1.5': 384,
  'Xenova/bge-base-en-v1.5': 768,
};

export class LocalEmbeddingProvider implements EmbeddingProvider {
  private model: string;
  private dims: number;
  private pipeline: FeatureExtractionPipeline | null = null;
  private initPromise: Promise<void> | null = null;

  readonly name = 'local';
  readonly supportsBatching = true;
  readonly maxTokens = 512;  // Typical for sentence transformers

  constructor(config: LocalEmbeddingConfig = {}) {
    this.model = config.model || 'Xenova/all-MiniLM-L6-v2';
    this.dims = config.dimensions || MODEL_DIMENSIONS[this.model] || 384;

    // Configure cache directory if provided
    if (config.cacheDir) {
      env.cacheDir = config.cacheDir;
    }

    // Disable local model loading for serverless environments
    // Models will be downloaded from HuggingFace Hub on first use
    env.allowLocalModels = false;
  }

  get modelName(): string {
    return this.model;
  }

  get dimensions(): number {
    return this.dims;
  }

  /**
   * Initialize the embedding pipeline (lazy loaded)
   */
  private async initialize(): Promise<void> {
    if (this.pipeline) return;

    if (!this.initPromise) {
      this.initPromise = (async () => {
        console.log(`[Local Embedding] Loading model: ${this.model}...`);
        this.pipeline = await pipeline('feature-extraction', this.model);
        console.log(`[Local Embedding] Model loaded: ${this.model}`);
      })();
    }

    await this.initPromise;
  }

  /**
   * Mean pooling to get sentence embeddings
   */
  private meanPooling(output: any, attentionMask: any): number[] {
    // Extract token embeddings
    const tokenEmbeddings = output.tolist()[0];
    const maskExpanded = attentionMask.tolist()[0];

    // Perform mean pooling
    const sumEmbeddings = new Array(tokenEmbeddings[0].length).fill(0);
    let sumMask = 0;

    for (let i = 0; i < tokenEmbeddings.length; i++) {
      if (maskExpanded[i] === 1) {
        for (let j = 0; j < tokenEmbeddings[i].length; j++) {
          sumEmbeddings[j] += tokenEmbeddings[i][j];
        }
        sumMask += 1;
      }
    }

    // Normalize
    const embedding = sumEmbeddings.map((val) => val / sumMask);
    return embedding;
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    try {
      await this.initialize();

      if (!this.pipeline) {
        throw new Error('Pipeline not initialized');
      }

      // Generate embeddings
      const result = await this.pipeline(request.text, {
        pooling: 'mean',
        normalize: true,
      });

      // Extract embedding from result
      let embedding: number[];

      if (result && typeof result === 'object' && 'data' in result) {
        // Result is a Tensor, convert to array
        embedding = Array.from(result.data as Float32Array);
      } else if (Array.isArray(result)) {
        embedding = result;
      } else {
        throw new Error('Unexpected pipeline output format');
      }

      return {
        embedding,
        model: this.model,
        dims: this.dims,
        metadata: request.metadata,
      };
    } catch (error) {
      console.error('[Local Embedding] Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async embedBatch(request: BatchEmbeddingRequest): Promise<BatchEmbeddingResponse> {
    try {
      await this.initialize();

      if (!this.pipeline) {
        throw new Error('Pipeline not initialized');
      }

      // Xenova transformers support batch processing
      const embeddings: number[][] = [];

      // Process in smaller batches to avoid memory issues
      const batchSize = 32;

      for (let i = 0; i < request.texts.length; i += batchSize) {
        const batch = request.texts.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map(async (text) => {
            const result = await this.pipeline!(text, {
              pooling: 'mean',
              normalize: true,
            });

            if (result && typeof result === 'object' && 'data' in result) {
              return Array.from(result.data as Float32Array);
            } else if (Array.isArray(result)) {
              return result;
            } else {
              throw new Error('Unexpected pipeline output format');
            }
          })
        );

        embeddings.push(...batchResults);
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
      console.error('[Local Embedding] Error generating batch embeddings:', error);
      throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
