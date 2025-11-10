'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { Send, Loader2, MessageSquare, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4">
      <div className="bg-white/5 border border-white/10 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[600px]">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
          <Sparkles className="w-5 h-5 text-violet-400" />
          <h3 className="text-white font-medium">Chat with Avatar</h3>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[400px]">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <MessageSquare className="w-12 h-12 text-white/20 mb-3" />
              <p className="text-white/60 text-sm">Start a conversation with your avatar</p>
              <p className="text-white/40 text-xs mt-1">Ask questions, share thoughts, or reflect on your memories</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/10 text-white border border-white/10'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs opacity-50 mt-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                <span className="text-white/60 text-sm">Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error display */}
        {error && (
          <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Input area */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message your avatar..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/40 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/50 max-h-32"
              rows={1}
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="shrink-0 bg-violet-600 hover:bg-violet-700"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-white/30 text-xs mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  )
}
