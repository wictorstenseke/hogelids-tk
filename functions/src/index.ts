import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import OpenAI from 'openai'
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessage,
} from 'openai/resources/chat/completions'
import { SYSTEM_PROMPT, buildUserContext } from './prompt'
import { TOOLS } from './tools'
import { executeReadTool } from './toolExecution'
import type { Response } from 'express'

if (getApps().length === 0) initializeApp()

const openrouterApiKey = defineSecret('OPENROUTER_API_KEY')

const MAX_MESSAGE_LENGTH = 500
const MAX_MESSAGES = 20
const MODEL = 'anthropic/claude-haiku-4.5'
const MAX_TOKENS = 1024

const WRITE_TOOLS = new Set([
  'create_booking',
  'create_ladder_match',
  'delete_booking',
])
const BOOKING_TOOLS = new Set(['create_booking', 'create_ladder_match'])

function sendSSE(res: Response, data: Record<string, unknown>): void {
  res.write(`data: ${JSON.stringify(data)}\n\n`)
}

/** Collect a streamed response, forwarding text deltas via SSE. */
async function consumeStream(
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  res: Response
): Promise<ChatCompletionMessage> {
  let content = ''
  const toolCallsMap = new Map<
    number,
    { id: string; name: string; arguments: string }
  >()

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta
    if (!delta) continue

    if (delta.content) {
      content += delta.content
      sendSSE(res, { type: 'delta', content: delta.content })
    }

    if (delta.tool_calls) {
      for (const tc of delta.tool_calls) {
        const existing = toolCallsMap.get(tc.index)
        if (!existing) {
          toolCallsMap.set(tc.index, {
            id: tc.id ?? '',
            name: tc.function?.name ?? '',
            arguments: tc.function?.arguments ?? '',
          })
        } else {
          if (tc.function?.arguments) {
            existing.arguments += tc.function.arguments
          }
        }
      }
    }
  }

  const toolCalls =
    toolCallsMap.size > 0
      ? [...toolCallsMap.entries()]
          .sort(([a], [b]) => a - b)
          .map(([, tc]) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: tc.arguments },
          }))
      : undefined

  return {
    role: 'assistant',
    content: content || null,
    tool_calls: toolCalls,
    refusal: null,
  }
}

export const aiChatStream = onRequest(
  {
    secrets: [openrouterApiKey],
    timeoutSeconds: 120,
    region: 'europe-west1',
    invoker: 'public',
  },
  async (req, res) => {
    // Manual CORS to avoid middleware buffering
    res.set('Access-Control-Allow-Origin', '*')
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
    if (req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    // 1. Auth
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Du måste vara inloggad.' })
      return
    }

    let uid: string
    let email: string
    let displayName: string
    try {
      const token = authHeader.split('Bearer ')[1]
      const decoded = await getAuth().verifyIdToken(token)
      uid = decoded.uid
      email = decoded.email ?? ''
      displayName = decoded.name ?? email
    } catch {
      res.status(401).json({ error: 'Ogiltig token.' })
      return
    }

    // 2. Feature flag
    const db = getFirestore()
    const settingsDoc = await db.doc('settings/app').get()
    const settings = settingsDoc.data()

    if (!settings?.aiAssistantEnabled) {
      res.status(403).json({ error: 'AI-assistenten är inte aktiverad.' })
      return
    }

    const bookingEnabled = settings?.bookingEnabled ?? true

    // 3. Validate input
    const messages: ChatCompletionMessageParam[] = req.body?.messages
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Inga meddelanden skickade.' })
      return
    }

    if (messages.length > MAX_MESSAGES) {
      res.status(429).json({
        error: 'Max antal meddelanden nått. Starta en ny chatt.',
      })
      return
    }

    const lastMessage = messages[messages.length - 1]
    if (
      typeof lastMessage.content === 'string' &&
      lastMessage.content.length > MAX_MESSAGE_LENGTH
    ) {
      res.status(400).json({
        error: `Meddelandet är för långt (max ${MAX_MESSAGE_LENGTH} tecken).`,
      })
      return
    }

    // 4. SSE headers
    res.set('Content-Type', 'text/event-stream')
    res.set('Cache-Control', 'no-cache')
    res.set('Connection', 'keep-alive')
    res.set('X-Accel-Buffering', 'no')
    res.flushHeaders()

    try {
      // 5. Build system prompt
      const now = new Date()
      const userContext = buildUserContext(
        uid,
        displayName,
        email,
        now,
        bookingEnabled
      )
      const systemMessage: ChatCompletionMessageParam = {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\n${userContext}`,
      }

      const openai = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY,
      })

      let allMessages: ChatCompletionMessageParam[] = [
        systemMessage,
        ...messages,
      ]
      let hasCheckedAvailability = false
      let hasCheckedLadderOpponents = false

      for (const msg of messages) {
        if (msg.role === 'assistant' && typeof msg.content === 'string') {
          if (msg.content.includes('list_available_times'))
            hasCheckedAvailability = true
          if (msg.content.includes('list_ladder_opponents'))
            hasCheckedLadderOpponents = true
        }
      }

      // 6. Stream every LLM call — consumeStream forwards text deltas via SSE
      //    and collects tool_calls silently.
      const availableTools = bookingEnabled
        ? TOOLS
        : TOOLS.filter((t) => !BOOKING_TOOLS.has(t.function.name))
      const stream = await openai.chat.completions.create({
        model: MODEL,
        messages: allMessages,
        tools: availableTools,
        tool_choice: 'auto',
        max_tokens: MAX_TOKENS,
        stream: true,
      })

      let assistantMessage = await consumeStream(stream, res)

      // 7. Tool-call loop
      for (let i = 0; i < 5 && assistantMessage.tool_calls?.length; i++) {
        const toolCalls = assistantMessage.tool_calls

        // Guard: booking without availability check
        const bookingTool = toolCalls.find((tc) =>
          BOOKING_TOOLS.has(tc.function.name)
        )
        if (bookingTool && !hasCheckedAvailability) {
          const args = JSON.parse(bookingTool.function.arguments)
          const dateArg = args.date as string | undefined
          if (dateArg) {
            const availResult = await executeReadTool(
              db,
              uid,
              'list_available_times',
              { date: dateArg }
            )
            hasCheckedAvailability = true

            allMessages = [
              systemMessage,
              ...messages,
              {
                role: 'assistant' as const,
                content: '',
                tool_calls: [
                  {
                    id: 'forced_avail_check',
                    type: 'function' as const,
                    function: {
                      name: 'list_available_times',
                      arguments: JSON.stringify({ date: dateArg }),
                    },
                  },
                ],
              },
              {
                role: 'tool' as const,
                tool_call_id: 'forced_avail_check',
                content: JSON.stringify(availResult),
              },
            ]

            const s = await openai.chat.completions.create({
              model: MODEL,
              messages: allMessages,
              tools: availableTools,
              tool_choice: 'auto',
              max_tokens: MAX_TOKENS,
              stream: true,
            })
            assistantMessage = await consumeStream(s, res)
            continue
          }
        }

        // Guard: ladder match without opponents check
        const ladderTool = toolCalls.find(
          (tc) => tc.function.name === 'create_ladder_match'
        )
        if (ladderTool && !hasCheckedLadderOpponents) {
          const opponentsResult = await executeReadTool(
            db,
            uid,
            'list_ladder_opponents',
            {}
          )
          hasCheckedLadderOpponents = true

          allMessages = [
            systemMessage,
            ...messages,
            {
              role: 'assistant' as const,
              content: '',
              tool_calls: [
                {
                  id: 'forced_ladder_check',
                  type: 'function' as const,
                  function: {
                    name: 'list_ladder_opponents',
                    arguments: '{}',
                  },
                },
              ],
            },
            {
              role: 'tool' as const,
              tool_call_id: 'forced_ladder_check',
              content: JSON.stringify(opponentsResult),
            },
          ]

          const s = await openai.chat.completions.create({
            model: MODEL,
            messages: allMessages,
            tools: availableTools,
            tool_choice: 'auto',
            max_tokens: MAX_TOKENS,
            stream: true,
          })
          assistantMessage = await consumeStream(s, res)
          continue
        }

        // Write tool → return to client for confirmation
        const hasWriteTool = toolCalls.some((tc) =>
          WRITE_TOOLS.has(tc.function.name)
        )

        if (hasWriteTool) {
          const writeTool = toolCalls.find((tc) =>
            WRITE_TOOLS.has(tc.function.name)
          )!

          // Block booking writes when bookings are disabled
          if (!bookingEnabled && BOOKING_TOOLS.has(writeTool.function.name)) {
            sendSSE(res, {
              type: 'delta',
              content: 'Bokning är avstängd just nu. Försök igen senare!',
            })
            sendSSE(res, { type: 'done' })
            res.end()
            return
          }

          sendSSE(res, {
            type: 'tool',
            reply: assistantMessage.content ?? '',
            toolCall: {
              name: writeTool.function.name,
              arguments: JSON.parse(writeTool.function.arguments),
            },
          })
          sendSSE(res, { type: 'done' })
          res.end()
          return
        }

        // Execute read tools server-side
        const toolResults: ChatCompletionMessageParam[] = []
        for (const tc of toolCalls) {
          const args = JSON.parse(tc.function.arguments)
          const result = await executeReadTool(db, uid, tc.function.name, args)
          if (tc.function.name === 'list_available_times') {
            hasCheckedAvailability = true
          }
          toolResults.push({
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          })
        }

        allMessages = [
          systemMessage,
          ...messages,
          {
            role: 'assistant' as const,
            content: assistantMessage.content,
            tool_calls: assistantMessage.tool_calls,
          },
          ...toolResults,
        ]

        const s = await openai.chat.completions.create({
          model: MODEL,
          messages: allMessages,
          tools: availableTools,
          tool_choice: 'auto',
          max_tokens: MAX_TOKENS,
          stream: true,
        })
        assistantMessage = await consumeStream(s, res)
      }

      // 8. Done
      if (!assistantMessage.content) {
        sendSSE(res, {
          type: 'delta',
          content: 'Jag kunde inte svara just nu.',
        })
      }
      sendSSE(res, { type: 'done' })
      res.end()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Något gick fel.'
      sendSSE(res, { type: 'error', message })
      res.end()
    }
  }
)
