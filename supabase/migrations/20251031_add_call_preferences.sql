-- ============================================================================
-- Add call scheduling preferences to users table
-- Supports per-user configurable call times for automated daily calls
-- ============================================================================

-- Add new columns to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS call_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS call_time TIME DEFAULT '21:00:00';

-- Add comments
COMMENT ON COLUMN public.users.call_enabled IS 'Whether user has enabled automated daily calls (default: true)';
COMMENT ON COLUMN public.users.call_time IS 'Preferred call time in user''s local timezone (default: 9:00 PM)';

-- Create index for efficient querying of users who need calls
CREATE INDEX IF NOT EXISTS idx_users_call_enabled ON public.users(call_enabled) WHERE call_enabled = true;
