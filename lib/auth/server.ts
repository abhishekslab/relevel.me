import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export interface AuthSession {
  user: User
  accessToken: string
}

export interface UserWithSubscription {
  id: string
  auth_user_id: string
  email: string
  created_at: string
  subscription: {
    id: string
    status: string
    tier: string
    dodo_subscription_id: string
  } | null
}

/**
 * Creates a Supabase server client with proper cookie handling for Server Components
 */
export function createServerClient() {
  const cookieStore = cookies()

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle cookie setting errors (e.g., in Server Components)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle cookie removal errors
          }
        },
      },
    }
  )
}

/**
 * Get the current authenticated session
 * Returns null if not authenticated
 * Uses getUser() for security - validates with Supabase Auth server
 */
export async function getSession(): Promise<AuthSession | null> {
  const supabase = createServerClient()

  // Use getUser() instead of getSession() for security
  // getUser() validates the JWT by contacting the auth server
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  // Get the access token from the session
  const { data: { session } } = await supabase.auth.getSession()

  return {
    user,
    accessToken: session?.access_token || '',
  }
}

/**
 * Require authentication - redirects to /signup if not authenticated
 * Use in Server Components and Route Handlers
 */
export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession()

  if (!session) {
    redirect('/signup')
  }

  return session
}

/**
 * Get the current user with their subscription data
 * Returns null if not authenticated or user record not found
 */
export async function getUserWithSubscription(): Promise<UserWithSubscription | null> {
  const session = await getSession()

  if (!session) {
    return null
  }

  const supabase = createServerClient()

  // Get user record from public.users table
  const { data: userRecord, error: userError } = await supabase
    .from('users')
    .select(`
      id,
      auth_user_id,
      email,
      created_at,
      subscription:subscriptions(
        id,
        status,
        tier,
        dodo_subscription_id
      )
    `)
    .eq('auth_user_id', session.user.id)
    .single()

  if (userError || !userRecord) {
    return null
  }

  // Handle the case where subscription is an array (should be single)
  const subscription = Array.isArray(userRecord.subscription)
    ? userRecord.subscription[0] || null
    : userRecord.subscription

  return {
    ...userRecord,
    email: userRecord.email || session.user.email || '',
    subscription,
  }
}

/**
 * Require an active subscription - redirects to /pricing if no active subscription
 * Use in Server Components and Route Handlers for subscription-gated content
 */
export async function requireSubscription(): Promise<UserWithSubscription> {
  const session = await requireAuth()
  const userWithSub = await getUserWithSubscription()

  // If no user record exists, redirect to pricing (user needs to be provisioned)
  if (!userWithSub) {
    redirect('/pricing')
  }

  // Check for active subscription
  if (!userWithSub.subscription || userWithSub.subscription.status !== 'active') {
    redirect('/pricing')
  }

  return userWithSub
}

/**
 * Sign out the current user
 * Use in Server Actions
 */
export async function signOut() {
  const supabase = createServerClient()
  await supabase.auth.signOut()
  redirect('/')
}
