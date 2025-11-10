/**
 * LLM Provider Interface
 *
 * This interface defines a standard contract for Large Language Model providers,
 * allowing the application to swap between different services (Ollama, OpenRouter, OpenAI, etc.)
 * without changing business logic.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface ChatResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface LLMProvider {
  /**
   * Send a chat completion request
   */
  chat(request: ChatRequest): Promise<ChatResponse>;

  /**
   * Provider metadata
   */
  readonly name: string;
  readonly supportsStreaming: boolean;
}
