import { auth } from '../lib/firebase'

const AI_CHAT_URL = import.meta.env.VITE_AI_CHAT_URL ?? '/api/aiChat'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface PendingToolCall {
  name: string
  arguments: Record<string, unknown>
}

interface SSEDelta {
  type: 'delta'
  content: string
}

interface SSETool {
  type: 'tool'
  reply: string
  toolCall: PendingToolCall
}

interface SSEDone {
  type: 'done'
}

interface SSEError {
  type: 'error'
  message: string
}

type SSEEvent = SSEDelta | SSETool | SSEDone | SSEError

export interface AiChatResult {
  reply: string
  toolCall: PendingToolCall | null
}

export async function streamAiChat(
  messages: ChatMessage[],
  onDelta: (text: string) => void
): Promise<AiChatResult> {
  const user = auth.currentUser
  if (!user) throw new Error('Du måste vara inloggad.')

  const token = await user.getIdToken()

  const response = await fetch(AI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw new Error(
      (err as { error?: string })?.error ?? 'Något gick fel. Försök igen.'
    )
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Streaming stöds inte.')

  const decoder = new TextDecoder()
  let buffer = ''
  let reply = ''
  let toolCall: PendingToolCall | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Parse SSE lines
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? '' // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const json = line.slice(6)

      let event: SSEEvent
      try {
        event = JSON.parse(json) as SSEEvent
      } catch {
        continue
      }

      switch (event.type) {
        case 'delta':
          reply += event.content
          onDelta(event.content)
          break
        case 'tool':
          reply = event.reply
          toolCall = event.toolCall
          break
        case 'error':
          throw new Error(event.message)
        case 'done':
          break
      }
    }
  }

  return { reply, toolCall }
}
