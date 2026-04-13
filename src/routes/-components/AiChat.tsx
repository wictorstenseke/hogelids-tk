import { useCallback, useEffect, useRef, useState } from 'react'
import { IconSend2, IconX, IconSparkles } from '@tabler/icons-react'
import { overlayCloseDelayMs } from '../../lib/overlayCloseDelay'
import {
  sendAiChat,
  type ChatMessage,
  type PendingToolCall,
} from '../../services/AiChatService'
import { useAuth } from '../../lib/useAuth'
import { useAppSettings } from '../../lib/useAppSettings'
import { AiConfirmationCard } from './AiConfirmationCard'

const MAX_MESSAGES = 20

interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  toolCall?: PendingToolCall
}

export function AiChat() {
  const { user } = useAuth()
  const { settings } = useAppSettings()
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const messageCountRef = useRef(0)

  const isEnabled = !!user && !!settings?.aiAssistantEnabled

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (!isEnabled) return
        if (open) {
          handleClose()
        } else {
          openChat()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEnabled, open])

  function openChat() {
    setOpen(true)
    requestAnimationFrame(() => setVisible(true))
    document.body.style.overflow = 'hidden'
    // Focus input after animation
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  function handleClose() {
    setVisible(false)
    setTimeout(() => {
      setOpen(false)
      setMessages([])
      setInput('')
      setError(null)
      messageCountRef.current = 0
      document.body.style.overflow = ''
    }, overlayCloseDelayMs(640))
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isLoading) return

      if (messageCountRef.current >= MAX_MESSAGES) {
        setError('Max antal meddelanden nått. Stäng och öppna chatten igen.')
        return
      }

      setError(null)
      const userMsg: DisplayMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: trimmed,
      }

      setMessages((prev) => [...prev, userMsg])
      setInput('')
      setIsLoading(true)
      messageCountRef.current++

      try {
        // Build message history for API
        const apiMessages: ChatMessage[] = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content: trimmed },
        ]

        const response = await sendAiChat(apiMessages)

        const assistantMsg: DisplayMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.reply,
          toolCall: response.toolCall ?? undefined,
        }

        setMessages((prev) => [...prev, assistantMsg])
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Något gick fel. Försök igen.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    },
    [messages, isLoading]
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    void sendMessage(input)
  }

  function handleToolConfirmed(messageId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, toolCall: undefined } : m))
    )
  }

  function handleToolEdit(messageId: string) {
    // Send a pre-filled message to ask LLM to revise
    void sendMessage('Jag vill ändra förslaget')
    // Remove the tool call from the message
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, toolCall: undefined } : m))
    )
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 motion-reduce:backdrop-blur-none sm:duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Chat panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI-assistent"
        className={[
          'fixed z-50 flex flex-col bg-white shadow-2xl',
          // Mobile: fullscreen bottom sheet
          'inset-x-0 bottom-0 top-12 rounded-t-3xl',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          visible
            ? 'translate-y-0 sm:translate-y-0 sm:opacity-100'
            : 'translate-y-full sm:translate-y-0 sm:opacity-0',
          // Desktop: centered modal
          'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
          'sm:h-[min(600px,80vh)] sm:w-full sm:max-w-md sm:rounded-2xl',
          'sm:transition-opacity sm:duration-150 sm:ease-out',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <IconSparkles size={18} stroke={2} className="text-[#F1E334]" />
            <h2 className="font-display text-[16px] font-bold uppercase tracking-wide text-gray-900">
              AI-assistent
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Stäng"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
          >
            <IconX size={18} stroke={2} />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && !isLoading && (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-sm text-gray-400">
                Fråga mig om bokningar, lediga tider eller stegen!
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id}>
              <div
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={[
                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-900',
                  ].join(' ')}
                >
                  {msg.content}
                </div>
              </div>
              {msg.toolCall && (
                <div className="mt-2">
                  <AiConfirmationCard
                    toolCall={msg.toolCall}
                    onConfirm={() => handleToolConfirmed(msg.id)}
                    onEdit={() => handleToolEdit(msg.id)}
                  />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-gray-100 px-4 py-3">
                <div className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <form
          onSubmit={handleSubmit}
          className="shrink-0 border-t border-gray-100 px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Skriv ett meddelande…"
              maxLength={500}
              disabled={isLoading}
              className="min-h-[44px] flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:bg-white focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              aria-label="Skicka"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gray-900 text-white transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <IconSend2 size={18} stroke={2} />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-gray-400">
            {messageCountRef.current}/{MAX_MESSAGES} meddelanden
          </p>
        </form>
      </div>
    </>
  )
}
