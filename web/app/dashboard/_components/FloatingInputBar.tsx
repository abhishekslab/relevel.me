'use client'

import { useState, useRef, FormEvent } from 'react'
import { Mic, Image as ImageIcon, Type, Send, X, Upload, Loader2, Pause, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'

interface FloatingInputBarProps {
  onMemoryCreated?: () => void
}

type InputMode = 'text' | 'image' | 'voice'

export default function FloatingInputBar({ onMemoryCreated }: FloatingInputBarProps) {
  const [mode, setMode] = useState<InputMode>('text')
  const [textInput, setTextInput] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    isRecording,
    isPaused,
    recordingTime,
    audioBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    error: recordingError,
  } = useAudioRecorder({
    onRecordingComplete: (blob) => {
      console.log('Recording complete:', blob.size, 'bytes')
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  const handleModeChange = (newMode: InputMode) => {
    if (isRecording) {
      stopRecording()
    }
    setMode(newMode)
    setError(null)
    setTextInput('')
    setImageFile(null)
    setImagePreview(null)
    clearRecording()
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleTextSubmit = async () => {
    if (!textInput.trim()) {
      setError('Please enter some text')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/memory/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'text',
          textContent: textInput,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create memory')
      }

      setTextInput('')
      onMemoryCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create memory')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageSubmit = async () => {
    if (!imageFile) {
      setError('Please select an image')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Upload image
      const formData = new FormData()
      formData.append('file', imageFile)

      const uploadResponse = await fetch('/api/upload/memory-image', {
        method: 'POST',
        body: formData,
      })

      const uploadData = await uploadResponse.json()

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Failed to upload image')
      }

      // Create memory
      const memoryResponse = await fetch('/api/memory/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'image',
          fileUrl: uploadData.url,
        }),
      })

      const memoryData = await memoryResponse.json()

      if (!memoryResponse.ok) {
        throw new Error(memoryData.error || 'Failed to create memory')
      }

      setImageFile(null)
      setImagePreview(null)
      onMemoryCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create memory')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVoiceSubmit = async () => {
    if (!audioBlob) {
      setError('Please record audio first')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Upload audio
      const formData = new FormData()
      formData.append('file', audioBlob, 'voice-note.webm')

      const uploadResponse = await fetch('/api/upload/memory-audio', {
        method: 'POST',
        body: formData,
      })

      const uploadData = await uploadResponse.json()

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Failed to upload audio')
      }

      // Transcribe audio
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioPath: uploadData.path,
        }),
      })

      const transcribeData = await transcribeResponse.json()

      if (!transcribeResponse.ok) {
        throw new Error(transcribeData.error || 'Failed to transcribe audio')
      }

      // Create memory
      const memoryResponse = await fetch('/api/memory/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'audio',
          fileUrl: uploadData.url,
          transcript: transcribeData.transcript,
        }),
      })

      const memoryData = await memoryResponse.json()

      if (!memoryResponse.ok) {
        throw new Error(memoryData.error || 'Failed to create memory')
      }

      clearRecording()
      onMemoryCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create memory')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (mode === 'text') {
      await handleTextSubmit()
    } else if (mode === 'image') {
      await handleImageSubmit()
    } else if (mode === 'voice') {
      await handleVoiceSubmit()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4">
      <div className="bg-white/5 border border-white/10 backdrop-blur-lg rounded-2xl shadow-2xl">
        {/* Mode selector */}
        <div className="flex items-center gap-2 p-3 border-b border-white/10">
          <Button
            size="sm"
            variant={mode === 'text' ? 'default' : 'ghost'}
            onClick={() => handleModeChange('text')}
            className="gap-2"
          >
            <Type className="w-4 h-4" />
            Text
          </Button>
          <Button
            size="sm"
            variant={mode === 'image' ? 'default' : 'ghost'}
            onClick={() => handleModeChange('image')}
            className="gap-2"
          >
            <ImageIcon className="w-4 h-4" />
            Image
          </Button>
          <Button
            size="sm"
            variant={mode === 'voice' ? 'default' : 'ghost'}
            onClick={() => handleModeChange('voice')}
            className="gap-2"
          >
            <Mic className="w-4 h-4" />
            Voice
          </Button>
        </div>

        {/* Error display */}
        {(error || recordingError) && (
          <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm">
            {error || recordingError?.message}
          </div>
        )}

        {/* Input area */}
        <form onSubmit={handleSubmit} className="p-4">
          {mode === 'text' && (
            <div className="flex gap-2">
              <textarea
                ref={textareaRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Write a thought, idea, or note..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                rows={2}
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!textInput.trim() || isSubmitting}
                className="shrink-0"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}

          {mode === 'image' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleImageSelect}
                className="hidden"
              />

              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview(null)
                    }}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-48 border-2 border-dashed border-white/20 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-violet-500/50 transition-colors"
                >
                  <Upload className="w-8 h-8 text-white/40" />
                  <span className="text-white/60 text-sm">Click to upload image</span>
                  <span className="text-white/40 text-xs">PNG, JPEG, WebP (max 5MB)</span>
                </button>
              )}

              {imageFile && (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Save Memory
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {mode === 'voice' && (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-4 py-8">
                {!isRecording && !audioBlob && (
                  <Button
                    type="button"
                    size="lg"
                    onClick={startRecording}
                    className="gap-2"
                  >
                    <Mic className="w-5 h-5" />
                    Start Recording
                  </Button>
                )}

                {isRecording && (
                  <div className="flex items-center gap-4">
                    <div className="text-white font-mono text-2xl">
                      {formatTime(recordingTime)}
                    </div>
                    {isPaused ? (
                      <Button
                        type="button"
                        size="lg"
                        onClick={resumeRecording}
                        variant="outline"
                      >
                        Resume
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="lg"
                        onClick={pauseRecording}
                        variant="outline"
                      >
                        <Pause className="w-5 h-5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="lg"
                      onClick={stopRecording}
                      variant="default"
                    >
                      <Square className="w-5 h-5" />
                      Stop
                    </Button>
                  </div>
                )}

                {audioBlob && !isRecording && (
                  <div className="flex items-center gap-4">
                    <audio
                      src={URL.createObjectURL(audioBlob)}
                      controls
                      className="max-w-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={clearRecording}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {audioBlob && !isRecording && (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Save Voice Note
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
