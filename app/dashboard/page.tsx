
'use client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { Compass, Flame, Star, Map as MapIcon, Sparkles, Target, Clock, ZoomIn, ZoomOut, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Canvas, useThree } from '@react-three/fiber'
import { Stars, Float, useGLTF } from '@react-three/drei'
import * as THREE from 'three'

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
  s1: { x: 500, y: 420, biome: 'meadow' },
  s2: { x: 980, y: 820, biome: 'desert' },
  s3: { x: 1550, y: 620, biome: 'tech' },
  s4: { x: 780, y: 240, biome: 'forest' },
  s5: { x: 1800, y: 980, biome: 'mist' },
  s6: { x: 2200, y: 400, biome: 'peaks' },
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
  const WORLD_W = 2800, WORLD_H = 1600
  const [zoom, setZoom] = useState(1)
  const [isDockOpen, setIsDockOpen] = useState(false)
  const [isWorldboardVisible, setIsWorldboardVisible] = useState(false)
  const camX = useMotionValue(-(WORLD_W/2 - 600))
  const camY = useMotionValue(-(WORLD_H/2 - 350))

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
    <div ref={rootRef} className="relative min-h-screen w-full overflow-hidden">
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
                className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
                onClick={() => { setIsDockOpen(false); setIsWorldboardVisible(false); }}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{ position: 'fixed', right: '1rem', top: '5rem', bottom: '1rem', zIndex: 50, width: '340px' } as any}
            >
              <Dock onClose={() => { setIsDockOpen(false); setIsWorldboardVisible(false); }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <MiniMap worldW={WORLD_W} worldH={WORLD_H} camX={camX} camY={camY} zoom={zoom} />
    </div>
  )
}

function HUD({ zoom, setZoom, isDockOpen, setIsDockOpen, isWorldboardVisible, setIsWorldboardVisible }: { zoom: number; setZoom: (z:number)=>void; isDockOpen: boolean; setIsDockOpen: (open:boolean)=>void; isWorldboardVisible: boolean; setIsWorldboardVisible: (visible:boolean)=>void }){
  const wrs = 72, streak = 5, points = 4

  const handleToggle = () => {
    setIsDockOpen(!isDockOpen)
    setIsWorldboardVisible(!isWorldboardVisible)
  }

  return (
    <div className="pointer-events-none fixed top-0 left-0 right-0 z-40">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 backdrop-blur">
          <MapIcon className="size-4"/>
          <div className="font-semibold tracking-wide">Artha · Worldboard</div>
        </div>
        <div className="pointer-events-auto ml-auto flex items-center gap-2">
          <Badge className="bg-emerald-500/15 text-emerald-200 border-emerald-500/30">WRS {wrs}</Badge>
          <Badge className="bg-orange-500/15 text-orange-200 border-orange-500/30"><Flame className="size-4 mr-1"/> {streak}d</Badge>
          <Badge className="bg-amber-500/15 text-amber-200 border-amber-500/30"><Star className="size-4 mr-1"/> {points}</Badge>
          <div className="hidden md:flex items-center gap-1 rounded-xl bg-white/5 border border-white/10 px-2 py-1">
            <ZoomOut className="size-4 opacity-70"/>
            <input type="range" min={0.6} max={2.2} step={0.01} value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="w-32 accent-violet-400"/>
            <ZoomIn className="size-4 opacity-70"/>
          </div>
          <button
            onClick={handleToggle}
            className="rounded-xl bg-violet-500/20 border border-violet-400/40 px-3 py-2 hover:bg-violet-500/30 transition"
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
    { x: 200,  y: 200,  w: 700, h: 450, biome: 'meadow' },
    { x: 980,  y: 480,  w: 520, h: 380, biome: 'tech' },
    { x: 680,  y: 780,  w: 820, h: 480, biome: 'desert' },
    { x: 1600, y: 200,  w: 700, h: 400, biome: 'peaks' },
    { x: 1800, y: 760,  w: 700, h: 520, biome: 'mist' },
    { x: 400,  y: 80,   w: 480, h: 240, biome: 'forest' },
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
      const p = SHRINES[id]; const r = 160
      return `radial-gradient( circle ${r}px at ${p.x}px ${p.y}px, transparent 0, transparent ${r}px, black ${r+1}px )`
    })
    circles.push(`radial-gradient( circle 180px at 600px 520px, transparent 0, transparent 180px, black 181px )`)
    return circles.join(', ')
  }, [revealedSkillIds])
  return (
    <div className="absolute top-0 left-0"
      style={{ width, height, WebkitMaskImage: mask, maskImage: mask, background: 'radial-gradient(circle at 50% 40%, rgba(0,0,0,0.55), rgba(0,0,0,0.85))' }} />
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
          <div key={s.id} className="absolute" style={{ transform: `translate(${pos.x - 30}px, ${pos.y - 30}px)` }}>
            <button className={`group relative w-[72px] h-[72px] rounded-full border backdrop-blur transition ${discovered ? 'bg-violet-500/15 border-violet-300/30' : 'bg-slate-900/70 border-white/10'}`}>
              {discovered && <div className="absolute inset-0 rounded-full shadow-[0_0_24px_8px_rgba(168,85,247,0.35)]"/>}
              <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(255,255,255,0.12),transparent_60%)] group-hover:rotate-45 transition"/>
              <div className="relative z-10 flex h-full w-full flex-col items-center justify-center text-center px-1">
                {discovered ? <Sparkles className="size-4 text-fuchsia-300"/> : <LockGlyph/>}
                <div className="mt-0.5 text-[10px] leading-tight font-semibold line-clamp-2">{s.name}</div>
                {discovered && us && (<div className="mt-0.5 text-[10px] text-slate-300">Lv {us.level}</div>)}
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
    <div className="relative h-full space-y-3">
      <button
        onClick={onClose}
        className="absolute -left-12 top-0 rounded-xl bg-white/5 border border-white/10 p-2 hover:bg-white/10 transition backdrop-blur"
      >
        <X className="size-5" />
      </button>
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Target className="size-5"/> Quest Log</CardTitle></CardHeader>
        <CardContent>
          {due.length === 0 ? (
            <div className="text-sm text-slate-300">No checkpoints due. Explore the map or prepare for tonight’s call.</div>
          ) : (
            <div className="space-y-2">
              {due.map(q => (
                <div key={q.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{skillById.get(q.skill_id)?.name}</div>
                    <div className="text-xs text-slate-300">{new Date(q.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {q.items_count ?? 3} items</div>
                  </div>
                  <Button className="bg-violet-600 hover:bg-violet-500">Start</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <CallCard />
      <ArtifactsCard />
      <AllocatePointsCard />
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
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Clock className="size-5"/> Evening Call</CardTitle></CardHeader>
      <CardContent>
        <div className="text-sm text-slate-300">Next call at {new Date(next).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        <div className="mt-2 flex gap-2">
          <Button
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
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Sparkles className="size-5"/> Artifacts</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {ARTIFACTS.map(a => (
          <Badge key={a.id} className="bg-fuchsia-600/20 border-fuchsia-400/30 text-fuchsia-200">{a.name}</Badge>
        ))}
      </CardContent>
    </Card>
  )
}
function AllocatePointsCard(){
  const [pool, setPool] = useState(4)
  const discovered = USER_SKILLS.filter(u => u.discovered)
  return (
    <Card className="bg-gradient-to-br from-amber-600/20 to-amber-400/10 border-amber-200/20">
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2"><Star className="size-5"/> Allocate Points</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <div className="text-sm text-amber-100/90">Pool: {pool}</div>
        <div className="space-y-2 max-h-52 overflow-auto pr-1">
          {discovered.map(u => (
            <div key={u.skill_id} className="rounded-xl border border-white/10 bg-white/5 p-2">
              <div className="flex items-center justify-between text-sm">
                <span>{SKILLS.find(s => s.id === u.skill_id)?.name}</span>
                <span>Lv {u.level} · XP {u.xp}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Button variant="outline" onClick={() => setPool(p => Math.min(4, p + 1))}>+1</Button>
                <Button onClick={() => setPool(p => Math.max(0, p - 1))} className="bg-amber-600 hover:bg-amber-500">Assign</Button>
              </div>
            </div>
          ))}
        </div>
        <Button disabled={pool===4} className="w-full bg-amber-600 hover:bg-amber-500">Confirm</Button>
      </CardContent>
    </Card>
  )
}

function MiniMap({ worldW, worldH, camX, camY, zoom }:{ worldW:number; worldH:number; camX:any; camY:any; zoom:number }){
  const viewW = 260 / zoom
  const viewH = 150 / zoom
  const vx = useTransform(camX, x => (-x / (worldW)) * 200)
  const vy = useTransform(camY, y => (-y / (worldH)) * 120)
  return (
    <div className="fixed left-4 bottom-4 z-30">
      <div className="rounded-xl border border-white/10 bg-black/50 backdrop-blur p-2">
        <div className="text-xs mb-1 flex items-center gap-1 opacity-80"><Compass className="size-3"/> Minimap</div>
        <div className="relative h-[120px] w-[200px] rounded-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(88,140,240,0.15), rgba(90,180,150,0.15))' }}>
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 30% 60%, rgba(255,255,255,0.1) 0, transparent 40%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.1) 0, transparent 40%)' }}/>
          <motion.div style={{ position: 'absolute', left: vx, top: vy, width: viewW as any, height: viewH as any, border: '1px solid rgba(255,255,255,0.7)' } as any} />
        </div>
      </div>
    </div>
  )
}
