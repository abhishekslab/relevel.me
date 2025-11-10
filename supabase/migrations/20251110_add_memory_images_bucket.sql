-- Migration: Add storage bucket for memory images
-- Created: 2025-11-09
-- Description: Creates storage bucket for user-uploaded memory images from the floating input bar

-- Create storage bucket for memory images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('memory-images', 'memory-images', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- RLS policies for memory-images bucket

CREATE POLICY "Users can read own memory images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'memory-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own memory images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'memory-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own memory images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'memory-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own memory images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'memory-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
