import { LLMProvider, ChatRequest, ChatResponse } from '../llm-provider';
import { createChildLogger } from '../../logger';
import { captureException } from '../../sentry';

const logger = createChildLogger({ service: 'OpenRouterProvider' });

/**
 * OpenRouter LLM Provider
 *
 * Connects to OpenRouter API for accessing multiple LLM providers
 * (Claude, GPT, Gemini, Llama, etc.) through a unified interface.
 */
export class OpenRouterProvider implements LLMProvider {
  readonly name = 'openrouter';
  readonly supportsStreaming = true;

  private apiKey: string;
  private defaultModel: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.defaultModel = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

    if (!this.apiKey) {
      logger.warn('OPENROUTER_API_KEY not set - OpenRouter provider will fail');
    }

    logger.debug({ model: this.defaultModel }, 'Initialized OpenRouter provider');
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.apiKey) {
      logger.error('OPENROUTER_API_KEY is required');
      return {
        success: false,
        error: 'OpenRouter API key is not configured. Please set OPENROUTER_API_KEY environment variable.',
      };
    }

    const model = request.model || this.defaultModel;

    try {
      logger.debug({ model, messageCount: request.messages.length }, 'Sending chat request to OpenRouter');

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://relevel.me', // Optional: for OpenRouter analytics
          'X-Title': 'Relevel.me', // Optional: for OpenRouter analytics
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 500,
          stream: false, // For now, we'll use non-streaming
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, error: errorText }, 'OpenRouter API error');

        return {
          success: false,
          error: `OpenRouter API error: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json() as any;

      const content = data.choices?.[0]?.message?.content || '';

      logger.debug({ hasContent: !!content, model }, 'Received response from OpenRouter');

      return {
        success: true,
        content,
        usage: {
          promptTokens: data.usage?.prompt_tokens,
          completionTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens,
        },
      };
    } catch (error) {
      logger.error({ error, model }, 'Failed to connect to OpenRouter');
      captureException(error as Error, {
        tags: { component: 'openrouter_provider', model },
      });

      return {
        success: false,
        error: `Failed to connect to OpenRouter: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
