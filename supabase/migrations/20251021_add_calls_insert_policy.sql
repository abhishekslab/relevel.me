-- Add INSERT policy for calls table to allow users to create their own calls
-- This fixes the RLS error: "new row violates row-level security policy for table 'calls'"

DROP POLICY IF EXISTS "user_can_insert_own_calls" ON calls;
CREATE POLICY "user_can_insert_own_calls"
  ON calls
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Also add UPDATE policy so the API can update call status
DROP POLICY IF EXISTS "user_can_update_own_calls" ON calls;
CREATE POLICY "user_can_update_own_calls"
  ON calls
  FOR UPDATE
  USING (auth.uid() = user_id);
