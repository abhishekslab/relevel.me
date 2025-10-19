import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Auth callback handler for magic link authentication
 * 1. Exchanges the code for a session
 * 2. Provisions user record if it doesn't exist
 * 3. Redirects to dashboard (subscription check happens on dashboard page)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Missing code parameter
  if (!code) {
    console.error('Auth callback: Missing code parameter')
    return NextResponse.redirect(`${origin}/signup?error=missing_code`)
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Cookie setting can fail in some cases - log but continue
            console.error('Failed to set cookie:', error)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            console.error('Failed to remove cookie:', error)
          }
        },
      },
    }
  )

  // Exchange code for session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Auth callback error:', error.message)
    return NextResponse.redirect(`${origin}/signup?error=auth_failed`)
  }

  if (!data.user) {
    console.error('Auth callback: No user in session')
    return NextResponse.redirect(`${origin}/signup?error=no_user`)
  }

  // Provision user record (creates if doesn't exist)
  try {
    const provisionResponse = await fetch(`${origin}/api/auth/provision`, {
      method: 'POST',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
    })

    if (!provisionResponse.ok) {
      console.error('User provisioning failed:', await provisionResponse.text())
      // Continue anyway - user record might already exist
    }
  } catch (error) {
    console.error('Error calling provision API:', error)
    // Continue anyway - this is not critical
  }

  // Always redirect to dashboard
  // Dashboard page will handle subscription checks using requireSubscription()
  return NextResponse.redirect(`${origin}/dashboard`)
}
