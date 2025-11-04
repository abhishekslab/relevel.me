'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Image from 'next/image'
import { Sparkles, Phone, User, Image as ImageIcon } from 'lucide-react'

const DEFAULT_AVATAR_URL = process.env.NEXT_PUBLIC_DEFAULT_AVATAR_URL || 'https://models.readyplayer.me/66eab6aa7613fa126b7c5a45.glb'
const DEFAULT_AVATAR_GENDER = (process.env.NEXT_PUBLIC_DEFAULT_AVATAR_GENDER as 'feminine' | 'masculine') || 'feminine'

interface OnboardingFormProps {
  email: string
}

export default function OnboardingForm({ email }: OnboardingFormProps) {
  const [firstName, setFirstName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR_URL)
  const [avatarGender, setAvatarGender] = useState<'feminine' | 'masculine'>(DEFAULT_AVATAR_GENDER)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Validation
    if (!firstName.trim()) {
      setError('First name is required')
      setIsLoading(false)
      return
    }

    if (!phone.trim()) {
      setError('Phone number is required for voice calls')
      setIsLoading(false)
      return
    }

    // Basic phone validation (international format)
    const phoneClean = phone.replace(/[\s()-]/g, '')
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    if (!phoneRegex.test(phoneClean)) {
      setError('Please enter a valid phone number with country code (e.g., +1234567890)')
      setIsLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Authentication error. Please sign in again.')
        setIsLoading(false)
        return
      }

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim(),
          phone: phoneClean, // Save clean version
          avatar_url: avatarUrl.trim(),
          avatar_gender: avatarGender,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Success! Redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Profile update error:', err)
      setError(err.message || 'Failed to save profile. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/5 to-transparent">
      <CardHeader className="text-center">
        <Image
          src="/logo.png"
          alt="Relevel.me Logo"
          width={100}
          height={100}
          className="mx-auto mb-4 drop-shadow-[0_0_24px_rgba(143,123,255,0.4)]"
        />
        <CardTitle className="text-3xl flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-violet-400" />
          Welcome to relevel.me
        </CardTitle>
        <p className="text-base text-white/60 mt-2">
          Let's set up your profile to get started with your voice-first journaling companion.
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-white/5"
            />
          </div>

          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              First Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter your first name"
              required
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone Number <span className="text-red-400">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
              required
              disabled={isLoading}
            />
            <p className="text-xs text-white/40">
              Required for evening reflection calls. Include country code.
            </p>
          </div>

          {/* Avatar URL (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="avatarUrl" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Avatar URL (Optional)
            </Label>
            <Input
              id="avatarUrl"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder={DEFAULT_AVATAR_URL}
              disabled={isLoading}
            />
            <p className="text-xs text-white/40">
              Paste your Ready Player Me GLB avatar link. Or use the default.
            </p>
          </div>

          {/* Avatar Gender */}
          <div className="space-y-2">
            <Label>Avatar Animation Style</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAvatarGender('feminine')}
                disabled={isLoading}
                className={`flex-1 py-2.5 px-4 rounded-xl border transition ${
                  avatarGender === 'feminine'
                    ? 'bg-violet-500/20 border-violet-400/60 text-violet-200'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                Feminine
              </button>
              <button
                type="button"
                onClick={() => setAvatarGender('masculine')}
                disabled={isLoading}
                className={`flex-1 py-2.5 px-4 rounded-xl border transition ${
                  avatarGender === 'masculine'
                    ? 'bg-violet-500/20 border-violet-400/60 text-violet-200'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                Masculine
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Complete Setup & Enter World'}
          </Button>

          <p className="text-xs text-white/40 text-center">
            Your information is secure and will only be used to provide you with personalized voice journaling experiences.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
