/**
 * Speech synthesis service with audio analysis for lip-sync
 * Integrates browser TTS with Web Audio API for real-time amplitude tracking
 */

import {
  generateVisemeTimeline,
  getVisemeWeightsAtTime,
  modulateVisemeWeights,
  type VisemeTimeline,
  type VisemeName,
} from './lipsync'

export interface SpeechOptions {
  voice?: SpeechSynthesisVoice
  rate?: number // 0.1 to 10, default 1
  pitch?: number // 0 to 2, default 1
  volume?: number // 0 to 1, default 1
  lang?: string // e.g., 'en-US'
}

export interface SpeechState {
  isSpeaking: boolean
  currentText: string
  visemeWeights: Record<VisemeName, number>
  amplitude: number // current audio amplitude 0-1
}

type SpeechCallback = (state: SpeechState) => void

export class SpeechService {
  private utterance: SpeechSynthesisUtterance | null = null
  private audioContext: AudioContext | null = null
  private analyzer: AnalyserNode | null = null
  private dataArray: Uint8Array | null = null
  private timeline: VisemeTimeline | null = null
  private startTime: number = 0
  private animationFrameId: number = 0

  private state: SpeechState = {
    isSpeaking: false,
    currentText: '',
    visemeWeights: {} as Record<VisemeName, number>,
    amplitude: 0,
  }

  private onUpdate: SpeechCallback | null = null

  /**
   * Initialize the speech service
   */
  constructor() {
    // Check for browser support
    if (typeof window === 'undefined') {
      console.warn('SpeechService: Running in non-browser environment')
      return
    }

    if (!('speechSynthesis' in window)) {
      console.error('SpeechService: Speech Synthesis API not supported')
      return
    }
  }

  /**
   * Set callback for state updates (called every animation frame during speech)
   */
  setOnUpdate(callback: SpeechCallback) {
    this.onUpdate = callback
  }

  /**
   * Get list of available voices
   */
  async getVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        resolve(voices)
      } else {
        // Voices might load asynchronously
        window.speechSynthesis.onvoiceschanged = () => {
          resolve(window.speechSynthesis.getVoices())
        }
      }
    })
  }

  /**
   * Speak text with lip-sync
   */
  async speak(text: string, options: SpeechOptions = {}): Promise<void> {
    // Cancel any ongoing speech
    this.stop()

    return new Promise((resolve, reject) => {
      try {
        // Create utterance
        this.utterance = new SpeechSynthesisUtterance(text)
        this.utterance.rate = options.rate ?? 1
        this.utterance.pitch = options.pitch ?? 1
        this.utterance.volume = options.volume ?? 1
        this.utterance.lang = options.lang ?? 'en-US'

        if (options.voice) {
          this.utterance.voice = options.voice
        }

        // Generate viseme timeline
        // Estimate duration based on text length and speech rate
        const estimatedDuration = this.estimateDuration(text, this.utterance.rate)
        this.timeline = generateVisemeTimeline(text, estimatedDuration)

        // Set up audio context for amplitude analysis
        this.setupAudioAnalysis()

        // Event handlers
        this.utterance.onstart = () => {
          this.startTime = performance.now()
          this.state.isSpeaking = true
          this.state.currentText = text
          this.startAnimation()
        }

        this.utterance.onend = () => {
          this.state.isSpeaking = false
          this.state.currentText = ''
          this.stopAnimation()
          this.resetVisemes()
          resolve()
        }

        this.utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event)
          this.state.isSpeaking = false
          this.stopAnimation()
          this.resetVisemes()
          reject(new Error(`Speech synthesis failed: ${event.error}`))
        }

        // Start speaking
        window.speechSynthesis.speak(this.utterance)
      } catch (error) {
        console.error('Failed to speak:', error)
        reject(error)
      }
    })
  }

  /**
   * Stop current speech
   */
  stop() {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel()
    }
    this.stopAnimation()
    this.resetVisemes()
    this.state.isSpeaking = false
    this.state.currentText = ''
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.state.isSpeaking
  }

  /**
   * Get current state
   */
  getState(): SpeechState {
    return { ...this.state }
  }

  /**
   * Estimate speech duration based on text length and rate
   * Average speaking rate: ~150 words/minute = ~2.5 words/second
   */
  private estimateDuration(text: string, rate: number): number {
    const words = text.trim().split(/\s+/).length
    const baseWPM = 150 // words per minute
    const durationSeconds = (words / baseWPM) * 60 / rate
    return durationSeconds * 1000 // convert to ms
  }

  /**
   * Set up Web Audio API for amplitude analysis
   * Note: We can't directly capture TTS audio, so we'll use a simpler approach
   */
  private setupAudioAnalysis() {
    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Create analyzer node
      this.analyzer = this.audioContext.createAnalyser()
      this.analyzer.fftSize = 256
      this.analyzer.smoothingTimeConstant = 0.8

      const bufferLength = this.analyzer.frequencyBinCount
      this.dataArray = new Uint8Array(bufferLength)

      // Note: We can't capture TTS audio directly in most browsers
      // So we'll simulate amplitude based on viseme activity instead
    } catch (error) {
      console.warn('Failed to setup audio analysis:', error)
    }
  }

  /**
   * Get current audio amplitude
   * Since we can't capture TTS audio, we estimate based on speech state
   */
  private getAmplitude(): number {
    if (!this.state.isSpeaking) return 0

    // Simulate amplitude variation based on time
    // Reduced variation for more natural, subtle movement
    const t = (performance.now() - this.startTime) / 100
    const baseAmplitude = 0.5 + Math.sin(t * 0.5) * 0.1 // Slower oscillation, 0.4-0.6 range
    const randomVariation = Math.random() * 0.05 // Gentler random jitter: 0-0.05
    return Math.max(0, Math.min(1, baseAmplitude + randomVariation))
  }

  /**
   * Start animation loop
   */
  private startAnimation() {
    const animate = () => {
      if (!this.state.isSpeaking || !this.timeline) {
        return
      }

      // Calculate current time in speech
      const currentTime = performance.now() - this.startTime

      // Get viseme weights at current time
      const weights = getVisemeWeightsAtTime(this.timeline, currentTime)

      // Get amplitude and modulate weights
      const amplitude = this.getAmplitude()
      const modulatedWeights = modulateVisemeWeights(weights, amplitude)

      // Update state
      this.state.visemeWeights = modulatedWeights
      this.state.amplitude = amplitude

      // Notify callback
      if (this.onUpdate) {
        this.onUpdate(this.state)
      }

      // Continue animation
      this.animationFrameId = requestAnimationFrame(animate)
    }

    animate()
  }

  /**
   * Stop animation loop
   */
  private stopAnimation() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = 0
    }
  }

  /**
   * Reset all viseme weights to silence
   */
  private resetVisemes() {
    const allVisemes: VisemeName[] = [
      'viseme_sil', 'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD',
      'viseme_kk', 'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR',
      'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U',
    ]

    const silentWeights: Record<string, number> = {}
    allVisemes.forEach(v => silentWeights[v] = v === 'viseme_sil' ? 1 : 0)

    this.state.visemeWeights = silentWeights as Record<VisemeName, number>
    this.state.amplitude = 0

    if (this.onUpdate) {
      this.onUpdate(this.state)
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stop()
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
    this.analyzer = null
    this.dataArray = null
    this.timeline = null
    this.onUpdate = null
  }
}

// Singleton instance
let speechServiceInstance: SpeechService | null = null

/**
 * Get the global speech service instance
 */
export function getSpeechService(): SpeechService {
  if (!speechServiceInstance) {
    speechServiceInstance = new SpeechService()
  }
  return speechServiceInstance
}

/**
 * Hardcoded test phrases for lip-sync testing
 */
export const TEST_PHRASES = {
  phonetic: [
    'The quick brown fox jumps over the lazy dog',
    'Peter Piper picked a peck of pickled peppers',
    'She sells seashells by the seashore',
    'How much wood would a woodchuck chuck if a woodchuck could chuck wood',
  ],
  rpg: [
    'Welcome, traveler. Your journey begins now.',
    'Quest completed! Experience gained.',
    'Level up! New abilities unlocked.',
    'Checkpoint approaching. Prepare yourself.',
    'Greetings from Artha, your skills await mastery.',
    'The path ahead is fraught with challenges, but great rewards await.',
    'Your dedication strengthens the web of knowledge.',
    'Every skill mastered brings you closer to enlightenment.',
  ],
  mixed: [
    'Greetings from Artha, your skills await mastery.',
    'The ancient shrines hold the power of forgotten wisdom.',
    'Through practice and persistence, mastery shall be yours.',
    'Each checkpoint completed weaves stronger connections in the data web.',
  ],
}

/**
 * Get all test phrases as a flat array
 */
export function getAllTestPhrases(): Array<{ category: string; text: string }> {
  const phrases: Array<{ category: string; text: string }> = []

  for (const [category, texts] of Object.entries(TEST_PHRASES)) {
    texts.forEach(text => {
      phrases.push({ category, text })
    })
  }

  return phrases
}
