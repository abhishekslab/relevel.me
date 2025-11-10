/**
 * Chat service - handles LLM chat interactions with the avatar
 * Used by API routes to manage conversations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getLLMProvider } from '../providers/llm-factory';
import { ChatMessage } from '../providers/llm-provider';
import { createChildLogger } from '../logger';
import { captureException } from '../sentry';

const logger = createChildLogger({ service: 'ChatService' });

export interface SendChatMessageParams {
  supabase: SupabaseClient; // Pass authenticated client from API route
  userId: string;
  conversationId?: string; // If not provided, creates a new conversation
  userMessage: string;
  includeMemoryContext?: boolean; // Whether to include user's memories as context
}

export interface SendChatMessageResult {
  success: boolean;
  conversationId?: string;
  assistantMessage?: string;
  error?: string;
}

/**
 * Get the avatar's system prompt
 * This defines the avatar's personality and behavior
 */
function getAvatarSystemPrompt(userName?: string): string {
  const name = userName || 'friend';

  return `You are a helpful, reflective AI companion and second brain assistant. You help ${name} capture, organize, and reflect on their thoughts, memories, and goals.

Your personality:
- Warm, encouraging, and thoughtful
- You speak concisely and naturally (2-3 sentences max)
- You ask clarifying questions to understand better
- You surface connections between ideas
- You help the user reflect on patterns and insights

Your purpose:
- Help capture thoughts through conversation
- Connect ideas across time
- Surface forgotten goals and patterns
- Provide gentle accountability
- Celebrate progress

Keep responses brief and conversational - you're speaking, not writing an essay.`;
}

/**
 * Get recent conversation history
 */
async function getConversationHistory(
  supabase: SupabaseClient,
  conversationId: string,
  limit: number = 20
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    logger.error({ error, conversationId }, 'Failed to fetch conversation history');
    throw error;
  }

  return (data || []) as ChatMessage[];
}

/**
 * Get user's recent memories for context
 * This helps the avatar reference past thoughts
 */
async function getUserMemoryContext(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 5
): Promise<string> {

  const { data, error } = await supabase
    .from('messages')
    .select('content')
    .eq('user_id', userId)
    .not('content', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.warn({ error, userId }, 'Failed to fetch user memories');
    return '';
  }

  if (!data || data.length === 0) {
    return '';
  }

  const memories = data.map(m => m.content).join('\n\n');
  return `\n\nRecent thoughts from ${userId}:\n${memories}`;
}

/**
 * Create a new conversation
 */
async function createConversation(supabase: SupabaseClient, userId: string): Promise<string> {

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      title: 'Chat ' + new Date().toLocaleDateString(),
    })
    .select('id')
    .single();

  if (error) {
    logger.error({ error, userId }, 'Failed to create conversation');
    throw error;
  }

  logger.info({ conversationId: data.id, userId }, 'Created new conversation');
  return data.id;
}

/**
 * Save a chat message to the database
 */
async function saveChatMessage(
  supabase: SupabaseClient,
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<void> {

  const { error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      role,
      content,
    });

  if (error) {
    logger.error({ error, conversationId, role }, 'Failed to save chat message');
    throw error;
  }
}

/**
 * Send a chat message and get the avatar's response
 */
export async function sendChatMessage(
  params: SendChatMessageParams
): Promise<SendChatMessageResult> {
  const { supabase, userId, conversationId: existingConversationId, userMessage, includeMemoryContext } = params;

  try {
    logger.info({ userId, hasConversationId: !!existingConversationId }, 'Processing chat message');

    // Create or use existing conversation
    let conversationId = existingConversationId;
    if (!conversationId) {
      conversationId = await createConversation(supabase, userId);
    }

    // Save user message
    await saveChatMessage(supabase, conversationId, 'user', userMessage);

    // Build message history for LLM
    const history = await getConversationHistory(supabase, conversationId);

    // Get user profile for personalization
    const { data: profile } = await supabase
      .from('users')
      .select('name')
      .eq('id', userId)
      .single();

    // Build system prompt with optional memory context
    let systemPrompt = getAvatarSystemPrompt(profile?.name);
    if (includeMemoryContext) {
      const memoryContext = await getUserMemoryContext(supabase, userId);
      systemPrompt += memoryContext;
    }

    // Prepare messages for LLM
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history,
    ];

    // Get LLM response
    const provider = getLLMProvider();
    logger.debug({ provider: provider.name, messageCount: messages.length }, 'Calling LLM provider');

    const response = await provider.chat({
      messages,
      temperature: 0.7,
      maxTokens: 200, // Keep responses concise for speech
    });

    if (!response.success || !response.content) {
      logger.error({ error: response.error }, 'LLM provider returned error');
      return {
        success: false,
        error: response.error || 'Failed to get response from LLM',
      };
    }

    // Save assistant response
    await saveChatMessage(supabase, conversationId, 'assistant', response.content);

    logger.info(
      {
        conversationId,
        responseLength: response.content.length,
        usage: response.usage,
      },
      'Chat message processed successfully'
    );

    return {
      success: true,
      conversationId,
      assistantMessage: response.content,
    };
  } catch (error) {
    logger.error({ error, userId }, 'Failed to process chat message');
    captureException(error as Error, {
      tags: { component: 'chat_service', user_id: userId },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ error, userId }, 'Failed to fetch user conversations');
    throw error;
  }

  return data || [];
}

/**
 * Get messages for a specific conversation
 */
export async function getConversationMessages(supabase: SupabaseClient, conversationId: string) {
  return getConversationHistory(supabase, conversationId, 100);
}
