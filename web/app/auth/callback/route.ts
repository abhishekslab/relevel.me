import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Auth callback handler for magic link authentication
 * Supports both PKCE flow (session via cookies) and OAuth code flow
 * 1. Checks for existing session (PKCE) or exchanges code for session (OAuth)
 * 2. User record automatically created by database trigger (handle_new_auth_user)
 * 3. Redirects to onboarding for profile completion
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  // Use NEXT_PUBLIC_APP_URL instead of origin to avoid 0.0.0.0 issues
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://relevel.me'

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

  let user = null

  // Handle OAuth code flow (newer)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Auth callback error (code flow):', error.message)
      return NextResponse.redirect(`${baseUrl}/signup?error=auth_failed`)
    }
    user = data.user
  }
  // Handle PKCE token_hash flow or check existing session
  else if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })
    if (error) {
      console.error('Auth callback error (token flow):', error.message)
      return NextResponse.redirect(`${baseUrl}/signup?error=auth_failed`)
    }
    user = data.user
  }
  // Check if session already exists (PKCE flow sets cookies directly)
  else {
    const { data: { user: existingUser }, error } = await supabase.auth.getUser()
    if (!error && existingUser) {
      user = existingUser
    } else {
      console.error('Auth callback: No code, token, or existing session')
      return NextResponse.redirect(`${baseUrl}/signup?error=missing_params`)
    }
  }

  if (!user) {
    console.error('Auth callback: No user in session')
    return NextResponse.redirect(`${baseUrl}/signup?error=no_user`)
  }

  // User record automatically created by database trigger (handle_new_auth_user)
  // See: supabase/migrations/20250102_add_subscriptions.sql:109-131
  // No need for manual provisioning - the trigger handles it

  // Redirect to onboarding for profile completion
  // Onboarding page will check if profile is complete and skip if needed
  return NextResponse.redirect(`${baseUrl}/onboarding`)
}
