'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Shield, ArrowLeft, Clock, Bell } from 'lucide-react'
import { signOut } from '../dashboard/actions'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/auth/client'

export default function SettingsPage() {
  const router = useRouter()
  const [callEnabled, setCallEnabled] = useState(true)
  const [callTime, setCallTime] = useState('21:00') // Default 9pm
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('users')
        .select('call_enabled, call_time')
        .eq('id', user.id)
        .single()

      if (data) {
        setCallEnabled(data.call_enabled ?? true)
        // Convert TIME format (HH:MM:SS) to input format (HH:MM)
        if (data.call_time) {
          setCallTime(data.call_time.substring(0, 5))
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    setMessage('')

    try {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { error } = await supabase
        .from('users')
        .update({
          call_enabled: callEnabled,
          call_time: `${callTime}:00` // Convert HH:MM to HH:MM:SS
        })
        .eq('id', user.id)

      if (error) {
        setMessage('Failed to save settings')
        console.error(error)
      } else {
        setMessage('✓ Settings saved successfully')
        setTimeout(() => setMessage(''), 3000)
      }
    } catch (error) {
      setMessage('Error saving settings')
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-white/60">Manage your account preferences</p>
        </div>

        {/* Call Preferences Card */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-400" />
              Daily Call Preferences
            </CardTitle>
            <CardDescription className="text-white/60">
              Configure when you'd like to receive your daily journaling call
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <p className="font-medium">Enable Daily Calls</p>
                <p className="text-sm text-white/60">Receive automated calls for journaling</p>
              </div>
              <Button
                variant={callEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setCallEnabled(!callEnabled)}
                disabled={loading}
                className={callEnabled ? "bg-emerald-600 hover:bg-emerald-500" : ""}
              >
                {callEnabled ? 'Enabled' : 'Disabled'}
              </Button>
            </div>

            {/* Time Picker */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Clock className="w-4 h-4 text-violet-400" />
                Preferred Call Time
              </label>
              <input
                type="time"
                value={callTime}
                onChange={(e) => setCallTime(e.target.value)}
                disabled={loading || !callEnabled}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-white/50">
                Calls will be made at this time in your local timezone (default: 9:00 PM)
              </p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSaveSettings}
              disabled={saving || loading}
              className="w-full bg-violet-600 hover:bg-violet-500"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>

            {/* Message */}
            {message && (
              <p className={`text-sm text-center ${message.startsWith('✓') ? 'text-emerald-300' : 'text-red-300'}`}>
                {message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Account Card */}
        <Card className="bg-white/5 border-white/10 p-6 space-y-4">
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
