'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'
import { signOut } from '../dashboard/actions'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-white/60">Manage your account</p>
        </div>

        {/* Account Card */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-violet-400" />
            Account
          </h2>
          <p className="text-sm text-white/60">
            You are currently signed in. Your subscription and account details are managed through the dashboard.
          </p>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <Button onClick={handleSignOut} variant="outline" className="w-full">
            Sign Out
          </Button>
          <Link href="/dashboard">
            <Button variant="secondary" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
