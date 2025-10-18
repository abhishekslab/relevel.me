
'use client'
import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
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
        <Link
          href="/dashboard"
          className="inline-block mt-4 rounded-xl bg-gradient-to-r from-[#8F7BFF] to-[#C6B5FF] px-6 py-3 font-semibold text-white shadow-lg shadow-[#8F7BFF]/50 hover:shadow-xl hover:shadow-[#8F7BFF]/70 transition-all duration-300 hover:scale-105"
        >
          Enter World
        </Link>
      </div>
    </main>
  )
}
