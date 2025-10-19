import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'Relevel.me — Re-level Your Real Life',
  description: 'Relevel.me is a voice-first journaling and self-growth app guided by Artha. Reflect daily, earn XP, unlock new skills, and track your growth like an RPG for real life.',
  keywords: ['self-improvement app', 'journaling app', 'voice journaling', 'gamified productivity', 'personal growth', 'habit tracker', 'Artha AI', 'isekai productivity', 'reflection app'],
  authors: [{ name: 'Relevel.me' }],
  creator: 'Relevel.me',
  metadataBase: new URL('https://relevel.me'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Relevel.me — Level Up Your Real Life',
    description: 'Guided by Artha, your AI voice companion, relevel.me turns reflection into skill growth.',
    url: 'https://relevel.me',
    siteName: 'Relevel.me',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Relevel.me — Re-level your real life.',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Relevel.me — Level Up Your Real Life',
    description: 'Guided by Artha, your AI voice companion, relevel.me turns reflection into skill growth.',
    images: ['/og-image.png'],
    creator: '@relevelme',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#8F7BFF',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
