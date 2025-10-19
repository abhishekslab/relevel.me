-- Run this in Supabase SQL Editor to verify migration worked

-- Check if email column was added to users table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if subscriptions table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'subscriptions'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if waitlist table exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'waitlist'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if the trigger function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'handle_new_auth_user';

-- Check if policies were created
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('users', 'subscriptions', 'waitlist');
