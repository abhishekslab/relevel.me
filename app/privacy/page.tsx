import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, Shield, Lock, Eye, Database, Mail } from 'lucide-react'
import { Card } from '@/components/ui/card'

export default function PrivacyPolicyPage() {
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
          <h2 className="text-4xl font-bold">Privacy Policy</h2>
          <p className="text-white/60">Last updated: January 2025</p>
        </div>

        {/* Key Highlights */}
        <Card className="p-6 border-violet-500/30 bg-violet-500/5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-400" />
            Privacy at a Glance
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Lock className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Encrypted Data</p>
                <p className="text-white/60">All your data is encrypted at rest and in transit</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Eye className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Never Sold</p>
                <p className="text-white/60">We will never sell your data to third parties</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Database className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">You Own It</p>
                <p className="text-white/60">Your skill data belongs to you</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Policy Content */}
        <div className="prose prose-invert max-w-none space-y-6">
          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">1. Information We Collect</h3>
            <div className="text-white/80 space-y-3">
              <p>
                To provide you with the relevel.me skill-tracking experience, we collect the following information:
              </p>
              <div className="pl-4 space-y-2">
                <p><strong className="text-violet-400">Account Information:</strong> Email address used for authentication and communication</p>
                <p><strong className="text-violet-400">Skill Data:</strong> Your tracked skills, progress, levels, checkpoints, and learning activities</p>
                <p><strong className="text-violet-400">Usage Data:</strong> How you interact with the platform (worldboard navigation, shrine visits, quest completion)</p>
                <p><strong className="text-violet-400">Payment Information:</strong> Processed securely through DodoPayments (we do not store credit card details)</p>
                <p><strong className="text-violet-400">Voice Data (Max tier):</strong> Voice interactions with AI companion, processed via CallKaro API</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">2. How We Use Your Information</h3>
            <div className="text-white/80 space-y-3">
              <p>We use your data exclusively to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide and improve the relevel.me skill-tracking service</li>
                <li>Generate personalized insights and recommendations using AI</li>
                <li>Send checkpoint reminders and quest notifications</li>
                <li>Process your subscription payments</li>
                <li>Communicate important service updates</li>
                <li>Enable voice AI features (Max tier only)</li>
                <li>Provide customer support</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">3. Data Sharing & Third Parties</h3>
            <div className="text-white/80 space-y-3">
              <p className="font-semibold text-violet-400">
                We do NOT sell your personal data to anyone. Period.
              </p>
              <p>We only share data with trusted service providers necessary to operate relevel.me:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Supabase:</strong> Database and authentication infrastructure (encrypted at rest)</li>
                <li><strong>DodoPayments:</strong> Payment processing (PCI DSS compliant)</li>
                <li><strong>CallKaro:</strong> AI voice calling service (Max tier only, voice data processed per their privacy policy)</li>
                <li><strong>AI Providers:</strong> OpenAI/Anthropic for generating insights (data anonymized where possible)</li>
              </ul>
              <p className="text-sm text-white/60">
                These providers are contractually obligated to protect your data and use it only for providing services to us.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">4. Data Security</h3>
            <div className="text-white/80 space-y-3">
              <p>We implement industry-standard security measures:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>End-to-end encryption for data in transit (TLS/SSL)</li>
                <li>Encryption at rest for all stored data (AES-256)</li>
                <li>Regular security audits and updates</li>
                <li>Row-level security policies in our database</li>
                <li>Secure authentication via magic links (no passwords to leak)</li>
                <li>Limited employee access with audit logs</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">5. Your Rights</h3>
            <div className="text-white/80 space-y-3">
              <p>You have complete control over your data:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Request a copy of all your data anytime</li>
                <li><strong>Correction:</strong> Update or correct your information through the dashboard</li>
                <li><strong>Deletion:</strong> Request complete account and data deletion</li>
                <li><strong>Export:</strong> Download your skill data in portable format (JSON)</li>
                <li><strong>Opt-out:</strong> Unsubscribe from emails (except critical service notifications)</li>
                <li><strong>Portability:</strong> Take your data elsewhere if you choose to leave</li>
              </ul>
              <p className="text-sm">
                To exercise these rights, contact us at{' '}
                <a href="mailto:privacy@relevel.me" className="text-violet-400 hover:underline">
                  privacy@relevel.me
                </a>
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">6. Data Retention</h3>
            <div className="text-white/80 space-y-3">
              <p>
                We retain your data as long as your account is active. If you cancel your subscription:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Your account remains accessible for 30 days (grace period)</li>
                <li>After 30 days, skill data is archived but not deleted (in case you return)</li>
                <li>You can request immediate permanent deletion anytime</li>
                <li>Payment records are kept for 7 years for tax/legal compliance</li>
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">7. Cookies & Tracking</h3>
            <div className="text-white/80 space-y-3">
              <p>We use minimal essential cookies:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Authentication:</strong> Session tokens to keep you logged in</li>
                <li><strong>Preferences:</strong> UI settings (theme, zoom level)</li>
              </ul>
              <p>We do NOT use advertising cookies or third-party tracking pixels.</p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">8. Children's Privacy</h3>
            <div className="text-white/80 space-y-3">
              <p>
                relevel.me is not intended for users under 13 years old. We do not knowingly collect data from children.
                If you're a parent and believe your child has created an account, please contact us for immediate deletion.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">9. International Users</h3>
            <div className="text-white/80 space-y-3">
              <p>
                relevel.me is hosted on servers in the United States. By using our service, you consent to data transfer
                and processing in the US. We comply with GDPR for EU users and CCPA for California residents.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">10. Changes to This Policy</h3>
            <div className="text-white/80 space-y-3">
              <p>
                We may update this policy occasionally. Material changes will be notified via email 30 days in advance.
                Continued use after changes constitutes acceptance. Previous versions will be archived and available on request.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-2xl font-bold text-white">11. Contact Us</h3>
            <div className="text-white/80 space-y-3 flex items-start gap-3">
              <Mail className="w-6 h-6 text-violet-400 flex-shrink-0 mt-1" />
              <div>
                <p>
                  Questions about privacy? We're here to help:
                </p>
                <p className="mt-2">
                  <a href="mailto:privacy@relevel.me" className="text-violet-400 hover:underline font-medium">
                    privacy@relevel.me
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
            <Link href="/refund" className="hover:text-violet-400">Refund Policy</Link>
            <span>•</span>
            <Link href="/" className="hover:text-violet-400">Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
