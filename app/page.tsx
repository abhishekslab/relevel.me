
'use client'
import Link from 'next/link'
export default function Home() {
  return (
    <main className="min-h-screen grid place-items-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">relevel.me · Artha</h1>
        <p className="opacity-80">Open-world dashboard demo</p>
        <Link href="/dashboard" className="inline-block rounded-xl bg-violet-600 px-4 py-2">Enter World</Link>
      </div>
    </main>
  )
}
