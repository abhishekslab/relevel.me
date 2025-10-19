# Supabase Redirect URL Configuration

## Problem

When Supabase sends magic link emails, the redirect URL in the email must match one of the allowed redirect URLs configured in your Supabase project. If not configured correctly, magic links will fail in production.

## Solution

### 1. Environment Variable Setup

We use `NEXT_PUBLIC_APP_URL` to define the application's public URL. This is accessible both on the client and server.

**Local Development (.env.local):**
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Production (env/.production.env or your hosting platform's env vars):**
```bash
NEXT_PUBLIC_APP_URL=https://relevel.me
```

### 2. Configure Supabase Dashboard

You need to add allowed redirect URLs in your Supabase project dashboard:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `relevel.me` (project ref: `your-project-ref`)
3. Navigate to: **Authentication** → **URL Configuration**
4. Add the following to **Redirect URLs**:

   ```
   http://localhost:3000/auth/callback
   https://relevel.me/auth/callback
   ```

5. Also update **Site URL** to:
   - Development: `http://localhost:3000`
   - Production: `https://relevel.me`

### 3. How It Works

**Signup Flow:**
1. User enters email on `/signup` page
2. App calls `supabase.auth.signInWithOtp()` with:
   ```typescript
   emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
   ```
3. Supabase sends email with magic link pointing to the callback URL
4. User clicks link → redirected to `/auth/callback` → session created → redirected to `/dashboard`

**Key Files:**
- `app/signup/page.tsx:31` - Magic link redirect configuration
- `app/auth/callback/route.ts` - Handles the OAuth callback

### 4. Testing

**Local Testing:**
1. Run `npm run dev`
2. Go to `http://localhost:3000/signup`
3. Enter your email
4. Check email - the magic link should point to `http://localhost:3000/auth/callback?...`

**Production Testing:**
1. Deploy to production with `NEXT_PUBLIC_APP_URL=https://relevel.me`
2. Go to `https://relevel.me/signup`
3. Enter your email
4. Check email - the magic link should point to `https://relevel.me/auth/callback?...`

### 5. Common Issues

**Issue:** Magic link still shows localhost in production
- **Fix:** Make sure `NEXT_PUBLIC_APP_URL` is set in your production environment variables
- **Note:** Restart your production server/rebuild after adding the env var

**Issue:** "Invalid Redirect URL" error
- **Fix:** Ensure the redirect URL is added to Supabase Dashboard → Auth → URL Configuration
- **Note:** Both `http://localhost:3000` and `https://relevel.me` should be in the allowed list

**Issue:** Environment variable not working
- **Fix:** Environment variables prefixed with `NEXT_PUBLIC_` are baked into the build. If you change them, you need to rebuild:
  ```bash
  npm run build
  ```

### 6. Deployment Checklist

Before deploying to production:

- [ ] Set `NEXT_PUBLIC_APP_URL=https://relevel.me` in production env vars
- [ ] Add `https://relevel.me/auth/callback` to Supabase Redirect URLs
- [ ] Set Site URL to `https://relevel.me` in Supabase dashboard
- [ ] Rebuild the application (`npm run build`)
- [ ] Test signup flow end-to-end in production

### 7. Multiple Environments

If you have staging/preview environments:

**Staging:**
```bash
NEXT_PUBLIC_APP_URL=https://staging.relevel.me
```

Add to Supabase:
```
https://staging.relevel.me/auth/callback
```

**Vercel Preview Deployments:**

For dynamic preview URLs, you can use a wildcard pattern in Supabase (if supported), or add each preview URL manually. Alternatively, use the Supabase Vercel integration which handles this automatically.

## Support

If you encounter issues with magic links in production:

1. Check Supabase logs: Dashboard → Authentication → Logs
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Ensure DNS is pointing to the correct deployment
