import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  // Create response object first
  let response = NextResponse.redirect(`${origin}/pricing`)

  if (code) {
    // Create Supabase client with cookie handlers that set cookies on the response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // Set cookie on the request for reading in this handler
            request.cookies.set({
              name,
              value,
              ...options,
            })
            // Set cookie on the response to send to browser
            response = NextResponse.redirect(requestUrl, {
              headers: request.headers,
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            // Remove cookie from request
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            // Remove cookie from response
            response = NextResponse.redirect(requestUrl, {
              headers: request.headers,
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error)
      response = NextResponse.redirect(`${origin}/signup?error=auth_failed`)
      return response
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
          response = NextResponse.redirect(`${origin}/dashboard`)
          return response
        }
      }

      // No subscription, redirect to pricing
      response = NextResponse.redirect(`${origin}/pricing`)
      return response
    }
  }

  // No code or no user, redirect to pricing
  return response
}
