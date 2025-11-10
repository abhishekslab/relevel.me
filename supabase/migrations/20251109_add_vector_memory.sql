-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Messages table: Ground truth for all memory entries
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('text', 'image', 'audio')),

  -- Content fields
  text_content TEXT,           -- For text messages
  file_url TEXT,              -- For image/audio files (Supabase Storage URL)
  transcript TEXT,            -- For audio (Whisper transcription)

  -- Metadata
  meta JSONB DEFAULT '{}'::JSONB,
  tags TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Message embeddings table: Vector storage for semantic search
-- Note: Using vector(1536) to support OpenAI embeddings by default
-- Smaller models (384, 768 dims) can still be stored (pgvector allows this)
CREATE TABLE IF NOT EXISTS public.message_embeddings (
  id BIGSERIAL PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,

  -- Embedding metadata
  modality TEXT NOT NULL CHECK (modality IN ('text', 'image', 'audio')),
  model TEXT NOT NULL,         -- e.g., 'text-embedding-3-small', 'all-MiniLM-L6-v2'
  dims INTEGER NOT NULL,       -- Dimension of the embedding vector

  -- Vector data (1536 dimensions to support OpenAI text-embedding-3-small)
  embedding vector(1536),      -- The actual embedding vector

  -- Metadata for filtering
  meta JSONB DEFAULT '{}'::JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance

-- 1. HNSW index for fast vector similarity search (cosine distance)
CREATE INDEX IF NOT EXISTS idx_message_embeddings_vector
  ON public.message_embeddings
  USING hnsw (embedding vector_cosine_ops);

-- 2. Index on message_id for fast joins
CREATE INDEX IF NOT EXISTS idx_message_embeddings_message_id
  ON public.message_embeddings(message_id);

-- 3. Index on user_id in messages for filtering
CREATE INDEX IF NOT EXISTS idx_messages_user_id
  ON public.messages(user_id);

-- 4. GIN index for full-text search on text content and transcripts
CREATE INDEX IF NOT EXISTS idx_messages_text_search
  ON public.messages
  USING gin(
    to_tsvector('english',
      COALESCE(text_content, '') || ' ' || COALESCE(transcript, '')
    )
  );

-- 5. GIN index for fuzzy text matching
CREATE INDEX IF NOT EXISTS idx_messages_text_trgm
  ON public.messages
  USING gin(text_content gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_messages_transcript_trgm
  ON public.messages
  USING gin(transcript gin_trgm_ops);

-- 6. Index on tags array
CREATE INDEX IF NOT EXISTS idx_messages_tags
  ON public.messages
  USING gin(tags);

-- 7. Metadata filter index on embeddings (for user_id)
CREATE INDEX IF NOT EXISTS idx_message_embeddings_meta_user_id
  ON public.message_embeddings((meta->>'user_id'));

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_embeddings ENABLE ROW LEVEL SECURITY;

-- Messages: Users can only access their own messages
CREATE POLICY messages_user_isolation
  ON public.messages
  FOR ALL
  USING (user_id = auth.uid());

-- Message embeddings: Users can only access embeddings for their messages
CREATE POLICY message_embeddings_user_isolation
  ON public.message_embeddings
  FOR ALL
  USING (
    message_id IN (
      SELECT id FROM public.messages WHERE user_id = auth.uid()
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on messages
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.messages IS 'Stores all memory entries (text, image, audio) from the floating input bar';
COMMENT ON TABLE public.message_embeddings IS 'Stores vector embeddings for semantic search across memories';
COMMENT ON COLUMN public.messages.kind IS 'Type of memory: text, image, or audio';
COMMENT ON COLUMN public.messages.file_url IS 'Supabase Storage URL for image/audio files';
COMMENT ON COLUMN public.messages.transcript IS 'Whisper transcription for audio messages';
COMMENT ON COLUMN public.message_embeddings.modality IS 'Modality of the embedding: text (including OCR/transcript), image, or audio';
COMMENT ON COLUMN public.message_embeddings.model IS 'Name of the embedding model used (e.g., text-embedding-3-small)';
COMMENT ON COLUMN public.message_embeddings.dims IS 'Dimension of the embedding vector';
