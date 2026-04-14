import * as functions from 'firebase-functions/v1'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { SYSTEM_PROMPT, buildUserContext } from './prompt'
import { TOOLS } from './tools'
import { executeReadTool } from './toolExecution'

initializeApp()

const MAX_MESSAGE_LENGTH = 500
const MAX_MESSAGES = 20
const MODEL = 'anthropic/claude-haiku-4.5'
const MAX_TOKENS = 1024

export const aiChat = functions
  .runWith({ secrets: ['OPENROUTER_API_KEY'] })
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // 1. Auth check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Du måste vara inloggad.'
      )
    }

    const { uid, token } = context.auth
    const email = token.email ?? ''
    const displayName = token.name ?? email

    // 2. Feature flag check
    const db = getFirestore()
    const settingsDoc = await db.doc('settings/app').get()
    const settings = settingsDoc.data()

    if (!settings?.aiAssistantEnabled) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'AI-assistenten är inte aktiverad.'
      )
    }

    // 3. Validate input
    const messages: ChatCompletionMessageParam[] = data?.messages
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Inga meddelanden skickade.'
      )
    }

    if (messages.length > MAX_MESSAGES) {
      throw new functions.https.HttpsError(
        'resource-exhausted',
        'Max antal meddelanden nått. Starta en ny chatt.'
      )
    }

    const lastMessage = messages[messages.length - 1]
    if (
      typeof lastMessage.content === 'string' &&
      lastMessage.content.length > MAX_MESSAGE_LENGTH
    ) {
      throw new functions.https.HttpsError(
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
      apiKey: process.env.OPENROUTER_API_KEY,
    })

    let response = await openai.chat.completions.create({
      model: MODEL,
      messages: [systemMessage, ...messages],
      tools: TOOLS,
      tool_choice: 'auto',
      max_tokens: MAX_TOKENS,
    })

    let assistantMessage = response.choices[0]?.message

    // 6. Handle tool calls — loop for read tools, return write tools to client
    const WRITE_TOOLS = new Set([
      'create_booking',
      'create_ladder_match',
      'delete_booking',
    ])
    const BOOKING_TOOLS = new Set(['create_booking', 'create_ladder_match'])
    let hasCheckedAvailability = false
    let hasCheckedLadderOpponents = false

    // Track if checks were already done in conversation history
    for (const msg of messages) {
      if (msg.role === 'assistant' && typeof msg.content === 'string') {
        if (msg.content.includes('list_available_times'))
          hasCheckedAvailability = true
        if (msg.content.includes('list_ladder_opponents'))
          hasCheckedLadderOpponents = true
      }
    }

    // Allow up to 5 tool-call rounds (extra room for forced availability check)
    for (let i = 0; i < 5 && assistantMessage?.tool_calls?.length; i++) {
      const toolCalls = assistantMessage.tool_calls

      // Guard: if LLM tries to create a booking without checking availability,
      // force a list_available_times call first
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

          // Re-ask LLM with availability data injected
          response = await openai.chat.completions.create({
            model: MODEL,
            messages: [
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
            ],
            tools: TOOLS,
            tool_choice: 'auto',
            max_tokens: MAX_TOKENS,
          })
          assistantMessage = response.choices[0]?.message
          continue
        }
      }

      // Guard: if LLM tries to create a ladder match without checking opponents,
      // force a list_ladder_opponents call first
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

        response = await openai.chat.completions.create({
          model: MODEL,
          messages: [
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
          ],
          tools: TOOLS,
          tool_choice: 'auto',
          max_tokens: MAX_TOKENS,
        })
        assistantMessage = response.choices[0]?.message
        continue
      }

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
        // Track if availability was checked
        if (tc.function.name === 'list_available_times') {
          hasCheckedAvailability = true
        }
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
        max_tokens: MAX_TOKENS,
      })

      assistantMessage = response.choices[0]?.message
    }

    return {
      reply: assistantMessage?.content ?? 'Jag kunde inte svara just nu.',
      toolCall: null,
    }
  })
