'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { User, Mail, Calendar, Shield, LogOut, ArrowLeft } from 'lucide-react'

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('[Settings] Creating Supabase client...')
        const supabase = createClient()

        console.log('[Settings] Fetching user...')
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        console.log('[Settings] User:', user)
        console.log('[Settings] User Error:', userError)

        if (userError) {
          setError(`User Error: ${userError.message}`)
          setLoading(false)
          return
        }

        if (!user) {
          setError('No user found - not logged in')
          setLoading(false)
          return
        }

        console.log('[Settings] Fetching session...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        console.log('[Settings] Session:', session)
        console.log('[Settings] Session Error:', sessionError)

        setUser(user)
        setSession(session)
        setLoading(false)
      } catch (err) {
        console.error('[Settings] Caught error:', err)
        setError(`Exception: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center">
        <div className="text-white/60">Loading user data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 space-y-4">
          <div className="text-center space-y-2">
            <Shield className="w-12 h-12 text-red-400 mx-auto" />
            <h2 className="text-xl font-bold text-red-400">Authentication Error</h2>
            <p className="text-white/60">{error}</p>
          </div>
          <div className="space-y-2">
            <Link href="/signup">
              <Button className="w-full">Go to Signup</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-white/60">Your account information</p>
        </div>

        {/* User Info Card */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-violet-400" />
            User Information
          </h2>

          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
              <Mail className="w-5 h-5 text-violet-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-white/60">Email</div>
                <div className="font-medium">{user?.email || 'N/A'}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
              <Shield className="w-5 h-5 text-violet-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-white/60">User ID</div>
                <div className="font-mono text-xs break-all">{user?.id || 'N/A'}</div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
              <Calendar className="w-5 h-5 text-violet-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-white/60">Created At</div>
                <div className="text-sm">
                  {user?.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
              <Calendar className="w-5 h-5 text-violet-400 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm text-white/60">Last Sign In</div>
                <div className="text-sm">
                  {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Session Info Card */}
        {session && (
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-bold">Session Information</h2>
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-white/60">Access Token: </span>
                <span className="font-mono text-xs break-all">
                  {session.access_token ? '***' + session.access_token.slice(-20) : 'N/A'}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-white/60">Expires At: </span>
                {session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'N/A'}
              </div>
            </div>
          </Card>
        )}

        {/* Debug Info */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Debug Info</h2>
          <div className="space-y-2 text-sm font-mono">
            <div>
              <span className="text-white/60">Environment Check:</span>
              <div className="mt-1 p-2 bg-white/5 rounded">
                NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing'}
              </div>
              <div className="mt-1 p-2 bg-white/5 rounded">
                NEXT_PUBLIC_SUPABASE_ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}
              </div>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
          <Link href="/">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
