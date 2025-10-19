import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { tier, userId, email } = await request.json()

    // Validate inputs
    if (!tier || !userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Only Pro tier is available for now
    if (tier !== 'pro') {
      return NextResponse.json(
        { error: 'Only Pro tier is available at this time' },
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Get user record from public.users via auth_user_id
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', userId)
      .single()

    if (!userRecord) {
      return NextResponse.json(
        { error: 'User record not found' },
        { status: 404 }
      )
    }

    // Check if user already has an active subscription
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userRecord.id)
      .eq('status', 'active')
      .single()

    if (existingSub) {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 400 }
      )
    }

    // DodoPayments API integration
    const dodoPublicKey = process.env.NEXT_PUBLIC_DODOPAYMENTS_PUBLIC_KEY
    const dodoSecretKey = process.env.DODOPAYMENTS_SECRET_KEY

    if (!dodoPublicKey || !dodoSecretKey) {
      console.error('DodoPayments keys not configured')
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      )
    }

    // Get product ID from environment (must be created in DodoPayments dashboard first)
    const productId = process.env.DODOPAYMENTS_PRO_PRODUCT_ID

    if (!productId) {
      console.error('DodoPayments product ID not configured')
      return NextResponse.json(
        { error: 'Product not configured. Please create a product in DodoPayments dashboard and add DODOPAYMENTS_PRO_PRODUCT_ID to .env.local' },
        { status: 500 }
      )
    }

    // Create subscription with DodoPayments
    // Documentation: https://docs.dodopayments.com/api-reference/subscriptions/post-subscriptions
    const subscriptionResponse = await fetch('https://api.dodopayments.com/subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dodoSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: productId,
        quantity: 1,
        payment_link: true, // This generates a hosted checkout page
        return_url: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/dashboard?checkout=success`,
        customer: {
          email: email,
          name: email.split('@')[0], // Use email prefix as name or get from user profile
        },
        billing: {
          // These can be collected or use placeholder values
          // DodoPayments will collect billing address during checkout
          street: '',
          city: '',
          state: '',
          country: 'US',
          zipcode: 0
        },
        metadata: {
          user_id: userRecord.id, // Use public.users.id, not auth.users.id
          tier: tier,
          auth_user_id: userId, // Also store auth.users.id for reference
        },
      }),
    })

    if (!subscriptionResponse.ok) {
      const error = await subscriptionResponse.text()
      console.error('DodoPayments error:', error)
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      )
    }

    const subscriptionData = await subscriptionResponse.json()

    // DodoPayments returns a payment_link when payment_link: true is set
    return NextResponse.json({
      checkoutUrl: subscriptionData.payment_link,
      subscriptionId: subscriptionData.subscription_id,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
