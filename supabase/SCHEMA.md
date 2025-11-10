# Database Schema Documentation

## Overview

**relevel.me** uses PostgreSQL via Supabase with Row-Level Security (RLS) to enforce data isolation. The schema is designed around a voice-first second brain concept, capturing user memories through calls and text input, then making them searchable through semantic embeddings.

## Design Principles

1. **Auth Integration**: Uses `auth.uid()` as primary key in users table for simplified RLS
2. **Explicit Grants**: All tables have `GRANT` statements for the `authenticated` role
3. **Comprehensive RLS**: Every table has policies for SELECT, INSERT, UPDATE, DELETE
4. **Storage Isolation**: Storage buckets use folder-based access (`/user_id/filename`)
5. **Cascade Deletes**: User deletion cascades to all related data

## Table Relationships

```
auth.users (Supabase Auth)
    ↓ (id → users.id via FK + trigger)
users
    ├── calls (user_id → users.id)
    ├── messages (user_id → users.id)
    │   └── message_embeddings (message_id → messages.id)
    ├── subscriptions (user_id → users.id, UNIQUE)
    └── [storage: audio, backgrounds, models, memory-images]

waitlist (no FK to users - email-based)
```

## Core Tables

### users

**Purpose**: Primary user profile with preferences and settings

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Same as auth.users.id (references auth.users) |
| `email` | TEXT UNIQUE | User's email address |
| `phone` | TEXT UNIQUE | Phone number for voice calls |
| `first_name` | TEXT | User's first name |
| `name` | TEXT | Full name (backwards compatibility) |
| `avatar_url` | TEXT | Ready Player Me avatar URL |
| `avatar_gender` | TEXT | 'feminine' or 'masculine' for voice selection |
| `local_tz` | TEXT | Timezone (default: 'Asia/Kolkata') |
| `evening_window` | TSTZRANGE | Scheduling window for calls |
| `call_enabled` | BOOLEAN | Whether scheduled calls are enabled |
| `call_time` | TIME | Preferred call time (default: 21:00) |
| `background_image_url` | TEXT | Dashboard background URL |
| `background_image_path` | TEXT | Storage path for background |
| `created_at` | TIMESTAMPTZ | Account creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last profile update (auto-updated) |

**RLS Policies**:
- `users_select_own`: Users can read their own profile
- `users_insert_own`: Policy exists but INSERT is handled by `handle_new_auth_user()` trigger
- `users_update_own`: Users can update their own profile
- `users_delete_denied`: Users cannot delete profiles (must delete auth.users)

**Triggers**:
- `update_users_updated_at`: Auto-updates `updated_at` on changes

**Design Notes**:
- User creation is automatic via `handle_new_auth_user()` trigger on auth.users INSERT
- The trigger runs with SECURITY DEFINER to bypass RLS during user creation
- Deleting from auth.users cascades to this table and all related data

---

### calls

**Purpose**: Voice call history and transcripts (core memory capture)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Unique call identifier |
| `user_id` | UUID FK | References users.id (ON DELETE CASCADE) |
| `to_number` | TEXT | Phone number called |
| `agent_id` | TEXT | AI agent identifier (e.g., Vapi agent ID) |
| `scheduled_at` | TIMESTAMPTZ | When the call was scheduled |
| `status` | TEXT | 'queued', 'ringing', 'in_progress', 'completed', 'failed' |
| `vendor_call_id` | TEXT UNIQUE | External vendor's call ID |
| `vendor_payload` | JSONB | Raw webhook data from vendor |
| `last_status_at` | TIMESTAMPTZ | Last status update timestamp |
| `transcript_text` | TEXT | Full conversation transcript |
| `audio_path` | TEXT | Path to recording in storage.audio bucket |
| `created_at` | TIMESTAMPTZ | Call creation timestamp |

**Indexes**:
- `idx_calls_user_status`: Fast lookups by user and status
- `idx_calls_created_at`: Sorted by recency for streak calculation
- `idx_calls_tsv`: Full-text search on transcripts

**RLS Policies**:
- `calls_select_own`: Users can read their own calls
- `calls_insert_own`: Users can create calls
- `calls_update_own`: Users can update their own calls
- `calls_delete_own`: Users can delete their own calls

**Design Notes**:
- Transcripts are stored denormalized in `transcript_text` for simplicity
- Audio files are stored in storage.audio bucket at `/{user_id}/{filename}`
- Call streak is calculated via `get_user_call_streak(user_id)` function

---

### messages

**Purpose**: Memory entries from floating input bar (text, images, audio)

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Unique message identifier |
| `user_id` | UUID FK | References users.id (ON DELETE CASCADE) |
| `kind` | TEXT | 'text', 'image', or 'audio' |
| `text_content` | TEXT | Direct text input or image/audio caption |
| `file_url` | TEXT | Supabase Storage URL for image/audio files |
| `transcript` | TEXT | Whisper transcription for audio messages |
| `meta` | JSONB | Arbitrary metadata (default: {}) |
| `tags` | TEXT[] | User-defined tags (default: {}) |
| `created_at` | TIMESTAMPTZ | Message creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp (auto-updated) |

**Indexes**:
- `idx_messages_user_id`: Fast user lookups
- `idx_messages_text_search`: Full-text search on text_content
- `idx_messages_text_trgm`: Fuzzy text matching (typo-tolerant)
- `idx_messages_transcript_trgm`: Fuzzy matching on audio transcripts
- `idx_messages_tags`: Tag-based filtering

**RLS Policies**:
- `messages_user_isolation`: Single policy for ALL operations (SELECT, INSERT, UPDATE, DELETE)

**Triggers**:
- `update_messages_updated_at`: Auto-updates `updated_at` on changes

**Design Notes**:
- Images/audio stored in memory-images bucket, path stored in `file_url`
- Audio messages get transcribed via Whisper API, stored in `transcript`
- Single RLS policy simplifies access control

---

### message_embeddings

**Purpose**: Vector embeddings for semantic search using pgvector

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL PK | Auto-incrementing ID |
| `message_id` | UUID FK | References messages.id (ON DELETE CASCADE) |
| `modality` | TEXT | 'text', 'image', or 'audio' |
| `model` | TEXT | Embedding model name (e.g., 'text-embedding-3-small') |
| `dims` | INTEGER | Embedding dimensions (e.g., 1536) |
| `embedding` | VECTOR(1536) | Embedding vector (pgvector type) |
| `meta` | JSONB | Metadata including user_id for filtering |
| `created_at` | TIMESTAMPTZ | Embedding creation timestamp |

**Indexes**:
- `idx_message_embeddings_vector`: HNSW index for cosine similarity search
- `idx_message_embeddings_message_id`: Fast message lookups
- `idx_message_embeddings_meta_user_id`: Metadata-based filtering

**RLS Policies**:
- `message_embeddings_user_isolation`: Uses EXISTS clause to check message ownership

**Design Notes**:
- Optimized RLS policy uses EXISTS instead of subquery for better performance
- HNSW index enables fast approximate nearest neighbor search
- Meta field stores user_id for additional filtering during vector search

**Common Query Pattern**:
```sql
-- Semantic search with user isolation
SELECT m.*, e.embedding <=> '[...]'::vector AS distance
FROM message_embeddings e
JOIN messages m ON m.id = e.message_id
WHERE e.meta->>'user_id' = auth.uid()::text
ORDER BY e.embedding <=> '[query_embedding]'::vector
LIMIT 10;
```

---

### subscriptions

**Purpose**: User subscription tiers via DodoPayments

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Unique subscription identifier |
| `user_id` | UUID FK UNIQUE | References users.id (ON DELETE CASCADE) |
| `tier` | subscription_tier | 'pro', 'max', or 'self_host' |
| `status` | subscription_status | 'active', 'canceled', 'past_due', 'trialing' |
| `dodo_customer_id` | TEXT | DodoPayments customer ID |
| `dodo_subscription_id` | TEXT | DodoPayments subscription ID |
| `current_period_start` | TIMESTAMPTZ | Billing period start |
| `current_period_end` | TIMESTAMPTZ | Billing period end |
| `cancel_at_period_end` | BOOLEAN | Whether to cancel at period end |
| `created_at` | TIMESTAMPTZ | Subscription creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp (auto-updated) |

**Indexes**:
- `idx_subscriptions_user_id`: Fast user lookups
- `idx_subscriptions_status`: Filter by subscription status

**RLS Policies**:
- `subscriptions_select_own`: Users can view their own subscription
- `subscriptions_update_cancel_only`: Users can only set `cancel_at_period_end`
- `subscriptions_service_role_all`: Service role can manage all subscriptions

**Triggers**:
- `update_subscriptions_updated_at`: Auto-updates `updated_at` on changes

**Design Notes**:
- One subscription per user (enforced by UNIQUE constraint)
- Users can cancel but cannot change tier or status directly
- All subscription management (create, tier changes) must use service_role API key

---

### waitlist

**Purpose**: Tier-specific waitlist for early access

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Unique waitlist entry identifier |
| `email` | TEXT | Email address |
| `tier` | subscription_tier | 'pro', 'max', or 'self_host' |
| `created_at` | TIMESTAMPTZ | Waitlist signup timestamp |

**Constraints**:
- `UNIQUE(email, tier)`: Same email can join waitlist for different tiers

**Indexes**:
- `idx_waitlist_email`: Fast email lookups

**RLS Policies**:
- `waitlist_insert_anyone`: Anyone can join the waitlist
- No SELECT policy (write-only for privacy)

**Design Notes**:
- No foreign key to users table (email-based, pre-signup)
- Write-only design prevents users from querying the waitlist
- Service role can query via API for admin dashboard

---

## Storage Buckets

All storage buckets enforce folder-based isolation. Files must be stored at `/{user_id}/{filename}`.

### audio
- **Purpose**: Call recordings
- **Size Limit**: 10MB
- **MIME Types**: audio/mpeg, audio/wav, audio/ogg, audio/webm
- **RLS**: Users can only access files in their own folder

### backgrounds
- **Purpose**: User-uploaded dashboard backgrounds
- **Size Limit**: 5MB
- **MIME Types**: image/jpeg, image/png, image/webp, image/gif
- **RLS**: Users can only access files in their own folder

### models
- **Purpose**: User-uploaded 3D avatar models (Ready Player Me)
- **Size Limit**: 50MB
- **MIME Types**: model/gltf-binary, model/gltf+json, application/octet-stream
- **RLS**: Users can only access files in their own folder

### memory-images
- **Purpose**: Images from floating memory input bar
- **Size Limit**: 5MB
- **MIME Types**: image/jpeg, image/png, image/webp, image/gif, image/heic, image/heif
- **RLS**: Users can only access files in their own folder

**Storage RLS Pattern**:
```sql
-- Example: SELECT policy for audio bucket
CREATE POLICY "audio_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Helper Functions

### update_updated_at_column()
**Purpose**: Automatically updates `updated_at` timestamp on row changes

**Usage**:
```sql
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### get_user_call_streak(user_id UUID)
**Purpose**: Calculates consecutive days of completed calls

**Returns**: INTEGER (streak count)

**Usage**:
```sql
SELECT get_user_call_streak(auth.uid());
```

**Logic**:
- Counts backwards from today
- Streak breaks if any day is missing a completed call
- Only counts calls with status = 'completed'

### handle_new_auth_user()
**Purpose**: Automatically creates user profile when auth.users row is inserted

**Trigger**: Fires AFTER INSERT on auth.users

**Security**: Runs with SECURITY DEFINER to bypass RLS during user creation

**Design Note**: This is why `users_insert_own` policy exists but is rarely used directly

---

## RLS Policy Rationale

### Why use auth.uid() as primary key?
- **Simplicity**: No need for `auth_user_id` foreign key
- **Performance**: Direct equality checks instead of joins
- **Security**: Impossible to orphan user profiles

### Why deny DELETE on users table?
- User deletion should be done via `auth.users` table in Supabase Auth dashboard
- Cascading delete ensures all related data is removed
- Prevents accidental data loss from application code

### Why restrict subscription updates?
- **Security**: Prevents users from upgrading themselves without payment
- **Flexibility**: Allows users to cancel at period end
- **Control**: All tier changes must go through payment webhooks (service_role)

### Why use EXISTS in message_embeddings RLS?
- **Performance**: EXISTS short-circuits on first match
- **Scalability**: Avoids full table scan of messages table
- **Correctness**: Maintains proper user isolation

---

## Common Query Patterns

### Get user's recent calls with transcripts
```sql
SELECT id, scheduled_at, status, transcript_text
FROM calls
WHERE user_id = auth.uid()
  AND status = 'completed'
ORDER BY created_at DESC
LIMIT 10;
```

### Search messages by keyword
```sql
SELECT *
FROM messages
WHERE user_id = auth.uid()
  AND (
    text_content ILIKE '%keyword%'
    OR transcript ILIKE '%keyword%'
  )
ORDER BY created_at DESC;
```

### Semantic search with embeddings
```sql
-- First, generate embedding for search query
-- Then query for similar messages
SELECT
  m.id,
  m.text_content,
  m.created_at,
  e.embedding <=> '[query_embedding]'::vector AS distance
FROM message_embeddings e
JOIN messages m ON m.id = e.message_id
WHERE m.user_id = auth.uid()
ORDER BY e.embedding <=> '[query_embedding]'::vector
LIMIT 10;
```

### Check user's subscription status
```sql
SELECT tier, status, current_period_end
FROM subscriptions
WHERE user_id = auth.uid();
```

### Calculate call streak
```sql
SELECT get_user_call_streak(auth.uid()) AS streak;
```

### Get user profile with all related data
```sql
SELECT
  u.*,
  s.tier AS subscription_tier,
  s.status AS subscription_status,
  get_user_call_streak(u.id) AS call_streak,
  COUNT(c.id) AS total_calls
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
LEFT JOIN calls c ON c.user_id = u.id AND c.status = 'completed'
WHERE u.id = auth.uid()
GROUP BY u.id, s.tier, s.status;
```

---

## Testing RLS Policies

### Test as authenticated user
```sql
-- Set session to simulate user authentication
SET LOCAL request.jwt.claims.sub = '00000000-0000-0000-0000-000000000000';

-- Test SELECT
SELECT * FROM users WHERE id = '00000000-0000-0000-0000-000000000000';

-- Test INSERT
INSERT INTO messages (user_id, kind, text_content)
VALUES ('00000000-0000-0000-0000-000000000000', 'text', 'Test message');

-- Reset session
RESET request.jwt.claims.sub;
```

### Test isolation (should return nothing)
```sql
SET LOCAL request.jwt.claims.sub = '11111111-1111-1111-1111-111111111111';

-- This should return 0 rows (different user's data)
SELECT * FROM calls WHERE user_id = '00000000-0000-0000-0000-000000000000';
```

---

## Migration Strategy

The complete schema is defined in a single migration file:
- `20251114_complete_schema.sql`

This replaces 13 previous migrations with a clean, well-documented schema.

**To apply to fresh database**:
```bash
supabase db reset
```

**To apply to existing database** (destructive):
```sql
-- WARNING: This deletes all data
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Then run migration
```

---

## Extensions Used

- **uuid-ossp**: UUID generation functions
- **pg_trgm**: Trigram-based fuzzy text search
- **vector**: pgvector for similarity search (embeddings)

---

## Security Considerations

1. **Service Role Key**: Never expose in client code. Use for:
   - Subscription management
   - Admin operations
   - Webhook handlers

2. **Anon Key**: Safe to expose in client. Users must be authenticated for all operations.

3. **Storage Security**: Always upload files to `/{user_id}/` folder path

4. **RLS Testing**: Always test policies with multiple user contexts

5. **Cascade Deletes**: Deleting a user removes ALL related data (calls, messages, embeddings, etc.)

---

## Performance Considerations

1. **Indexes**: All foreign keys are indexed for fast joins
2. **HNSW Index**: Enables fast approximate nearest neighbor search for embeddings
3. **GIN Indexes**: Used for full-text search and trigram matching
4. **RLS Optimization**: EXISTS clauses preferred over subqueries

---

## Future Enhancements

Potential schema extensions:
- **tags table**: Normalize tags for autocomplete
- **call_summaries**: Separate table for AI-generated summaries
- **user_goals**: Track long-term goals and progress
- **memory_connections**: Graph edges between related memories

---

## Questions?

Refer to:
- `TABLE_CREATION_TEMPLATE.md` for adding new tables
- Supabase docs: https://supabase.com/docs/guides/database
- pgvector docs: https://github.com/pgvector/pgvector
