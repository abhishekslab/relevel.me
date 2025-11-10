# Avatar Chat with LLM Integration

## Overview

The avatar can now respond to your messages using AI! When you type a message, it goes to a local or cloud-based LLM, gets an intelligent response, and the avatar speaks it out loud with lip-sync animation.

## Features

✅ **Real-time Chat**: Message your avatar and get intelligent responses
✅ **Automatic Speech**: Avatar speaks responses with realistic lip-sync
✅ **Conversation Memory**: Chats are saved to database across sessions
✅ **Memory Context**: Avatar can reference your past thoughts and memories
✅ **Extensible LLM Support**: Easy to add new LLM providers (OpenAI, Anthropic, etc.)

## Architecture

```
User types message → ChatInterface
                  ↓
              /api/chat/send
                  ↓
            Chat Service (packages/shared)
                  ↓
         LLM Provider (Ollama/OpenRouter)
                  ↓
         AI Response Generated
                  ↓
    Saved to database + returned to UI
                  ↓
      Avatar speaks with TTS + lip-sync
```

## Setup Instructions

### Option 1: Local LLM with Ollama (Recommended for Development)

1. **Install Ollama**
   ```bash
   # macOS/Linux
   curl -fsSL https://ollama.ai/install.sh | sh

   # Or visit: https://ollama.ai
   ```

2. **Pull a Model**
   ```bash
   ollama pull llama2          # Fast, good quality
   # OR
   ollama pull mistral         # Better quality, slower
   # OR
   ollama pull mixtral:8x7b    # Best quality, requires more RAM
   ```

3. **Start Ollama Server**
   ```bash
   ollama serve
   # Runs on http://localhost:11434
   ```

4. **Configure Environment**
   ```bash
   # In your .env.local file
   LLM_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama2
   ```

### Option 2: Cloud LLMs with OpenRouter

1. **Get API Key**
   - Sign up at https://openrouter.ai
   - Get your API key from https://openrouter.ai/keys

2. **Configure Environment**
   ```bash
   # In your .env.local file
   LLM_PROVIDER=openrouter
   OPENROUTER_API_KEY=your-api-key-here
   OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

   # Available models:
   # - anthropic/claude-3.5-sonnet (best quality)
   # - openai/gpt-4-turbo
   # - openai/gpt-3.5-turbo (cheapest)
   # - meta-llama/llama-2-70b-chat
   # - google/gemini-pro
   ```

## Database Setup

Run the migration to create chat tables:

```bash
# If using Supabase CLI
supabase db push

# Or apply the SQL migration manually
# File: supabase/migrations/20251115_add_chat_tables.sql
```

The migration creates:
- `conversations` table - stores chat sessions
- `chat_messages` table - stores individual messages
- RLS policies for secure user data access

## File Structure

```
packages/shared/src/
├── providers/
│   ├── llm-provider.ts                    # LLM interface
│   ├── llm-factory.ts                     # Provider factory
│   └── implementations/
│       ├── ollama-provider.ts             # Ollama implementation
│       └── openrouter-provider.ts         # OpenRouter implementation
└── services/
    └── chat-service.ts                    # Chat logic & conversation management

web/app/
├── api/chat/send/route.ts                 # Chat API endpoint
└── dashboard/_components/
    └── ChatInterface.tsx                  # Chat UI component

supabase/migrations/
└── 20251115_add_chat_tables.sql          # Database schema
```

## Usage

### For Users

1. Start your dev server: `npm run dev`
2. Make sure Ollama is running (if using local LLM)
3. Go to the dashboard
4. Type a message in the chat interface at the bottom
5. Watch the avatar respond and speak!

### Adding New LLM Providers

To add support for OpenAI, Anthropic Claude, or other providers:

1. Create a new provider class:
```typescript
// packages/shared/src/providers/implementations/my-provider.ts
import { LLMProvider, ChatRequest, ChatResponse } from '../llm-provider'

export class MyProvider implements LLMProvider {
  readonly name = 'my-provider'
  readonly supportsStreaming = false

  async chat(request: ChatRequest): Promise<ChatResponse> {
    // Implement API call to your LLM service
    // Return ChatResponse with content
  }
}
```

2. Register in factory:
```typescript
// packages/shared/src/providers/llm-factory.ts
import { MyProvider } from './implementations/my-provider'

export function getLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER

  switch (provider) {
    case 'my-provider':
      return new MyProvider()
    // ... other cases
  }
}
```

3. Add environment variables:
```bash
LLM_PROVIDER=my-provider
MY_PROVIDER_API_KEY=...
```

## Customization

### Avatar Personality

Edit the system prompt in `packages/shared/src/services/chat-service.ts`:

```typescript
function getAvatarSystemPrompt(userName?: string): string {
  return `You are a helpful AI companion...`  // Customize here!
}
```

### Response Length

Adjust `maxTokens` in the chat service:

```typescript
const response = await provider.chat({
  messages,
  temperature: 0.7,
  maxTokens: 200,  // Increase for longer responses
})
```

### Memory Context

Toggle whether the avatar uses your past memories for context:

```typescript
// In ChatInterface.tsx
includeMemoryContext: true  // Set to false to disable
```

## Troubleshooting

### "Failed to connect to Ollama"

- Make sure Ollama is running: `ollama serve`
- Check the URL in `.env.local` matches your Ollama server
- Try `curl http://localhost:11434/api/tags` to test connectivity

### "OPENROUTER_API_KEY is required"

- Make sure you've set the API key in `.env.local`
- Restart your dev server after adding environment variables

### Avatar not speaking

- Check browser console for speech synthesis errors
- Ensure `onAvatarSpeak` callback is properly connected
- Verify speech service is initialized in `DashboardClient.tsx`

### Chat messages not persisting

- Run the database migration
- Check Supabase RLS policies are enabled
- Verify user is authenticated

## Performance Tips

### For Local LLM (Ollama)

- Use smaller models for faster responses (llama2, mistral)
- Adjust `OLLAMA_MODEL` based on your hardware
- Consider using GPU acceleration if available

### For Cloud LLM (OpenRouter)

- Use `gpt-3.5-turbo` for faster, cheaper responses
- Use Claude/GPT-4 for higher quality conversations
- Monitor your API usage at openrouter.ai

## Next Steps

- [ ] Add streaming responses for real-time typing effect
- [ ] Add voice input to chat (already have voice recording)
- [ ] Add conversation switching UI (browse past chats)
- [ ] Add "thinking" animation when waiting for LLM
- [ ] Add rate limiting to prevent API abuse
- [ ] Add cost tracking for cloud LLMs
