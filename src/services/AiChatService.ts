import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface PendingToolCall {
  name: string
  arguments: Record<string, unknown>
}

interface AiChatResponse {
  reply: string
  toolCall: PendingToolCall | null
}

const aiChatFn = httpsCallable<{ messages: ChatMessage[] }, AiChatResponse>(
  functions,
  'aiChat'
)

export async function sendAiChat(
  messages: ChatMessage[]
): Promise<AiChatResponse> {
  const result = await aiChatFn({ messages })
  return result.data
}
