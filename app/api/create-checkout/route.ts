import { NextResponse } from 'next/server'
import { requireAuth, createServerClient } from '@/lib/auth/server'
import DodoPayments from 'dodopayments'

export async function POST(request: Request) {
  try {
    // Require authentication
    const session = await requireAuth()

    const { tier } = await request.json()

    // Validate inputs
    if (!tier) {
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

    // Get user record from public.users
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('id', session.user.id)
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

    // DodoPayments API integration using official SDK
    const dodoSecretKey = process.env.DODOPAYMENTS_SECRET_KEY

    if (!dodoSecretKey) {
      console.error('DodoPayments API key not configured')
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

    // Initialize DodoPayments SDK client
    const dodoClient = new DodoPayments({
      bearerToken: dodoSecretKey,
    })

    // Create subscription with DodoPayments SDK
    // Documentation: https://docs.dodopayments.com/api-reference/subscriptions/post-subscriptions
    let subscription
    try {
      subscription = await dodoClient.subscriptions.create({
        product_id: productId,
        quantity: 1,
        payment_link: true, // This generates a hosted checkout page
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.PUBLIC_URL || 'http://localhost:3000'}/dashboard?checkout=success`,
        customer: {
          email: session.user.email || '',
          name: session.user.email?.split('@')[0] || 'User',
        },
        billing: {
          // DodoPayments will collect billing address during checkout
          street: '',
          city: '',
          state: '',
          country: 'US',
          zipcode: ''
        },
        metadata: {
          user_id: userRecord.id, // Now auth.uid() = users.id, so they're the same!
          tier: tier,
        },
      })
    } catch (sdkError: any) {
      console.error('DodoPayments SDK error:', sdkError)
      console.error('Error details:', sdkError.message)
      return NextResponse.json(
        { error: 'Unable to create subscription. Please try again later or contact support.' },
        { status: 503 }
      )
    }

    // DodoPayments returns a payment_link when payment_link: true is set
    return NextResponse.json({
      checkoutUrl: subscription.payment_link,
      subscriptionId: subscription.subscription_id,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
