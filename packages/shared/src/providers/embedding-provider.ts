/**
 * Embedding Provider Interface
 *
 * This interface defines a standard contract for embedding providers,
 * allowing the application to swap between different services (OpenAI, HuggingFace, local models)
 * without changing business logic.
 */

export interface EmbeddingRequest {
  text: string;
  metadata?: Record<string, any>;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dims: number;
  metadata?: Record<string, any>;
}

export interface BatchEmbeddingRequest {
  texts: string[];
  metadata?: Record<string, any>;
}

export interface BatchEmbeddingResponse {
  embeddings: number[][];
  model: string;
  dims: number;
  metadata?: Record<string, any>;
}

export interface EmbeddingProvider {
  /**
   * Generate embedding for a single text input
   */
  embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;

  /**
   * Generate embeddings for multiple text inputs (batch processing)
   * Optional: Some providers may not support batching
   */
  embedBatch?(request: BatchEmbeddingRequest): Promise<BatchEmbeddingResponse>;

  /**
   * Provider metadata
   */
  readonly name: string;
  readonly modelName: string;
  readonly dimensions: number;
  readonly maxTokens?: number;  // Maximum tokens per input
  readonly supportsBatching: boolean;
}
