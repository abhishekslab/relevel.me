import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = createServerClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)

    if (data.user) {
      // Check if user has an active subscription
      const { data: userRecord } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', data.user.id)
        .single()

      if (userRecord) {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userRecord.id)
          .eq('status', 'active')
          .single()

        if (subscription) {
          // Has subscription, go to dashboard
          return NextResponse.redirect(`${origin}/dashboard`)
        }
      }
    }
  }

  // No subscription, redirect to pricing
  return NextResponse.redirect(`${origin}/pricing`)
}
