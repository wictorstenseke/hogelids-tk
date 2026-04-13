import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { defineSecret } from 'firebase-functions/params'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { SYSTEM_PROMPT, buildUserContext } from './prompt'
import { TOOLS } from './tools'
import { executeReadTool } from './toolExecution'

initializeApp()

const openrouterApiKey = defineSecret('OPENROUTER_API_KEY')

const MAX_MESSAGE_LENGTH = 500
const MAX_MESSAGES = 20
const MODEL = 'google/gemini-2.0-flash-001'

export const aiChat = onCall(
  {
    secrets: [openrouterApiKey],
    region: 'europe-west1',
    cors: true,
    invoker: 'public',
  },
  async (request) => {
    // 1. Auth check
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Du måste vara inloggad.')
    }

    const { uid, token } = request.auth
    const email = token.email ?? ''
    const displayName = token.name ?? email

    // 2. Feature flag check
    const db = getFirestore()
    const settingsDoc = await db.doc('settings/app').get()
    const settings = settingsDoc.data()

    if (!settings?.aiAssistantEnabled) {
      throw new HttpsError(
        'permission-denied',
        'AI-assistenten är inte aktiverad.'
      )
    }

    // 3. Validate input
    const messages: ChatCompletionMessageParam[] = request.data?.messages
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new HttpsError('invalid-argument', 'Inga meddelanden skickade.')
    }

    if (messages.length > MAX_MESSAGES) {
      throw new HttpsError(
        'resource-exhausted',
        'Max antal meddelanden nått. Starta en ny chatt.'
      )
    }

    const lastMessage = messages[messages.length - 1]
    if (
      typeof lastMessage.content === 'string' &&
      lastMessage.content.length > MAX_MESSAGE_LENGTH
    ) {
      throw new HttpsError(
        'invalid-argument',
        `Meddelandet är för långt (max ${MAX_MESSAGE_LENGTH} tecken).`
      )
    }

    // 4. Build system prompt with user context
    const now = new Date()
    const userContext = buildUserContext(uid, displayName, email, now)
    const systemMessage: ChatCompletionMessageParam = {
      role: 'system',
      content: `${SYSTEM_PROMPT}\n\n${userContext}`,
    }

    // 5. Call OpenRouter
    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openrouterApiKey.value(),
    })

    let response = await openai.chat.completions.create({
      model: MODEL,
      messages: [systemMessage, ...messages],
      tools: TOOLS,
      tool_choice: 'auto',
    })

    let assistantMessage = response.choices[0]?.message

    // 6. Handle tool calls — loop for read tools, return write tools to client
    const WRITE_TOOLS = new Set([
      'create_booking',
      'create_ladder_match',
      'delete_booking',
    ])

    // Allow up to 3 tool-call rounds (read tools may chain)
    for (let i = 0; i < 3 && assistantMessage?.tool_calls?.length; i++) {
      const toolCalls = assistantMessage.tool_calls
      const hasWriteTool = toolCalls.some((tc) =>
        WRITE_TOOLS.has(tc.function.name)
      )

      if (hasWriteTool) {
        // Return write tool call to client for confirmation
        const writeTool = toolCalls.find((tc) =>
          WRITE_TOOLS.has(tc.function.name)
        )!
        return {
          reply: assistantMessage.content ?? '',
          toolCall: {
            name: writeTool.function.name,
            arguments: JSON.parse(writeTool.function.arguments),
          },
        }
      }

      // Execute read tools server-side
      const toolResults: ChatCompletionMessageParam[] = []
      for (const tc of toolCalls) {
        const args = JSON.parse(tc.function.arguments)
        const result = await executeReadTool(db, uid, tc.function.name, args)
        toolResults.push({
          role: 'tool' as const,
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        })
      }

      // Send tool results back to LLM
      response = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          systemMessage,
          ...messages,
          {
            role: 'assistant' as const,
            content: assistantMessage.content,
            tool_calls: assistantMessage.tool_calls,
          },
          ...toolResults,
        ],
        tools: TOOLS,
        tool_choice: 'auto',
      })

      assistantMessage = response.choices[0]?.message
    }

    return {
      reply: assistantMessage?.content ?? 'Jag kunde inte svara just nu.',
      toolCall: null,
    }
  }
)
