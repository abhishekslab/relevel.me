
'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { Flame, Sparkles, Target, Clock, X, Volume2, VolumeX, Settings, LogOut, ChevronLeft, ChevronRight, User, AlertCircle, MessageSquare, Square, Bell, Bug } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Canvas, useThree } from '@react-three/fiber'
import { Stars, Float } from '@react-three/drei'
import { Avatar as VisageAvatar } from '@readyplayerme/visage'
import { FileUpload } from '@/components/FileUpload'
import ChatInterface from './ChatInterface'
import * as THREE from 'three'
import { playClickSound, toggleMusicMute, getMusicMutedState, playBackgroundMusic, isMusicActuallyPlaying } from '@/lib/sound'
import { signOut as serverSignOut } from '../actions'
import { createClient } from '@/lib/auth/client'
import { getSpeechService, TEST_PHRASES, type SpeechState } from '@/lib/speech'
import type { VisemeName } from '@/lib/lipsync'

type UUID = string

interface Skill { id: UUID; name: string }
interface Checkpoint { id: UUID; user_id: UUID; skill_id: UUID; due_at: string; status: 'pending'|'completed'|'missed'; items_count?: number }
interface Artifact { id: UUID; name: string; effect: Record<string, any>; expires_at?: string }

// Mock data for Quest Log and Artifacts
const SKILLS: Skill[] = [
  { id: 's1', name: 'Knowledge Retention' },
  { id: 's2', name: 'Discipline' },
  { id: 's3', name: 'JavaScript' },
]
const CHECKPOINTS: Checkpoint[] = [
  { id: 'c1', user_id: 'u1', skill_id: 's3', due_at: addMinsISO(45), status: 'pending', items_count: 3 },
  { id: 'c2', user_id: 'u1', skill_id: 's1', due_at: addMinsISO(80), status: 'pending', items_count: 2 },
]
const ARTIFACTS: Artifact[] = [
  { id: 'a1', name: 'Notebook of Clarity', effect: { retention_multiplier: 1.05 }, expires_at: addMinsISO(60*24*6) },
  { id: 'a2', name: 'Sigil of Streaks', effect: { streak_boost: 1 }, expires_at: addMinsISO(60*24*2) },
]
function addMinsISO(m:number){ const d = new Date(Date.now()+m*60000); return d.toISOString() }

// Animation configuration
type ArmatureType = 'feminine' | 'masculine'

const IDLE_ANIMATIONS = {
  feminine: '/animation/feminine/fbx/idle/F_Standing_Idle_001.fbx',
  masculine: '/animation/masculine/fbx/idle/F_Standing_Idle_001.fbx',
}

const DANCE_ANIMATIONS = {
  feminine: [
    '/animation/feminine/fbx/dance/F_Dances_001.fbx',
    '/animation/feminine/fbx/dance/F_Dances_004.fbx',
    '/animation/feminine/fbx/dance/F_Dances_005.fbx',
    '/animation/feminine/fbx/dance/F_Dances_006.fbx',
    '/animation/feminine/fbx/dance/F_Dances_007.fbx',
    '/animation/feminine/fbx/dance/M_Dances_001.fbx',
    '/animation/feminine/fbx/dance/M_Dances_002.fbx',
    '/animation/feminine/fbx/dance/M_Dances_003.fbx',
  ],
  masculine: [
    '/animation/masculine/fbx/dance/F_Dances_001.fbx',
    '/animation/masculine/fbx/dance/F_Dances_004.fbx',
    '/animation/masculine/fbx/dance/F_Dances_005.fbx',
    '/animation/masculine/fbx/dance/M_Dances_001.fbx',
    '/animation/masculine/fbx/dance/M_Dances_002.fbx',
    '/animation/masculine/fbx/dance/M_Dances_003.fbx',
    '/animation/masculine/fbx/dance/M_Dances_004.fbx',
    '/animation/masculine/fbx/dance/M_Dances_005.fbx',
  ]
}

function Scene() {
  const { scene } = useThree()
  React.useEffect(() => {
    scene.background = new THREE.Color('#0b0f17')
    scene.fog = new THREE.Fog('#0b0f17', 10, 40)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 5, 5)

    scene.add(ambientLight)
    scene.add(directionalLight)

    return () => {
      scene.remove(ambientLight)
      scene.remove(directionalLight)
    }
  }, [scene])
  return null
}

const DEFAULT_AVATAR_URL = process.env.NEXT_PUBLIC_DEFAULT_AVATAR_URL!
const DEFAULT_AVATAR_GENDER = process.env.NEXT_PUBLIC_DEFAULT_AVATAR_GENDER! as ArmatureType

export default function DashboardPage() {
  const [isDockOpen, setIsDockOpen] = useState(false)
  const [armatureType, setArmatureType] = useState<ArmatureType>(DEFAULT_AVATAR_GENDER)
  const [currentDanceIndex, setCurrentDanceIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR_URL)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null)

  // Profile completeness state
  const [profileStatus, setProfileStatus] = useState<{
    hasPhone: boolean
    hasFirstName: boolean
    isLoading: boolean
  }>({
    hasPhone: false,
    hasFirstName: false,
    isLoading: true,
  })

  // Speech/lip-sync state
  const [visemeWeights, setVisemeWeights] = useState<Record<VisemeName, number>>({} as Record<VisemeName, number>)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Initialize speech service
  useEffect(() => {
    const speechService = getSpeechService()
    speechService.setOnUpdate((state: SpeechState) => {
      setVisemeWeights(state.visemeWeights)
      setIsSpeaking(state.isSpeaking)
    })

    return () => {
      speechService.dispose()
    }
  }, [])

  // Start background music when dashboard loads
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      playBackgroundMusic()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Load user profile settings from database
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        const { data, error } = await supabase
          .from('users')
          .select('avatar_gender, avatar_url, phone, first_name, background_image_path')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error loading user profile:', error)
          setProfileStatus({ hasPhone: false, hasFirstName: false, isLoading: false })
          return
        }

        if (data) {
          if (data.avatar_gender) {
            setArmatureType(data.avatar_gender as ArmatureType)
          }
          if (data.avatar_url) {
            setAvatarUrl(data.avatar_url)
          }

          // Generate signed URL from stored path
          if (data.background_image_path) {
            const { data: signedUrlData, error: signedUrlError } = await supabase.storage
              .from('backgrounds')
              .createSignedUrl(data.background_image_path, 31536000) // 1 year

            if (!signedUrlError && signedUrlData) {
              setBackgroundImageUrl(signedUrlData.signedUrl)
            } else {
              console.error('Error generating signed URL:', signedUrlError)
            }
          }

          // Set profile status
          setProfileStatus({
            hasPhone: !!data.phone,
            hasFirstName: !!data.first_name,
            isLoading: false,
          })
        }
      } catch (err) {
        console.error('Error loading user profile:', err)
        setProfileStatus({ hasPhone: false, hasFirstName: false, isLoading: false })
      }
    }

    loadUserProfile()
  }, [])

  // Calculate if profile is incomplete
  const isProfileIncomplete = !profileStatus.isLoading && (!profileStatus.hasPhone || !profileStatus.hasFirstName)
  const canMakeCalls = profileStatus.hasPhone

  // Speech handler for avatar
  const handleSpeak = async (text: string) => {
    playClickSound()
    const speechService = getSpeechService()
    try {
      await speechService.speak(text, { rate: 1.0, pitch: 1.0 })
    } catch (error) {
      console.error('Speech error:', error)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Starfield background layer */}
      <div className="absolute inset-0 -z-10">
        <Canvas camera={{ position: [0, 0, 10], fov: 55 }}>
          <Scene />
          <Stars radius={80} depth={50} count={2500} factor={2} fade />
        </Canvas>
      </div>

      {/* Avatar layer (Visage creates its own Canvas) */}
      <div
        className="absolute inset-0 pointer-events-none bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: backgroundImageUrl
            ? `url(${backgroundImageUrl})`
            : 'url(/backgrounds/avatar-bg.png)',
          backgroundBlendMode: 'normal'
        }}
      >
        <Avatar
          armatureType={armatureType}
          danceIndex={currentDanceIndex}
          isAnimating={isAnimating}
          avatarUrl={avatarUrl}
          visemeWeights={visemeWeights}
        />
      </div>

      {/* Profile Incomplete Warning Banner */}
      {isProfileIncomplete && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 shadow-lg backdrop-blur-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-amber-200 text-sm">
                {!profileStatus.hasPhone && 'Phone number required for reflection calls. '}
                {!profileStatus.hasFirstName && 'Complete your profile to personalize your experience.'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-amber-400/60 text-amber-200 hover:bg-amber-500/20"
              onClick={() => {
                // Find and click the profile button in settings
                const profileBtn = document.querySelector('[data-profile-button]') as HTMLButtonElement
                if (profileBtn) profileBtn.click()
              }}
            >
              Complete Profile
            </Button>
          </div>
        </div>
      )}

      <HUD
        isDockOpen={isDockOpen}
        setIsDockOpen={setIsDockOpen}
        armatureType={armatureType}
        setArmatureType={setArmatureType}
        currentDanceIndex={currentDanceIndex}
        setCurrentDanceIndex={setCurrentDanceIndex}
        isAnimating={isAnimating}
        setIsAnimating={setIsAnimating}
        avatarUrl={avatarUrl}
        setAvatarUrl={setAvatarUrl}
        canMakeCalls={canMakeCalls}
        visemeWeights={visemeWeights}
        isSpeaking={isSpeaking}
      />

      {/* Dock */}
      {isDockOpen && (
        <div className="fixed inset-0 z-40">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setIsDockOpen(false)}
          />
          {/* Dock Panel */}
          <div className="fixed inset-x-0 bottom-0 md:inset-auto md:right-4 md:top-20 md:bottom-4 z-50 md:w-[300px] max-h-[85vh] md:max-h-none">
            <Dock onClose={() => setIsDockOpen(false)} />
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <ChatInterface onAvatarSpeak={handleSpeak} />
    </div>
  )
}

interface HUDProps {
  isDockOpen: boolean
  setIsDockOpen: (open: boolean) => void
  armatureType: ArmatureType
  setArmatureType: (type: ArmatureType) => void
  currentDanceIndex: number
  setCurrentDanceIndex: (index: number) => void
  isAnimating: boolean
  setIsAnimating: (animating: boolean) => void
  avatarUrl: string
  setAvatarUrl: (url: string) => void
  canMakeCalls: boolean
  visemeWeights: Record<VisemeName, number>
  isSpeaking: boolean
}

function HUD({ isDockOpen, setIsDockOpen, armatureType, setArmatureType, currentDanceIndex, setCurrentDanceIndex, isAnimating, setIsAnimating, avatarUrl, setAvatarUrl, canMakeCalls, visemeWeights, isSpeaking }: HUDProps){
  const [streak, setStreak] = useState(0)
  const [isMusicMuted, setIsMusicMuted] = useState(false)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedPhraseIndex, setSelectedPhraseIndex] = useState(0)
  const [showSpeechMenu, setShowSpeechMenu] = useState(false)
  const [showDebugMenu, setShowDebugMenu] = useState(false)
  const router = useRouter()

  // Combined test phrases from all categories
  const allTestPhrases = useMemo(() => {
    const phrases: string[] = []
    TEST_PHRASES.rpg.forEach(p => phrases.push(p))
    TEST_PHRASES.phonetic.forEach(p => phrases.push(p))
    return phrases
  }, [])

  // Speech handlers
  const handleSpeak = async (text: string) => {
    playClickSound()
    const speechService = getSpeechService()
    try {
      await speechService.speak(text, { rate: 1.0, pitch: 1.0 })
    } catch (error) {
      console.error('Speech error:', error)
    }
  }

  const handleStopSpeech = () => {
    playClickSound()
    const speechService = getSpeechService()
    speechService.stop()
  }

  const handleProfileUpdate = React.useCallback((data: { firstName: string; phone: string; avatarUrl: string; avatarGender: 'feminine' | 'masculine' }) => {
    // Update armature type if changed
    if (data.avatarGender !== armatureType) {
      setArmatureType(data.avatarGender)
      setCurrentDanceIndex(0)
    }
    // Update avatar URL
    if (data.avatarUrl) {
      setAvatarUrl(data.avatarUrl)
    }
    // Note: Background image is handled by upload API directly, no need to update here
  }, [armatureType, setArmatureType, setCurrentDanceIndex, setAvatarUrl])

  // Load user's call streak
  useEffect(() => {
    const loadStreak = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        const { data, error } = await supabase.rpc('get_user_call_streak', {
          p_user_id: user.id
        })

        if (error) {
          console.error('Error loading streak:', error)
          return
        }

        setStreak(data || 0)
      } catch (err) {
        console.error('Error loading streak:', err)
      }
    }

    loadStreak()
  }, [])

  // Initialize mute state from localStorage
  useEffect(() => {
    setIsMusicMuted(getMusicMutedState())
  }, [])

  // Check music playback state periodically
  useEffect(() => {
    const checkPlaybackState = () => {
      setIsMusicPlaying(isMusicActuallyPlaying())
    }

    // Check immediately
    checkPlaybackState()

    // Check every 500ms to keep UI in sync
    const interval = setInterval(checkPlaybackState, 500)

    return () => clearInterval(interval)
  }, [])

  const handleToggle = () => {
    // Ensure music is playing (in case autoplay was blocked on refresh)
    playBackgroundMusic()
    playClickSound()
    setIsDockOpen(!isDockOpen)

    // Update playing state immediately after interaction
    setTimeout(() => setIsMusicPlaying(isMusicActuallyPlaying()), 100)
  }

  const handleMusicToggle = () => {
    // Ensure music is playing first (in case autoplay was blocked)
    playBackgroundMusic()
    const newMutedState = toggleMusicMute()
    setIsMusicMuted(newMutedState)
    playClickSound()

    // Update playing state immediately after interaction
    setTimeout(() => setIsMusicPlaying(isMusicActuallyPlaying()), 100)
  }

  const handleSignOut = async () => {
    playClickSound()
    await serverSignOut()
  }

  return (
    <div className="pointer-events-none fixed top-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-7xl px-2 md:px-4 py-2 md:py-3 flex items-center gap-2 md:gap-3">
        <Image
          src="/logo.png"
          alt="Relevel.me"
          width={56}
          height={56}
          className="pointer-events-auto size-14 drop-shadow-[0_0_16px_rgba(143,123,255,0.7)]"
        />
        <div className="pointer-events-auto ml-auto flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 px-3 py-2 text-orange-200">
            <Flame className="size-5"/>
            <span className="text-sm font-semibold">{streak}d</span>
          </div>
          <button
            onClick={handleMusicToggle}
            className="rounded-xl bg-cyan-500/20 border border-cyan-400/40 p-2 hover:bg-cyan-500/30 transition active:scale-95"
            title={!isMusicPlaying ? 'Music paused - click to start' : isMusicMuted ? 'Unmute music' : 'Mute music'}
          >
            {!isMusicPlaying || isMusicMuted ? (
              <VolumeX className="size-5 text-cyan-300"/>
            ) : (
              <Volume2 className="size-5 text-cyan-300"/>
            )}
          </button>

          <button
            onClick={handleToggle}
            className="rounded-xl bg-violet-500/20 border border-violet-400/40 p-2 hover:bg-violet-500/30 transition active:scale-95"
          >
            <Sparkles className="size-5 text-fuchsia-300"/>
          </button>

          <div className="relative">
            <button
              onClick={() => { playClickSound(); setShowSettingsMenu(!showSettingsMenu) }}
              className="rounded-xl bg-emerald-500/20 border border-emerald-400/40 p-2 hover:bg-emerald-500/30 transition active:scale-95"
              title="Settings"
            >
              <Settings className="size-5 text-emerald-300"/>
            </button>
            {showSettingsMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white/5 border border-white/10 backdrop-blur shadow-xl overflow-hidden max-h-[80vh] overflow-y-auto">
                {/* Profile Section */}
                <button
                  data-profile-button
                  onClick={() => { playClickSound(); setShowProfileModal(true); setShowSettingsMenu(false) }}
                  className="w-full p-3 flex items-center gap-2 hover:bg-white/10 transition text-left text-sm border-b border-white/10 text-white"
                >
                  <User className="size-4" />
                  Profile
                </button>

                {/* Debug Section */}
                <button
                  onClick={() => { playClickSound(); setShowDebugMenu(!showDebugMenu) }}
                  className="w-full p-3 flex items-center gap-2 hover:bg-white/10 transition text-left text-sm border-b border-white/10 text-white"
                >
                  <Bug className="size-4" />
                  Debug
                </button>

                {showDebugMenu && (
                  <div className="border-b border-white/10 bg-black/20">
                    {/* Avatar Animation Section */}
                    <div className="p-3 border-b border-white/10">
                      <div className="text-xs font-medium text-purple-300 mb-2">Avatar Animation</div>
                      <div className="flex items-center gap-1 rounded-lg bg-purple-500/20 border border-purple-400/40 p-1">
                        <button
                          onClick={() => {
                            playClickSound()
                            const dances = DANCE_ANIMATIONS[armatureType]
                            setCurrentDanceIndex((currentDanceIndex - 1 + dances.length) % dances.length)
                            if (!isAnimating) setIsAnimating(true)
                          }}
                          className="rounded-lg p-1.5 transition text-purple-300 hover:bg-purple-500/20"
                          title="Previous dance"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <span className="text-xs text-purple-300 font-medium px-2 flex-1 text-center">
                          {isAnimating ? `${currentDanceIndex + 1}/${DANCE_ANIMATIONS[armatureType].length}` : 'Idle'}
                        </span>
                        <button
                          onClick={() => {
                            playClickSound()
                            const dances = DANCE_ANIMATIONS[armatureType]
                            setCurrentDanceIndex((currentDanceIndex + 1) % dances.length)
                            if (!isAnimating) setIsAnimating(true)
                          }}
                          className="rounded-lg p-1.5 transition text-purple-300 hover:bg-purple-500/20"
                          title="Next dance"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                        <button
                          onClick={() => {
                            playClickSound()
                            if (isAnimating) {
                              setIsAnimating(false)
                            } else {
                              setArmatureType(armatureType === 'feminine' ? 'masculine' : 'feminine')
                              setCurrentDanceIndex(0)
                            }
                          }}
                          className="ml-1 rounded-lg px-2 py-1.5 transition text-purple-300 hover:bg-purple-500/20 text-xs font-medium"
                          title={isAnimating ? 'Stop dancing (back to idle)' : 'Switch armature type'}
                        >
                          {isAnimating ? '◼' : (armatureType === 'feminine' ? 'F' : 'M')}
                        </button>
                      </div>
                    </div>

                    {/* Speech Test Lip-Sync Section */}
                    <div className="p-3">
                      <div className="text-xs font-medium text-violet-300 mb-2">Speech Test (Lip-Sync)</div>
                      <div className="text-[10px] text-slate-400 mb-2">Select a phrase and click "Speak" to test lip-sync</div>

                      {/* Phrase selection */}
                      <div className="space-y-1 max-h-48 overflow-y-auto mb-3">
                        {allTestPhrases.map((phrase, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              playClickSound()
                              setSelectedPhraseIndex(index)
                            }}
                            className={`w-full text-left text-xs p-2 rounded-lg transition ${
                              selectedPhraseIndex === index
                                ? 'bg-violet-500/30 border border-violet-400/50 text-violet-200'
                                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                            }`}
                          >
                            {phrase.length > 60 ? phrase.substring(0, 60) + '...' : phrase}
                          </button>
                        ))}
                      </div>

                      {/* Control buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (!isSpeaking) {
                              handleSpeak(allTestPhrases[selectedPhraseIndex])
                            }
                          }}
                          disabled={isSpeaking}
                          className="flex-1 rounded-lg px-3 py-2 text-xs font-medium transition bg-violet-500/30 border border-violet-400/50 text-violet-200 hover:bg-violet-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSpeaking ? 'Speaking...' : 'Speak'}
                        </button>
                        <button
                          onClick={handleStopSpeech}
                          disabled={!isSpeaking}
                          className="rounded-lg px-3 py-2 text-xs font-medium transition bg-red-500/30 border border-red-400/50 text-red-200 hover:bg-red-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Square className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sign Out Section */}
                <button
                  onClick={handleSignOut}
                  className="w-full p-3 flex items-center gap-2 hover:bg-white/10 transition text-left text-sm text-white"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        open={showProfileModal}
        onOpenChange={setShowProfileModal}
        onProfileUpdate={handleProfileUpdate}
      />
    </div>
  )
}

interface ProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProfileUpdate?: (data: { firstName: string; phone: string; avatarUrl: string; avatarGender: 'feminine' | 'masculine' }) => void
}

function ProfileModal({ open, onOpenChange, onProfileUpdate }: ProfileModalProps) {
  const [firstName, setFirstName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR_URL)
  const [avatarGender, setAvatarGender] = useState<'feminine' | 'masculine'>(DEFAULT_AVATAR_GENDER)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('')
  const [callEnabled, setCallEnabled] = useState(true)
  const [callTime, setCallTime] = useState('21:00')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const loadUserProfile = React.useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Not authenticated')
        return
      }

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('first_name, phone, avatar_url, avatar_gender, background_image_path, call_enabled, call_time')
        .eq('id', user.id)
        .single()

      if (fetchError) throw fetchError

      if (data) {
        setFirstName(data.first_name || '')
        setPhone(data.phone || '')
        setAvatarUrl(data.avatar_url || DEFAULT_AVATAR_URL)
        setAvatarGender(data.avatar_gender || DEFAULT_AVATAR_GENDER)
        setCallEnabled(data.call_enabled ?? true)
        // Convert TIME format (HH:MM:SS) to input format (HH:MM)
        if (data.call_time) {
          setCallTime(data.call_time.substring(0, 5))
        }

        // Generate signed URL from path for preview
        if (data.background_image_path) {
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('backgrounds')
            .createSignedUrl(data.background_image_path, 31536000)

          if (!signedUrlError && signedUrlData) {
            setBackgroundImageUrl(signedUrlData.signedUrl)
          }
        } else {
          setBackgroundImageUrl('')
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err)
      setError('Failed to load profile')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      loadUserProfile()
    }
  }, [open, loadUserProfile])

  const handleSave = async () => {
    if (!phone.trim()) {
      setError('Phone number is required')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Not authenticated')
        return
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: firstName.trim(),
          phone: phone.trim(),
          avatar_url: avatarUrl.trim(),
          avatar_gender: avatarGender,
          call_enabled: callEnabled,
          call_time: `${callTime}:00`, // Convert HH:MM to HH:MM:SS
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      playClickSound()

      // Notify parent component of the update
      if (onProfileUpdate) {
        onProfileUpdate({
          firstName: firstName.trim(),
          phone: phone.trim(),
          avatarUrl: avatarUrl.trim(),
          avatarGender,
        })
      }

      onOpenChange(false)
    } catch (err) {
      console.error('Error saving profile:', err)
      setError('Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader onClose={() => onOpenChange(false)}>
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription>Manage your account information</DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Physical Self Section */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="size-5 text-violet-400" />
                <h3 className="text-lg font-semibold text-violet-300">Physical Self</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    First Name
                  </label>
                  <Input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter your first name"
                    disabled={isLoading || isSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    Phone Number <span className="text-red-400">*</span>
                  </label>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1234567890"
                    disabled={isLoading || isSaving}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Virtual Self Section */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="size-5 text-cyan-400" />
                <h3 className="text-lg font-semibold text-cyan-300">Virtual Self</h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1.5">
                    Avatar URL (Ready Player Me)
                  </label>
                  <Input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder={DEFAULT_AVATAR_URL}
                    disabled={isLoading || isSaving}
                  />
                  <p className="text-xs text-white/40 mt-1">
                    Paste your Ready Player Me GLB avatar link
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Avatar Gender
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { playClickSound(); setAvatarGender('feminine') }}
                      disabled={isLoading || isSaving}
                      className={`flex-1 py-2.5 px-4 rounded-xl border transition ${
                        avatarGender === 'feminine'
                          ? 'bg-violet-500/20 border-violet-400/60 text-violet-200'
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      Feminine
                    </button>
                    <button
                      onClick={() => { playClickSound(); setAvatarGender('masculine') }}
                      disabled={isLoading || isSaving}
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
              </div>
            </div>
          </div>

          {/* Custom Assets Section */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="size-5 text-emerald-400" />
                <h3 className="text-lg font-semibold text-emerald-300">Custom Assets</h3>
              </div>

              <div className="space-y-4">
                {/* Background Upload */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Background Image
                  </label>
                  <FileUpload
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    maxSize={5 * 1024 * 1024}
                    uploadEndpoint="/api/upload/background"
                    label="Upload Background"
                    onUploadComplete={(url) => setBackgroundImageUrl(url)}
                    currentPreview={backgroundImageUrl || null}
                  />
                  <p className="text-xs text-white/40 mt-1">
                    PNG, JPEG, or WebP up to 5MB
                  </p>
                </div>

                {/* Model Upload */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    3D Avatar Model (.glb)
                  </label>
                  <FileUpload
                    accept=".glb,model/gltf-binary"
                    maxSize={50 * 1024 * 1024}
                    uploadEndpoint="/api/upload/model"
                    label="Upload GLB Model"
                    onUploadComplete={(url) => setAvatarUrl(url)}
                  />
                  <p className="text-xs text-white/40 mt-1">
                    GLB format up to 50MB, or use Ready Player Me URL above
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bell className="size-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-amber-300">Preferences</h3>
              </div>

              <div className="space-y-4">
                {/* Daily Call Toggle */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-white/90">Enable Daily Calls</p>
                    <p className="text-xs text-white/60">Receive automated calls for journaling</p>
                  </div>
                  <Button
                    variant={callEnabled ? undefined : "outline"}
                    size="sm"
                    onClick={() => { playClickSound(); setCallEnabled(!callEnabled) }}
                    disabled={isLoading || isSaving}
                    className={callEnabled ? "bg-emerald-600 hover:bg-emerald-500" : ""}
                  >
                    {callEnabled ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                {/* Call Time Picker */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-white/80">
                    <Clock className="size-4 text-violet-400" />
                    Preferred Call Time
                  </label>
                  <input
                    type="time"
                    value={callTime}
                    onChange={(e) => setCallTime(e.target.value)}
                    disabled={isLoading || isSaving || !callEnabled}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-white/40">
                    Calls will be made at this time in your local timezone (default: 9:00 PM)
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1"
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-violet-500/20 border-violet-400/40 hover:bg-violet-500/30"
              disabled={isLoading || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


interface AvatarProps {
  armatureType: ArmatureType
  danceIndex: number
  isAnimating: boolean
  avatarUrl?: string
  visemeWeights?: Record<VisemeName, number>
}

function Avatar({ armatureType, danceIndex, isAnimating, avatarUrl = DEFAULT_AVATAR_URL, visemeWeights }: AvatarProps){
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768) // Tailwind's md breakpoint
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Use dance animation if dancing, otherwise use idle animation
  const animationSrc = isAnimating
    ? DANCE_ANIMATIONS[armatureType][danceIndex]
    : IDLE_ANIMATIONS[armatureType]

  // Hardcoded local GLB model path
  const localModelSrc = '/models/custom-avatar.glb'

  // Convert viseme weights to emotion format (Ready Player Me uses emotion prop for morph targets)
  const emotion = visemeWeights && Object.keys(visemeWeights).length > 0 ? visemeWeights : undefined

  // Camera distance: 21% zoom for mobile (closer = smaller number)
  const cameraDistance = isMobile ? 3.5 * 0.65 : 3.5 // 2.765 for mobile, 3.5 for desktop

  return (
    <VisageAvatar
      modelSrc={localModelSrc}
      animationSrc={animationSrc}
      cameraInitialDistance={cameraDistance}
      cameraTarget={0}
      fov={50}
      style={{
        width: '100%',
        height: '100%',
        background: 'transparent'
      }}
      shadows={false}
      halfBody={false}
      emotion={emotion}
      onLoaded={() => console.log('Avatar loaded with animation:', animationSrc)}
    />
  )
}

function Dock({ onClose }: { onClose: () => void }){
  const due = CHECKPOINTS.filter(c => c.status === 'pending')
  const skillById = new Map(SKILLS.map(s => [s.id, s]))
  return (
    <div className="relative h-full bg-black/90 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none rounded-t-2xl md:rounded-none overflow-hidden">
      {/* Mobile handle bar */}
      <div className="md:hidden w-12 h-1 bg-white/20 rounded-full mx-auto my-3" />

      {/* Close button - desktop only */}
      <button
        onClick={onClose}
        className="hidden md:block absolute -left-12 top-0 rounded-xl bg-white/5 border border-white/10 p-2 hover:bg-white/10 transition backdrop-blur"
      >
        <X className="size-5" />
      </button>

      {/* Scrollable content area */}
      <div className="h-full overflow-y-auto px-4 md:px-0 pb-6 md:pb-0 space-y-2.5">
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2 px-3 pt-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4"/> Quest Log
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {due.length === 0 ? (
              <div className="text-xs md:text-sm text-slate-300">No checkpoints due. Explore the map or prepare for tonight's call.</div>
            ) : (
              <div className="space-y-2">
                {due.map(q => (
                  <div key={q.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-2.5 py-2">
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="text-sm font-medium truncate">{skillById.get(q.skill_id)?.name}</div>
                      <div className="text-xs text-slate-300">{new Date(q.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {q.items_count ?? 3} items</div>
                    </div>
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-500 shrink-0">Start</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <CallCard />
        <ArtifactsCard />
      </div>
    </div>
  )
}
function CallCard(){
  const next = addMinsISO(120)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleCallNow = async () => {
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`✓ ${data.message || 'Call initiated successfully!'}`)
      } else {
        setMessage(`✗ ${data.error || 'Failed to initiate call'}`)
      }
    } catch (error) {
      setMessage('✗ Network error. Please try again.')
      console.error('Call initiation error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2 px-3 pt-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="size-4"/> Evening Call
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="text-xs md:text-sm text-slate-300">Next call at {new Date(next).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div className="mt-2 flex gap-2">
          <Button
            size="sm"
            onClick={handleCallNow}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Calling...' : 'Call now'}
          </Button>
        </div>
        {message && (
          <div className={`mt-2 text-xs ${message.startsWith('✓') ? 'text-emerald-300' : 'text-red-300'}`}>
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
function ArtifactsCard(){
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2 px-3 pt-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4"/> Artifacts
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 flex flex-wrap gap-1.5">
        {ARTIFACTS.map(a => (
          <Badge key={a.id} className="bg-fuchsia-600/20 border-fuchsia-400/30 text-fuchsia-200 text-xs">{a.name}</Badge>
        ))}
      </CardContent>
    </Card>
  )
}
