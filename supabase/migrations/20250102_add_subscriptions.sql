-- Add email and auth integration to existing users table
-- This migration extends the existing users table created in 0001_init.sql

-- Make phone column nullable (to support email-only users)
ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL;

-- Add email column to existing users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;

-- Add auth_user_id to link to Supabase auth.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add updated_at column
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add constraint to ensure at least email OR phone is provided
DO $$ BEGIN
  ALTER TABLE public.users ADD CONSTRAINT users_contact_check
    CHECK (email IS NOT NULL OR phone IS NOT NULL);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create index on auth_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- Create subscription tiers enum
DO $$ BEGIN
  CREATE TYPE subscription_tier AS ENUM ('pro', 'max', 'self_host');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create subscription status enum
DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  dodo_customer_id TEXT,
  dodo_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create waitlist table for Self-Host and Max tiers
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  tier subscription_tier NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, tier)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist(email);

-- Enable Row Level Security on new tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table (updated to include email access)
DROP POLICY IF EXISTS "user_can_read_own_profile" ON public.users;
CREATE POLICY "user_can_read_own_profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = auth_user_id OR auth.uid() = id);

DROP POLICY IF EXISTS "user_can_update_own_profile" ON public.users;
CREATE POLICY "user_can_update_own_profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = auth_user_id OR auth.uid() = id);

-- RLS Policies for subscriptions table
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (
    auth.uid() = (SELECT auth_user_id FROM public.users WHERE id = user_id)
  );

CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions
  FOR ALL
  USING (auth.role() = 'service_role');

-- RLS Policies for waitlist (allow inserts, no reads for privacy)
CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist
  FOR INSERT
  WITH CHECK (true);

-- Function to handle new Supabase auth user creation
-- This creates or links a user record when someone signs up with email
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a user with this email already exists (from phone signup)
  IF EXISTS (SELECT 1 FROM public.users WHERE email = NEW.email) THEN
    -- Link existing user to auth.users
    UPDATE public.users
    SET auth_user_id = NEW.id
    WHERE email = NEW.email;
  ELSE
    -- Create new user record
    INSERT INTO public.users (auth_user_id, email, created_at)
    VALUES (NEW.id, NEW.email, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create/link user record when auth.users is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comment for documentation
COMMENT ON COLUMN public.users.auth_user_id IS 'Links to auth.users for email-based authentication';
COMMENT ON COLUMN public.users.phone IS 'Phone number for CallKaro voice integration';
COMMENT ON TABLE public.subscriptions IS 'Manages user subscription tiers and billing via DodoPayments';
