'use client'

// Standalone Avatar Component for Picture-in-Picture Window
// This component runs in a separate window context

import { useEffect, useState } from 'react'
import { Avatar as VisageAvatar } from '@readyplayerme/visage'
import type { AvatarPiPState, PiPMessage } from '@/lib/avatar-pip'
import type { VisemeName } from '@/lib/lipsync'

// Animation URLs
const IDLE_ANIMATIONS = {
  masculine: '/animation/masculine/fbx/idle/standing_idle.fbx',
  feminine: '/animation/feminine/fbx/idle/standing_idle.fbx'
}

const DANCE_ANIMATIONS = {
  masculine: [
    '/animation/masculine/fbx/dance/dance1.fbx',
    '/animation/masculine/fbx/dance/dance2.fbx',
    '/animation/masculine/fbx/dance/dance3.fbx',
    '/animation/masculine/fbx/dance/dance4.fbx',
    '/animation/masculine/fbx/dance/dance5.fbx',
    '/animation/masculine/fbx/dance/dance6.fbx',
    '/animation/masculine/fbx/dance/dance7.fbx',
    '/animation/masculine/fbx/dance/dance8.fbx'
  ],
  feminine: [
    '/animation/feminine/fbx/dance/dance1.fbx',
    '/animation/feminine/fbx/dance/dance2.fbx',
    '/animation/feminine/fbx/dance/dance3.fbx',
    '/animation/feminine/fbx/dance/dance4.fbx',
    '/animation/feminine/fbx/dance/dance5.fbx',
    '/animation/feminine/fbx/dance/dance6.fbx',
    '/animation/feminine/fbx/dance/dance7.fbx',
    '/animation/feminine/fbx/dance/dance8.fbx'
  ]
}

export default function AvatarPiPContent() {
  const [state, setState] = useState<AvatarPiPState>(() => {
    // Get initial state from window object (set by PiP manager)
    if (typeof window !== 'undefined' && (window as any).__avatarState) {
      return (window as any).__avatarState
    }
    return {
      avatarUrl: '',
      armatureType: 'masculine' as const,
      visemeWeights: undefined,
      isAnimating: false,
      danceIndex: 0
    }
  })

  const [visemeWeights, setVisemeWeights] = useState<Record<VisemeName, number> | undefined>(
    state.visemeWeights
  )

  useEffect(() => {
    // Setup BroadcastChannel to receive updates from main tab
    const channel = new BroadcastChannel('avatar-pip-sync')

    channel.addEventListener('message', (event: MessageEvent<PiPMessage>) => {
      if (event.data.type === 'VISEME_UPDATE') {
        setVisemeWeights(event.data.visemeWeights)
      } else if (event.data.type === 'STATE_UPDATE' && event.data.state) {
        setState(prev => ({ ...prev, ...event.data.state }))
      }
    })

    return () => {
      channel.close()
    }
  }, [])

  // Handle click to focus main tab
  const handleClick = () => {
    const channel = new BroadcastChannel('avatar-pip-sync')
    channel.postMessage({ type: 'FOCUS_MAIN_TAB' } as PiPMessage)
    channel.close()
  }

  // Select animation based on state
  const animationSrc = state.isAnimating
    ? DANCE_ANIMATIONS[state.armatureType][state.danceIndex]
    : IDLE_ANIMATIONS[state.armatureType]

  // Convert viseme weights to emotion prop
  const emotion = visemeWeights && Object.keys(visemeWeights).length > 0
    ? visemeWeights
    : undefined

  return (
    <div
      className="w-full h-full cursor-pointer relative"
      onClick={handleClick}
      title="Click to return to dashboard"
      style={{ background: 'transparent' }}
    >
      {/* Avatar - fully transparent background */}
      <VisageAvatar
        modelSrc="/models/custom-avatar.glb"
        animationSrc={animationSrc}
        cameraInitialDistance={1.35}
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
      />
    </div>
  )
}
