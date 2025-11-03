# User Onboarding Flow - Complete Audit

**Project:** relevel.me
**Date:** 2025-10-22
**Status:** 🔴 Critical Issues Found

---

## Table of Contents

1. [Flow Overview](#flow-overview)
2. [Detailed Step-by-Step Flow](#detailed-step-by-step-flow)
3. [Database State Transitions](#database-state-transitions)
4. [Authentication Flow](#authentication-flow)
5. [Subscription Flow](#subscription-flow)
6. [Critical Gaps Identified](#critical-gaps-identified)
7. [Flow Diagrams](#flow-diagrams)

---

## Flow Overview

### Current User Journey

```
Landing Page (/)
    ↓ [Get Started]
Signup Page (/signup)
    ↓ [Enter Email + Magic Link Sent]
Email Inbox
    ↓ [Click Magic Link]
Auth Callback (/auth/callback)
    ↓ [Session Created + User Provisioned]
Dashboard (/dashboard) ⚠️ NO SUBSCRIPTION CHECK
    ↓ [User Interaction]
Call Initiation ❌ FAILS if no phone
```

### Expected vs Actual Flow

| Step | Expected | Actual | Status |
|------|----------|--------|--------|
| 1. Landing | User sees value prop | ✅ Works | ✅ |
| 2. Signup | User enters email | ✅ Works | ✅ |
| 3. Email Verification | User clicks magic link | ✅ Works | ✅ |
| 4. Auth Callback | Session created, user provisioned | ⚠️ Partial | ⚠️ |
| 5. Profile Setup | User completes profile (phone, name) | ❌ Missing | 🔴 |
| 6. Subscription Check | User redirected to pricing if no sub | ❌ Skipped | 🔴 |
| 7. Dashboard Access | Full dashboard functionality | ⚠️ Partial | ⚠️ |
| 8. Call Feature | User can initiate calls | ❌ Fails | 🔴 |

---

## Detailed Step-by-Step Flow

### Step 1: Landing Page (`/`)

**File:** `app/page.tsx`

```typescript
// User sees:
- Logo
- "Voice-first journaling platform with AI assistant"
- [Get Started] button → /signup
- [Learn More] button → /vision
```

**Database State:** None (no user yet)

**Auth State:** None

---

### Step 2: Signup Page (`/signup`)

**File:** `app/signup/page.tsx`

**User Actions:**
1. User enters email address
2. Clicks "Send magic link"

**Code Flow:**
```typescript
const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: `${APP_URL}/auth/callback`,
  },
})
```

**What Happens:**
- Supabase Auth sends OTP email
- User sees "Check your email" screen
- Email contains magic link to `/auth/callback?token_hash=...&type=email`

**Database State:** None yet (auth.users not created until link clicked)

**Auth State:** None (session not created)

**✅ Status:** Works correctly

---

### Step 3: Email Click & Auth Callback (`/auth/callback`)

**File:** `app/auth/callback/route.ts`

**Code Flow:**
```typescript
// 1. Extract token from URL
const token_hash = searchParams.get('token_hash')
const code = searchParams.get('code')

// 2. Verify OTP or exchange code for session
if (code) {
  await supabase.auth.exchangeCodeForSession(code)
} else if (token_hash) {
  await supabase.auth.verifyOtp({ token_hash, type })
}

// 3. Provision user record
await fetch(`${baseUrl}/api/auth/provision`, { method: 'POST' })

// 4. Redirect to dashboard
return NextResponse.redirect(`${baseUrl}/dashboard`)
```

**What Actually Happens:**

#### 3a. Database Trigger Fires FIRST

**File:** `supabase/migrations/20250102_add_subscriptions.sql:109-131`

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
```

**Trigger Function:**
```sql
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE email = NEW.email) THEN
    UPDATE public.users SET auth_user_id = NEW.id WHERE email = NEW.email;
  ELSE
    -- 🔴 CRITICAL: Creates user with ONLY email and auth_user_id
    INSERT INTO public.users (auth_user_id, email, created_at)
    VALUES (NEW.id, NEW.email, NOW());
  END IF;
  RETURN NEW;
END;
$$
```

**⚠️ ISSUE:** Creates incomplete user record (missing required `phone` field)

#### 3b. Provision API Called SECOND

**File:** `app/api/auth/provision/route.ts`

```typescript
// Check if user record already exists
const { data: existingUser } = await supabase
  .from('users')
  .select('id')
  .eq('auth_user_id', user.id)
  .single()

if (existingUser) {
  return NextResponse.json({ success: true, message: 'User already exists' })
}

// This code NEVER RUNS because trigger already created the record!
const { data: newUser } = await supabase
  .from('users')
  .insert({ auth_user_id: user.id, email: user.email })
```

**⚠️ ISSUE:** Redundant code, potential race condition

#### 3c. Redirect to Dashboard

**Code:** `return NextResponse.redirect('/dashboard')`

**🔴 CRITICAL ISSUE:** No subscription check, no profile completion check

**Database State After Step 3:**

```sql
-- auth.users table
id: uuid (e.g., '550e8400-e29b-41d4-a716-446655440000')
email: 'user@example.com'
created_at: '2025-10-22T10:00:00Z'

-- public.users table
id: uuid (generated)
auth_user_id: '550e8400-e29b-41d4-a716-446655440000'
email: 'user@example.com'
phone: NULL ❌ MISSING
name: NULL
first_name: NULL
avatar_url: NULL
avatar_gender: NULL
created_at: '2025-10-22T10:00:00Z'
```

---

### Step 4: Dashboard Landing (`/dashboard`)

**File:** `app/dashboard/page.tsx`

**Middleware Check:** `middleware.ts:76-82`
```typescript
if (request.nextUrl.pathname.startsWith('/dashboard')) {
  if (!user) {
    return NextResponse.redirect('/signup')
  }
}
// ✅ User has session, so they pass
```

**🔴 CRITICAL ISSUE:** No `requireSubscription()` check!

**Expected Code (MISSING):**
```typescript
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const userWithSub = await requireSubscription() // ❌ NOT CALLED
  // ... rest of component
}
```

**Actual Code:**
```typescript
export default function DashboardPage() {
  // Client-side component, no subscription check!
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR_URL)

  useEffect(() => {
    // Loads avatar from users table
    const { data } = await supabase
      .from('users')
      .select('avatar_gender, avatar_url')
      .eq('auth_user_id', user.id)
      .single()
    // ✅ This works, but user has no phone!
  }, [])
}
```

**What User Sees:**
- Full dashboard UI with worldboard
- HUD with streak counter (shows 0)
- Dock with "Call now" button
- Profile settings button

**What User CANNOT Do:**
- Click "Call now" → fails with "Phone number not set"
- Access actual features (no subscription)

**⚠️ ISSUE:** User has access to UI but features don't work

---

### Step 5: Profile Modal (Optional, User-Initiated)

**File:** `app/dashboard/page.tsx:551-778`

**User Action:** Clicks Profile button in settings menu

**Modal Shows:**
- First Name input
- Phone Number input (❌ NOT marked as required in UI)
- Avatar URL input
- Avatar Gender selector

**Save Logic:**
```typescript
const { error } = await supabase
  .from('users')
  .update({
    first_name: firstName.trim(),
    phone: phone.trim(),
    avatar_url: avatarUrl.trim(),
    avatar_gender: avatarGender,
  })
  .eq('auth_user_id', user.id)
```

**⚠️ ISSUE:**
- No validation that phone is required
- No prompt on dashboard load that profile is incomplete
- User must discover this themselves when call fails

---

### Step 6: Call Initiation (Feature Use)

**File:** `app/api/calls/initiate/route.ts`

**User Action:** Clicks "Call now" button

**Code Flow:**
```typescript
// 1. Get authenticated user
const { data: { user: authUser } } = await supabase.auth.getUser()
if (!authUser) return 401

// 2. Get user record
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('auth_user_id', authUser.id)
  .single()

if (!user) {
  return NextResponse.json(
    { error: 'User profile not found. Please complete your profile first.' },
    { status: 404 }
  )
}

// 3. Validate phone ❌ FAILS HERE
if (!user.phone) {
  return NextResponse.json(
    { error: 'Phone number not set. Please add your phone number in profile settings.' },
    { status: 400 }
  )
}
```

**What User Experiences:**
1. Clicks "Call now"
2. Sees error: "Phone number not set. Please add your phone number in profile settings."
3. Confused because nothing indicated phone was required
4. Must figure out how to open profile modal
5. Manually enters phone
6. Tries again

**🔴 CRITICAL ISSUE:** Poor UX, no proactive validation

---

### Step 7: Subscription Flow (Pricing Page)

**File:** `app/pricing/page.tsx`

**How User Gets Here:**
- NOT automatically (should be redirected from dashboard)
- Only if they manually navigate to `/pricing`

**Subscribe Flow:**
```typescript
// 1. User clicks "Get Started" on Pro tier
const response = await fetch('/api/create-checkout', {
  method: 'POST',
  body: JSON.stringify({ tier: 'pro' }),
})

// 2. API creates DodoPayments subscription
const subscription = await dodoClient.subscriptions.create({
  product_id: productId,
  return_url: `${APP_URL}/dashboard?checkout=success`, // ⚠️ No handler for this!
})

// 3. User redirected to DodoPayments checkout
window.location.href = data.checkoutUrl

// 4. User completes payment on DodoPayments

// 5. Webhook receives subscription.active event
// File: app/api/webhooks/dodopayment/route.ts
await supabase.from('subscriptions').upsert({
  user_id: activeUserId,
  status: 'active',
  tier: 'pro',
})

// 6. User returns to /dashboard?checkout=success
// ⚠️ NO CODE HANDLES ?checkout=success PARAMETER
```

**⚠️ ISSUE:** No success message, no indication payment worked

---

## Database State Transitions

### State 1: Anonymous User (Landing Page)

```
auth.users: (empty)
public.users: (empty)
subscriptions: (empty)
```

### State 2: After Email Signup (Magic Link Sent)

```
auth.users: (still empty until link clicked)
public.users: (empty)
subscriptions: (empty)
```

### State 3: After Magic Link Click (Auth Created)

```
auth.users:
  - id: uuid
  - email: 'user@example.com'
  - created_at: timestamp

public.users (created by TRIGGER):
  - id: uuid
  - auth_user_id: uuid (references auth.users.id)
  - email: 'user@example.com'
  - phone: NULL ❌
  - name: NULL
  - first_name: NULL
  - avatar_url: NULL
  - avatar_gender: NULL

subscriptions: (empty) ❌
```

### State 4: After Profile Completion (Manual)

```
public.users:
  - id: uuid
  - auth_user_id: uuid
  - email: 'user@example.com'
  - phone: '+919876543210' ✅
  - first_name: 'John' ✅
  - avatar_url: 'https://...' ✅
  - avatar_gender: 'masculine' ✅

subscriptions: (still empty) ❌
```

### State 5: After Subscription Purchase

```
subscriptions:
  - id: uuid
  - user_id: uuid (references public.users.id)
  - tier: 'pro'
  - status: 'active' ✅
  - dodo_subscription_id: 'dodo_abc123'
  - current_period_start: timestamp
  - current_period_end: timestamp
```

---

## Authentication Flow

### Magic Link Flow (Current Implementation)

```
User enters email
    ↓
Supabase.auth.signInWithOtp()
    ↓
Email sent with token_hash
    ↓
User clicks link → /auth/callback?token_hash=...
    ↓
supabase.auth.verifyOtp()
    ↓
Session created in auth.users
    ↓
TRIGGER: handle_new_auth_user() fires
    ↓
public.users record created (incomplete)
    ↓
Provision API called (redundant check)
    ↓
Redirect to /dashboard
    ↓
middleware checks session ✅
    ↓
Dashboard loads (no subscription check) ⚠️
```

### RLS Policy Evolution (ISSUE)

**Initial Schema** (`0001_init.sql:50`):
```sql
create policy "user_can_read_own_profile"
  on users for select using (auth.uid() = id); -- ❌ WRONG FIELD
```

**After Subscriptions** (`20250102_add_subscriptions.sql:80`):
```sql
DROP POLICY "user_can_read_own_profile" ON users;
CREATE POLICY "user_can_read_own_profile"
  ON users FOR SELECT
  USING (auth.uid() = auth_user_id OR auth.uid() = id); -- ✅ FIXED
```

**Latest Fix** (`20251022_fix_user_profile_rls.sql:9`):
```sql
CREATE POLICY "user_can_update_own_profile"
  ON users FOR UPDATE
  USING (auth.uid() = auth_user_id OR auth.uid() = id); -- ✅ CORRECT
```

**✅ Status:** RLS policies now correct, but schema evolution shows confusion

---

## Subscription Flow

### Expected Flow:

```
User completes auth
    ↓
Dashboard checks requireSubscription()
    ↓
No active subscription found
    ↓
Redirect to /pricing
    ↓
User selects plan
    ↓
Checkout flow
    ↓
Webhook confirms payment
    ↓
User returns to dashboard
    ↓
Dashboard checks subscription ✅
    ↓
Full access granted
```

### Actual Flow:

```
User completes auth
    ↓
Dashboard loads (NO CHECK) ❌
    ↓
User sees full UI
    ↓
User tries to use features
    ↓
Features fail (no subscription) ❌
    ↓
User confused, manually navigates to /pricing
    ↓
... (rest same)
```

---

## Critical Gaps Identified

### 🔴 CRITICAL - Must Fix Before Launch

#### Gap 1: No Subscription Enforcement on Dashboard

**Location:** `app/dashboard/page.tsx`

**Issue:** Dashboard is a client component with no subscription check

**Current Code:**
```typescript
'use client'
export default function DashboardPage() {
  // No requireSubscription() check!
}
```

**Expected Code:**
```typescript
// Option 1: Server Component (recommended)
export default async function DashboardPage() {
  const userWithSub = await requireSubscription()
  // If no subscription, automatically redirects to /pricing
  return <DashboardClient user={userWithSub} />
}

// Option 2: Client-side check (less secure)
'use client'
export default function DashboardPage() {
  useEffect(() => {
    checkSubscription().then(hasSub => {
      if (!hasSub) router.push('/pricing')
    })
  }, [])
}
```

**Impact:** Users without subscription can access dashboard UI

**Severity:** 🔴 CRITICAL

---

#### Gap 2: Incomplete User Record at Signup

**Location:** `supabase/migrations/20250102_add_subscriptions.sql:120`

**Issue:** Database trigger creates user with only email and auth_user_id

**Current Code:**
```sql
INSERT INTO public.users (auth_user_id, email, created_at)
VALUES (NEW.id, NEW.email, NOW());
```

**Issue:** Missing required fields:
- `phone` (required for calls)
- `first_name` (useful for personalization)

**Expected Behavior:**
1. Create minimal user record in trigger (email + auth_user_id only)
2. Immediately redirect to profile completion page
3. Validate profile is complete before allowing dashboard access

**Severity:** 🔴 CRITICAL

---

#### Gap 3: No Profile Completion Flow

**Location:** Missing entirely

**Issue:** No dedicated profile setup page/flow after signup

**Expected Flow:**
```
Auth callback → Profile completion page → Dashboard
```

**Actual Flow:**
```
Auth callback → Dashboard (with incomplete profile)
```

**Recommended Solution:**

Create `/app/onboarding/page.tsx`:
```typescript
export default async function OnboardingPage() {
  const session = await requireAuth()
  const supabase = createServerClient()

  const { data: user } = await supabase
    .from('users')
    .select('phone, first_name')
    .eq('auth_user_id', session.user.id)
    .single()

  // If profile complete, redirect to dashboard
  if (user?.phone && user?.first_name) {
    redirect('/dashboard')
  }

  // Show onboarding form
  return <OnboardingForm />
}
```

Update auth callback:
```typescript
// app/auth/callback/route.ts
return NextResponse.redirect(`${baseUrl}/onboarding`) // Changed from /dashboard
```

**Severity:** 🔴 CRITICAL

---

#### Gap 4: Phone Number Not Validated Upfront

**Location:** `app/api/calls/initiate/route.ts:33`

**Issue:** Phone validation happens too late (at feature use)

**Current Flow:**
```
User clicks "Call now" → API rejects → User confused
```

**Expected Flow:**
```
Dashboard loads → Check phone → Show banner if missing → Block call button
```

**Recommended Solution:**

`app/dashboard/page.tsx`:
```typescript
const [hasPhone, setHasPhone] = useState(false)

useEffect(() => {
  async function checkProfile() {
    const { data: user } = await supabase
      .from('users')
      .select('phone')
      .eq('auth_user_id', authUser.id)
      .single()

    setHasPhone(!!user?.phone)
  }
  checkProfile()
}, [])

// In render:
{!hasPhone && (
  <Banner variant="warning">
    Please add your phone number to enable calls.
    <Button onClick={() => setShowProfileModal(true)}>
      Complete Profile
    </Button>
  </Banner>
)}

// Disable call button if no phone
<Button
  onClick={handleCallNow}
  disabled={!hasPhone}
>
  Call now
</Button>
```

**Severity:** 🔴 CRITICAL (UX)

---

### ⚠️ MEDIUM - Should Fix Soon

#### Gap 5: Redundant User Provisioning

**Location:**
- `supabase/migrations/20250102_add_subscriptions.sql:109` (trigger)
- `app/api/auth/provision/route.ts` (API endpoint)

**Issue:** Two mechanisms create user records, potential race condition

**Recommendation:**
1. Keep trigger for automatic creation (simpler)
2. Remove `/api/auth/provision` endpoint
3. Or keep endpoint only for manual fixes, remove trigger

**Severity:** ⚠️ MEDIUM

---

#### Gap 6: No Checkout Success Handling

**Location:** Return URL includes `?checkout=success` but no handler

**Issue:** After successful payment, user returns to dashboard with no feedback

**Current:**
```typescript
// app/api/create-checkout/route.ts:94
return_url: `${APP_URL}/dashboard?checkout=success`

// app/dashboard/page.tsx
// ❌ No code checks for ?checkout=success
```

**Recommended Solution:**
```typescript
// app/dashboard/page.tsx
const searchParams = useSearchParams()

useEffect(() => {
  if (searchParams.get('checkout') === 'success') {
    toast.success('Subscription activated! Welcome to Pro. 🎉')
    // Remove query param
    router.replace('/dashboard', { scroll: false })
  }
}, [searchParams])
```

**Severity:** ⚠️ MEDIUM (UX)

---

#### Gap 7: No Loading State During Profile Load

**Location:** `app/dashboard/page.tsx:178-199`

**Issue:** UI renders with defaults while profile loads

**Current:**
```typescript
useEffect(() => {
  // Avatar loads after component mounts
  const { data } = await supabase.from('users').select(...)
  if (data) {
    setArmatureType(data.avatar_gender)
    setAvatarUrl(data.avatar_url)
  }
}, [])
```

**Issue:** Brief flash of default avatar before user's avatar loads

**Recommendation:** Add loading state

**Severity:** ⚠️ MEDIUM (Polish)

---

### ℹ️ MINOR - Nice to Have

#### Gap 8: No Onboarding Tutorial

**Issue:** First-time users see full dashboard without explanation

**Recommendation:** Add interactive tutorial overlay

**Severity:** ℹ️ MINOR

---

#### Gap 9: Email in Database But Not Used

**Location:** `public.users` table has `email` column

**Issue:** Email is duplicated (exists in both `auth.users` and `public.users`)

**Recommendation:** Consider making email optional in public.users, or remove entirely and fetch from auth.users when needed

**Severity:** ℹ️ MINOR (Design)

---

## Flow Diagrams

### Current Flow (Simplified)

```
┌─────────────┐
│   Landing   │
│   Page (/)  │
└──────┬──────┘
       │ Click "Get Started"
       ↓
┌─────────────┐
│   Signup    │
│  (/signup)  │
└──────┬──────┘
       │ Enter email
       ↓
┌─────────────┐
│    Email    │
│   (Inbox)   │
└──────┬──────┘
       │ Click magic link
       ↓
┌─────────────────────────────┐
│    Auth Callback            │
│   (/auth/callback)          │
│                             │
│  1. Verify OTP              │
│  2. Create session          │
│  3. Trigger creates user    │
│     (email + auth_user_id)  │
│  4. Provision API (skipped) │
│  5. Redirect to dashboard   │
└──────┬──────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│         Dashboard ⚠️                 │
│       (/dashboard)                   │
│                                      │
│  ❌ No subscription check            │
│  ❌ No profile completion check      │
│  ⚠️  User sees full UI               │
│  ❌ Features don't work (no phone)   │
└──────────────────────────────────────┘
```

### Expected Flow (With Fixes)

```
┌─────────────┐
│   Landing   │
│   Page (/)  │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Signup    │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│    Email    │
└──────┬──────┘
       │
       ↓
┌────────────────────────────┐
│    Auth Callback           │
│  - Create session          │
│  - Create minimal user     │
│  - Redirect to onboarding  │
└──────┬─────────────────────┘
       │
       ↓
┌────────────────────────────┐
│  ✅ Profile Completion     │
│    (/onboarding)           │
│                            │
│  Required:                 │
│  - First name              │
│  - Phone number            │
│  Optional:                 │
│  - Avatar                  │
└──────┬─────────────────────┘
       │ Profile complete
       ↓
┌────────────────────────────┐
│  ✅ Subscription Check     │
│                            │
│  If no subscription:       │
│  → Redirect to /pricing    │
└──────┬─────────────────────┘
       │ Has subscription
       ↓
┌────────────────────────────┐
│  ✅ Dashboard (Full)       │
│    (/dashboard)            │
│                            │
│  - Profile complete ✅     │
│  - Subscription active ✅  │
│  - All features work ✅    │
└────────────────────────────┘
```

---

## Summary

### Critical Issues Count

- 🔴 **Critical:** 4 issues
- ⚠️ **Medium:** 3 issues
- ℹ️ **Minor:** 2 issues

### Immediate Action Required

1. **Add subscription enforcement** to dashboard
2. **Create onboarding/profile completion flow**
3. **Add proactive phone number validation**
4. **Fix database trigger** to redirect to onboarding

### Estimated Fix Time

- Critical fixes: 4-6 hours
- Medium fixes: 2-3 hours
- Minor fixes: 1-2 hours
- **Total:** ~8-11 hours

---

## Next Steps

1. Review this document with team
2. Prioritize fixes (recommend all Critical items)
3. Create implementation tickets
4. Test each fix with end-to-end user flow
5. Update this document as fixes are implemented

---

**Document Status:** ✅ Complete
**Last Updated:** 2025-10-22
**Author:** Claude Code (via onboarding audit)
