/**
 * Lip-sync engine for Ready Player Me avatars
 * Provides phoneme-to-viseme mapping and timeline generation for OVR LipSync blend shapes
 */

// OVR LipSync viseme names (15 standard visemes for Ready Player Me)
export type VisemeName =
  | 'viseme_sil' // silence
  | 'viseme_PP'  // p, b, m
  | 'viseme_FF'  // f, v
  | 'viseme_TH'  // th
  | 'viseme_DD'  // t, d
  | 'viseme_kk'  // k, g
  | 'viseme_CH'  // ch, j, sh, zh
  | 'viseme_SS'  // s, z
  | 'viseme_nn'  // n, l
  | 'viseme_RR'  // r
  | 'viseme_aa'  // a, ah, ae
  | 'viseme_E'   // e, eh
  | 'viseme_I'   // i, ih
  | 'viseme_O'   // o, oh, aw
  | 'viseme_U'   // u, oo, uh

export interface VisemeFrame {
  time: number // milliseconds from start
  viseme: VisemeName
  weight: number // 0-1
  duration: number // milliseconds
}

export interface VisemeTimeline {
  frames: VisemeFrame[]
  totalDuration: number
}

// Phoneme to viseme mapping based on OVR LipSync specification
const PHONEME_TO_VISEME: Record<string, VisemeName> = {
  // Silence
  'sil': 'viseme_sil',
  'pau': 'viseme_sil',

  // Bilabial (lips together)
  'p': 'viseme_PP',
  'b': 'viseme_PP',
  'm': 'viseme_PP',

  // Labiodental (teeth on lip)
  'f': 'viseme_FF',
  'v': 'viseme_FF',

  // Dental (tongue on teeth)
  'th': 'viseme_TH',
  'dh': 'viseme_TH',

  // Alveolar (tongue on alveolar ridge)
  't': 'viseme_DD',
  'd': 'viseme_DD',

  // Velar (back of tongue)
  'k': 'viseme_kk',
  'g': 'viseme_kk',
  'ng': 'viseme_kk',

  // Postalveolar (tongue behind alveolar ridge)
  'ch': 'viseme_CH',
  'jh': 'viseme_CH',
  'sh': 'viseme_CH',
  'zh': 'viseme_CH',

  // Alveolar fricative
  's': 'viseme_SS',
  'z': 'viseme_SS',

  // Nasal/lateral
  'n': 'viseme_nn',
  'l': 'viseme_nn',

  // Rhotic
  'r': 'viseme_RR',
  'er': 'viseme_RR',

  // Open vowels
  'aa': 'viseme_aa',
  'ae': 'viseme_aa',
  'ah': 'viseme_aa',
  'ao': 'viseme_aa',
  'aw': 'viseme_aa',
  'ay': 'viseme_aa',

  // Mid vowels
  'eh': 'viseme_E',
  'ey': 'viseme_E',

  // Close front vowels
  'ih': 'viseme_I',
  'iy': 'viseme_I',

  // Back vowels
  'oh': 'viseme_O',
  'ow': 'viseme_O',
  'oy': 'viseme_O',

  // Close back vowels
  'uh': 'viseme_U',
  'uw': 'viseme_U',
  'w': 'viseme_U',
}

// Letter/pattern to phoneme mapping (simplified English)
const LETTER_TO_PHONEME: Array<[RegExp, string]> = [
  // Consonants
  [/ch/i, 'ch'],
  [/sh/i, 'sh'],
  [/th/i, 'th'],
  [/ng/i, 'ng'],
  [/ph/i, 'f'],
  [/p/i, 'p'],
  [/b/i, 'b'],
  [/m/i, 'm'],
  [/f/i, 'f'],
  [/v/i, 'v'],
  [/t/i, 't'],
  [/d/i, 'd'],
  [/k/i, 'k'],
  [/c/i, 'k'],
  [/g/i, 'g'],
  [/j/i, 'jh'],
  [/s/i, 's'],
  [/z/i, 'z'],
  [/n/i, 'n'],
  [/l/i, 'l'],
  [/r/i, 'r'],
  [/w/i, 'w'],
  [/h/i, 'sil'],
  [/y/i, 'iy'],
  [/x/i, 'k'],
  [/q/i, 'k'],

  // Vowels (simplified, position-dependent)
  [/ee/i, 'iy'],
  [/ea/i, 'iy'],
  [/oo/i, 'uw'],
  [/ou/i, 'aw'],
  [/ow/i, 'aw'],
  [/oi/i, 'oy'],
  [/oy/i, 'oy'],
  [/ai/i, 'ay'],
  [/ay/i, 'ay'],
  [/au/i, 'aw'],
  [/aw/i, 'aw'],
  [/a/i, 'ae'],
  [/e/i, 'eh'],
  [/i/i, 'ih'],
  [/o/i, 'oh'],
  [/u/i, 'uh'],
]

/**
 * Convert text to approximate phoneme sequence
 * This is a simplified approach - for production, use a proper phoneme dictionary
 */
export function textToPhonemes(text: string): string[] {
  const phonemes: string[] = []
  const words = text.toLowerCase()
    .replace(/[^a-z\s]/g, '') // Remove punctuation
    .split(/\s+/)
    .filter(w => w.length > 0)

  for (const word of words) {
    let remaining = word

    while (remaining.length > 0) {
      let matched = false

      for (const [pattern, phoneme] of LETTER_TO_PHONEME) {
        if (pattern.test(remaining)) {
          const match = remaining.match(pattern)
          if (match && match.index === 0) {
            phonemes.push(phoneme)
            remaining = remaining.slice(match[0].length)
            matched = true
            break
          }
        }
      }

      if (!matched) {
        // Skip unknown character
        remaining = remaining.slice(1)
      }
    }

    // Add brief pause between words
    phonemes.push('pau')
  }

  return phonemes
}

/**
 * Convert phoneme sequence to viseme names
 */
export function phonemesToVisemes(phonemes: string[]): VisemeName[] {
  return phonemes.map(phoneme =>
    PHONEME_TO_VISEME[phoneme] || 'viseme_sil'
  )
}

/**
 * Generate viseme timeline from text
 * @param text - Text to speak
 * @param durationMs - Total duration of speech in milliseconds (estimated or from TTS)
 * @returns Timeline of viseme frames
 */
export function generateVisemeTimeline(
  text: string,
  durationMs?: number
): VisemeTimeline {
  const phonemes = textToPhonemes(text)
  const visemes = phonemesToVisemes(phonemes)

  // Estimate duration if not provided (average speaking rate: ~150 words/min = ~5 phonemes/sec)
  const estimatedDuration = durationMs || (phonemes.length * 100) // 100ms per phoneme
  const phonemeDuration = estimatedDuration / phonemes.length

  const frames: VisemeFrame[] = []
  let currentTime = 0

  for (let i = 0; i < visemes.length; i++) {
    const viseme = visemes[i]
    const duration = phonemeDuration

    // Determine weight based on phoneme type
    // Vowels typically have stronger mouth shapes
    // Reduced weights for more natural, subtle movement
    const isVowel = ['viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U'].includes(viseme)
    const weight = viseme === 'viseme_sil' ? 0 : (isVowel ? 0.5 : 0.35)

    frames.push({
      time: currentTime,
      viseme,
      weight,
      duration,
    })

    currentTime += duration
  }

  return {
    frames,
    totalDuration: estimatedDuration,
  }
}

/**
 * Get current viseme weights at a specific time in the timeline
 * Uses smooth interpolation between frames
 */
export function getVisemeWeightsAtTime(
  timeline: VisemeTimeline,
  currentTimeMs: number
): Record<VisemeName, number> {
  const weights: Record<string, number> = {}

  // Initialize all visemes to 0
  const allVisemes: VisemeName[] = [
    'viseme_sil', 'viseme_PP', 'viseme_FF', 'viseme_TH', 'viseme_DD',
    'viseme_kk', 'viseme_CH', 'viseme_SS', 'viseme_nn', 'viseme_RR',
    'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U',
  ]

  allVisemes.forEach(v => weights[v] = 0)

  // Find current and next frames
  let currentFrame: VisemeFrame | null = null
  let nextFrame: VisemeFrame | null = null

  for (let i = 0; i < timeline.frames.length; i++) {
    const frame = timeline.frames[i]
    if (currentTimeMs >= frame.time && currentTimeMs < frame.time + frame.duration) {
      currentFrame = frame
      nextFrame = timeline.frames[i + 1] || null
      break
    }
  }

  if (!currentFrame) {
    // Speech finished or not started - return silence
    weights['viseme_sil'] = 1
    return weights as Record<VisemeName, number>
  }

  // Calculate blend factor for smooth transition
  const blendDuration = 100 // 100ms blend time for smoother transitions
  const timeInFrame = currentTimeMs - currentFrame.time
  const blendFactor = Math.min(timeInFrame / blendDuration, 1)

  // Apply current frame weight
  weights[currentFrame.viseme] = currentFrame.weight * (1 - (nextFrame ? (1 - blendFactor) * 0.3 : 0))

  // Blend with next frame if within blend duration of transition
  if (nextFrame && timeInFrame > (currentFrame.duration - blendDuration)) {
    const nextBlendFactor = (timeInFrame - (currentFrame.duration - blendDuration)) / blendDuration
    weights[nextFrame.viseme] = nextFrame.weight * nextBlendFactor * 0.5
  }

  return weights as Record<VisemeName, number>
}

/**
 * Modulate viseme weights based on audio amplitude
 * This adds dynamic variation based on actual speech volume
 */
export function modulateVisemeWeights(
  weights: Record<VisemeName, number>,
  amplitude: number // 0-1
): Record<VisemeName, number> {
  const modulated: Record<string, number> = {}

  for (const [viseme, weight] of Object.entries(weights)) {
    // Silence is not affected by amplitude
    if (viseme === 'viseme_sil') {
      modulated[viseme] = weight
    } else {
      // Scale weight by amplitude with reduced range for more natural movement
      // Range: 0.5-0.9x instead of 0.3-1.0x
      modulated[viseme] = weight * (0.5 + amplitude * 0.4)
    }
  }

  return modulated as Record<VisemeName, number>
}
