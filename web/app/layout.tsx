import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Relevel.me — A Second Brain You Can Call',
  description: 'Relevel.me is the world\'s first voice-first second brain — an AI memory companion you can literally call. Speak your thoughts, and Relevel.me remembers, organizes, and reflects them back when you need clarity.',
  keywords: ['voice AI', 'second brain', 'AI memory', 'personal knowledge management', 'journaling AI', 'recall assistant', 'cognitive companion', 'voice journaling', 'reflection AI', 'productivity tool', 'memory OS'],
  authors: [{ name: 'Relevel.me' }],
  creator: 'Relevel.me',
  metadataBase: new URL('https://relevel.me'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Relevel.me — A Second Brain You Can Call',
    description: 'Relevel.me transforms your voice into structured memory — capturing ideas, reflections, and insights in real time.',
    url: 'https://relevel.me',
    siteName: 'Relevel.me',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Relevel.me — A second brain you can call.',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A Second Brain You Can Call',
    description: 'Relevel.me — the world\'s first voice-first second brain. Speak your thoughts. Remember everything.',
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
      <body>{children}</body>
    </html>
  )
}
