import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, Brain, Map, Server, Phone, Code, Zap, Users, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Reimagining skill development as an adventure
          </p>
        </div>

        {/* The Science of Lasting Growth */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Brain className="w-7 h-7 text-violet-400" />
            <h3 className="text-3xl font-bold">The Science of Lasting Growth</h3>
          </div>

          <Card className="p-8 border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
            <div className="prose prose-invert max-w-none space-y-4 text-white/80 text-lg leading-relaxed">
              <p>
                <strong className="text-violet-300">Growth begins with reflection.</strong> But reflection alone isn't enough—
                true mastery requires revisiting what you've learned at the exact moments when your brain is ready to
                cement it into long-term memory.
              </p>

              <p>
                Most learning fades within days. You watch a tutorial, read an article, or complete a course—and within
                a week, 70% of it is gone. This isn't a failure of willpower; it's how memory works.
              </p>

              <p className="text-violet-300 font-medium text-center text-2xl my-6">
                What if you could change that?
              </p>

              <p>
                Research in cognitive science has proven that <strong>spaced repetition</strong>—reviewing material
                at strategic intervals—dramatically improves retention. Studies from 2024 show that learners who
                revisited content at <strong>3 days, 7 days, and 21 days</strong> after initial learning improved
                their test scores by nearly 40%, with over 90% reporting lasting confidence in their knowledge.
              </p>

              <p>
                At <strong>relevel.me</strong>, we've built this science into your skill journey. After you explore
                a concept, we prompt you with quick, contextual quizzes at precisely these intervals—not random drills,
                but meaningful reflections that feel natural and rewarding.
              </p>

              <p>
                This isn't just about remembering facts. It's about building the version of yourself you aspire to be—
                one intentional reflection at a time.
              </p>

              <p className="text-center text-xl mt-8 text-violet-300 font-medium">
                We're here to help you achieve your goals.<br />
                To track your progress.<br />
                To become your better self.
              </p>
            </div>
          </Card>
        </section>

        {/* Our Philosophy */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-7 h-7 text-violet-400" />
            <h3 className="text-3xl font-bold">Our Philosophy</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-3 border-cyan-500/20">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Code className="w-6 h-6 text-cyan-400" />
              </div>
              <h4 className="text-xl font-bold">Learning is Exploration</h4>
              <p className="text-white/60">
                We believe skill development shouldn't feel like a chore. By gamifying progress through an
                isekai-inspired worldboard, we turn learning into an adventure—each skill a shrine to discover,
                each checkpoint a quest to complete.
              </p>
            </Card>

            <Card className="p-6 space-y-3 border-emerald-500/20">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="text-xl font-bold">You Own Your Data</h4>
              <p className="text-white/60">
                Your skill journey is yours alone. We don't sell your data to advertisers or train public AI models
                on your progress. With our upcoming Self-Host tier, you'll have complete ownership and control.
              </p>
            </Card>

            <Card className="p-6 space-y-3 border-amber-500/20">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-amber-400" />
              </div>
              <h4 className="text-xl font-bold">AI as a Mirror</h4>
              <p className="text-white/60">
                Our AI doesn't dictate your path—it reflects your progress and patterns back to you.
                We use state-of-the-art LLMs to provide insights, not instructions. The journey is yours to shape.
              </p>
            </Card>

            <Card className="p-6 space-y-3 border-violet-500/20">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-violet-400" />
              </div>
              <h4 className="text-xl font-bold">Beautiful Experiences</h4>
              <p className="text-white/60">
                From the fog-of-war revealing new shrines to the starfield background, every detail is crafted to
                make your skill-tracking experience delightful. Learning should spark joy, not dread.
              </p>
            </Card>
          </div>
        </section>

        {/* Roadmap */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Map className="w-7 h-7 text-violet-400" />
            <h3 className="text-3xl font-bold">Roadmap: What's Coming</h3>
          </div>

          <div className="space-y-6">
            {/* Max Tier */}
            <Card className="p-6 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="w-8 h-8 text-amber-400" />
                    <div>
                      <h4 className="text-2xl font-bold">Max Tier — Voice AI Companion</h4>
                      <Badge className="mt-1 bg-amber-500/20 text-amber-400 border-amber-500/30">
                        Coming Q2 2025
                      </Badge>
                    </div>
                  </div>
                  <p className="text-white/70 text-lg">
                    Call your virtual self anytime to discuss your learning journey, get motivation, or reflect on
                    your progress. Powered by advanced voice AI, it's like having a personal learning companion
                    on-demand.
                  </p>
                  <div className="space-y-2 pt-2">
                    <p className="font-medium text-amber-300">Features:</p>
                    <ul className="list-disc pl-6 space-y-1 text-white/60">
                      <li>Inbound phone calls to your AI companion (via CallKaro)</li>
                      <li>Natural voice conversations about your skills and goals</li>
                      <li>Personalized reflections based on your progress data</li>
                      <li>100 minutes of voice time per month (additional minutes available)</li>
                      <li>Everything in Pro tier included</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <Link href="/pricing">
                  <Button variant="outline" className="border-amber-500/30 hover:bg-amber-500/10">
                    Join Waitlist <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Self-Host */}
            <Card className="p-6 border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-transparent">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <Server className="w-8 h-8 text-cyan-400" />
                    <div>
                      <h4 className="text-2xl font-bold">Self-Host Tier — Own Everything</h4>
                      <Badge className="mt-1 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
                        Coming Q3 2025
                      </Badge>
                    </div>
                  </div>
                  <p className="text-white/70 text-lg">
                    Deploy relevel.me on your own infrastructure with complete control over your data, privacy, and
                    customization. Perfect for developers, teams, or anyone who values sovereignty.
                  </p>
                  <div className="space-y-2 pt-2">
                    <p className="font-medium text-cyan-300">Features:</p>
                    <ul className="list-disc pl-6 space-y-1 text-white/60">
                      <li>Docker-based deployment (one command setup)</li>
                      <li>Use your own AI API keys (OpenAI, Anthropic, local models)</li>
                      <li>Complete data ownership and privacy</li>
                      <li>Customize the worldboard, biomes, and UI themes</li>
                      <li>No monthly subscription—one-time license fee</li>
                      <li>Full source code access with MIT license</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <Link href="/pricing">
                  <Button variant="outline" className="border-cyan-500/30 hover:bg-cyan-500/10">
                    Join Waitlist <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Future Features */}
            <Card className="p-6 border-white/10">
              <h4 className="text-xl font-bold mb-4">Other Features on the Horizon</h4>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-white/60">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 flex-shrink-0" />
                  <p><strong className="text-white/80">Skill Sharing:</strong> Share your worldboard with friends or mentors</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 flex-shrink-0" />
                  <p><strong className="text-white/80">Team Dashboards:</strong> Track collective skill development</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 flex-shrink-0" />
                  <p><strong className="text-white/80">Mobile App:</strong> relevel.me in your pocket (iOS/Android)</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 flex-shrink-0" />
                  <p><strong className="text-white/80">API Access:</strong> Integrate relevel.me with your tools</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 flex-shrink-0" />
                  <p><strong className="text-white/80">Custom Biomes:</strong> Design your own worldboard themes</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-2 flex-shrink-0" />
                  <p><strong className="text-white/80">Learning Communities:</strong> Connect with fellow explorers</p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Call to Action */}
        <section className="text-center space-y-6 pt-8">
          <h3 className="text-3xl font-bold">Join the Journey</h3>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Whether you're starting with Pro or waiting for Self-Host or Max, you're becoming part of something special—
            a platform where learning is beautiful, personal, and yours to own.
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
            Your growth. Your journey. Your better self.
          </p>
        </div>
      </div>
    </div>
  )
}
