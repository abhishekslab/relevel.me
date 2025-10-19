# Onboarding & Subscription System Setup Guide

This guide will help you complete the setup of the authentication and subscription system for relevel.me.

## ✅ What's Been Implemented

### Pages Created
- `/signup` - Magic link email authentication
- `/auth/callback` - Auth callback handler
- `/pricing` - Subscription tier pricing page (redirects directly to DodoPayments)
- `/privacy` - Privacy policy (full content)
- `/terms` - Terms and conditions (full content)
- `/refund` - Refund policy (full content)
- `/vision` - Vision and roadmap page

### Features Implemented
- ✅ Supabase magic link authentication
- ✅ Route protection middleware
- ✅ Auth context provider
- ✅ User menu with sign out in dashboard
- ✅ Database schema for users & subscriptions
- ✅ DodoPayments SDK integration (direct checkout redirect)
- ✅ Webhook handler for subscription events
- ✅ UI components (input, label, form, checkbox, textarea)

---

## 🔧 Setup Steps

### 1. Run Database Migrations

**IMPORTANT:** This migration extends the existing `users` table from the CallKaro setup (migration 0001_init.sql). Make sure you've already run that migration first!

You need to apply the subscription database schema to your Supabase project:

```bash
# Using Supabase CLI (recommended)
supabase db push

# OR manually run the migration SQL
# Copy the contents of supabase/migrations/20250102_add_subscriptions.sql
# and run it in your Supabase SQL editor at:
# https://app.supabase.com/project/YOUR_PROJECT_ID/sql
```

**What this migration does:**
- Adds `email` and `auth_user_id` columns to the existing `users` table
- Creates `subscriptions` table for managing Pro/Max/Self-Host tiers
- Creates `waitlist` table for coming soon tiers
- Adds trigger to auto-create user records when someone signs up with email

### 2. Configure DodoPayments

1. **Create a DodoPayments account** at https://dodopayments.com

2. **Create a Product in DodoPayments Dashboard**:
   - Go to Products → Create New Product
   - Product Type: **Subscription**
   - Name: `Relevel.me Pro`
   - Price: `$29.00`
   - Billing Period: **Monthly**
   - Copy the Product ID (you'll need this for .env.local)

3. **Get your API keys** from Settings → API Keys

4. **Update `.env.local`** with your real keys:

```env
# API Keys from DodoPayments Dashboard
NEXT_PUBLIC_DODOPAYMENTS_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
DODOPAYMENTS_SECRET_KEY=sk_live_xxxxxxxxxxxxx
DODOPAYMENTS_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Product ID from the product you created
DODOPAYMENTS_PRO_PRODUCT_ID=prod_xxxxxxxxxxxxx
```

### 3. Configure Webhook in DodoPayments

1. Go to your DodoPayments dashboard → Webhooks
2. Add a new webhook endpoint: `https://yourdomain.com/api/webhooks/dodopayment`
3. Select these event types:
   - `subscription.active` - When subscription becomes active
   - `subscription.renewed` - When subscription renews
   - `subscription.cancelled` (or `subscription.canceled`) - When subscription is cancelled
   - `subscription.on_hold` - When payment fails and subscription is on hold
   - `subscription.failed` - When subscription fails
   - `payment.succeeded` - When payment succeeds (optional, for logging)
4. Copy the webhook secret and update `DODOPAYMENTS_WEBHOOK_SECRET` in `.env.local`

### 4. Update Public URL

In `.env.local`, update the PUBLIC_URL for production:

```env
PUBLIC_URL=https://yourdomain.com  # Change from http://localhost:3000
```

### 5. Configure Supabase Email Templates

1. Go to Supabase dashboard → Authentication → Email Templates
2. Customize the **Magic Link** email template
3. Make sure the redirect URL is set to: `{{ .SiteURL }}/auth/callback`

---

## 🧪 Testing the Flow

### Local Testing

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Test signup flow:**
   - Visit `http://localhost:3000`
   - Click "Get Started"
   - Enter your email
   - Check your email for the magic link
   - Click the link (should redirect to `/pricing`)

3. **Test checkout (in sandbox mode):**
   - Click "Get Started" on Pro tier
   - Will immediately redirect to DodoPayments hosted checkout
   - Use test card: `4242 4242 4242 4242`
   - Complete checkout
   - Should redirect to `/dashboard?checkout=success`

4. **Test dashboard access:**
   - Should now have access to dashboard
   - Click user icon (top right) to see email and tier
   - Click "Sign Out" to log out

### Production Testing

Before launching:
- [ ] Test magic link emails in production
- [ ] Test checkout with real payment
- [ ] Verify webhooks are received (check Supabase logs)
- [ ] Test subscription status updates
- [ ] Test sign out and re-authentication
- [ ] Test route protection (try accessing `/dashboard` while logged out)

---

## 📋 Database Schema Overview

### Dual User Model: Phone + Email

The `users` table supports **both phone-based and email-based users**:

**For CallKaro (Voice) Users:**
- `phone` - Phone number in E.164 format (+919876543210)
- `name` - User's name
- `local_tz` - Timezone for call scheduling
- `evening_window` - Preferred time window for calls

**For Web/Email Users:**
- `email` - Email address for magic link authentication
- `auth_user_id` - Links to Supabase `auth.users` table

**Both types can exist in the same record!** For example:
- User signs up with phone for voice calls
- Later signs up with email for web dashboard
- Trigger links them if emails match

### Tables

**`public.users`** (Extended from 0001_init.sql)
- Now supports both phone AND email authentication
- `auth_user_id` links to Supabase auth for email users
- Original phone fields preserved for CallKaro integration

**`public.subscriptions`**
- Stores subscription data
- `user_id` references `public.users.id` (NOT auth.users.id!)
- Links to DodoPayments via `dodo_customer_id` and `dodo_subscription_id`
- Tracks tier (pro, max, self_host), status, and billing period

**`public.waitlist`**
- Stores email signups for Self-Host and Max tiers
- Used on pricing page "Notify Me" buttons

---

## 🔐 Security Notes

### Environment Variables
- **NEVER** commit real API keys to git
- The current `.env.local` has placeholder keys - replace them
- Use different keys for development and production

### Webhook Security
- Webhook signature verification is implemented in `/app/api/webhooks/dodopayment/route.ts`
- Always verify signatures before processing webhook events
- DodoPayments sends `x-dodo-signature` header for verification

### Row-Level Security (RLS)
- RLS policies are enabled on all tables
- Users can only view/update their own data
- Service role key bypasses RLS for webhook operations

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Replace all placeholder DodoPayment keys with real ones
- [ ] Run database migrations on production Supabase
- [ ] Configure production webhook URL in DodoPayments
- [ ] Update `PUBLIC_URL` in environment variables
- [ ] Test magic link emails (check spam folder)
- [ ] Test checkout flow end-to-end
- [ ] Verify subscription webhooks are working
- [ ] Review and customize legal pages (privacy, terms, refund)
- [ ] Update contact emails in legal pages (privacy@relevel.me, legal@relevel.me, etc.)
- [ ] Test route protection middleware
- [ ] Set up error monitoring (Sentry, etc.)

---

## 🎯 Next Steps

### Immediate
1. Get real DodoPayment API keys
2. Run database migrations
3. Test the complete flow locally

### Future Enhancements
- Add subscription management page (cancel, update payment method)
- Implement usage tracking for Max tier voice credits
- Add admin dashboard for managing users/subscriptions
- Implement email notifications for subscription events
- Add analytics tracking for conversion funnels
- Build Self-Host tier (Docker deployment)
- Build Max tier (CallKaro voice integration)

---

## 🔄 API Changes Summary (January 2025)

The DodoPayments integration has been updated with the official SDK:

**What Changed:**
- ✅ SDK Integration: Now using `dodopayments` npm package instead of raw fetch calls
- ✅ Direct Checkout: Removed intermediate checkout page - users redirect directly to DodoPayments
- ✅ Request structure: Proper format with `product_id`, `billing`, `customer`, `payment_link: true`
- ✅ Webhook events: Updated to match DodoPayments actual events (`subscription.active`, `subscription.renewed`, etc.)
- ✅ Product configuration: Now requires creating products in DodoPayments dashboard first

**Required Actions:**
1. Install DodoPayments SDK: `npm install dodopayments`
2. Create a subscription product in your DodoPayments dashboard
3. Add the product ID to `.env.local` as `DODOPAYMENTS_PRO_PRODUCT_ID`
4. Update webhook event subscriptions to include the correct event types
5. Test the flow end-to-end before deploying to production

## 🆘 Troubleshooting

### Magic link not working
- Check Supabase email settings
- Verify redirect URL in email template
- Check spam folder
- Ensure `NEXT_PUBLIC_SUPABASE_URL` is correct

### Checkout not redirecting
- Verify DodoPayment keys are correct (use `sk_live_` or `sk_test_` for secret key)
- Check browser console for errors
- Ensure `PUBLIC_URL` is set correctly
- **Verify Product ID exists**: Make sure `DODOPAYMENTS_PRO_PRODUCT_ID` matches a real product in your dashboard
- Check DodoPayment API logs in their dashboard
- Check your server logs for the actual error response from DodoPayments

### Webhook not received
- Verify webhook URL is publicly accessible (no localhost)
- Check webhook secret matches
- View webhook logs in DodoPayment dashboard
- Check Supabase logs for errors

### User can't access dashboard after payment
- Check subscription status in Supabase database
- Verify webhook was processed successfully
- Try signing out and back in
- Check middleware logs for auth errors

---

## 📞 Support

For issues with:
- **Supabase:** https://supabase.com/docs
- **DodoPayments:** https://docs.dodopayments.com
- **Next.js:** https://nextjs.org/docs

---

**Last Updated:** January 2025
