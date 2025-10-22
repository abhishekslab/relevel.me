-- Fix RLS policy for user profile updates to use auth_user_id
-- This fixes the issue where new users can't update their profile because
-- the policy was checking auth.uid() = id instead of auth.uid() = auth_user_id

DROP POLICY IF EXISTS "user_can_update_own_profile" ON users;
CREATE POLICY "user_can_update_own_profile"
  ON users
  FOR UPDATE
  USING (auth.uid() = auth_user_id OR auth.uid() = id);

-- Also update the read policy for consistency
DROP POLICY IF EXISTS "user_can_read_own_profile" ON users;
CREATE POLICY "user_can_read_own_profile"
  ON users
  FOR SELECT
  USING (auth.uid() = auth_user_id OR auth.uid() = id);
