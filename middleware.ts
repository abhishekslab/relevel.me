import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect /dashboard route
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    // Check if user is authenticated
    if (!user) {
      const redirectUrl = new URL('/signup', request.url)
      return NextResponse.redirect(redirectUrl)
    }

    // Get user record from public.users table
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userRecord) {
      const redirectUrl = new URL('/pricing', request.url)
      return NextResponse.redirect(redirectUrl)
    }

    // Check if user has an active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userRecord.id)
      .eq('status', 'active')
      .single()

    if (!subscription) {
      const redirectUrl = new URL('/pricing', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Redirect authenticated users from signup to pricing (if no subscription) or dashboard (if active subscription)
  if (request.nextUrl.pathname === '/signup' && user) {
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userRecord) {
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userRecord.id)
        .eq('status', 'active')
        .single()

      if (subscription) {
        const redirectUrl = new URL('/dashboard', request.url)
        return NextResponse.redirect(redirectUrl)
      }
    }

    const redirectUrl = new URL('/pricing', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/signup', '/checkout'],
}
