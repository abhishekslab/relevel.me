-- ============================================================================
-- NUCLEAR OPTION: Complete schema rebuild with auth.uid() as primary key
-- This migration DROPS ALL TABLES and rebuilds them cleanly
-- Only safe because there are no production users yet
-- ============================================================================

-- Drop everything in reverse dependency order
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_auth_user() CASCADE;
DROP FUNCTION IF EXISTS get_user_call_streak(uuid) CASCADE;
DROP FUNCTION IF EXISTS get_users_needing_call_today() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

DROP TABLE IF EXISTS public.waitlist CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.calls CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS subscription_tier CASCADE;

-- Drop storage policies
DROP POLICY IF EXISTS "Users can read own audio" ON storage.objects;

-- ============================================================================
-- USERS TABLE - Clean design with auth.uid() as primary key
-- ============================================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),  -- Use auth.uid() directly!
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  first_name TEXT,
  name TEXT,  -- Keep for backwards compatibility
  avatar_url TEXT,
  avatar_gender TEXT DEFAULT 'feminine' CHECK (avatar_gender IN ('feminine', 'masculine')),
  local_tz TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  evening_window TSTZRANGE NOT NULL DEFAULT tstzrange(
    date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'UTC' + interval '12:30 hours',
    date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'UTC' + interval '13:30 hours',
    '[)'
  ),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT users_contact_check CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_phone ON public.users(phone);

-- ============================================================================
-- CALLS TABLE
-- ============================================================================
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_number TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  vendor_call_id TEXT UNIQUE,
  vendor_payload JSONB,
  last_status_at TIMESTAMPTZ DEFAULT NOW(),
  transcript_text TEXT,
  audio_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calls_user_status ON public.calls(user_id, status);
CREATE INDEX idx_calls_created_at ON public.calls(created_at DESC);
CREATE INDEX idx_calls_tsv ON public.calls USING gin(to_tsvector('english', coalesce(transcript_text, '')));

-- ============================================================================
-- SUBSCRIPTION TYPES
-- ============================================================================
CREATE TYPE subscription_tier AS ENUM ('pro', 'max', 'self_host');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');

-- ============================================================================
-- SUBSCRIPTIONS TABLE
-- ============================================================================
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  tier subscription_tier NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  dodo_customer_id TEXT,
  dodo_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- ============================================================================
-- WAITLIST TABLE
-- ============================================================================
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  tier subscription_tier NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, tier)
);

CREATE INDEX idx_waitlist_email ON public.waitlist(email);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES - Simple and clean! Just auth.uid() checks
-- ============================================================================

-- Users table
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Calls table
CREATE POLICY "Users can read own calls"
  ON public.calls FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calls"
  ON public.calls FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calls"
  ON public.calls FOR UPDATE
  USING (auth.uid() = user_id);

-- Subscriptions table
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Waitlist table
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================
CREATE POLICY "Users can read own audio"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-create user record when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert with auth.uid() as the id
  INSERT INTO public.users (id, email, created_at)
  VALUES (NEW.id, NEW.email, NOW())
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Get users needing a call today
CREATE OR REPLACE FUNCTION get_users_needing_call_today()
RETURNS TABLE (id UUID, phone TEXT, name TEXT)
LANGUAGE SQL
STABLE
AS $$
  WITH today AS (
    SELECT date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'UTC' AS d_utc
  )
  SELECT u.id, u.phone, u.name
  FROM users u, today t
  WHERE u.phone IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM calls c
      WHERE c.user_id = u.id
        AND c.created_at >= t.d_utc
        AND c.status IN ('queued','ringing','in_progress','completed')
    );
$$;

-- Get user call streak
CREATE OR REPLACE FUNCTION get_user_call_streak(p_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  WITH RECURSIVE streak_days AS (
    -- Start from today
    SELECT 
      date_trunc('day', now() at time zone 'Asia/Kolkata') AS check_date,
      0 AS streak
    
    UNION ALL
    
    -- Check each previous day
    SELECT 
      sd.check_date - interval '1 day',
      sd.streak + 1
    FROM streak_days sd
    WHERE EXISTS (
      SELECT 1 FROM calls c
      WHERE c.user_id = p_user_id
        AND c.status = 'completed'
        AND date_trunc('day', c.created_at at time zone 'Asia/Kolkata') = 
            date_trunc('day', (sd.check_date - interval '1 day') at time zone 'Asia/Kolkata')
    )
    AND sd.streak < 365  -- Prevent infinite recursion
  )
  SELECT COALESCE(MAX(streak), 0) FROM streak_days;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-create user on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Auto-update updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.users IS 'Users table with auth.uid() as primary key - simple and clean!';
COMMENT ON COLUMN public.users.id IS 'Primary key = auth.uid() from Supabase Auth';
COMMENT ON COLUMN public.users.phone IS 'Phone number for CallKaro voice calls';
COMMENT ON TABLE public.subscriptions IS 'User subscription tiers managed via DodoPayments';

-- ============================================================================
-- Done! Schema is now clean with auth.uid() as primary key everywhere
-- ============================================================================
