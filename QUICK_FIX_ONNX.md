# ONNX Runtime Error Fix

## Problem
The app crashes with:
```
terminate called after throwing an instance of 'Ort::Exception'
  what():  Exception caught: No error information
```

This happens because the local embedding provider uses ONNX Runtime for AI models, which doesn't work well in Docker/Next.js dev mode.

## Quick Fix (Disable Embeddings for Development)

Add to your `.env.local`:

```bash
# Disable embeddings (memories will be stored but not searchable)
EMBEDDING_PROVIDER=disabled
```

## Alternative Fixes

### Option 1: Use OpenAI Embeddings (Recommended for Production)
```bash
# Use OpenAI instead of local ONNX
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here
```

### Option 2: Fix ONNX Runtime in Docker

If you want to use local embeddings in Docker, add to your Dockerfile:

```dockerfile
# Install ONNX Runtime dependencies
RUN apt-get update && apt-get install -y \
    libgomp1 \
    libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*
```

### Option 3: Use HuggingFace API
```bash
EMBEDDING_PROVIDER=huggingface
HUGGINGFACE_API_KEY=your_api_key_here
```

## What Was Fixed

1. **Added graceful error handling** in `/api/memory/create` - memories are now stored even if embeddings fail
2. **Added `EMBEDDING_PROVIDER=disabled` option** - completely skip embedding initialization
3. **Added better error messages** - explains why ONNX failed and suggests fixes

## Impact

With `EMBEDDING_PROVIDER=disabled`:
- ✅ App won't crash
- ✅ Memories are still stored
- ❌ Vector search won't work (memories not searchable by semantic similarity)

For production, use `EMBEDDING_PROVIDER=openai` for full functionality.
