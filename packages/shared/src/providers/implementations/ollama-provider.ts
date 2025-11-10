import { LLMProvider, ChatRequest, ChatResponse } from '../llm-provider';
import { createChildLogger } from '../../logger';
import { captureException } from '../../sentry';

const logger = createChildLogger({ service: 'OllamaProvider' });

/**
 * Ollama LLM Provider
 *
 * Connects to a local Ollama server for LLM inference.
 * Requires Ollama to be running locally (default: http://localhost:11434)
 */
export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  readonly supportsStreaming = true;

  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.defaultModel = process.env.OLLAMA_MODEL || 'llama2';

    logger.debug({ baseUrl: this.baseUrl, model: this.defaultModel }, 'Initialized Ollama provider');
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const model = request.model || this.defaultModel;

    try {
      logger.debug({ model, messageCount: request.messages.length }, 'Sending chat request to Ollama');

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          stream: false, // For now, we'll use non-streaming
          options: {
            temperature: request.temperature ?? 0.7,
            num_predict: request.maxTokens ?? 500,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, error: errorText }, 'Ollama API error');

        return {
          success: false,
          error: `Ollama API error: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json() as any;

      logger.debug({ hasContent: !!data.message?.content }, 'Received response from Ollama');

      return {
        success: true,
        content: data.message?.content || '',
        usage: {
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count,
          totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
      };
    } catch (error) {
      logger.error({ error, model }, 'Failed to connect to Ollama');
      captureException(error as Error, {
        tags: { component: 'ollama_provider', model },
      });

      return {
        success: false,
        error: `Failed to connect to Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
