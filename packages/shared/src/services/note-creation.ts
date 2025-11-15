/**
 * Note Creation Service
 *
 * Handles automatic note creation from chat and call transcripts
 */

interface NoteCreationIntent {
  shouldCreateNote: boolean;
  suggestedTitle?: string;
  suggestedBody?: string;
  extractedTags?: string[];
}

/**
 * Patterns that indicate user wants to create a note
 */
const NOTE_CREATION_PATTERNS = [
  /create\s+(?:a\s+)?note\s+(?:about|on|for)\s+(.+)/i,
  /make\s+(?:a\s+)?note\s+(?:about|of)\s+(.+)/i,
  /save\s+(?:this|that)\s+(?:as\s+)?(?:a\s+)?note/i,
  /write\s+(?:down|this)\s+(?:in\s+)?(?:a\s+)?note/i,
  /(?:can you|please)\s+(?:create|make)\s+(?:a\s+)?note/i,
  /take\s+(?:a\s+)?note\s+(?:about|on)\s+(.+)/i,
  /remember\s+(?:this|that)\s*:?\s*(.+)/i,
];

/**
 * Detect if a chat message indicates the user wants to create a note
 */
export function detectNoteCreationIntent(message: string): NoteCreationIntent {
  const lowerMessage = message.toLowerCase().trim();

  // Check for explicit note creation patterns
  for (const pattern of NOTE_CREATION_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      // Extract content after the command
      const content = match[1]?.trim() || message;

      return {
        shouldCreateNote: true,
        suggestedTitle: extractTitle(content),
        suggestedBody: content,
        extractedTags: extractHashtags(content),
      };
    }
  }

  return { shouldCreateNote: false };
}

/**
 * Extract a title from content (first sentence or up to 80 chars)
 */
function extractTitle(content: string): string {
  // Try to get first sentence
  const firstSentence = content.split(/[.!?]/)[0]?.trim();

  if (firstSentence && firstSentence.length <= 80) {
    return firstSentence;
  }

  // Fallback to first 80 characters
  if (content.length <= 80) {
    return content;
  }

  return content.substring(0, 77) + '...';
}

/**
 * Extract #hashtags from text
 */
function extractHashtags(text: string): string[] {
  const hashtagRegex = /#([a-zA-Z0-9_-]+)/g;
  const matches = text.matchAll(hashtagRegex);
  const tags = Array.from(matches, m => m[1].toLowerCase());
  return Array.from(new Set(tags)); // Deduplicate
}

/**
 * Create a note from a call transcript using AI summarization
 */
export async function createNoteFromCallTranscript(
  transcript: string,
  callId: string,
  supabase: any,
  userId: string,
  llmProvider?: any
): Promise<{ noteId: string; title: string } | null> {
  try {
    // If LLM provider is available, use it to extract key topics
    let title = 'Call Notes';
    let body = transcript;
    let tags: string[] = [];

    if (llmProvider) {
      // Use LLM to generate a structured note
      const prompt = `Analyze this call transcript and extract:
1. A concise title (max 80 chars)
2. Key topics/insights as bullet points
3. Relevant hashtags (max 5)

Transcript:
${transcript.substring(0, 2000)} ${transcript.length > 2000 ? '...' : ''}

Respond in this exact format:
TITLE: <title here>
TOPICS:
- <topic 1>
- <topic 2>
...
TAGS: #tag1 #tag2 ...`;

      const response = await llmProvider.generateText(prompt);

      // Parse the response
      const titleMatch = response.match(/TITLE:\s*(.+)/i);
      const topicsMatch = response.match(/TOPICS:([\s\S]+?)(?=TAGS:|$)/i);
      const tagsMatch = response.match(/TAGS:\s*(.+)/i);

      if (titleMatch) title = titleMatch[1].trim();
      if (topicsMatch) {
        const topics = topicsMatch[1]
          .split('\n')
          .filter((line: string) => line.trim().startsWith('-'))
          .map((line: string) => line.trim());
        body = topics.join('\n');
      }
      if (tagsMatch) {
        tags = extractHashtags(tagsMatch[1]);
      }
    }

    // Create the note
    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        user_id: userId,
        title,
        body,
        tags,
        created_from: 'call',
        source_id: callId,
      })
      .select('id, title')
      .single();

    if (error) {
      console.error('Failed to create note from call:', error);
      return null;
    }

    return { noteId: note.id, title: note.title };
  } catch (error) {
    console.error('Error creating note from call:', error);
    return null;
  }
}

/**
 * Create a note from a chat conversation
 */
export async function createNoteFromChat(
  intent: NoteCreationIntent,
  conversationId: string,
  supabase: any,
  userId: string
): Promise<{ noteId: string; title: string } | null> {
  if (!intent.shouldCreateNote) return null;

  try {
    const { data: note, error } = await supabase
      .from('notes')
      .insert({
        user_id: userId,
        title: intent.suggestedTitle || 'Untitled Note',
        body: intent.suggestedBody || '',
        tags: intent.extractedTags || [],
        created_from: 'chat',
        source_id: conversationId,
      })
      .select('id, title')
      .single();

    if (error) {
      console.error('Failed to create note from chat:', error);
      return null;
    }

    return { noteId: note.id, title: note.title };
  } catch (error) {
    console.error('Error creating note from chat:', error);
    return null;
  }
}

/**
 * System message to inform AI assistant about note creation capability
 */
export const NOTE_CREATION_SYSTEM_MESSAGE = `You can help users create notes in their knowledge graph. When a user asks you to create a note, remember something, or save information, respond naturally and confirm that you've created the note for them.

Examples:
- User: "Create a note about TypeScript best practices"
- Assistant: "I've created a note about TypeScript best practices for you. You can find it in your knowledge graph and add more details later."

- User: "Remember that I need to follow up with John next week"
- Assistant: "Noted! I've saved a reminder about following up with John next week. You'll be able to see it in your notes."

Always be helpful and confirm when notes are created.`;
