
'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, useMotionValue, AnimatePresence } from 'framer-motion'
import { Flame, Sparkles, Target, Clock, X, Volume2, VolumeX } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Canvas, useThree } from '@react-three/fiber'
import { Stars, Float, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { playClickSound, toggleMusicMute, getMusicMutedState, playBackgroundMusic, isMusicActuallyPlaying } from '@/lib/sound'

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

export default function DashboardPage() {
  const WORLD_W = 1200, WORLD_H = 900
  const [zoom, setZoom] = useState(1)
  const [isDockOpen, setIsDockOpen] = useState(false)
  const [isWorldboardVisible, setIsWorldboardVisible] = useState(false)
  const camX = useMotionValue(-(WORLD_W/2 - 600))
  const camY = useMotionValue(-(WORLD_H/2 - 350))

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

  const discovered = USER_SKILLS.filter(u => u.discovered).map(u => u.skill_id)

  return (
    <div ref={rootRef} className="relative min-h-screen w-full overflow-hidden touch-none">
      <div className="absolute inset-0 -z-10">
        <Canvas camera={{ position: [0, 0, 10], fov: 55 }}>
          <Scene />
          <Stars radius={80} depth={50} count={2500} factor={2} fade />
          <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.2}>
            <Avatar />
          </Float>
        </Canvas>
      </div>

      <HUD zoom={zoom} setZoom={setZoom} isDockOpen={isDockOpen} setIsDockOpen={setIsDockOpen} isWorldboardVisible={isWorldboardVisible} setIsWorldboardVisible={setIsWorldboardVisible} />

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

function HUD({ zoom, setZoom, isDockOpen, setIsDockOpen, isWorldboardVisible, setIsWorldboardVisible }: { zoom: number; setZoom: (z:number)=>void; isDockOpen: boolean; setIsDockOpen: (open:boolean)=>void; isWorldboardVisible: boolean; setIsWorldboardVisible: (visible:boolean)=>void }){
  const streak = 5
  const [isMusicMuted, setIsMusicMuted] = useState(false)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)

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
        </div>
      </div>
    </div>
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

function Avatar(){
  const { scene } = useGLTF('https://models.readyplayer.me/68f39e2ac955f67d168fc54c.glb')
  const PrimitiveComponent = 'primitive' as any
  return (
    <Float speed={1} rotationIntensity={0.1} floatIntensity={0.2}>
      <PrimitiveComponent
        object={scene}
        scale={1.8}
        position={[0, -1.5, 5]}
        rotation={[0, 0, 0]}
      />
    </Float>
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
