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
      email,
      created_at,
      subscription:subscriptions(
        id,
        status,
        tier,
        dodo_subscription_id
      )
    `)
    .eq('id', session.user.id)
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
 * For self-hosted instances, this check is bypassed when NEXT_PUBLIC_SELF_HOSTED=true
 * Use in Server Components and Route Handlers for subscription-gated content
 */
export async function requireSubscription(): Promise<UserWithSubscription> {
  const session = await requireAuth()

  // Skip subscription check for self-hosted instances
  if (process.env.NEXT_PUBLIC_SELF_HOSTED === 'true') {
    const supabase = createServerClient()
    const { data: userRecord } = await supabase
      .from('users')
      .select('id, email, created_at')
      .eq('id', session.user.id)
      .single()

    if (!userRecord) {
      // User record still required even for self-hosted
      redirect('/pricing')
    }

    // Return user without subscription requirement for self-hosted
    return {
      ...userRecord,
      email: userRecord.email || session.user.email || '',
      subscription: null, // No subscription needed for self-hosted
    }
  }

  // Existing subscription check logic for hosted instances
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
