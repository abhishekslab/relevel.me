-- Production Database Reset Script
-- WARNING: This will delete ALL data in your database!
-- Only use this in development or when you're 100% sure you want to start fresh.
--
-- Usage: Paste this entire script in Supabase SQL Editor, then run:
-- npx supabase db push

-- 1. Drop storage policies first
DROP POLICY IF EXISTS "Users can read own backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own backgrounds" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own models" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own models" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own models" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own models" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own audio" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own memory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own memory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own memory images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own memory images" ON storage.objects;

-- 2. Delete all objects from buckets (must happen before deleting buckets)
DELETE FROM storage.objects WHERE bucket_id IN ('backgrounds', 'models', 'audio', 'memory-images');

-- 3. Now delete the buckets
DELETE FROM storage.buckets WHERE id IN ('backgrounds', 'models', 'audio', 'memory-images');

-- 4. Drop public schema completely
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 5. Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 6. Clear migration history
TRUNCATE supabase_migrations.schema_migrations;

-- Done! Now run: npx supabase db push
