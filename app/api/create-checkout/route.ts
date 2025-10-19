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

    // Create checkout session with DodoPayments
    // Documentation: https://docs.dodopayments.com/
    const checkoutResponse = await fetch('https://api.dodopayments.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dodoSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_name: 'Relevel.me Pro',
        price: 2900, // $29.00 in cents
        currency: 'USD',
        billing_period: 'monthly',
        customer_email: email,
        success_url: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/dashboard?checkout=success`,
        cancel_url: `${process.env.PUBLIC_URL || 'http://localhost:3000'}/pricing?checkout=cancelled`,
        metadata: {
          user_id: userRecord.id, // Use public.users.id, not auth.users.id
          tier: tier,
        },
      }),
    })

    if (!checkoutResponse.ok) {
      const error = await checkoutResponse.text()
      console.error('DodoPayments error:', error)
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    const checkoutData = await checkoutResponse.json()

    return NextResponse.json({
      checkoutUrl: checkoutData.checkout_url,
      sessionId: checkoutData.id,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
