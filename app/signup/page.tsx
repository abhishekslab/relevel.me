'use client'

import { useState } from 'react'

// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { Sparkles, Mail, CheckCircle2 } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-600/20 border border-violet-500/30">
            <CheckCircle2 className="w-8 h-8 text-violet-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Check your email</h1>
            <p className="text-white/60">
              We sent a magic link to <span className="text-violet-400 font-medium">{email}</span>
            </p>
            <p className="text-sm text-white/40 pt-4">
              Click the link in the email to sign in. The link will expire in 1 hour.
            </p>
          </div>
          <Button onClick={() => setSent(false)} variant="outline" className="w-full">
            Use a different email
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-violet-400" />
            <h1 className="text-3xl font-bold">relevel.me</h1>
          </div>
          <p className="text-white/60">Enter your email to receive a magic link</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending...' : 'Send magic link'}
          </Button>
        </form>

        <div className="text-center text-sm text-white/40 space-y-2">
          <p>
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-violet-400 hover:underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-violet-400 hover:underline">
              Privacy Policy
            </Link>
          </p>
          <p>
            <Link href="/" className="text-violet-400 hover:underline">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
