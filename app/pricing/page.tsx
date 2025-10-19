'use client'

import { useState } from 'react'

// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Zap,
  Server,
  Phone,
  Check,
  Bell,
  ArrowRight,
  Crown
} from 'lucide-react'

export default function PricingPage() {
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifyTier, setNotifyTier] = useState<'self_host' | 'max' | null>(null)
  const [loading, setLoading] = useState(false)
  const [notifySuccess, setNotifySuccess] = useState(false)
  const router = useRouter()

  const handleNotifyMe = async (tier: 'self_host' | 'max') => {
    if (!notifyEmail) {
      alert('Please enter your email address')
      return
    }

    setLoading(true)
    setNotifyTier(tier)

    try {
      const supabase = createClient()
      const { error } = await supabase.from('waitlist').insert({
        email: notifyEmail,
        tier: tier,
      })

      if (error) {
        alert('Failed to join waitlist. You may have already signed up.')
      } else {
        setNotifySuccess(true)
      }
    } catch (error) {
      console.error('Waitlist error:', error)
      alert('An error occurred. Please try again.')
    }

    setLoading(false)
  }

  const handleSubscribe = async () => {
    setLoading(true)

    try {
      // Call API to create DodoPayment subscription and get checkout URL
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'pro' }),
      })

      const data = await response.json()

      if (data.checkoutUrl) {
        // Redirect directly to DodoPayments hosted checkout
        window.location.href = data.checkoutUrl
      } else {
        alert(data.error || 'Failed to create checkout session')
        setLoading(false)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 mb-2">
            <Sparkles className="w-8 h-8 text-violet-400" />
            <h1 className="text-3xl font-bold">relevel.me</h1>
          </div>
          <h2 className="text-4xl font-bold">Choose Your Path</h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Select the perfect plan to enhance your skill development journey
          </p>
          <Link href="/vision" className="inline-flex items-center gap-2 text-violet-400 hover:underline text-sm">
            Learn about our vision <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {notifySuccess && (
          <div className="max-w-md mx-auto p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-center">
            Thanks! We'll notify you when {notifyTier === 'self_host' ? 'Self-Host' : 'Max'} tier is available.
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Pro Tier */}
          <Card className="p-6 space-y-6 border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-transparent relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/20 rounded-full blur-3xl" />
            <div className="relative space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-violet-400" />
                <h3 className="text-2xl font-bold">Pro</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$29</span>
                <span className="text-white/60">/month</span>
              </div>
              <p className="text-white/60">
                Best-in-class AI for optimal skill tracking
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">State-of-the-art LLMs for intelligent progress tracking</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Interactive worldboard with fog-of-war exploration</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Smart checkpoint reminders & quest system</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Advanced analytics & skill insights</span>
              </div>
            </div>

            <Button onClick={handleSubscribe} className="w-full" disabled={loading}>
              {loading ? 'Processing...' : (
                <>
                  Get Started <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </Card>

          {/* Max Tier - Coming Soon */}
          <Card className="p-6 space-y-6 border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent relative overflow-hidden opacity-90">
            <Badge className="absolute top-4 right-4 bg-amber-500/20 text-amber-400 border-amber-500/30">
              Coming Soon
            </Badge>
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl" />
            <div className="relative space-y-2">
              <div className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-amber-400" />
                <h3 className="text-2xl font-bold">Max</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">$100</span>
                <span className="text-white/60">/month</span>
              </div>
              <p className="text-white/60">
                Premium features with inbound calling
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Everything in Pro</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-medium">Call your virtual self anytime via phone</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">AI voice companion for skill discussions</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Priority support & early access to features</span>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                className="w-full"
              />
              <Button
                onClick={() => handleNotifyMe('max')}
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                <Bell className="w-4 h-4 mr-2" />
                Notify Me
              </Button>
            </div>
          </Card>

          {/* Self-Host Tier - Coming Soon */}
          <Card className="p-6 space-y-6 border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent relative overflow-hidden opacity-90">
            <Badge className="absolute top-4 right-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              Coming Soon
            </Badge>
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 rounded-full blur-3xl" />
            <div className="relative space-y-2">
              <div className="flex items-center gap-2">
                <Server className="w-6 h-6 text-cyan-400" />
                <h3 className="text-2xl font-bold">Self-Host</h3>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">Own your data</span>
              </div>
              <p className="text-white/60">
                Complete control & privacy
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Host relevel.me on your own infrastructure</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Complete data ownership & privacy</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Use your own AI API keys</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm">Docker deployment & full customization</span>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                type="email"
                placeholder="your@email.com"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                className="w-full"
              />
              <Button
                onClick={() => handleNotifyMe('self_host')}
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                <Bell className="w-4 h-4 mr-2" />
                Notify Me
              </Button>
            </div>
          </Card>
        </div>

        {/* Footer Links */}
        <div className="text-center text-sm text-white/60 space-x-4 pt-8">
          <Link href="/refund" className="hover:text-violet-400">Refund Policy</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-violet-400">Privacy</Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-violet-400">Terms</Link>
        </div>
      </div>
    </div>
  )
}
