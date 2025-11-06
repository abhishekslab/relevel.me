import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, Brain, Phone, Mic, Shield, Zap, GitBranch, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function VisionPage() {
  return (
    <div className="min-h-screen bg-[#0b0f17] py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-16">
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
          <h2 className="text-5xl font-bold">Our Vision</h2>
        </div>
        {/* The Idea */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Phone className="w-7 h-7 text-violet-400" />
            <h3 className="text-3xl font-bold">What if you could call your memory?</h3>
          </div>

          <Card className="p-8 border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
            <div className="prose prose-invert max-w-none space-y-4 text-white/80 text-lg leading-relaxed">
              <p>
                Imagine calling a number and speaking your thoughts freely — and every conversation becomes a <strong>structured, living memory</strong>.
              </p>

              <ul className="space-y-3 my-6">
                <li><strong className="text-cyan-300">Artha</strong>, your AI reflection, listens like a friend.</li>
                <li>Each idea is auto-transcribed, tagged, and linked by meaning.</li>
                <li><strong>Relevel is building the world's first voice-first second brain</strong>, a second brain that listens, remembers, and reflects.</li>
              </ul>
            </div>
          </Card>
        </section>
        {/* The Problem */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Brain className="w-7 h-7 text-violet-400" />
            <h3 className="text-3xl font-bold">The Problem</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-3 border-amber-500/20">
              <h4 className="text-xl font-bold text-amber-300">Forgetting what matters</h4>
              <p className="text-white/60">
                Manual capture creates too much friction to record thoughts in the moment.
              </p>
            </Card>

            <Card className="p-6 space-y-3 border-emerald-500/20">
              <h4 className="text-xl font-bold text-emerald-300">Cognitive overload</h4>
              <p className="text-white/60">
                No external brain to offload mental noise and free up headspace.
              </p>
            </Card>

            <Card className="p-6 space-y-3 border-orange-500/20">
              <h4 className="text-xl font-bold text-orange-300">Reflection fatigue</h4>
              <p className="text-white/60">
                Journaling demands discipline, not insight. It becomes a chore.
              </p>
            </Card>

            <Card className="p-6 space-y-3 border-violet-500/20">
              <h4 className="text-xl font-bold text-violet-300">Fragmented memory</h4>
              <p className="text-white/60">
                Notes and recordings live in silos, disconnected and hard to retrieve.
              </p>
            </Card>
          </div>
        </section>

        {/* Core Pillars */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-7 h-7 text-violet-400" />
            <h3 className="text-3xl font-bold">Core Pillars</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-3 border-cyan-500/20">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Mic className="w-6 h-6 text-cyan-400" />
              </div>
              <h4 className="text-xl font-bold">Voice-First Interface</h4>
              <p className="text-white/60">
                Talk instead of type — through calls, voice notes, or browser mic. Capture thoughts as naturally as speaking them.
              </p>
            </Card>

            <Card className="p-6 space-y-3 border-emerald-500/20">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <GitBranch className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="text-xl font-bold">Memory Graph</h4>
              <p className="text-white/60">
                Each idea becomes a node — connected by topic, tone, and intent. Your thoughts form a living knowledge network.
              </p>
            </Card>

            <Card className="p-6 space-y-3 border-violet-500/20">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Brain className="w-6 h-6 text-violet-400" />
              </div>
              <h4 className="text-xl font-bold">Reflective Intelligence</h4>
              <p className="text-white/60">
                Artha surfaces forgotten goals, patterns, or contradictions. "You mentioned starting a YouTube channel last month — revisit it?"
              </p>
            </Card>

            <Card className="p-6 space-y-3 border-amber-500/20">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-amber-400" />
              </div>
              <h4 className="text-xl font-bold">Privacy by Design</h4>
              <p className="text-white/60">
                User-owned data, encrypted at rest. Transparency over tracking. Trust over analytics.
              </p>
            </Card>

            <Card className="p-6 space-y-3 border-orange-500/20 md:col-span-2">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-400" />
              </div>
              <h4 className="text-xl font-bold">Zero Friction, High Recall</h4>
              <p className="text-white/60">
                Instant capture via call or WhatsApp; effortless retrieval via chat or email. No tags, no folders — just context-aware understanding.
              </p>
            </Card>
          </div>
        </section>

        {/* Why We're Different */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-7 h-7 text-violet-400" />
            <h3 className="text-3xl font-bold">Why We're Different</h3>
          </div>

          <Card className="p-8 border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
            <div className="prose prose-invert max-w-none space-y-4 text-white/80 text-lg leading-relaxed">
              <ul className="space-y-4">
                <li>
                  <strong className="text-violet-300">Voice-Native First:</strong> starts from speech, not text. Your thoughts deserve to flow freely.
                </li>
                <li>
                  <strong className="text-cyan-300">Call-Based Interface:</strong> reflection without screen time. Just call and think aloud.
                </li>
                <li>
                  <strong className="text-emerald-300">Personified AI (Artha):</strong> not a tool, a mirror. A companion that grows with you.
                </li>
                <li>
                  <strong className="text-amber-300">Gamified Recall:</strong> optional skill-world visualizing your evolving mind as memory orbs and knowledge connections.
                </li>
              </ul>
            </div>
          </Card>
        </section>

        {/* Call to Action */}
        <section className="text-center space-y-6 pt-8">
          <h3 className="text-3xl font-bold">Join the Journey</h3>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Start building your second brain today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/pricing">
              <Button className="min-w-[200px]">
                View Pricing <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="min-w-[200px]">
                Back to Home
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <div className="pt-8 text-center text-sm text-white/40 border-t border-white/10">
          <p>
            Think aloud. Remember everything. Your better self.
          </p>
        </div>
      </div>
    </div>
  )
}
