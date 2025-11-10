-- =====================================================
-- Complete Schema Migration for relevel.me
-- =====================================================
--
-- This migration creates the entire database schema from scratch.
-- Includes: tables, RLS policies, storage buckets, indexes, and triggers.
--
-- Design principles:
-- 1. auth.uid() used as primary key in users table for simplicity
-- 2. All tables have explicit GRANT statements for authenticated role
-- 3. All tables have comprehensive RLS policies (SELECT, INSERT, UPDATE, DELETE)
-- 4. Storage buckets use folder-based isolation (one folder per user)
--
-- =====================================================

-- =====================================================
-- EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE subscription_tier AS ENUM ('pro', 'max', 'self_host');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate user's call streak
CREATE OR REPLACE FUNCTION get_user_call_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_streak INTEGER := 0;
  v_current_date DATE := CURRENT_DATE;
  v_last_call_date DATE;
BEGIN
  -- Get the most recent successful call date
  SELECT DATE(created_at) INTO v_last_call_date
  FROM calls
  WHERE user_id = p_user_id
    AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no calls, streak is 0
  IF v_last_call_date IS NULL THEN
    RETURN 0;
  END IF;

  -- Start counting backwards from today
  WHILE v_last_call_date IS NOT NULL LOOP
    -- Check if there's a call on the expected date
    SELECT DATE(created_at) INTO v_last_call_date
    FROM calls
    WHERE user_id = p_user_id
      AND status = 'completed'
      AND DATE(created_at) = v_current_date
    LIMIT 1;

    IF v_last_call_date IS NOT NULL THEN
      v_streak := v_streak + 1;
      v_current_date := v_current_date - INTERVAL '1 day';
    ELSE
      EXIT;
    END IF;
  END LOOP;

  RETURN v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle new auth user creation
-- This trigger automatically creates a user profile when someone signs up
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users to create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_auth_user();

-- =====================================================
-- TABLE: users
-- =====================================================
-- Primary user profile table
-- Uses auth.uid() as primary key for simplified RLS
-- =====================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  first_name TEXT,
  name TEXT, -- Backwards compatibility
  avatar_url TEXT,
  avatar_gender TEXT CHECK (avatar_gender IN ('feminine', 'masculine')),
  local_tz TEXT DEFAULT 'Asia/Kolkata',
  evening_window TSTZRANGE,
  call_enabled BOOLEAN DEFAULT TRUE,
  call_time TIME DEFAULT '21:00:00',
  background_image_url TEXT,
  background_image_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant table-level permissions (REQUIRED for RLS to work)
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO authenticated;

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Note: INSERT is handled by handle_new_auth_user() trigger with SECURITY DEFINER
-- Users cannot directly INSERT, but we add a policy for explicitness
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Explicitly deny DELETE (users should be deleted via auth.users)
CREATE POLICY "users_delete_denied"
  ON users FOR DELETE
  TO authenticated
  USING (false);

COMMENT ON POLICY "users_insert_own" ON users IS
  'INSERT policy exists for explicitness, but actual user creation is handled by handle_new_auth_user() trigger';

COMMENT ON POLICY "users_delete_denied" ON users IS
  'Users should be deleted via auth.users table, which will cascade delete via ON DELETE CASCADE';

-- Trigger to update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: calls
-- =====================================================
-- Voice call history and transcripts
-- Core memory capture mechanism
-- =====================================================

CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_number TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'ringing', 'in_progress', 'completed', 'failed')),
  vendor_call_id TEXT UNIQUE,
  vendor_payload JSONB,
  last_status_at TIMESTAMPTZ,
  transcript_text TEXT,
  audio_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant table-level permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON calls TO authenticated;

-- Enable RLS
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- RLS Policies for calls table
CREATE POLICY "calls_select_own"
  ON calls FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "calls_insert_own"
  ON calls FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calls_update_own"
  ON calls FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "calls_delete_own"
  ON calls FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for calls
CREATE INDEX idx_calls_user_status ON calls(user_id, status);
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);
CREATE INDEX idx_calls_tsv ON calls USING GIN (to_tsvector('english', transcript_text));

-- =====================================================
-- TABLE: messages
-- =====================================================
-- Memory entries from floating input bar
-- Supports text, image, and audio content
-- =====================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('text', 'image', 'audio')),
  text_content TEXT,
  file_url TEXT,
  transcript TEXT,
  meta JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant table-level permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy for messages table (single policy for all operations)
CREATE POLICY "messages_user_isolation"
  ON messages FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON POLICY "messages_user_isolation" ON messages IS
  'Single policy covering all CRUD operations - users can only access their own messages';

-- Indexes for messages
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_text_search ON messages USING GIN (to_tsvector('english', text_content));
CREATE INDEX idx_messages_text_trgm ON messages USING GIN (text_content gin_trgm_ops);
CREATE INDEX idx_messages_transcript_trgm ON messages USING GIN (transcript gin_trgm_ops);
CREATE INDEX idx_messages_tags ON messages USING GIN (tags);

-- Trigger to update updated_at
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: message_embeddings
-- =====================================================
-- Vector embeddings for semantic search
-- Uses pgvector for similarity search
-- =====================================================

CREATE TABLE message_embeddings (
  id BIGSERIAL PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  modality TEXT NOT NULL CHECK (modality IN ('text', 'image', 'audio')),
  model TEXT NOT NULL,
  dims INTEGER NOT NULL,
  embedding VECTOR(1536) NOT NULL,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant table-level permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON message_embeddings TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE message_embeddings_id_seq TO authenticated;

-- Enable RLS
ALTER TABLE message_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policy for message_embeddings (optimized with EXISTS)
CREATE POLICY "message_embeddings_user_isolation"
  ON message_embeddings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_embeddings.message_id
      AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_embeddings.message_id
      AND m.user_id = auth.uid()
    )
  );

COMMENT ON POLICY "message_embeddings_user_isolation" ON message_embeddings IS
  'Uses EXISTS for better performance than subquery. Users can only access embeddings for their own messages.';

-- Indexes for message_embeddings
CREATE INDEX idx_message_embeddings_vector
  ON message_embeddings
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_message_embeddings_message_id ON message_embeddings(message_id);
CREATE INDEX idx_message_embeddings_meta_user_id ON message_embeddings USING GIN (meta);

-- =====================================================
-- TABLE: subscriptions
-- =====================================================
-- Subscription tiers via DodoPayments
-- Users can view and cancel, but tier changes require service_role
-- =====================================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL,
  status subscription_status NOT NULL,
  dodo_customer_id TEXT,
  dodo_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant table-level permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions TO authenticated;

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only cancel their subscription (set cancel_at_period_end)
CREATE POLICY "subscriptions_update_cancel_only"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    -- Only allow updating cancel_at_period_end field
    AND tier = (SELECT tier FROM subscriptions WHERE user_id = auth.uid())
    AND status = (SELECT status FROM subscriptions WHERE user_id = auth.uid())
    AND dodo_customer_id = (SELECT dodo_customer_id FROM subscriptions WHERE user_id = auth.uid())
    AND dodo_subscription_id = (SELECT dodo_subscription_id FROM subscriptions WHERE user_id = auth.uid())
  );

-- Service role can manage all subscriptions
CREATE POLICY "subscriptions_service_role_all"
  ON subscriptions FOR ALL
  TO authenticated
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON POLICY "subscriptions_update_cancel_only" ON subscriptions IS
  'Users can only update cancel_at_period_end to cancel their subscription. All other changes require service_role.';

-- Indexes for subscriptions
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Trigger to update updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TABLE: waitlist
-- =====================================================
-- Tier-specific waitlist entries
-- Write-only for privacy (no SELECT policy for users)
-- =====================================================

CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  tier subscription_tier NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, tier)
);

-- Grant table-level permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON waitlist TO authenticated;

-- Enable RLS
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for waitlist
CREATE POLICY "waitlist_insert_anyone"
  ON waitlist FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No SELECT policy - waitlist is write-only for privacy

-- Index for waitlist
CREATE INDEX idx_waitlist_email ON waitlist(email);

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================
-- All buckets use folder-based isolation: /user_id/filename
-- RLS policies ensure users can only access their own folder
-- =====================================================

-- Bucket: audio (call recordings)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio',
  'audio',
  false,
  10485760, -- 10MB
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: backgrounds (user-uploaded background images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'backgrounds',
  'backgrounds',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: models (user-uploaded 3D models)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'models',
  'models',
  false,
  52428800, -- 50MB
  ARRAY['model/gltf-binary', 'model/gltf+json', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: memory-images (memory input bar images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'memory-images',
  'memory-images',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE RLS POLICIES
-- =====================================================
-- Pattern: auth.uid()::text = (storage.foldername(name))[1]
-- Ensures users can only access files in their own folder
-- =====================================================

-- Audio bucket policies
CREATE POLICY "audio_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "audio_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "audio_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "audio_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Backgrounds bucket policies
CREATE POLICY "backgrounds_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "backgrounds_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "backgrounds_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "backgrounds_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'backgrounds' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Models bucket policies
CREATE POLICY "models_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'models' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "models_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'models' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "models_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'models' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "models_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'models' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Memory-images bucket policies
CREATE POLICY "memory_images_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'memory-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "memory_images_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'memory-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "memory_images_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'memory-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "memory_images_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'memory-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- END OF MIGRATION
-- =====================================================
