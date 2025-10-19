# Production Deployment Checklist

Use this checklist to ensure your DodoPayments subscription system is production-ready.

## Pre-Deployment Setup

### 1. DodoPayments Configuration
- [ ] Create DodoPayments account at https://dodopayments.com
- [ ] Switch to **Live Mode** (not Test Mode) in DodoPayments dashboard
- [ ] Create subscription product:
  - [ ] Name: `Relevel.me Pro`
  - [ ] Type: `Subscription`
  - [ ] Price: `$29.00`
  - [ ] Billing: `Monthly`
  - [ ] Copy Product ID
- [ ] Get API keys from Settings → API Keys:
  - [ ] Public Key (starts with `pk_live_`)
  - [ ] Secret Key (starts with `sk_live_`)

### 2. Environment Variables
- [ ] Update production `.env.local` or hosting platform env vars:
  ```
  DODOPAYMENTS_SECRET_KEY=sk_live_xxxxxxxxxxxxx
  NEXT_PUBLIC_DODOPAYMENTS_PUBLIC_KEY=pk_live_xxxxxxxxxxxxx
  DODOPAYMENTS_PRO_PRODUCT_ID=prod_xxxxxxxxxxxxx
  PUBLIC_URL=https://your-production-domain.com
  ```
- [ ] **CRITICAL**: Never commit these to git!
- [ ] Verify Supabase production keys are set
- [ ] Verify `PUBLIC_URL` matches your production domain

### 3. Supabase Database
- [ ] Run migrations on production Supabase:
  ```bash
  supabase db push --db-url "your-production-db-url"
  ```
  Or manually run `supabase/migrations/20250102_add_subscriptions.sql` in SQL Editor
- [ ] Verify tables exist: `users`, `subscriptions`, `waitlist`
- [ ] Check Row Level Security (RLS) policies are enabled

### 4. DodoPayments Webhook Setup
- [ ] Go to DodoPayments Dashboard → Webhooks → Add Endpoint
- [ ] Webhook URL: `https://your-production-domain.com/api/webhooks/dodopayment`
- [ ] Select events:
  - [x] `subscription.active`
  - [x] `subscription.renewed`
  - [x] `subscription.cancelled` / `subscription.canceled`
  - [x] `subscription.on_hold`
  - [x] `subscription.failed`
  - [x] `payment.succeeded` (optional)
- [ ] Copy webhook secret
- [ ] Add webhook secret to env vars: `DODOPAYMENTS_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx`

### 5. Email Configuration
- [ ] Update Supabase Auth email templates
- [ ] Verify magic link redirect URL: `{{ .SiteURL }}/auth/callback`
- [ ] Test magic link emails in production
- [ ] Check spam folder if not receiving

## Deployment

### 6. Deploy Application
- [ ] Build and deploy to your hosting platform (Vercel, Netlify, etc.)
- [ ] Verify all environment variables are set in hosting dashboard
- [ ] Check deployment logs for errors
- [ ] Verify app loads at production URL

## Post-Deployment Testing

### 7. Test Complete Flow
- [ ] **Signup Flow**:
  - [ ] Visit production site
  - [ ] Click "Get Started"
  - [ ] Enter email and sign up
  - [ ] Check email for magic link
  - [ ] Click magic link → should redirect to `/pricing`

- [ ] **Checkout Flow**:
  - [ ] Click "Get Started" on Pro tier
  - [ ] Should redirect to `/checkout?tier=pro`
  - [ ] Agree to terms
  - [ ] Click "Subscribe"
  - [ ] Should redirect to DodoPayments checkout page
  - [ ] Complete payment with real card (or test card in test mode)
  - [ ] Should redirect back to `/dashboard?checkout=success`

- [ ] **Verify Subscription**:
  - [ ] Check Supabase database → `subscriptions` table
  - [ ] Verify user has active subscription
  - [ ] Check DodoPayments dashboard for subscription record

- [ ] **Webhook Testing**:
  - [ ] Go to DodoPayments Dashboard → Webhooks → View Logs
  - [ ] Verify `subscription.active` event was sent
  - [ ] Check response status is `200 OK`
  - [ ] If webhook failed, check server logs for errors

### 8. Test Dashboard Access
- [ ] User with active subscription can access dashboard
- [ ] User without subscription is redirected to pricing
- [ ] Sign out and sign back in works correctly
- [ ] User menu shows correct email and tier

## Monitoring

### 9. Set Up Monitoring
- [ ] Add error tracking (Sentry, LogRocket, etc.)
- [ ] Monitor webhook failures in DodoPayments dashboard
- [ ] Set up alerts for failed payments
- [ ] Monitor Supabase logs for database errors

### 10. Legal & Compliance
- [ ] Review and customize Privacy Policy at `/privacy`
- [ ] Review and customize Terms & Conditions at `/terms`
- [ ] Review and customize Refund Policy at `/refund`
- [ ] Update contact emails in legal pages:
  - [ ] `privacy@relevel.me`
  - [ ] `legal@relevel.me`
  - [ ] `support@relevel.me`

## Common Issues

### Issue: "Product not configured" error
**Solution**: Make sure `DODOPAYMENTS_PRO_PRODUCT_ID` environment variable is set in production

### Issue: Checkout redirects but payment doesn't process
**Solution**: Check DodoPayments webhook logs. Ensure webhook secret is correct and endpoint is publicly accessible

### Issue: User can't access dashboard after payment
**Solution**:
1. Check Supabase logs for webhook processing errors
2. Verify `user_id` in subscription metadata matches `public.users.id`
3. Try signing out and back in

### Issue: Webhook signature verification fails
**Solution**: Make sure `DODOPAYMENTS_WEBHOOK_SECRET` matches the secret in DodoPayments dashboard

## Security Checklist

- [ ] All API keys are environment variables (never in code)
- [ ] `.env.local` is in `.gitignore`
- [ ] Webhook signature verification is enabled
- [ ] RLS policies are enabled on all Supabase tables
- [ ] Production uses `https://` (not `http://`)
- [ ] CORS is properly configured

## Final Steps

- [ ] Announce launch! 🚀
- [ ] Monitor first few subscriptions closely
- [ ] Collect user feedback
- [ ] Set up subscription analytics

---

## Quick Commands

```bash
# Build production
npm run build

# Start production server locally
npm start

# Push database migrations
supabase db push

# View Supabase logs
supabase logs --db

# Test webhook locally (use ngrok or similar)
ngrok http 3000
# Then update webhook URL to: https://your-ngrok-url.ngrok.io/api/webhooks/dodopayment
```

## Support Resources

- **DodoPayments Docs**: https://docs.dodopayments.com
- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

**Last Updated**: January 2025
