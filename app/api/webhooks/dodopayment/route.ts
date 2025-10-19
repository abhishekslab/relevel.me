import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// Verify webhook signature from DodoPayments
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto.createHmac('sha256', secret)
  const digest = hmac.update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-dodo-signature')

    if (!signature) {
      console.error('No signature provided')
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    // Verify webhook signature
    const webhookSecret = process.env.DODOPAYMENTS_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('Webhook secret not configured')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    if (!verifyWebhookSignature(body, signature, webhookSecret)) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    const supabase = createServerClient()

    console.log('DodoPayment webhook event:', event.type)

    switch (event.type) {
      case 'subscription.active':
        // Handle successful subscription activation (after payment)
        // This event is sent when a subscription becomes active
        const activeData = event.data
        const activeMetadata = activeData.metadata || {}
        const activeUserId = activeMetadata.user_id

        if (!activeUserId) {
          console.error('No user_id in metadata')
          return NextResponse.json({ error: 'Missing user_id in metadata' }, { status: 400 })
        }

        // Create or update subscription
        const { error: activeError } = await supabase.from('subscriptions').upsert({
          user_id: activeUserId,
          tier: activeMetadata.tier || 'pro',
          status: 'active',
          dodo_customer_id: activeData.customer_id,
          dodo_subscription_id: activeData.subscription_id || activeData.id,
          current_period_start: activeData.current_period_start || new Date().toISOString(),
          current_period_end: activeData.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          cancel_at_period_end: false,
        })

        if (activeError) {
          console.error('Error creating subscription:', activeError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        console.log(`Subscription activated for user ${activeUserId}`)
        break

      case 'subscription.renewed':
        // Handle subscription renewal
        const renewedData = event.data
        const renewedSubId = renewedData.subscription_id || renewedData.id

        const { error: renewError } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_start: renewedData.current_period_start,
            current_period_end: renewedData.current_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('dodo_subscription_id', renewedSubId)

        if (renewError) {
          console.error('Error renewing subscription:', renewError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        console.log(`Subscription renewed: ${renewedSubId}`)
        break

      case 'subscription.on_hold':
        // Handle subscription put on hold (e.g., payment issues)
        const onHoldData = event.data
        const onHoldSubId = onHoldData.subscription_id || onHoldData.id

        const { error: holdError } = await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('dodo_subscription_id', onHoldSubId)

        if (holdError) {
          console.error('Error marking subscription on hold:', holdError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        console.log(`Subscription on hold: ${onHoldSubId}`)
        break

      case 'subscription.cancelled':
      case 'subscription.canceled':
        // Handle subscription cancellation (support both spellings)
        const cancelledData = event.data
        const cancelledSubId = cancelledData.subscription_id || cancelledData.id

        const { error: cancelError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq('dodo_subscription_id', cancelledSubId)

        if (cancelError) {
          console.error('Error cancelling subscription:', cancelError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        console.log(`Subscription cancelled: ${cancelledSubId}`)
        break

      case 'subscription.failed':
        // Handle subscription failure
        const failedData = event.data
        const failedSubId = failedData.subscription_id || failedData.id

        const { error: failError } = await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('dodo_subscription_id', failedSubId)

        if (failError) {
          console.error('Error marking subscription failed:', failError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        console.log(`Subscription failed: ${failedSubId}`)
        break

      case 'payment.succeeded':
        // Handle successful payment (could be initial or renewal)
        const paymentData = event.data
        console.log(`Payment succeeded for subscription: ${paymentData.subscription_id || 'N/A'}`)
        // Most subscription status updates are handled by subscription events
        // This is logged for reference
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
