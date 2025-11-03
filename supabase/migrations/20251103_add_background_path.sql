-- Migration: Add background_image_path field
-- Created: 2025-11-03
-- Description: Adds background_image_path to store the storage path separately from the signed URL

-- Add background image path field to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS background_image_path TEXT;
