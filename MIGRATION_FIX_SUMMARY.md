# Migration Conflict Fix Summary

## Problem Identified

You correctly identified that there were **two conflicting `users` table definitions**:

1. **Original migration** (`0001_init.sql`):
   - `users` table with `phone`, `name`, `local_tz`, `evening_window`
   - Used for CallKaro voice integration

2. **New migration** (initially `20250101_auth_and_subscriptions.sql`):
   - Tried to create a NEW `users` table with `email`, `auth_user_id`
   - Would have conflicted with existing table

## Solution Applied

Created a **new migration** (`20250102_add_subscriptions.sql`) that:

### ✅ Extends existing `users` table instead of replacing it
```sql
-- Adds email support to existing users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);
```

### ✅ Preserves all existing phone-based fields
- `phone` - For CallKaro integration
- `name`, `local_tz`, `evening_window` - All preserved

### ✅ Supports both authentication methods
Users can now have:
- **Phone only** (CallKaro voice users)
- **Email only** (Web dashboard users)
- **Both** (users who use both features)

### ✅ Creates subscription tables that reference the unified users table
```sql
CREATE TABLE subscriptions (
  user_id UUID REFERENCES public.users(id)  -- Links to unified users table
  -- ...
);
```

## Code Changes Made

### 1. **New Migration File**
- ✅ `supabase/migrations/20250102_add_subscriptions.sql` (replaces old one)
- ❌ Deleted `20250101_auth_and_subscriptions.sql` (conflicting version)

### 2. **Updated Auth Callback**
- Now looks up `public.users` via `auth_user_id`
- Then checks subscription via `user_id`

### 3. **Updated Middleware**
- Follows same pattern: `auth.users` → `public.users` → `subscriptions`

### 4. **Updated Auth Context**
- Fetches user record via `auth_user_id` before fetching subscription

### 5. **Updated Checkout API**
- Converts `auth.users.id` to `public.users.id` before creating subscription

## How It Works Now

### Email Signup Flow:
1. User signs up with email → Record created in `auth.users`
2. Trigger fires → Creates/updates record in `public.users` with `auth_user_id`
3. User subscribes → Subscription record created with `user_id = public.users.id`

### Phone Signup Flow (existing):
1. User record created in `public.users` with phone
2. No `auth_user_id` (phone users don't use Supabase auth)

### Dual User (future):
1. User has phone in `public.users`
2. Later signs up with matching email
3. Trigger links them by setting `auth_user_id` on existing record

## Database Relationships

```
auth.users (Supabase auth)
    ↓ (auth_user_id)
public.users (unified user table)
    ├── phone (for CallKaro)
    ├── email (for web auth)
    └── id
        ↓ (user_id)
subscriptions (Pro/Max tiers)
```

## Testing Checklist

- [ ] Run migration: `supabase db push`
- [ ] Test email signup flow
- [ ] Verify user record created with `auth_user_id`
- [ ] Test checkout creates subscription with correct `user_id`
- [ ] Verify existing phone users still work
- [ ] Test dashboard access control

## Key Takeaway

The system now supports a **unified user model** where the same `users` table handles:
- 📞 Phone-based authentication (CallKaro)
- 📧 Email-based authentication (Supabase Auth)
- 💳 Subscription management (DodoPayments)

All without conflicts!
