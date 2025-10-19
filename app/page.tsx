
'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { playBackgroundMusic, playClickSound } from '@/lib/sound'

export default function Home() {
  // Auto-play background music on mount
  useEffect(() => {
    playBackgroundMusic()
  }, [])

  const handleEnterWorld = () => {
    playClickSound()
  }

  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-b from-[#0b0f17] to-[#0E0A1E]">
      <div className="text-center space-y-6 px-4 max-w-2xl">
        <div className="flex justify-center mb-4">
          <Image
            src="/logo.png"
            alt="Relevel.me Logo"
            width={120}
            height={120}
            className="drop-shadow-[0_0_24px_rgba(143,123,255,0.4)]"
          />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#8F7BFF] to-[#C6B5FF] bg-clip-text text-transparent">
          relevel.me
        </h1>
        <p className="text-xl md:text-2xl font-semibold text-[#C6B5FF]">
          Re-level your real life.
        </p>
        <p className="text-base md:text-lg opacity-90 text-[#EDEDF8] leading-relaxed">
          Voice-first journaling platform guided by your AI companion Artha. Reflect daily, earn XP, unlock new skills, and track your growth like an RPG for real life.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link
            href="/signup"
            onClick={handleEnterWorld}
            className="inline-block rounded-xl bg-gradient-to-r from-[#8F7BFF] to-[#C6B5FF] px-8 py-3 font-semibold text-white shadow-lg shadow-[#8F7BFF]/50 hover:shadow-xl hover:shadow-[#8F7BFF]/70 transition-all duration-300 hover:scale-105"
          >
            Get Started
          </Link>
          <Link
            href="/vision"
            className="inline-block rounded-xl bg-white/5 border border-white/10 px-8 py-3 font-semibold text-[#C6B5FF] hover:bg-white/10 transition-all duration-300"
          >
            Learn More
          </Link>
        </div>
        <div className="flex gap-6 justify-center text-sm text-white/60 mt-6">
          <Link href="/pricing" className="hover:text-[#8F7BFF] transition">
            Pricing
          </Link>
          <Link href="/vision" className="hover:text-[#8F7BFF] transition">
            Vision
          </Link>
          <Link href="/privacy" className="hover:text-[#8F7BFF] transition">
            Privacy
          </Link>
        </div>
      </div>
    </main>
  )
}
