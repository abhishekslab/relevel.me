import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/signup?error=auth_failed`)
    }

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

      // No subscription, redirect to pricing
      return NextResponse.redirect(`${origin}/pricing`)
    }
  }

  // No code or no user, redirect to pricing
  return NextResponse.redirect(`${origin}/pricing`)
}
