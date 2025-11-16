// Avatar Picture-in-Picture Service
// Manages floating avatar window that persists across browser tabs

import type { VisemeName } from './lipsync'
import { createRoot, type Root } from 'react-dom/client'
import type { ReactElement } from 'react'

export type PiPMode = 'document' | 'video' | 'unsupported'

export interface AvatarPiPState {
  avatarUrl: string
  armatureType: 'masculine' | 'feminine'
  visemeWeights: Record<VisemeName, number> | undefined
  isAnimating: boolean
  danceIndex: number
}

export interface PiPMessage {
  type: 'VISEME_UPDATE' | 'STATE_UPDATE' | 'CLOSE_REQUEST' | 'FOCUS_MAIN_TAB'
  visemeWeights?: Record<VisemeName, number>
  state?: Partial<AvatarPiPState>
}

export class AvatarPiPManager {
  private pipWindow: Window | null = null
  private channel: BroadcastChannel | null = null
  private videoElement: HTMLVideoElement | null = null
  private mode: PiPMode = 'unsupported'
  private onMainTabFocus?: () => void
  private reactRoot: Root | null = null
  private mediaStream: MediaStream | null = null
  private autoPiPEnabled: boolean = false
  private pendingState: AvatarPiPState | null = null
  private pendingRenderComponent: (() => ReactElement) | null = null

  constructor() {
    this.detectMode()
    this.setupChannel()
  }

  /**
   * Detect which PiP mode the browser supports
   */
  private detectMode(): void {
    if (typeof window === 'undefined') {
      this.mode = 'unsupported'
      return
    }

    if ('documentPictureInPicture' in window) {
      this.mode = 'document'
    } else if ('pictureInPictureEnabled' in document && document.pictureInPictureEnabled) {
      this.mode = 'video'
    } else {
      this.mode = 'unsupported'
    }
  }

  /**
   * Setup BroadcastChannel for cross-window communication
   */
  private setupChannel(): void {
    if (typeof window === 'undefined') return

    this.channel = new BroadcastChannel('avatar-pip-sync')

    this.channel.addEventListener('message', (event: MessageEvent<PiPMessage>) => {
      if (event.data.type === 'FOCUS_MAIN_TAB') {
        // PiP window wants to focus main tab
        window.focus()
        if (this.onMainTabFocus) {
          this.onMainTabFocus()
        }
      }
    })
  }

  /**
   * Get the current PiP mode
   */
  getMode(): PiPMode {
    return this.mode
  }

  /**
   * Check if PiP is currently active
   */
  isActive(): boolean {
    return this.pipWindow !== null && !this.pipWindow.closed
  }

  /**
   * Open Picture-in-Picture window
   */
  async open(
    state: AvatarPiPState,
    renderComponent: () => ReactElement,
    canvasElement?: HTMLCanvasElement
  ): Promise<void> {
    if (this.isActive()) {
      console.warn('PiP window already open')
      return
    }

    try {
      if (this.mode === 'document') {
        await this.openDocumentPiP(state, renderComponent)
      } else if (this.mode === 'video' && canvasElement) {
        await this.openVideoPiP(canvasElement)
      } else {
        throw new Error('Picture-in-Picture not supported')
      }
    } catch (error) {
      console.error('Failed to open PiP:', error)
      throw error
    }
  }

  /**
   * Open Document Picture-in-Picture window (Chrome/Edge 116+)
   */
  private async openDocumentPiP(state: AvatarPiPState, renderComponent: () => ReactElement): Promise<void> {
    if (!window.documentPictureInPicture) {
      throw new Error('Document PiP not supported')
    }

    // Request PiP window
    this.pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 300,
      height: 400,
      disallowReturnToOpener: false
    })

    // Setup window styling - make it fully transparent
    const pipDoc = this.pipWindow.document

    // Set HTML and body to transparent
    pipDoc.documentElement.style.background = 'transparent'
    pipDoc.body.style.margin = '0'
    pipDoc.body.style.padding = '0'
    pipDoc.body.style.overflow = 'hidden'
    pipDoc.body.style.background = 'transparent'
    pipDoc.body.style.width = '100%'
    pipDoc.body.style.height = '100%'

    // Add meta tag for transparency support
    const meta = pipDoc.createElement('meta')
    meta.name = 'color-scheme'
    meta.content = 'light dark'
    pipDoc.head.appendChild(meta)

    // Copy stylesheets from main document
    const stylesheets = Array.from(document.styleSheets)
    for (const sheet of stylesheets) {
      try {
        if (sheet.href) {
          // External stylesheet
          const link = pipDoc.createElement('link')
          link.rel = 'stylesheet'
          link.href = sheet.href
          pipDoc.head.appendChild(link)
        } else if (sheet.cssRules) {
          // Inline stylesheet
          const style = pipDoc.createElement('style')
          const cssText = Array.from(sheet.cssRules)
            .map(rule => rule.cssText)
            .join('\n')
          style.textContent = cssText
          pipDoc.head.appendChild(style)
        }
      } catch (e) {
        // CORS or access issues - skip
        console.warn('Could not copy stylesheet:', e)
      }
    }

    // Create container for React app
    const container = pipDoc.createElement('div')
    container.id = 'pip-avatar-root'
    container.style.width = '100%'
    container.style.height = '100%'
    pipDoc.body.appendChild(container)

    // Store initial state for the PiP component to read
    ;(this.pipWindow as any).__avatarState = state

    // Render React component into PiP window
    this.reactRoot = createRoot(container)
    this.reactRoot.render(renderComponent())

    // Broadcast state to PiP window
    this.broadcastState(state)

    // Handle window close
    this.pipWindow.addEventListener('pagehide', () => {
      if (this.reactRoot) {
        this.reactRoot.unmount()
        this.reactRoot = null
      }
      this.pipWindow = null
    })
  }

  /**
   * Open Video Picture-in-Picture (Safari/Firefox fallback)
   */
  private async openVideoPiP(canvasElement: HTMLCanvasElement): Promise<void> {
    if (!document.pictureInPictureEnabled) {
      throw new Error('Video PiP not supported')
    }

    // Create video element if it doesn't exist
    if (!this.videoElement) {
      this.videoElement = document.createElement('video')
      this.videoElement.muted = true
      this.videoElement.style.display = 'none'
      document.body.appendChild(this.videoElement)
    }

    // Capture canvas as video stream
    const stream = canvasElement.captureStream(30) // 30 fps
    this.videoElement.srcObject = stream

    // Play video (required for PiP)
    await this.videoElement.play()

    // Enter PiP
    await this.videoElement.requestPictureInPicture()

    // Handle PiP exit
    this.videoElement.addEventListener('leavepictureinpicture', () => {
      this.close()
    }, { once: true })
  }

  /**
   * Broadcast state update to PiP window
   */
  broadcastState(state: Partial<AvatarPiPState>): void {
    if (!this.channel) return

    const message: PiPMessage = {
      type: 'STATE_UPDATE',
      state
    }
    this.channel.postMessage(message)
  }

  /**
   * Broadcast viseme weights update to PiP window
   */
  syncVisemeWeights(weights: Record<VisemeName, number> | undefined): void {
    if (!this.channel || !this.isActive()) return

    const message: PiPMessage = {
      type: 'VISEME_UPDATE',
      visemeWeights: weights
    }
    this.channel.postMessage(message)
  }

  /**
   * Close the PiP window
   */
  close(): void {
    if (this.reactRoot) {
      this.reactRoot.unmount()
      this.reactRoot = null
    }

    if (this.pipWindow && !this.pipWindow.closed) {
      this.pipWindow.close()
      this.pipWindow = null
    }

    if (this.videoElement) {
      if (document.pictureInPictureElement === this.videoElement) {
        document.exitPictureInPicture()
      }
      this.videoElement.srcObject = null
      this.videoElement.remove()
      this.videoElement = null
    }
  }

  /**
   * Register callback for when user wants to focus main tab
   */
  onRequestMainTabFocus(callback: () => void): void {
    this.onMainTabFocus = callback
  }

  /**
   * Enable automatic Picture-in-Picture (Google Meet style)
   * Requires microphone permission and Media Session API support
   */
  async enableAutoPiP(): Promise<boolean> {
    if (typeof window === 'undefined') return false

    // Check for Media Session API support
    if (!('mediaSession' in navigator)) {
      console.warn('[PiP] Media Session API not supported')
      return false
    }

    // Check if already enabled
    if (this.autoPiPEnabled && this.mediaStream) {
      console.log('[PiP] Auto-PiP already enabled')
      return true
    }

    try {
      console.log('[PiP] Requesting microphone access for auto-PiP...')

      // Request microphone access (required for auto-PiP eligibility)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      // Mute the stream (we don't actually record, just need it for API eligibility)
      this.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = false // Mute but keep active
      });

      console.log('[PiP] Microphone access granted, registering Media Session handler...');

      // Register Media Session action handler for automatic PiP
      // Note: 'enterpictureinpicture' is not yet in TypeScript definitions, so we cast to any
      (navigator.mediaSession as any).setActionHandler('enterpictureinpicture', async (details: any) => {
        console.log('[PiP] Media Session triggered:', details)

        // Check if this is an automatic trigger (tab switch)
        if (details && 'enterPictureInPictureReason' in details) {
          const reason = details.enterPictureInPictureReason
          console.log('[PiP] Trigger reason:', reason)

          if (reason === 'contentoccluded' || reason === 'automatic') {
            // Automatic trigger from tab switch!
            console.log('[PiP] Auto-opening PiP (tab switched away)')

            if (this.pendingState && this.pendingRenderComponent) {
              await this.open(
                this.pendingState,
                this.pendingRenderComponent,
                undefined
              )
            }
          }
        }
      })

      // Set microphone as active (required for auto-PiP)
      if ('setMicrophoneActive' in navigator.mediaSession) {
        (navigator.mediaSession as any).setMicrophoneActive(true)
        console.log('[PiP] Media Session microphone set to active')
      }

      this.autoPiPEnabled = true
      console.log('[PiP] Auto-PiP enabled successfully!')

      return true
    } catch (error) {
      console.error('[PiP] Failed to enable auto-PiP:', error)

      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          console.log('[PiP] User denied microphone permission')
        } else if (error.name === 'NotFoundError') {
          console.log('[PiP] No microphone found')
        }
      }

      return false
    }
  }

  /**
   * Disable automatic Picture-in-Picture
   */
  disableAutoPiP(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop())
      this.mediaStream = null
    }

    if ('mediaSession' in navigator) {
      try {
        (navigator.mediaSession as any).setActionHandler('enterpictureinpicture', null)

        if ('setMicrophoneActive' in navigator.mediaSession) {
          (navigator.mediaSession as any).setMicrophoneActive(false)
        }
      } catch (error) {
        console.warn('[PiP] Error clearing Media Session handler:', error)
      }
    }

    this.autoPiPEnabled = false
    this.pendingState = null
    this.pendingRenderComponent = null

    console.log('[PiP] Auto-PiP disabled')
  }

  /**
   * Check if auto-PiP is currently enabled
   */
  isAutoPiPEnabled(): boolean {
    return this.autoPiPEnabled
  }

  /**
   * Set the pending state for auto-PiP
   * This will be used when Media Session automatically triggers PiP
   */
  setPendingState(state: AvatarPiPState, renderComponent: () => ReactElement): void {
    this.pendingState = state
    this.pendingRenderComponent = renderComponent
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.disableAutoPiP()
    this.close()

    if (this.channel) {
      this.channel.close()
      this.channel = null
    }
  }
}
