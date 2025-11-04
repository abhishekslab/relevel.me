import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, DollarSign, AlertCircle, CheckCircle2, XCircle, Mail } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#0b0f17] py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Link href="/" className="inline-block hover:opacity-80 transition mb-4">
            <Image
              src="/logo.png"
              alt="Relevel.me Logo"
              width={120}
              height={120}
              className="drop-shadow-[0_0_24px_rgba(143,123,255,0.4)]"
            />
          </Link>
          <h2 className="text-4xl font-bold">Refund Policy</h2>
          <p className="text-white/60">Last updated: January 2025</p>
        </div>

        {/* Quick Summary */}
        <Card className="p-6 border-violet-500/30 bg-violet-500/5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-violet-400" />
            TL;DR
          </h3>
          <div className="text-sm text-white/80 space-y-2">
            <p>• You can cancel your subscription anytime—no questions asked</p>
            <p>• Refunds are handled on a case-by-case basis within 7 days of payment</p>
            <p>• Heavy usage (especially AI and voice credits) may affect refund eligibility</p>
            <p>• Contact us for refund requests—we're reasonable humans</p>
          </div>
        </Card>

        {/* Policy Content */}
        <div className="prose prose-invert max-w-none space-y-6">
          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">1. Cancellation Policy</h3>
            <div className="text-white/80 space-y-3">
              <p>
                You can cancel your relevel.me subscription at any time through your account settings. Cancellation takes
                effect at the end of your current billing period, and you'll retain full access until then.
              </p>
              <p className="font-semibold text-violet-400">
                No automatic refunds are issued upon cancellation—you paid for the month, you get the month.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">2. Refund Eligibility</h3>
            <div className="text-white/80 space-y-3">
              <p>
                Refund requests are evaluated on a <strong className="text-violet-400">case-by-case basis</strong> within
                <strong className="text-violet-400"> 7 days of your payment date</strong>. We're fair and understanding,
                but we also need to cover our costs.
              </p>

              <div className="space-y-4 mt-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-400 mb-2">Likely Approved:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>Technical issues preventing you from using relevel.me (and we couldn't resolve them)</li>
                      <li>Accidental duplicate charges or billing errors</li>
                      <li>First-time subscription within 7 days with minimal usage</li>
                      <li>Service didn't match the description on our pricing page</li>
                      <li>You discovered we're not compatible with your workflow after trying</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-400 mb-2">Evaluated Carefully:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>Moderate usage of Pro tier features (some AI insights generated, checkpoints created)</li>
                      <li>Changed your mind after 3-5 days of use</li>
                      <li>Found a different tool that suits you better</li>
                      <li>Financial hardship (we'll work with you)</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-400 mb-2">Unlikely Approved:</p>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>Heavy use of AI features (we pay per API call)</li>
                      <li><strong>Max tier with significant voice call usage</strong> (CallKaro charges us per minute)</li>
                      <li>Requesting refund after 7+ days</li>
                      <li>Multiple refund requests across different accounts (pattern abuse)</li>
                      <li>Account flagged for violating Terms of Service</li>
                      <li>"Just testing it out" after extensive feature exploration</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">3. Voice Credit Costs (Max Tier)</h3>
            <div className="text-white/80 space-y-3">
              <p className="font-semibold text-violet-400">
                Why we can't always refund Max tier subscriptions:
              </p>
              <p>
                The Max tier ($100/month) includes AI voice calling powered by CallKaro. Each minute of voice conversation
                costs us real money—approximately $0.50-$1.00 per minute depending on usage patterns.
              </p>
              <p>
                If you've used 50+ minutes of voice calls and request a refund, we'd lose money on that transaction
                (we'd pay CallKaro but refund you the $100). That's not sustainable.
              </p>
              <p>
                <strong>Our approach:</strong> If you've used voice features moderately (under 20 minutes) and have a
                legitimate reason within 7 days, we'll likely approve a partial or full refund. Heavy usage means refund
                requests will be denied—but you can still cancel to prevent future charges.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">4. How to Request a Refund</h3>
            <div className="text-white/80 space-y-3">
              <p>Email us at <a href="mailto:refunds@relevel.me" className="text-violet-400 hover:underline font-medium">refunds@relevel.me</a> with:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your account email</li>
                <li>Date of charge</li>
                <li>Reason for refund request</li>
                <li>Brief description of your usage (be honest—we can see it anyway)</li>
              </ul>
              <p>
                We'll respond within <strong>48 hours</strong> with our decision. If approved, refunds are processed
                via DodoPayments and appear in your account within 5-10 business days.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">5. Partial Refunds</h3>
            <div className="text-white/80 space-y-3">
              <p>
                In some cases, we may offer a partial refund instead of a full refund. For example:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You used the service for 2 weeks out of a month → 50% refund</li>
                <li>Max tier with moderate voice usage (20-40 minutes) → Refund minus voice costs (~$20-$40)</li>
                <li>Billing error but some legitimate usage occurred → Pro-rated refund</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">6. Chargebacks</h3>
            <div className="text-white/80 space-y-3 flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
              <div>
                <p className="font-semibold text-amber-400">
                  Please contact us before filing a chargeback with your bank.
                </p>
                <p>
                  Chargebacks cost us $15-$25 in fees even if they're reversed. If you file a chargeback without
                  attempting to resolve the issue with us first, we'll:
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-2">
                  <li>Immediately suspend your account</li>
                  <li>Ban your email from future signups</li>
                  <li>Contest the chargeback with evidence of service delivery</li>
                </ul>
                <p className="mt-2">
                  Let's talk first. We're reasonable and want to make things right.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">7. Service Discontinuation</h3>
            <div className="text-white/80 space-y-3">
              <p>
                If we ever discontinue relevel.me (we hope not!), we'll provide 60 days notice and issue pro-rated refunds
                for any prepaid time remaining. You'll also get export access to all your data.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">8. Our Philosophy</h3>
            <div className="text-white/80 space-y-3">
              <p>
                We built relevel.me to help people learn and grow. We're not here to trap you in a subscription you don't want.
              </p>
              <p>
                <strong>If you're unhappy, tell us why.</strong> Maybe we can fix it. If not, we'll be reasonable about
                refunds when it makes sense. But we also need to cover our costs—AI isn't free, and neither are voice calls.
              </p>
              <p className="text-violet-400 font-medium">
                Be honest with us, and we'll be fair with you.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">9. Contact</h3>
            <div className="text-white/80 space-y-3 flex items-start gap-3">
              <Mail className="w-6 h-6 text-violet-400 flex-shrink-0 mt-1" />
              <div>
                <p>Refund questions or requests:</p>
                <p className="mt-2">
                  <a href="mailto:refunds@relevel.me" className="text-violet-400 hover:underline font-medium text-lg">
                    refunds@relevel.me
                  </a>
                </p>
                <p className="text-sm text-white/60 mt-4">
                  Response time: Within 48 hours
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-8 text-center space-y-4">
          <div className="text-sm text-white/60 space-x-4">
            <Link href="/terms" className="hover:text-violet-400">Terms & Conditions</Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-violet-400">Privacy Policy</Link>
            <span>•</span>
            <Link href="/" className="hover:text-violet-400">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
