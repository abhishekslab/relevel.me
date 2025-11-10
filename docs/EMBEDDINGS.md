# Embedding Provider Guide

This guide explains how to configure and use embedding providers for relevel.me's semantic memory search feature.

## Overview

relevel.me uses a **provider abstraction layer** for text embeddings that allows you to swap embedding services without changing business logic. Embeddings convert text into high-dimensional vectors for semantic similarity search.

## Supported Providers

### Built-in Providers

| Provider | Status | Use Case |
|----------|--------|----------|
| **Local (Xenova)** | ✅ Production Ready | Free, offline-capable, lower quality |
| **OpenAI** | ✅ Production Ready | High quality, API-based, paid |
| **HuggingFace** | ✅ Production Ready | API-based, various models, paid |

## Quick Start

### Using Local Provider (Default)

The local provider uses `@xenova/transformers` to run ONNX models in Node.js - no API key required!

1. **No signup needed** - works out of the box
2. Configure environment variables (optional):

```bash
# .env
EMBEDDING_PROVIDER=local  # This is the default
LOCAL_EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2  # Default model
# LOCAL_EMBEDDING_DIMS=384  # Optional: override dimensions
# LOCAL_EMBEDDING_CACHE_DIR=/custom/path  # Optional: cache location
```

3. **That's it!** On first use, the model will download automatically (~23MB) to `~/.cache/huggingface/`

**How it works:**
- Model downloads once, cached forever
- Runs on CPU (no GPU needed)
- Works offline after first download
- Produces 384-dimension vectors
- Uses mean pooling with normalization

### Using OpenAI

1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Configure environment variables:

```bash
# .env
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...  # Required
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Optional, this is default
OPENAI_EMBEDDING_DIMS=1536  # Optional: dimensions (512-1536 for text-embedding-3-small)
```

3. Restart your application

**Models available:**
- `text-embedding-3-small` - 1536 dims, $0.02 per 1M tokens (recommended)
- `text-embedding-3-large` - 3072 dims, $0.13 per 1M tokens (highest quality)
- `text-embedding-ada-002` - 1536 dims, $0.10 per 1M tokens (legacy)

### Using HuggingFace

1. Get API key from [HuggingFace](https://huggingface.co/settings/tokens)
2. Configure environment variables:

```bash
# .env
EMBEDDING_PROVIDER=huggingface
HUGGINGFACE_API_KEY=hf_...  # Required
HUGGINGFACE_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2  # Optional
# HUGGINGFACE_EMBEDDING_DIMS=384  # Optional: override dimensions
```

3. Restart your application

**Popular models:**
- `sentence-transformers/all-MiniLM-L6-v2` - 384 dims, fast, good quality
- `sentence-transformers/all-mpnet-base-v2` - 768 dims, slower, higher quality
- `sentence-transformers/multi-qa-mpnet-base-dot-v1` - 768 dims, optimized for QA

## Provider Comparison

| Feature | Local (Xenova) | OpenAI | HuggingFace |
|---------|---------------|--------|-------------|
| **Cost** | Free | $0.02-0.13 per 1M tokens | Free tier, then paid |
| **Dimensions** | 384 (default) | 512-3072 | Varies by model |
| **Quality** | Good | Excellent | Good-Excellent |
| **Latency** | ~50-200ms | ~100-300ms | ~200-500ms |
| **API Key** | ❌ Not required | ✅ Required | ✅ Required |
| **Offline** | ✅ After first download | ❌ | ❌ |
| **Rate Limits** | ❌ None | ✅ Yes (tier-based) | ✅ Yes (free tier limited) |
| **Batch Support** | ✅ 32 texts | ✅ 2048 texts | ✅ Varies by model |
| **Best For** | Development, self-hosting | Production, high quality | Experimentation, specific models |

## Architecture

### Provider Interface

All embedding providers implement the `EmbeddingProvider` interface:

```typescript
// packages/shared/src/providers/embedding-provider.ts

export interface EmbeddingProvider {
  // Generate embedding for a single text
  embed(request: EmbedRequest): Promise<EmbedResult>;

  // Generate embeddings for multiple texts (optional)
  embedBatch?(requests: EmbedRequest[]): Promise<EmbedResult[]>;

  // Provider metadata
  readonly name: string;
  readonly modelName: string;
  readonly dimensions: number;
  readonly supportsBatching: boolean;
}

export interface EmbedRequest {
  text: string;
  metadata?: Record<string, any>;
}

export interface EmbedResult {
  embedding: number[];  // Vector of floats
  model: string;        // Model name used
  dims: number;         // Dimension count
  metadata?: Record<string, any>;
}
```

### Data Flow

```
┌─────────────┐     1. Create Memory     ┌──────────────┐
│   User      │ ───────────────────────> │  Memory API  │
│  (Web App)  │                           │  /api/memory/│
└─────────────┘                           │  create      │
                                          └──────────────┘
                                                 │
                                                 │ 2. Get Provider
                                                 v
                                          ┌──────────────┐
                                          │   Factory    │
                                          │ getEmbedding │
                                          │  Provider()  │
                                          └──────────────┘
                                                 │
                                                 │ 3. Generate Embedding
                                                 v
                                          ┌──────────────┐
                                          │   Provider   │
                                          │ (Local/OpenAI│
                                          │  /HuggingFace│
                                          └──────────────┘
                                                 │
                                                 │ 4. Store Vector
                                                 v
                                          ┌──────────────┐
                                          │  Supabase    │
                                          │  pgvector    │
                                          └──────────────┘

┌─────────────┐     5. Search Query      ┌──────────────┐
│   User      │ ───────────────────────> │  Memory API  │
│  (Web App)  │                           │  /api/memory/│
└─────────────┘                           │  search      │
                                          └──────────────┘
                                                 │
                                                 │ 6. Embed Query
                                                 v
                                          ┌──────────────┐
                                          │   Provider   │
                                          └──────────────┘
                                                 │
                                                 │ 7. Vector Search
                                                 v
                                          ┌──────────────┐
                                          │  Supabase    │
                                          │  pgvector    │
                                          │  (cosine     │
                                          │   similarity)│
                                          └──────────────┘
```

## Vector Dimensions Explained

### What are Vector Dimensions?

Embeddings are arrays of floating-point numbers. The **dimension** is the length of this array:

- `Xenova/all-MiniLM-L6-v2`: **384 dimensions**
- `text-embedding-3-small`: **1536 dimensions** (default)
- `text-embedding-3-large`: **3072 dimensions**

### Why Dimensions Matter

1. **Database Storage**: Your database vector column must match the embedding dimension
2. **Search Quality**: Higher dimensions can capture more semantic nuance (but not always better)
3. **Performance**: Higher dimensions = more storage and slower similarity calculations

### Dimension Mismatch Problem

If your embedding model produces **384 dimensions** but your database expects **1536 dimensions**, the code will **pad with zeros**:

```
Original:  [0.5, 0.3, 0.1, ..., 0.2]  (384 values)
Padded:    [0.5, 0.3, 0.1, ..., 0.2, 0, 0, 0, ..., 0]  (1536 values, 1152 zeros)
```

**Problem**: Padding with zeros **significantly degrades search quality** because 73% of your vector is meaningless.

### Solutions

**Option 1: Use OpenAI (Recommended for Production)**
```bash
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=sk-...
# Produces 1536D vectors natively - perfect match!
```

**Option 2: Change Database to 384D (Recommended for Self-Hosting)**
```sql
-- Create new migration
ALTER TABLE message_embeddings
  ALTER COLUMN embedding TYPE vector(384);

-- Recreate HNSW index
DROP INDEX IF EXISTS idx_message_embeddings_vector;
CREATE INDEX idx_message_embeddings_vector
  ON message_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- Clear existing embeddings (they're invalid)
TRUNCATE message_embeddings;
```

Then update the API routes:
```typescript
// web/app/api/memory/create/route.ts
// web/app/api/memory/search/route.ts
const DB_VECTOR_DIMS = 384  // Changed from 1536
```

**Option 3: Use Configurable Dimensions**
```bash
EMBEDDING_PROVIDER=openai
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_EMBEDDING_DIMS=512  # Reduce to 512 (saves costs)
```

Then change `DB_VECTOR_DIMS = 512` in your code and migrate the database.

## Environment Variables Reference

### Local Provider

```bash
EMBEDDING_PROVIDER=local  # Default, no API key needed

# Optional configuration
LOCAL_EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2  # Default: all-MiniLM-L6-v2
LOCAL_EMBEDDING_DIMS=384  # Override dimensions (use with caution)
LOCAL_EMBEDDING_CACHE_DIR=/custom/path  # Default: ~/.cache/huggingface/
```

**Available Models:**
- `Xenova/all-MiniLM-L6-v2` - 384D, 23MB, fast, general purpose
- `Xenova/all-mpnet-base-v2` - 768D, 420MB, slower, higher quality
- `Xenova/paraphrase-multilingual-MiniLM-L12-v2` - 384D, multilingual

### OpenAI Provider

```bash
EMBEDDING_PROVIDER=openai

# Required
OPENAI_API_KEY=sk-...  # Get from platform.openai.com

# Optional
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Default
OPENAI_EMBEDDING_DIMS=1536  # Override dimensions (512-1536 for 3-small)
```

**Cost Optimization:**
```bash
# Reduce dimensions to save costs (and storage)
OPENAI_EMBEDDING_DIMS=512  # ~33% cost reduction
```

### HuggingFace Provider

```bash
EMBEDDING_PROVIDER=huggingface

# Required
HUGGINGFACE_API_KEY=hf_...  # Get from huggingface.co/settings/tokens

# Optional
HUGGINGFACE_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2  # Default
HUGGINGFACE_EMBEDDING_DIMS=384  # Override dimensions
```

## Adding a New Provider

### Step 1: Create Provider Implementation

Create `packages/shared/src/providers/yourprovider-embedding.ts`:

```typescript
import {
  EmbeddingProvider,
  EmbedRequest,
  EmbedResult,
} from './embedding-provider';

export interface YourProviderConfig {
  apiKey: string;
  model?: string;
  dimensions?: number;
}

export class YourProviderEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'YourProvider';
  readonly modelName: string;
  readonly dimensions: number;
  readonly supportsBatching = true;

  private apiKey: string;
  private baseUrl: string;

  constructor(config: YourProviderConfig) {
    this.apiKey = config.apiKey;
    this.modelName = config.model || 'default-model';
    this.dimensions = config.dimensions || 768;
    this.baseUrl = 'https://api.yourprovider.com';
  }

  async embed(request: EmbedRequest): Promise<EmbedResult> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: request.text,
        model: this.modelName,
      }),
    });

    if (!response.ok) {
      throw new Error(`YourProvider API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      embedding: data.embedding,
      model: this.modelName,
      dims: this.dimensions,
      metadata: request.metadata,
    };
  }

  async embedBatch(requests: EmbedRequest[]): Promise<EmbedResult[]> {
    // Implement batch embedding
    const texts = requests.map(r => r.text);
    // ... batch API call
    return results;
  }
}
```

### Step 2: Register in Factory

Update `packages/shared/src/providers/embedding-factory.ts`:

```typescript
import { YourProviderEmbeddingProvider } from './yourprovider-embedding';

export async function getEmbeddingProvider(): Promise<EmbeddingProvider> {
  const provider = (process.env.EMBEDDING_PROVIDER || 'local').toLowerCase();

  switch (provider) {
    case 'local':
      // ... existing local provider

    case 'openai':
      // ... existing OpenAI provider

    case 'huggingface':
      // ... existing HuggingFace provider

    case 'yourprovider':
      if (!process.env.YOURPROVIDER_API_KEY) {
        console.warn('[EmbeddingFactory] YOURPROVIDER_API_KEY not set');
        return getFallbackProvider();
      }

      return new YourProviderEmbeddingProvider({
        apiKey: process.env.YOURPROVIDER_API_KEY,
        model: process.env.YOURPROVIDER_EMBEDDING_MODEL,
        dimensions: process.env.YOURPROVIDER_EMBEDDING_DIMS
          ? parseInt(process.env.YOURPROVIDER_EMBEDDING_DIMS, 10)
          : undefined,
      });

    default:
      console.warn(`Unknown provider "${provider}", using local`);
      return getFallbackProvider();
  }
}
```

### Step 3: Add Environment Variables

Add to `.env.example`:

```bash
# YourProvider configuration
# YOURPROVIDER_API_KEY=your_api_key
# YOURPROVIDER_EMBEDDING_MODEL=model-name
# YOURPROVIDER_EMBEDDING_DIMS=768
```

### Step 4: Test Your Implementation

```bash
# Set environment variables
export EMBEDDING_PROVIDER=yourprovider
export YOURPROVIDER_API_KEY=test_key

# Test with a simple script
node -e "
const { getEmbeddingProvider } = require('./packages/shared/dist');

(async () => {
  const provider = await getEmbeddingProvider();
  console.log('Provider:', provider.name);
  console.log('Model:', provider.modelName);
  console.log('Dimensions:', provider.dimensions);

  const result = await provider.embed({ text: 'Hello world' });
  console.log('Embedding length:', result.embedding.length);
})();
"
```

## Troubleshooting

### Import Error: "getEmbeddingProvider is not a function"

**Cause**: TypeScript path alias pointing to source instead of compiled code

**Solution**: Remove the path alias from `web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
      // Remove: "@relevel-me/shared": ["../packages/shared/src"]
    }
  }
}
```

Then restart your dev server.

### Local Model Not Downloading

**Symptoms**: Stalls or errors on first embedding generation

**Solutions**:

1. **Check internet connection** - model downloads from HuggingFace Hub
2. **Check disk space** - models can be 20-400MB
3. **Check cache directory permissions**:
   ```bash
   ls -la ~/.cache/huggingface/hub/
   ```
4. **Manual download**:
   ```bash
   # Download model manually
   node -e "
   const { pipeline } = require('@xenova/transformers');
   pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
   "
   ```

### Dimension Mismatch Warnings

**Symptoms**: Console warnings about padding vectors

**Meaning**: Your embedding model and database dimensions don't match

**Solutions**: See "Vector Dimensions Explained" section above

### Poor Search Quality

**Possible causes:**

1. **Dimension padding**: Using 384D model with 1536D database
   - **Fix**: Use OpenAI or migrate database to 384D

2. **Wrong model**: Using general-purpose model for specialized content
   - **Fix**: Choose model optimized for your content type

3. **Not enough data**: Semantic search needs sufficient examples
   - **Fix**: Add more memories (at least 50-100 for good results)

4. **Query mismatch**: Search queries don't match memory style
   - **Fix**: Rephrase queries to match how memories are phrased

### Rate Limiting (OpenAI/HuggingFace)

**Symptoms**: 429 errors or slow responses

**Solutions**:

1. **Implement batch processing**: Use `embedBatch()` instead of multiple `embed()` calls
2. **Add retry logic**: Exponential backoff on rate limit errors
3. **Cache embeddings**: Don't re-embed the same text
4. **Upgrade tier**: OpenAI has usage limits per tier

### High Costs (OpenAI)

**Solutions**:

1. **Reduce dimensions**:
   ```bash
   OPENAI_EMBEDDING_DIMS=512  # 33% cost reduction vs 1536
   ```

2. **Use text-embedding-3-small** instead of 3-large:
   - 3-small: $0.02 per 1M tokens
   - 3-large: $0.13 per 1M tokens (6.5x more expensive)

3. **Deduplicate**: Don't embed identical texts twice

4. **Consider local provider** for development/testing

## Best Practices

### Development

- ✅ Use **local provider** for development (free, fast)
- ✅ Test with small datasets first
- ✅ Monitor embedding generation logs
- ❌ Don't commit API keys to git

### Production

- ✅ Use **OpenAI** for best quality
- ✅ Match database dimensions to model dimensions
- ✅ Set up monitoring for API costs
- ✅ Implement rate limiting and retries
- ✅ Cache embeddings aggressively
- ❌ Don't use local provider (lower quality)

### Self-Hosting

- ✅ Use **local provider** (no external dependencies)
- ✅ Set `LOCAL_EMBEDDING_CACHE_DIR` to persistent volume
- ✅ Consider migrating database to 384D
- ❌ Don't use API-based providers (adds dependency)

### Cost Optimization

1. **Batch operations**: Embed multiple texts at once
2. **Reduce dimensions**: Use 512D instead of 1536D
3. **Dedup**: Check if embedding already exists before generating
4. **Choose right model**: Balance quality vs cost

## FAQ

### Which provider should I use?

- **For production with budget**: OpenAI (best quality)
- **For self-hosting**: Local/Xenova (free, offline)
- **For experimentation**: HuggingFace (many models available)
- **For development**: Local/Xenova (free, fast enough)

### Can I switch providers?

**Yes**, but you'll need to re-embed all existing memories:

```sql
-- Clear existing embeddings
TRUNCATE message_embeddings;
```

Then trigger re-embedding for all messages. Different models produce incompatible vectors.

### Do I need to re-embed when switching models of the same provider?

**Yes**. Even within the same provider (e.g., switching from `all-MiniLM-L6-v2` to `all-mpnet-base-v2`), vectors are incompatible.

### What if my model produces different dimensions?

1. Update `DB_VECTOR_DIMS` in your API routes
2. Migrate your database vector column to match
3. Clear existing embeddings
4. Restart your app

### How much do embeddings cost?

**OpenAI (text-embedding-3-small)**:
- $0.02 per 1M tokens
- ~750 tokens per page of text
- 1M memories ≈ $30-50 depending on text length

**Local/Xenova**:
- $0 (completely free)
- Only cost is compute time

**HuggingFace**:
- Free tier: 30K chars/month
- Pro tier: $9/month for unlimited

### Can I use GPU acceleration for local embeddings?

Not yet. `@xenova/transformers` currently runs on CPU only. GPU support is planned.

### How do I monitor embedding costs?

**OpenAI**:
1. Check usage at [platform.openai.com/usage](https://platform.openai.com/usage)
2. Set up billing alerts in dashboard
3. Log token usage in your application

**HuggingFace**:
1. Check usage at [huggingface.co/settings/billing](https://huggingface.co/settings/billing)

### Are embeddings private?

- **Local**: Yes, everything runs on your server
- **OpenAI**: Your text is sent to OpenAI (see their [privacy policy](https://openai.com/policies/privacy-policy))
- **HuggingFace**: Your text is sent to HuggingFace

For sensitive data, use the **local provider**.

## Contributing

To contribute a new provider:

1. Follow the implementation guide above
2. Add comprehensive tests
3. Update this documentation
4. Submit a PR with:
   - Provider implementation
   - Factory registration
   - Environment variable docs
   - Comparison table update
   - Example usage

## Support

- **Provider-specific issues**: Contact provider support
- **Integration issues**: Open a GitHub issue
- **Feature requests**: Start a GitHub discussion

---

Happy embedding! 🎯
