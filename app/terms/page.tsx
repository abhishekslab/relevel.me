import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, FileText, Scale, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0b0f17] py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <Link href="/" className="inline-flex items-center gap-2 mb-2 hover:opacity-80 transition">
            <Image
              src="/logo.png"
              alt="Relevel.me"
              width={32}
              height={32}
              className="drop-shadow-[0_0_16px_rgba(143,123,255,0.4)]"
            />
            <h1 className="text-3xl font-bold">relevel.me</h1>
          </Link>
          <h2 className="text-4xl font-bold">Terms & Conditions</h2>
          <p className="text-white/60">Last updated: January 2025</p>
        </div>

        {/* Quick Summary */}
        <Card className="p-6 border-violet-500/30 bg-violet-500/5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-violet-400" />
            Terms in Plain English
          </h3>
          <div className="text-sm text-white/80 space-y-2">
            <p>• You can cancel your subscription anytime—no questions asked</p>
            <p>• We use AI to help track your skills, and that costs us money (hence the subscription)</p>
            <p>• Be respectful, don't abuse the service, and we'll get along great</p>
            <p>• Your data is yours—we're just the caretakers</p>
            <p>• Questions? Email us. We're humans (mostly).</p>
          </div>
        </Card>

        {/* Terms Content */}
        <div className="prose prose-invert max-w-none space-y-6">
          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">1. Acceptance of Terms</h3>
            <div className="text-white/80 space-y-3">
              <p>
                By accessing or using relevel.me ("the Service," "we," "us," or "our"), you agree to be bound
                by these Terms and Conditions. If you don't agree, please don't use relevel.me.
              </p>
              <p>
                We may modify these terms occasionally. We'll notify you via email 30 days before material changes take effect.
                Continued use after changes means you accept the new terms.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">2. Service Description</h3>
            <div className="text-white/80 space-y-3">
              <p>
                relevel.me is a gamified skill-tracking platform that helps you visualize and manage your learning journey
                through an interactive worldboard interface. We use state-of-the-art AI models to provide insights,
                reminders, and personalized recommendations.
              </p>
              <p>
                The Service is provided "as is." While we strive for 99.9% uptime, we can't guarantee uninterrupted access
                (servers crash, the internet breaks, cats walk on keyboards).
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">3. Account Registration</h3>
            <div className="text-white/80 space-y-3">
              <p>To use relevel.me, you must:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Be at least 13 years old (or have parental consent)</li>
                <li>Provide a valid email address</li>
                <li>Maintain the security of your account (don't share magic links)</li>
                <li>Notify us immediately of unauthorized access</li>
              </ul>
              <p>
                One account per person. Creating multiple accounts to abuse free trials or promotional offers is prohibited
                and may result in immediate termination.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">4. Subscription & Billing</h3>
            <div className="text-white/80 space-y-3">
              <p><strong className="text-violet-400">Subscription Tiers:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Pro ($29/month):</strong> Full access to relevel.me with AI-powered insights</li>
                <li><strong>Max ($100/month):</strong> Pro + voice AI calling features (coming soon)</li>
                <li><strong>Self-Host:</strong> Run relevel.me on your own infrastructure (coming soon)</li>
              </ul>
              <p><strong className="text-violet-400">Billing Terms:</strong></p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Subscriptions are billed monthly in advance</li>
                <li>Payments are processed via DodoPayments (PCI DSS compliant)</li>
                <li>Prices are in USD and exclude applicable taxes</li>
                <li>Auto-renewal occurs on your billing date unless canceled</li>
                <li>Price changes will be communicated 30 days in advance</li>
              </ul>
              <p><strong className="text-violet-400">Cancellation:</strong></p>
              <p>
                You can cancel anytime from your account settings. Cancellation takes effect at the end of your current billing period.
                You'll retain access until then. No partial refunds for unused time (see Refund Policy for exceptions).
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">5. Acceptable Use</h3>
            <div className="text-white/80 space-y-3">
              <p>You agree NOT to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use relevel.me for illegal purposes or to violate any laws</li>
                <li>Attempt to hack, reverse engineer, or compromise the Service</li>
                <li>Use automated bots or scrapers (except for personal data export)</li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>Impersonate others or create fake accounts</li>
                <li>Resell or redistribute access to relevel.me without permission</li>
                <li>Abuse AI features to generate spam or harmful content</li>
                <li>Excessively use voice calling (Max tier) to the point it impacts service quality for others</li>
              </ul>
              <p className="text-sm text-amber-400 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                Violations may result in immediate account suspension or termination without refund.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">6. Intellectual Property</h3>
            <div className="text-white/80 space-y-3">
              <p><strong className="text-violet-400">Your Content:</strong></p>
              <p>
                You own all skill data, notes, and content you create in relevel.me. By using the Service, you grant us a
                limited license to process this data solely to provide and improve relevel.me. We will never use your data
                to train public AI models or share it with competitors.
              </p>
              <p><strong className="text-violet-400">Our Content:</strong></p>
              <p>
                relevel.me's code, design, UI, worldboard concept, and branding are our intellectual property. You may not
                copy, modify, or create derivative works without written permission (except for Self-Host tier under
                its specific license).
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">7. AI & Voice Features</h3>
            <div className="text-white/80 space-y-3">
              <p>
                relevel.me uses third-party AI services (OpenAI, Anthropic) to generate insights and (for Max tier) voice
                interactions via CallKaro. By using these features:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>You acknowledge AI outputs may occasionally be inaccurate or unexpected</li>
                <li>Voice recordings are processed by CallKaro per their privacy policy</li>
                <li>We are not liable for AI-generated content (though we work hard to keep it helpful)</li>
                <li>Max tier voice usage is subject to fair use limits (currently 100 minutes/month)</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">8. Data & Privacy</h3>
            <div className="text-white/80 space-y-3">
              <p>
                Your privacy matters. See our{' '}
                <Link href="/privacy" className="text-violet-400 hover:underline">Privacy Policy</Link>
                {' '}for details on how we collect, use, and protect your data.
              </p>
              <p>Key points:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>We encrypt your data at rest and in transit</li>
                <li>We never sell your personal information</li>
                <li>You can export or delete your data anytime</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">9. Limitation of Liability</h3>
            <div className="text-white/80 space-y-3">
              <p>
                To the maximum extent permitted by law, relevel.me and its operators are not liable for:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Lost data (though we backup regularly—you should too)</li>
                <li>Service interruptions or downtime</li>
                <li>Indirect, incidental, or consequential damages</li>
                <li>Third-party service failures (Supabase, DodoPayments, CallKaro, AI providers)</li>
              </ul>
              <p>
                Our total liability is limited to the amount you paid in the last 12 months (or $100, whichever is greater).
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">10. Warranty Disclaimer</h3>
            <div className="text-white/80 space-y-3">
              <p>
                relevel.me is provided "AS IS" without warranties of any kind, express or implied. We don't guarantee:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Perfect accuracy of AI insights</li>
                <li>Uninterrupted service availability</li>
                <li>Bug-free operation (we squash them as fast as we can)</li>
                <li>That using relevel.me will make you a skill-learning superhero (but it might help)</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">11. Termination</h3>
            <div className="text-white/80 space-y-3">
              <p>
                Either party may terminate this agreement:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>You:</strong> Cancel subscription anytime (takes effect end of billing period)</li>
                <li><strong>Us:</strong> Terminate for violations of these terms (immediate, no refund)</li>
                <li><strong>Us:</strong> Discontinue the Service with 60 days notice (pro-rated refund)</li>
              </ul>
              <p>
                Upon termination, you have 30 days to export your data before it's archived.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">12. Dispute Resolution</h3>
            <div className="text-white/80 space-y-3">
              <p>
                If we have a dispute, let's talk first: <a href="mailto:support@relevel.me" className="text-violet-400 hover:underline">support@relevel.me</a>
              </p>
              <p>
                If that doesn't work, any legal disputes will be governed by the laws of [Your Jurisdiction] and resolved
                through binding arbitration (except small claims court). Class action lawsuits are waived.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">13. Miscellaneous</h3>
            <div className="text-white/80 space-y-3">
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Entire Agreement:</strong> These terms + Privacy Policy = our complete agreement</li>
                <li><strong>Severability:</strong> If one clause is invalid, the rest still apply</li>
                <li><strong>No Waiver:</strong> Our failure to enforce a right doesn't mean we've waived it</li>
                <li><strong>Assignment:</strong> You can't transfer your account; we can transfer the business</li>
                <li><strong>Force Majeure:</strong> We're not liable for delays due to events beyond our control</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">14. Contact</h3>
            <div className="text-white/80 space-y-3 flex items-start gap-3">
              <Scale className="w-6 h-6 text-violet-400 flex-shrink-0 mt-1" />
              <div>
                <p>
                  Questions about these terms?
                </p>
                <p className="mt-2">
                  <a href="mailto:legal@relevel.me" className="text-violet-400 hover:underline font-medium">
                    legal@relevel.me
                  </a>
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="pt-8 text-center space-y-4">
          <div className="text-sm text-white/60 space-x-4">
            <Link href="/privacy" className="hover:text-violet-400">Privacy Policy</Link>
            <span>•</span>
            <Link href="/refund" className="hover:text-violet-400">Refund Policy</Link>
            <span>•</span>
            <Link href="/" className="hover:text-violet-400">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
