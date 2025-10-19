'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from './supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

type AuthContextType = {
  user: User | null
  subscription: any | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  subscription: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [subscription, setSubscription] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  // Defer Supabase client creation to avoid build-time evaluation
  const supabaseRef = useRef<SupabaseClient | null>(null)

  useEffect(() => {
    // Initialize Supabase client on mount (client-side only)
    if (!supabaseRef.current) {
      supabaseRef.current = createClient()
    }
    const supabase = supabaseRef.current

    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      setUser(user)

      if (user) {
        // Get user record from public.users
        const { data: userRecord } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (userRecord) {
          // Fetch subscription
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userRecord.id)
            .single()

          setSubscription(sub)
        }
      }

      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription: authListener },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        // Get user record from public.users
        const { data: userRecord } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .single()

        if (userRecord) {
          // Fetch subscription
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userRecord.id)
            .single()

          setSubscription(sub)
        } else {
          setSubscription(null)
        }
      } else {
        setSubscription(null)
      }

      setLoading(false)
    })

    return () => {
      authListener.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    if (supabaseRef.current) {
      await supabaseRef.current.auth.signOut()
    }
    setUser(null)
    setSubscription(null)
  }

  return (
    <AuthContext.Provider value={{ user, subscription, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
