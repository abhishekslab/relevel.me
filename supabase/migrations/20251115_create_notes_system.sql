-- =====================================================
-- Notes System Migration for relevel.me
-- =====================================================
--
-- Creates tables and infrastructure for Obsidian-style notes with:
-- - Markdown storage
-- - Wiki-style [[links]]
-- - Hierarchical organization
-- - Tag-based connections
-- - Vector embeddings for semantic search
--
-- =====================================================

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE note_source AS ENUM ('manual', 'chat', 'call');
CREATE TYPE note_link_type AS ENUM ('wiki', 'parent', 'tag', 'semantic');

-- =====================================================
-- TABLES
-- =====================================================

-- Main notes table
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Content
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '', -- Markdown content

  -- Metadata
  parent_note_id UUID REFERENCES notes(id) ON DELETE SET NULL,
  created_from note_source NOT NULL DEFAULT 'manual',
  source_id UUID, -- Reference to call_id, conversation_id, or message_id

  -- Organization
  tags TEXT[] DEFAULT '{}',
  meta JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'B')
  ) STORED,

  CONSTRAINT title_not_empty CHECK (char_length(trim(title)) > 0)
);

-- Note links table (wiki links, parent/child, tag connections)
CREATE TABLE note_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  target_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  link_type note_link_type NOT NULL DEFAULT 'wiki',

  -- Optional metadata for the link
  alias TEXT, -- For wiki links with aliases [[Target|Alias]]
  meta JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate links
  CONSTRAINT unique_note_link UNIQUE (source_note_id, target_note_id, link_type),
  -- Prevent self-links
  CONSTRAINT no_self_links CHECK (source_note_id != target_note_id)
);

-- Note embeddings table (reuses existing embedding infrastructure pattern)
CREATE TABLE note_embeddings (
  id BIGSERIAL PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,

  -- Embedding metadata
  model TEXT NOT NULL, -- e.g., 'text-embedding-ada-002'
  dims INTEGER NOT NULL, -- Vector dimensions (1536 for OpenAI)
  embedding VECTOR, -- Vector type from pgvector extension

  -- Additional metadata
  embedded_field TEXT NOT NULL DEFAULT 'body', -- 'title', 'body', or 'combined'
  meta JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_note_embedding UNIQUE (note_id, model, embedded_field)
);

-- Note attachments metadata (files stored in Supabase Storage)
CREATE TABLE note_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,

  -- File metadata
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_size_bytes INTEGER,
  mime_type TEXT,

  -- Optional metadata
  meta JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Notes indexes
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_parent_note_id ON notes(parent_note_id) WHERE parent_note_id IS NOT NULL;
CREATE INDEX idx_notes_created_from ON notes(created_from);
CREATE INDEX idx_notes_source_id ON notes(source_id) WHERE source_id IS NOT NULL;
CREATE INDEX idx_notes_tags ON notes USING GIN(tags);
CREATE INDEX idx_notes_search_vector ON notes USING GIN(search_vector);
CREATE INDEX idx_notes_created_at ON notes(user_id, created_at DESC);
CREATE INDEX idx_notes_updated_at ON notes(user_id, updated_at DESC);
CREATE INDEX idx_notes_title_trgm ON notes USING GIN(title gin_trgm_ops);

-- Note links indexes
CREATE INDEX idx_note_links_source ON note_links(source_note_id);
CREATE INDEX idx_note_links_target ON note_links(target_note_id);
CREATE INDEX idx_note_links_user_id ON note_links(user_id);
CREATE INDEX idx_note_links_type ON note_links(link_type);

-- Note embeddings indexes (HNSW for fast vector similarity search)
CREATE INDEX idx_note_embeddings_note_id ON note_embeddings(note_id);
CREATE INDEX idx_note_embeddings_vector ON note_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

-- Note attachments indexes
CREATE INDEX idx_note_attachments_note_id ON note_attachments(note_id);
CREATE INDEX idx_note_attachments_user_id ON note_attachments(user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_attachments ENABLE ROW LEVEL SECURITY;

-- Notes policies
CREATE POLICY notes_select_own ON notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY notes_insert_own ON notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY notes_update_own ON notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY notes_delete_own ON notes
  FOR DELETE USING (auth.uid() = user_id);

-- Note links policies
CREATE POLICY note_links_select_own ON note_links
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY note_links_insert_own ON note_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY note_links_update_own ON note_links
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY note_links_delete_own ON note_links
  FOR DELETE USING (auth.uid() = user_id);

-- Note embeddings policies
CREATE POLICY note_embeddings_select_own ON note_embeddings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM notes WHERE notes.id = note_embeddings.note_id AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY note_embeddings_insert_own ON note_embeddings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM notes WHERE notes.id = note_embeddings.note_id AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY note_embeddings_delete_own ON note_embeddings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM notes WHERE notes.id = note_embeddings.note_id AND notes.user_id = auth.uid()
    )
  );

-- Note attachments policies
CREATE POLICY note_attachments_select_own ON note_attachments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY note_attachments_insert_own ON note_attachments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY note_attachments_delete_own ON note_attachments
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- GRANTS
-- =====================================================

GRANT ALL ON notes TO authenticated;
GRANT ALL ON note_links TO authenticated;
GRANT ALL ON note_embeddings TO authenticated;
GRANT ALL ON note_attachments TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE note_embeddings_id_seq TO authenticated;

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Create bucket for note attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'note-attachments',
  'note-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/markdown']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies (folder-based isolation)
CREATE POLICY note_attachments_storage_select ON storage.objects
  FOR SELECT USING (
    bucket_id = 'note-attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY note_attachments_storage_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'note-attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY note_attachments_storage_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'note-attachments' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get all backlinks for a note
CREATE OR REPLACE FUNCTION get_note_backlinks(p_note_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  link_type note_link_type,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id,
    n.title,
    nl.link_type,
    nl.created_at
  FROM note_links nl
  JOIN notes n ON n.id = nl.source_note_id
  WHERE nl.target_note_id = p_note_id
    AND n.user_id = auth.uid()
  ORDER BY nl.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get note children (hierarchical)
CREATE OR REPLACE FUNCTION get_note_children(p_note_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  created_at TIMESTAMPTZ,
  child_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE note_tree AS (
    -- Base case: immediate children
    SELECT
      n.id,
      n.title,
      n.parent_note_id,
      n.created_at,
      1 AS depth
    FROM notes n
    WHERE n.parent_note_id = p_note_id
      AND n.user_id = auth.uid()

    UNION ALL

    -- Recursive case: children of children
    SELECT
      n.id,
      n.title,
      n.parent_note_id,
      n.created_at,
      nt.depth + 1
    FROM notes n
    JOIN note_tree nt ON n.parent_note_id = nt.id
    WHERE n.user_id = auth.uid()
  )
  SELECT
    nt.id,
    nt.title,
    nt.created_at,
    COUNT(child.id) AS child_count
  FROM note_tree nt
  LEFT JOIN notes child ON child.parent_note_id = nt.id
  WHERE nt.depth = 1 -- Only immediate children
  GROUP BY nt.id, nt.title, nt.created_at
  ORDER BY nt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get note breadcrumb path
CREATE OR REPLACE FUNCTION get_note_path(p_note_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE note_path AS (
    -- Start with the given note
    SELECT
      n.id,
      n.title,
      n.parent_note_id,
      0 AS depth
    FROM notes n
    WHERE n.id = p_note_id
      AND n.user_id = auth.uid()

    UNION ALL

    -- Walk up the parent chain
    SELECT
      n.id,
      n.title,
      n.parent_note_id,
      np.depth - 1
    FROM notes n
    JOIN note_path np ON n.id = np.parent_note_id
    WHERE n.user_id = auth.uid()
  )
  SELECT
    np.id,
    np.title,
    np.depth
  FROM note_path np
  ORDER BY np.depth;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
