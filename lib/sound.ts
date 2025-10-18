/**
 * Sound utility for UI interactions
 * Uses Web Audio API to generate simple sound effects
 */

let audioContext: AudioContext | null = null

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
