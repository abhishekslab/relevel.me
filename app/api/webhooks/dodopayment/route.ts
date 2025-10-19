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
      case 'checkout.session.completed':
        // Handle successful checkout
        const { metadata, customer_id, subscription_id } = event.data
        const { user_id, tier } = metadata

        // Create or update subscription
        const { error: subError } = await supabase.from('subscriptions').upsert({
          user_id,
          tier,
          status: 'active',
          dodo_customer_id: customer_id,
          dodo_subscription_id: subscription_id,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          cancel_at_period_end: false,
        })

        if (subError) {
          console.error('Error creating subscription:', subError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        console.log(`Subscription created for user ${user_id}`)
        break

      case 'subscription.updated':
        // Handle subscription updates (e.g., renewal)
        const { subscription } = event.data

        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            cancel_at_period_end: subscription.cancel_at_period_end,
          })
          .eq('dodo_subscription_id', subscription.id)

        if (updateError) {
          console.error('Error updating subscription:', updateError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        console.log(`Subscription updated: ${subscription.id}`)
        break

      case 'subscription.cancelled':
        // Handle subscription cancellation
        const { subscription: cancelledSub } = event.data

        const { error: cancelError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_at_period_end: true,
          })
          .eq('dodo_subscription_id', cancelledSub.id)

        if (cancelError) {
          console.error('Error cancelling subscription:', cancelError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        console.log(`Subscription cancelled: ${cancelledSub.id}`)
        break

      case 'payment.failed':
        // Handle failed payment
        const { subscription: failedSub } = event.data

        const { error: failError } = await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
          })
          .eq('dodo_subscription_id', failedSub.id)

        if (failError) {
          console.error('Error marking subscription past due:', failError)
          return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        console.log(`Payment failed for subscription: ${failedSub.id}`)
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
