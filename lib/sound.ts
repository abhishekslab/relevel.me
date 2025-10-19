/**
 * Sound utility for UI interactions
 * Uses Web Audio API to generate simple sound effects
 * And manages background music playback
 */

let audioContext: AudioContext | null = null
let backgroundMusic: HTMLAudioElement | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

/**
 * Play a simple click sound
 */
export function playClickSound() {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.1)
  } catch (error) {
    // Silently fail if audio context is not available
    console.warn('Audio playback failed:', error)
  }
}

/**
 * Play a success sound (higher pitch, pleasant)
 */
export function playSuccessSound() {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.setValueAtTime(600, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.1)
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.15)
  } catch (error) {
    console.warn('Audio playback failed:', error)
  }
}

/**
 * Play an error sound (lower pitch, brief)
 */
export function playErrorSound() {
  try {
    const ctx = getAudioContext()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = 300
    oscillator.type = 'triangle'

    gainNode.gain.setValueAtTime(0.12, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.12)
  } catch (error) {
    console.warn('Audio playback failed:', error)
  }
}

/**
 * Play a dramatic "Enter World" transition sound
 */
export function playEnterWorldSound() {
  try {
    const ctx = getAudioContext()

    // Create a sweeping upward frequency
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.setValueAtTime(400, ctx.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3)
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)
  } catch (error) {
    console.warn('Audio playback failed:', error)
  }
}

// ========================================
// Background Music Management
// ========================================

const MUSIC_MUTED_KEY = 'relevel_music_muted'
const MUSIC_PLAYING_KEY = 'relevel_music_playing'

/**
 * Initialize and play background music
 */
export function playBackgroundMusic() {
  try {
    if (!backgroundMusic) {
      backgroundMusic = new Audio('/audio/background-music.mp3')
      backgroundMusic.loop = true
      backgroundMusic.volume = 0.3 // 30% volume for background music
    }

    const isMuted = getMusicMutedState()
    backgroundMusic.muted = isMuted

    // Mark music as playing in localStorage
    setMusicPlayingState(true)

    // If music is already playing, don't restart it
    if (!backgroundMusic.paused) {
      return
    }

    // Set up listeners to resume on ANY user interaction (proactive approach)
    setupAutoResumeListeners()

    // Attempt to play - might be blocked by browser autoplay policy
    const playPromise = backgroundMusic.play()
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('Background music started successfully')
        })
        .catch(error => {
          console.warn('Autoplay blocked by browser. Music will start on first click/interaction.')
        })
    }
  } catch (error) {
    console.warn('Background music playback failed:', error)
  }
}

/**
 * Setup listeners to auto-resume music on user interaction
 */
function setupAutoResumeListeners() {
  const resumeMusic = () => {
    if (backgroundMusic && backgroundMusic.paused && getMusicPlayingState()) {
      const isMuted = getMusicMutedState()
      backgroundMusic.muted = isMuted
      backgroundMusic.play().catch(() => {})
    }
  }

  // Listen for various user interactions
  const events = ['click', 'keydown', 'touchstart', 'mousedown']
  events.forEach(event => {
    document.addEventListener(event, resumeMusic, { once: true })
  })
}

/**
 * Pause background music
 */
export function pauseBackgroundMusic() {
  if (backgroundMusic) {
    backgroundMusic.pause()
    setMusicPlayingState(false)
  }
}

/**
 * Toggle mute state for background music
 */
export function toggleMusicMute(): boolean {
  const newMutedState = !getMusicMutedState()
  setMusicMutedState(newMutedState)

  if (backgroundMusic) {
    backgroundMusic.muted = newMutedState
  }

  return newMutedState
}

/**
 * Get current mute state from localStorage
 */
export function getMusicMutedState(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(MUSIC_MUTED_KEY) === 'true'
}

/**
 * Set mute state in localStorage
 */
function setMusicMutedState(muted: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(MUSIC_MUTED_KEY, muted.toString())
}

/**
 * Get current music playing state from localStorage
 */
function getMusicPlayingState(): boolean {
  if (typeof window === 'undefined') return true // Default to playing
  return localStorage.getItem(MUSIC_PLAYING_KEY) !== 'false'
}

/**
 * Set music playing state in localStorage
 */
function setMusicPlayingState(playing: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(MUSIC_PLAYING_KEY, playing.toString())
}

/**
 * Check if background music is actually playing (not paused/blocked)
 */
export function isMusicActuallyPlaying(): boolean {
  return backgroundMusic !== null && !backgroundMusic.paused
}

/**
 * Get the background music audio element (for external control)
 */
export function getBackgroundMusicElement(): HTMLAudioElement | null {
  return backgroundMusic
}
