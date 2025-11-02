
'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { motion, useMotionValue, AnimatePresence } from 'framer-motion'
import { Flame, Sparkles, Target, Clock, X, Volume2, VolumeX, Settings, LogOut, ChevronLeft, ChevronRight, User, AlertCircle, MessageSquare, Square } from 'lucide-react'
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
import * as THREE from 'three'
import { playClickSound, toggleMusicMute, getMusicMutedState, playBackgroundMusic, isMusicActuallyPlaying } from '@/lib/sound'
import { signOut as serverSignOut } from '../actions'
import { createClient } from '@/lib/auth/client'
import { getSpeechService, TEST_PHRASES, type SpeechState } from '@/lib/speech'
import type { VisemeName } from '@/lib/lipsync'

type UUID = string
type Biome = 'meadow'|'forest'|'desert'|'mist'|'tech'|'peaks'

interface Skill { id: UUID; code: string; name: string; category: string; description?: string }
interface UserSkill { user_id: UUID; skill_id: UUID; level: number; xp: number; discovered: boolean; due_at?: string }
interface Checkpoint { id: UUID; user_id: UUID; skill_id: UUID; due_at: string; status: 'pending'|'completed'|'missed'; items_count?: number }
interface Artifact { id: UUID; name: string; effect: Record<string, any>; expires_at?: string }

const SKILLS: Skill[] = [
  { id: 's1', code: 'RETENTION', name: 'Knowledge Retention', category: 'Metaskill' },
  { id: 's2', code: 'DISCIPLINE', name: 'Discipline', category: 'Metaskill' },
  { id: 's3', code: 'JS', name: 'JavaScript', category: 'Programming' },
  { id: 's4', code: 'COMMUNICATION', name: 'Communication', category: 'Metaskill' },
  { id: 's5', code: 'EMOTIONAL_AMBIGUITY', name: 'Emotional Ambiguity', category: 'Metaskill' },
  { id: 's6', code: 'ALGORITHMS', name: 'Algorithms', category: 'Programming' },
]
const SHRINES: Record<UUID, { x: number; y: number; biome: Biome }> = {
  s1: { x: 300, y: 250, biome: 'meadow' },
  s2: { x: 600, y: 400, biome: 'desert' },
  s3: { x: 900, y: 250, biome: 'tech' },
  s4: { x: 300, y: 550, biome: 'forest' },
  s5: { x: 600, y: 700, biome: 'mist' },
  s6: { x: 900, y: 550, biome: 'peaks' },
}
const USER_SKILLS: UserSkill[] = [
  { user_id: 'u1', skill_id: 's1', level: 4, xp: 360, discovered: true,  due_at: addMinsISO(120) },
  { user_id: 'u1', skill_id: 's2', level: 3, xp: 185, discovered: true,  due_at: addMinsISO(240) },
  { user_id: 'u1', skill_id: 's3', level: 2, xp: 95,  discovered: true,  due_at: addMinsISO(180) },
  { user_id: 'u1', skill_id: 's4', level: 1, xp: 30,  discovered: true },
  { user_id: 'u1', skill_id: 's5', level: 1, xp: 10,  discovered: false },
  { user_id: 'u1', skill_id: 's6', level: 1, xp: 0,   discovered: false },
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
  const WORLD_W = 1200, WORLD_H = 900
  const [zoom, setZoom] = useState(1)
  const [isDockOpen, setIsDockOpen] = useState(false)
  const [isWorldboardVisible, setIsWorldboardVisible] = useState(false)
  const [armatureType, setArmatureType] = useState<ArmatureType>(DEFAULT_AVATAR_GENDER)
  const [currentDanceIndex, setCurrentDanceIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR_URL)
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null)
  const camX = useMotionValue(-(WORLD_W/2 - 600))
  const camY = useMotionValue(-(WORLD_H/2 - 350))

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't intercept keys if user is typing in an input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const step = 40 / zoom
      if (['w','a','s','d','ArrowUp','ArrowLeft','ArrowDown','ArrowRight'].includes(e.key)) e.preventDefault()
      if (e.key === 'w' || e.key === 'ArrowUp') camY.set(camY.get() + step)
      if (e.key === 's' || e.key === 'ArrowDown') camY.set(camY.get() - step)
      if (e.key === 'a' || e.key === 'ArrowLeft') camX.set(camX.get() + step)
      if (e.key === 'd' || e.key === 'ArrowRight') camX.set(camX.get() - step)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [camX, camY, zoom])

  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = rootRef.current; if (!el) return
    function onWheel(e: WheelEvent){
      if (!e.ctrlKey && Math.abs(e.deltaY) < 20) return
      e.preventDefault()
      setZoom(z => Math.min(2.2, Math.max(0.6, z * (e.deltaY > 0 ? 0.9 : 1.1))))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel as any)
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
          .select('avatar_gender, avatar_url, phone, first_name, background_image_url')
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
          if (data.background_image_url) {
            setBackgroundImageUrl(data.background_image_url)
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

  const discovered = USER_SKILLS.filter(u => u.discovered).map(u => u.skill_id)

  // Calculate if profile is incomplete
  const isProfileIncomplete = !profileStatus.isLoading && (!profileStatus.hasPhone || !profileStatus.hasFirstName)
  const canMakeCalls = profileStatus.hasPhone

  return (
    <div ref={rootRef} className="relative min-h-screen w-full overflow-hidden touch-none">
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
        zoom={zoom}
        setZoom={setZoom}
        isDockOpen={isDockOpen}
        setIsDockOpen={setIsDockOpen}
        isWorldboardVisible={isWorldboardVisible}
        setIsWorldboardVisible={setIsWorldboardVisible}
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

      <div className="fixed inset-0 z-10">
        <AnimatePresence>
          {isWorldboardVisible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                translateX: camX,
                translateY: camY,
                scale: zoom,
                transformOrigin: '0 0'
              } as any}
              drag
              dragElastic={0}
              dragMomentum={false}
              onDrag={(_, info) => { camX.set(camX.get() + info.delta.x); camY.set(camY.get() + info.delta.y) }}
            >
              <div className="absolute inset-0">
                <WorldDecor width={WORLD_W} height={WORLD_H} />
                <BiomeRegions width={WORLD_W} height={WORLD_H} />
                <FogOfWar width={WORLD_W} height={WORLD_H} revealedSkillIds={discovered} />
                <Shrines />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isDockOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ position: 'fixed', inset: 0, zIndex: 40 } as any}
            >
              <div
                className="absolute inset-0 bg-black/20 cursor-pointer"
                onClick={() => { setIsDockOpen(false); setIsWorldboardVisible(false); }}
              />
            </motion.div>
            <div className="fixed inset-x-0 bottom-0 md:inset-auto md:right-4 md:top-20 md:bottom-4 z-50 md:w-[300px] max-h-[85vh] md:max-h-none">
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{ height: '100%' } as any}
              >
                <Dock onClose={() => { setIsDockOpen(false); setIsWorldboardVisible(false); }} />
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

interface HUDProps {
  zoom: number
  setZoom: (z: number) => void
  isDockOpen: boolean
  setIsDockOpen: (open: boolean) => void
  isWorldboardVisible: boolean
  setIsWorldboardVisible: (visible: boolean) => void
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

function HUD({ zoom, setZoom, isDockOpen, setIsDockOpen, isWorldboardVisible, setIsWorldboardVisible, armatureType, setArmatureType, currentDanceIndex, setCurrentDanceIndex, isAnimating, setIsAnimating, avatarUrl, setAvatarUrl, canMakeCalls, visemeWeights, isSpeaking }: HUDProps){
  const [streak, setStreak] = useState(0)
  const [isMusicMuted, setIsMusicMuted] = useState(false)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedPhraseIndex, setSelectedPhraseIndex] = useState(0)
  const [showSpeechMenu, setShowSpeechMenu] = useState(false)
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
    setIsWorldboardVisible(!isWorldboardVisible)

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

          {/* Speech Test Button */}
          <div className="relative">
            <button
              onClick={() => { playClickSound(); setShowSpeechMenu(!showSpeechMenu) }}
              className={`rounded-xl ${isSpeaking ? 'bg-violet-500/30 border-violet-400/60 ring-2 ring-violet-400/40 animate-pulse' : 'bg-violet-500/20 border-violet-400/40'} border p-2 hover:bg-violet-500/30 transition active:scale-95`}
              title="Speech Test (Lip-Sync)"
            >
              <MessageSquare className="size-5 text-violet-300"/>
            </button>
            {showSpeechMenu && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#0b0f17] border border-white/10 shadow-xl overflow-hidden max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-white/10">
                  <div className="text-xs font-medium text-violet-300 mb-2">Lip-Sync Test Phrases</div>
                  <div className="text-[10px] text-slate-400 mb-2">Select a phrase and click "Speak" to test lip-sync</div>

                  {/* Phrase selection */}
                  <div className="space-y-1">
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
                  <div className="flex gap-2 mt-3">
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
          </div>

          <div className="relative">
            <button
              onClick={() => { playClickSound(); setShowSettingsMenu(!showSettingsMenu) }}
              className="rounded-xl bg-emerald-500/20 border border-emerald-400/40 p-2 hover:bg-emerald-500/30 transition active:scale-95"
              title="Settings"
            >
              <Settings className="size-5 text-emerald-300"/>
            </button>
            {showSettingsMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#0b0f17] border border-white/10 shadow-xl overflow-hidden">
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

                {/* Profile Section */}
                <button
                  data-profile-button
                  onClick={() => { playClickSound(); setShowProfileModal(true); setShowSettingsMenu(false) }}
                  className="w-full p-3 flex items-center gap-2 hover:bg-white/5 transition text-left text-sm border-b border-white/10"
                >
                  <User className="size-4" />
                  Profile
                </button>

                {/* Sign Out Section */}
                <button
                  onClick={handleSignOut}
                  className="w-full p-3 flex items-center gap-2 hover:bg-white/5 transition text-left text-sm"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleToggle}
            className="rounded-xl bg-violet-500/20 border border-violet-400/40 p-2 hover:bg-violet-500/30 transition active:scale-95"
          >
            <Sparkles className="size-5 text-fuchsia-300"/>
          </button>
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
        .select('first_name, phone, avatar_url, avatar_gender, background_image_url')
        .eq('id', user.id)
        .single()

      if (fetchError) throw fetchError

      if (data) {
        setFirstName(data.first_name || '')
        setPhone(data.phone || '')
        setAvatarUrl(data.avatar_url || DEFAULT_AVATAR_URL)
        setAvatarGender(data.avatar_gender || DEFAULT_AVATAR_GENDER)
        setBackgroundImageUrl(data.background_image_url || '')
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
          background_image_url: backgroundImageUrl.trim() || null,
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

function WorldDecor({ width, height }:{ width:number; height:number }){
  return (
    <div className="relative" style={{ width, height }}>
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '80px 80px, 80px 80px',
      }} />
    </div>
  )
}

function BiomeRegions({ width, height }:{ width:number; height:number }){
  const regions = [
    { x: 150,  y: 150,  w: 350, h: 250, biome: 'meadow' },
    { x: 750,  y: 150,  w: 350, h: 250, biome: 'tech' },
    { x: 450,  y: 300,  w: 350, h: 250, biome: 'desert' },
    { x: 750,  y: 450,  w: 350, h: 300, biome: 'peaks' },
    { x: 450,  y: 600,  w: 350, h: 200, biome: 'mist' },
    { x: 150,  y: 450,  w: 350, h: 250, biome: 'forest' },
  ] as const
  return (
    <svg width={width} height={height} className="absolute top-0 left-0">
      {regions.map((r, i) => (
        <g key={i}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={28}
            fill={biomeFill(r.biome as any)} stroke="rgba(255,255,255,0.08)" strokeWidth={2} />
          <text x={r.x + 16} y={r.y + 32} fontSize="12" fill="rgba(255,255,255,0.7)">
            {(r.biome as string).toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  )
}
function biomeFill(b: Biome){
  switch(b){
    case 'meadow': return 'rgba(78,194,150,0.16)'
    case 'forest': return 'rgba(84,160,120,0.18)'
    case 'desert': return 'rgba(214,170,70,0.14)'
    case 'mist':   return 'rgba(180,160,220,0.18)'
    case 'tech':   return 'rgba(90,140,240,0.14)'
    case 'peaks':  return 'rgba(180,200,220,0.12)'
  }
}

function FogOfWar({ width, height, revealedSkillIds }:{ width:number; height:number; revealedSkillIds:UUID[] }){
  const mask = useMemo(() => {
    const circles = revealedSkillIds.map((id) => {
      const p = SHRINES[id]; const r = 140
      return `radial-gradient( circle ${r}px at ${p.x}px ${p.y}px, transparent 0, transparent ${r}px, black ${r+1}px )`
    })
    circles.push(`radial-gradient( circle 160px at 600px 450px, transparent 0, transparent 160px, black 161px )`)
    return circles.join(', ')
  }, [revealedSkillIds])
  return (
    <div className="absolute top-0 left-0"
      style={{ width, height, WebkitMaskImage: mask, maskImage: mask, background: 'radial-gradient(circle at 50% 40%, rgba(0,0,0,0.2), rgba(0,0,0,0.35))' }} />
  )
}

function Shrines(){
  const userSkillById = new Map(USER_SKILLS.map(s => [s.skill_id, s]))
  return (
    <div className="absolute top-0 left-0">
      {SKILLS.map(s => {
        const pos = SHRINES[s.id]
        const us = userSkillById.get(s.id)
        const discovered = !!us?.discovered
        return (
          <div key={s.id} className="absolute" style={{ transform: `translate(${pos.x - 44}px, ${pos.y - 44}px)` }}>
            <button
              onClick={() => { playBackgroundMusic(); playClickSound(); }}
              className={`group relative w-[88px] h-[88px] md:w-[96px] md:h-[96px] rounded-full border-2 backdrop-blur transition active:scale-95 ${discovered ? 'bg-violet-500/25 border-violet-300/50' : 'bg-slate-900/80 border-white/20'}`}
            >
              {discovered && <div className="absolute inset-0 rounded-full shadow-[0_0_32px_12px_rgba(168,85,247,0.6)]"/>}
              <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(255,255,255,0.2),transparent_60%)] group-hover:rotate-45 transition"/>
              <div className="relative z-10 flex h-full w-full flex-col items-center justify-center text-center px-1">
                {discovered ? <Sparkles className="size-5 text-fuchsia-300"/> : <LockGlyph/>}
                <div className="mt-1 text-[11px] md:text-xs leading-tight font-semibold line-clamp-2">{s.name}</div>
                {discovered && us && (<div className="mt-0.5 text-[10px] md:text-[11px] text-slate-300">Lv {us.level}</div>)}
              </div>
            </button>
            <div className="pointer-events-none absolute left-20 top-1 hidden w-60 rounded-xl border border-white/10 bg-black/70 p-2 text-xs text-slate-200 shadow-lg group-hover:block">
              <div className="font-medium mb-1">{s.name} <span className="text-[10px] text-slate-400">[{s.code}]</span></div>
              {discovered ? (
                <div>
                  <div className="flex items-center justify-between">
                    <span>XP {us?.xp ?? 0}</span>
                    <span>Next recall: {us?.due_at ? new Date(us.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                  </div>
                  <Progress value={xpToNextPct(us!.level, us!.xp)} className="h-1.5 mt-1"/>
                </div>
              ) : (
                <div>Hidden in the fog. Earn XP in related biomes to reveal.</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
function LockGlyph(){
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-70">
      <path d="M7 10V8a5 5 0 1 1 10 0v2" stroke="currentColor" strokeWidth="2"/>
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}
function xpToNextPct(level:number, xp:number){
  const need = Math.pow(level + 1, 1.7)
  const have = Math.pow(level, 1.7)
  const pct = ((xp/100 - have) / Math.max(0.001, (need - have))) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

interface AvatarProps {
  armatureType: ArmatureType
  danceIndex: number
  isAnimating: boolean
  avatarUrl?: string
  visemeWeights?: Record<VisemeName, number>
}

function Avatar({ armatureType, danceIndex, isAnimating, avatarUrl = DEFAULT_AVATAR_URL, visemeWeights }: AvatarProps){
  // Use dance animation if dancing, otherwise use idle animation
  const animationSrc = isAnimating
    ? DANCE_ANIMATIONS[armatureType][danceIndex]
    : IDLE_ANIMATIONS[armatureType]

  // Hardcoded local GLB model path
  const localModelSrc = '/models/custom-avatar.glb'

  // Convert viseme weights to emotion format (Ready Player Me uses emotion prop for morph targets)
  const emotion = visemeWeights && Object.keys(visemeWeights).length > 0 ? visemeWeights : undefined

  return (
    <VisageAvatar
      modelSrc={localModelSrc}
      animationSrc={animationSrc}
      cameraInitialDistance={3.5}
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
function PlayerMarker({ x, y }:{ x:number; y:number }){
  return (
    <div className="absolute" style={{ transform: `translate(${x - 10}px, ${y - 10}px)` }}>
      <div className="relative size-5">
        <div className="absolute inset-0 rounded-full bg-cyan-300"/>
        <div className="absolute -inset-3 animate-ping rounded-full bg-cyan-300/30"/>
      </div>
    </div>
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
