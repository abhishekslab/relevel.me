'use server'

import { signOut as authSignOut } from '@/lib/auth/server'

/**
 * Server action to sign out the current user
 */
export async function signOut() {
  await authSignOut()
}
