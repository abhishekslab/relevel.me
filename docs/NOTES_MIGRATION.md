# Notes System Migration Guide

This guide walks you through applying the notes system database migration to your relevel.me instance.

## Prerequisites

- Supabase project set up
- Database connection credentials
- Access to Supabase dashboard or CLI

## Migration File

The migration is located at:
```
supabase/migrations/20251115_create_notes_system.sql
```

## Option 1: Supabase Dashboard (Recommended for Beginners)

### Step 1: Access SQL Editor

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"

### Step 2: Apply Migration

1. Open the migration file:
   ```bash
   cat supabase/migrations/20251115_create_notes_system.sql
   ```

2. Copy the entire contents

3. Paste into the SQL Editor

4. Click "Run" button

5. Wait for confirmation (should see "Success. No rows returned")

### Step 3: Verify Installation

Run this query to verify tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('notes', 'note_links', 'note_embeddings', 'note_attachments')
ORDER BY table_name;
```

You should see all 4 tables listed.

### Step 4: Check Storage Bucket

1. Go to "Storage" in Supabase dashboard
2. Verify "note-attachments" bucket exists
3. Check RLS policies are enabled

## Option 2: Supabase CLI (Recommended for Advanced Users)

### Step 1: Install Supabase CLI

```bash
# macOS/Linux
brew install supabase/tap/supabase

# Windows
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Or via npm
npm install -g supabase
```

### Step 2: Link to Project

```bash
# From project root
cd /path/to/relevel.me

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

Find your project ref in Supabase dashboard → Settings → General → Reference ID

### Step 3: Apply Migration

```bash
# Apply all pending migrations
supabase db push

# Or apply specific migration
supabase db push --include-all
```

### Step 4: Verify

```bash
# Check migration status
supabase migration list

# You should see:
# ✓ 20251115_create_notes_system
```

## Option 3: Direct psql Connection

### Step 1: Get Connection String

From Supabase dashboard:
1. Settings → Database
2. Copy "Connection string" (use "Connection pooling" for production)
3. Replace `[YOUR-PASSWORD]` with your database password

### Step 2: Apply Migration

```bash
# Connect and apply
psql "postgresql://postgres:[YOUR-PASSWORD]@[HOST]:[PORT]/postgres" \
  -f supabase/migrations/20251115_create_notes_system.sql

# Or pipe it
cat supabase/migrations/20251115_create_notes_system.sql | \
  psql "postgresql://postgres:[YOUR-PASSWORD]@[HOST]:[PORT]/postgres"
```

### Step 3: Verify

```bash
# Check tables exist
psql "postgresql://..." -c "\dt notes*"

# Should show:
# notes
# note_links
# note_embeddings
# note_attachments
```

## Post-Migration Verification

### Test Notes API

```bash
# Get auth token from your app
TOKEN="your-supabase-auth-token"

# Test create note
curl -X POST https://your-project.supabase.co/rest/v1/notes \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Note",
    "body": "This is a test [[Wiki Link]] with #tags",
    "created_from": "manual"
  }'

# Should return created note object
```

### Test in UI

1. Navigate to `/notes` in your app
2. Click "New Note"
3. Create a note with wiki links: `[[Test]]`
4. Save and verify:
   - Note appears in sidebar
   - Wiki link is parsed
   - Graph shows node

## Troubleshooting

### Error: "relation already exists"

This means tables already exist. You can:

1. **Drop and recreate** (⚠️ destroys data):
   ```sql
   DROP TABLE IF EXISTS note_attachments CASCADE;
   DROP TABLE IF EXISTS note_embeddings CASCADE;
   DROP TABLE IF EXISTS note_links CASCADE;
   DROP TABLE IF EXISTS notes CASCADE;
   DROP TYPE IF EXISTS note_source CASCADE;
   DROP TYPE IF EXISTS note_link_type CASCADE;

   -- Then rerun migration
   ```

2. **Skip migration** if tables are correct:
   Check table structure matches migration

### Error: "permission denied"

Make sure you're using the **service role key** or database password, not anon key.

### Error: "extension does not exist"

Ensure required extensions are installed:

```sql
-- Check extensions
SELECT * FROM pg_extension WHERE extname IN ('pg_trgm', 'vector');

-- If missing, install (requires superuser)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;
```

For `vector` extension:
1. Go to Supabase dashboard → Database → Extensions
2. Enable "pgvector"

### Storage Bucket Not Created

Manually create via dashboard:

1. Storage → Create bucket
2. Name: `note-attachments`
3. Public: No
4. File size limit: 10485760 (10MB)
5. Allowed MIME types:
   ```
   image/jpeg
   image/png
   image/gif
   image/webp
   application/pdf
   text/plain
   text/markdown
   ```

Then apply RLS policies from migration file.

### RLS Policies Not Working

Verify auth is working:

```sql
-- Check current user
SELECT auth.uid();

-- Should return your user UUID
-- If NULL, auth token is invalid
```

Test RLS:

```sql
-- Should only return your notes
SELECT COUNT(*) FROM notes;
```

## Rollback (If Needed)

To undo the migration:

```sql
-- Careful: This deletes all notes data!
DROP TABLE IF EXISTS note_attachments CASCADE;
DROP TABLE IF EXISTS note_embeddings CASCADE;
DROP TABLE IF EXISTS note_links CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TYPE IF EXISTS note_source CASCADE;
DROP TYPE IF EXISTS note_link_type CASCADE;

-- Remove storage bucket
DELETE FROM storage.buckets WHERE id = 'note-attachments';
```

## Next Steps

After successful migration:

1. ✅ **Restart your app** to load new routes
2. ✅ **Test the UI** at `/notes`
3. ✅ **Try voice creation**: Make a call and see note auto-generate
4. ✅ **Try chat creation**: Type "create a note about testing"
5. ✅ **Explore the graph**: Create linked notes and visualize

## Support

If you encounter issues:

1. Check [docs/NOTES.md](./NOTES.md) troubleshooting section
2. Review Supabase logs (Logs & Analytics → Postgres Logs)
3. Check browser console for JavaScript errors
4. Open GitHub issue with error details

## Migration Success Checklist

- [ ] Migration file executed without errors
- [ ] All 4 tables created (`notes`, `note_links`, `note_embeddings`, `note_attachments`)
- [ ] Both enums created (`note_source`, `note_link_type`)
- [ ] Storage bucket `note-attachments` exists
- [ ] RLS policies enabled on all tables
- [ ] Indexes created successfully
- [ ] Helper functions (`get_note_backlinks`, etc.) exist
- [ ] App restarted and `/notes` page loads
- [ ] Can create a test note
- [ ] Graph view renders
- [ ] Search works

Once all items are checked, your notes system is ready! 🎉
