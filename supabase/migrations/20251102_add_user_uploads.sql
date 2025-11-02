-- Migration: Add user file upload support
-- Created: 2025-11-02
-- Description: Adds background_image_url field and creates storage buckets for user-uploaded backgrounds and 3D models

-- Add background image field to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS background_image_url TEXT;

-- Create storage buckets for user uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('backgrounds', 'backgrounds', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']),
  ('models', 'models', false, 52428800, ARRAY['model/gltf-binary', 'application/octet-stream'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for backgrounds bucket
CREATE POLICY "Users can read own backgrounds"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'backgrounds' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own backgrounds"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'backgrounds' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own backgrounds"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'backgrounds' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own backgrounds"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'backgrounds' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- RLS policies for models bucket
CREATE POLICY "Users can read own models"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'models' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own models"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'models' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own models"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'models' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own models"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'models' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
