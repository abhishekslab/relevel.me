# Table Creation Template

**IMPORTANT**: Every new table needs BOTH RLS policies AND table-level grants.

## Complete Migration Template

```sql
-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================
CREATE TABLE public.your_table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- your columns here
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================
CREATE INDEX idx_your_table_user_id ON public.your_table_name(user_id);
CREATE INDEX idx_your_table_created_at ON public.your_table_name(created_at DESC);

-- ============================================================================
-- 3. ENABLE RLS
-- ============================================================================
ALTER TABLE public.your_table_name ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES
-- ============================================================================
CREATE POLICY "Users can read own records"
  ON public.your_table_name FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
  ON public.your_table_name FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records"
  ON public.your_table_name FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own records"
  ON public.your_table_name FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 5. GRANT TABLE PERMISSIONS (CRITICAL!)
-- Without these grants, RLS policies will not work!
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.your_table_name TO authenticated;
GRANT SELECT ON public.your_table_name TO anon;

-- If table has sequences (auto-increment)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- 6. CREATE TRIGGERS (if needed)
-- ============================================================================
CREATE TRIGGER update_your_table_updated_at
  BEFORE UPDATE ON public.your_table_name
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7. ADD COMMENTS
-- ============================================================================
COMMENT ON TABLE public.your_table_name IS 'Description of what this table stores';
COMMENT ON COLUMN public.your_table_name.user_id IS 'Foreign key to users table';
```

## Checklist for New Tables

- [ ] Table created with proper schema
- [ ] Indexes added for foreign keys and common queries
- [ ] RLS enabled on the table
- [ ] RLS policies created (SELECT, INSERT, UPDATE, DELETE)
- [ ] **GRANT permissions added for authenticated role** ⚠️ CRITICAL
- [ ] Triggers added if needed (updated_at, etc.)
- [ ] Comments added for documentation
- [ ] Test with authenticated user in Supabase SQL editor

## Testing New Tables

Run this after creating a table:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'your_table_name' AND schemaname = 'public';

-- Check policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'your_table_name' AND schemaname = 'public';

-- Check grants (MOST IMPORTANT!)
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'your_table_name'
  AND table_schema = 'public'
  AND grantee = 'authenticated';
```

If the last query returns no rows, **your table will fail with permission denied errors!**

## Common Mistakes

1. ❌ **Creating RLS policies without GRANT statements**
   - Policies control WHAT data users can access
   - Grants control WHETHER users can access the table at all
   - You need BOTH!

2. ❌ **Forgetting WITH CHECK on UPDATE policies**
   - USING clause: checks existing rows
   - WITH CHECK clause: validates new/updated rows
   - Both are needed for UPDATE

3. ❌ **Not granting SEQUENCE permissions for auto-increment columns**
   - If you have SERIAL or BIGSERIAL, grant USAGE on sequences

## Quick Fix for Missing Grants

If you forgot grants, run:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.your_table_name TO authenticated;
GRANT SELECT ON public.your_table_name TO anon;
```

## Advanced Patterns

### Pattern 1: Single ALL Policy (Recommended for Simple Tables)

For tables with straightforward user isolation:

```sql
CREATE POLICY "table_name_user_isolation"
  ON public.your_table_name FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**Pros**:
- Simpler - only one policy to maintain
- Covers all CRUD operations
- Easier to understand

**Cons**:
- Less granular control
- Cannot have different logic for different operations

**Use when**: All operations have the same access control logic (most common case)

### Pattern 2: Separate Policies (Fine-grained Control)

For tables needing different rules per operation:

```sql
CREATE POLICY "table_select_own"
  ON public.your_table_name FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "table_update_cancel_only"
  ON public.your_table_name FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND status = (SELECT status FROM your_table_name WHERE id = id)
  );
```

**Use when**: Different operations need different logic (e.g., users can cancel but not change tier)

### Pattern 3: Service Role Policies

For admin operations via API:

```sql
CREATE POLICY "service_role_all_access"
  ON public.your_table_name FOR ALL
  TO authenticated
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

**Security**: NEVER expose service_role key in client code!

**Use when**: Admin operations, webhooks, scheduled jobs

### Pattern 4: Optimized JOIN Policies

For tables that reference other user-owned tables:

```sql
-- ❌ SLOW: Subquery scans entire parent table
CREATE POLICY "slow_policy"
  ON child_table FOR ALL
  USING (parent_id IN (SELECT id FROM parent_table WHERE user_id = auth.uid()));

-- ✅ FAST: EXISTS short-circuits on first match
CREATE POLICY "fast_policy"
  ON child_table FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM parent_table p
      WHERE p.id = child_table.parent_id
      AND p.user_id = auth.uid()
    )
  );
```

**Rule of thumb**: Always use EXISTS instead of IN with subqueries for RLS policies

## Storage Buckets

Storage buckets require separate RLS policies on `storage.objects`:

```sql
-- Create bucket (one-time setup)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bucket-name',
  'bucket-name',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for folder isolation (/user_id/filename)
CREATE POLICY "bucket_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'bucket-name' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "bucket_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'bucket-name' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "bucket_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'bucket-name' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "bucket_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'bucket-name' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**Important**: Always upload files to `/{user_id}/{filename}` path

## Policy Naming Conventions

Choose one convention and stick to it:

**Option 1: Descriptive (User-friendly)**
```sql
CREATE POLICY "Users can read own records" ...
```

**Option 2: Schema-style (Consistent)**
```sql
CREATE POLICY "table_name_select_own" ...
CREATE POLICY "table_name_insert_own" ...
```

**Recommendation**: Use schema-style for consistency across large projects

## Performance Tips

1. **Index foreign keys**: Always add indexes on `user_id` and other FK columns
2. **Use EXISTS over IN**: For policies referencing other tables
3. **HNSW for vectors**: Use HNSW index type for pgvector similarity search
4. **GIN for arrays**: Use GIN indexes for JSONB, arrays, and full-text search
5. **Partial indexes**: For filtered queries (e.g., `WHERE status = 'active'`)

## Lessons Learned

### Why migrations got messy
1. **Iterative fixes**: Kept adding migrations to fix RLS issues instead of getting it right first time
2. **Missing grants**: Forgot table-level grants, causing permission denied errors
3. **Incomplete policies**: Missed DELETE or UPDATE policies, discovered later
4. **No template**: Created ad-hoc migrations without following a standard pattern

### How to avoid migration sprawl
1. **Use this template**: Copy-paste and fill in the blanks
2. **Test immediately**: Run the test queries before committing the migration
3. **Document decisions**: Add comments explaining why policies are structured a certain way
4. **Consolidate when possible**: If you haven't deployed to production, squash multiple migrations into one

### Special case: users table
The `users` table is special because:
- It uses `auth.uid()` as the primary key (references auth.users)
- INSERT is handled by `handle_new_auth_user()` trigger
- DELETE should be denied (users deleted via auth.users)

Don't copy this pattern for other tables - it's specific to the user profile table.

## Complete Example: Messages Table

Here's a real-world example from relevel.me:

```sql
-- Table with text, image, and audio content
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('text', 'image', 'audio')),
  text_content TEXT,
  file_url TEXT,
  transcript TEXT,
  meta JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grants (REQUIRED!)
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Single policy for all operations (simple user isolation)
CREATE POLICY "messages_user_isolation"
  ON messages FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Performance indexes
CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_text_search ON messages USING GIN (to_tsvector('english', text_content));
CREATE INDEX idx_messages_text_trgm ON messages USING GIN (text_content gin_trgm_ops);
CREATE INDEX idx_messages_tags ON messages USING GIN (tags);

-- Auto-update timestamp
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Documentation
COMMENT ON TABLE messages IS 'Memory entries from floating input bar (text, images, audio)';
COMMENT ON POLICY "messages_user_isolation" ON messages IS
  'Single policy covering all CRUD operations - users can only access their own messages';
```

## References

- [SCHEMA.md](./SCHEMA.md) - Complete database schema documentation
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Policies](https://www.postgresql.org/docs/current/sql-createpolicy.html)
