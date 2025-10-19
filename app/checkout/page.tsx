'use client'

import { Suspense, useEffect, useState } from 'react'

// Force dynamic rendering - don't pre-render during build
export const dynamic = 'force-dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import { Sparkles, CreditCard, Lock, Shield, ArrowLeft } from 'lucide-react'

function CheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tier = searchParams.get('tier') || 'pro'

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/signup')
        return
      }

      setUser(user)
      setLoading(false)
    }

    checkUser()
  }, [router])

  const handleCheckout = async () => {
    if (!agreedToTerms) {
      alert('Please agree to the Terms and Privacy Policy')
      return
    }

    setProcessing(true)

    try {
      // Call API to create DodoPayment checkout session
      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          userId: user.id,
          email: user.email,
        }),
      })

      const data = await response.json()

      if (data.checkoutUrl) {
        // Redirect to DodoPayment checkout
        window.location.href = data.checkoutUrl
      } else {
        alert('Failed to create checkout session')
        setProcessing(false)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('An error occurred. Please try again.')
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  const tierInfo = {
    pro: {
      name: 'Pro',
      price: 29,
      description: 'Best-in-class AI for optimal skill tracking',
      features: [
        'State-of-the-art LLMs',
        'Interactive worldboard',
        'Smart checkpoint reminders',
        'Advanced analytics',
      ],
    },
  }

  const info = tierInfo[tier as keyof typeof tierInfo]

  return (
    <div className="min-h-screen bg-[#0b0f17] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 mb-2">
            <Sparkles className="w-8 h-8 text-violet-400" />
            <h1 className="text-3xl font-bold">relevel.me</h1>
          </div>
          <h2 className="text-2xl font-semibold">Complete Your Purchase</h2>
          <p className="text-white/60">
            You're subscribing as <span className="text-violet-400">{user?.email}</span>
          </p>
        </div>

        {/* Order Summary */}
        <Card className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Order Summary</h3>
            <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
              {info.name}
            </Badge>
          </div>

          <div className="space-y-4 py-4 border-y border-white/10">
            <div className="flex justify-between">
              <span className="text-white/60">Plan</span>
              <span className="font-medium">{info.name} Tier</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Billing Cycle</span>
              <span className="font-medium">Monthly</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-violet-400">${info.price}/month</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">What's included:</p>
            <div className="space-y-2">
              {info.features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-white/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Payment Info */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-violet-400" />
            <h3 className="font-semibold">Payment Details</h3>
          </div>
          <p className="text-sm text-white/60">
            You'll be redirected to our secure payment provider to complete your purchase.
          </p>
          <div className="flex items-center gap-4 text-sm text-white/40">
            <div className="flex items-center gap-1">
              <Lock className="w-4 h-4" />
              <span>Encrypted</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4" />
              <span>PCI Compliant</span>
            </div>
          </div>
        </Card>

        {/* Terms Agreement */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
          <Checkbox
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(!!checked)}
          />
          <label className="text-sm text-white/80 cursor-pointer" onClick={() => setAgreedToTerms(!agreedToTerms)}>
            I agree to the{' '}
            <Link href="/terms" target="_blank" className="text-violet-400 hover:underline">
              Terms and Conditions
            </Link>
            {' '}and{' '}
            <Link href="/privacy" target="_blank" className="text-violet-400 hover:underline">
              Privacy Policy
            </Link>
            . I understand this is a monthly subscription that will auto-renew until canceled.
          </label>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleCheckout}
            disabled={!agreedToTerms || processing}
            className="w-full h-12 text-base"
          >
            {processing ? 'Processing...' : `Subscribe for $${info.price}/month`}
          </Button>
          <Link href="/pricing">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Pricing
            </Button>
          </Link>
        </div>

        {/* Refund Policy Notice */}
        <p className="text-center text-sm text-white/40">
          You can cancel anytime. See our{' '}
          <Link href="/refund" className="text-violet-400 hover:underline">
            refund policy
          </Link>{' '}
          for details.
        </p>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
