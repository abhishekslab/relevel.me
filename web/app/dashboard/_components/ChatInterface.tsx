'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { Send, Loader2, Plus, Mic, StopCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatInterfaceProps {
  onAvatarSpeak?: (text: string) => void
  conversationId?: string
}

export default function ChatInterface({ onAvatarSpeak, conversationId: initialConversationId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showSubtitle, setShowSubtitle] = useState(true)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Audio recording hook
  const {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder({
    onRecordingComplete: async (blob) => {
      // Handle recorded audio - you can send it to transcription API or as audio message
      console.log('Recording complete:', blob)
      // TODO: Integrate with transcription API or send as audio message
    },
  })

  // Auto-hide subtitle after inactivity
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      setShowSubtitle(true)

      // Clear existing timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }

      // Set new timeout to hide after 15 seconds
      hideTimeoutRef.current = setTimeout(() => {
        setShowSubtitle(false)
      }, 15000)
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [messages, isLoading])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setError(null)

    // Add user message to UI immediately
    const newUserMessage: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, newUserMessage])

    setIsLoading(true)

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          includeMemoryContext: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      // Update conversation ID if this was the first message
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId)
      }

      // Add assistant response to UI
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])

      // Trigger avatar to speak the response
      if (onAvatarSpeak) {
        onAvatarSpeak(data.message)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
      console.error('Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (but allow Shift+Enter for new lines)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      // TODO: Upload file and handle attachment in chat
      console.log('File selected:', file)
    }
  }

  const handleMicToggle = async () => {
    if (isRecording) {
      stopRecording()
    } else {
      await startRecording()
    }
  }

  // Get latest exchange for subtitle
  const latestAssistantMessage = messages.length > 0 && messages[messages.length - 1]?.role === 'assistant'
    ? messages[messages.length - 1]
    : null
  const latestUserMessage = messages.length > 1 && messages[messages.length - 2]?.role === 'user'
    ? messages[messages.length - 2]
    : messages.length > 0 && messages[messages.length - 1]?.role === 'user'
    ? messages[messages.length - 1]
    : null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4">
      {/* Floating subtitle */}
      {((latestAssistantMessage || isLoading) && showSubtitle) && (
        <div
          className="mb-3 px-3 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
          style={{ animationFillMode: 'backwards' }}
        >
          {isLoading ? (
            <div className="flex items-center gap-2 text-white/60">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
              <span className="text-sm">Thinking...</span>
            </div>
          ) : latestAssistantMessage ? (
            <div className="space-y-1">
              {/* Assistant response */}
              <p className="text-white text-sm leading-relaxed">
                {latestAssistantMessage.content}
              </p>
              {/* User message below (faded) */}
              {latestUserMessage && (
                <p className="text-white/40 text-xs">
                  You: {latestUserMessage.content}
                </p>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-2 px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/20 text-red-400 text-xs">
          {error}
        </div>
      )}

      {/* Input bar only */}
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl shadow-2xl">
        {/* Input area - minimal design */}
        <form onSubmit={handleSubmit} className="p-3">
          <div className="flex items-center gap-2">
            {/* File upload button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 w-9 h-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              title="Upload file"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Text input */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message your avatar..."
              className="flex-1 bg-transparent text-white placeholder-white/40 resize-none focus:outline-none max-h-32 py-2"
              rows={1}
              disabled={isLoading}
            />

            {/* Microphone button */}
            <button
              type="button"
              onClick={handleMicToggle}
              className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-lg transition-all ${
                isRecording
                  ? 'text-red-400 bg-red-400/10 hover:bg-red-400/20'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
              title={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? (
                <StopCircle className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            {/* Send button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="shrink-0 w-9 h-9 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              title="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
