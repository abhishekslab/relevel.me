-- Fix: Make phone column nullable to support email-only users

-- Make phone optional
ALTER TABLE public.users ALTER COLUMN phone DROP NOT NULL;

-- Add constraint to ensure at least email OR phone exists
ALTER TABLE public.users ADD CONSTRAINT users_contact_check
  CHECK (email IS NOT NULL OR phone IS NOT NULL);
