# AI Assistant — Implementation Plan

## Architecture

Firebase Callable Cloud Function (`aiChat`) → OpenRouter → Gemini 2.0 Flash

## Flow

1. User presses Cmd/Ctrl+K → chat dialog opens (modal)
2. Messages sent to Cloud Function with conversation history
3. Function verifies auth, checks feature flag, builds system prompt, calls OpenRouter
4. Read-tools execute server-side with Admin SDK, results displayed inline
5. Write-tools returned to client as confirmation cards with Confirm/Edit buttons
6. Confirm → client runs existing BookingService logic (with re-fetch + hasConflict)

## Tools (6)

| Tool                    | Type  | Description                                   |
| ----------------------- | ----- | --------------------------------------------- |
| `list_available_times`  | read  | Available times for a given date              |
| `list_my_bookings`      | read  | User's upcoming bookings                      |
| `list_ladder_opponents` | read  | Challengeable players in the ladder           |
| `create_booking`        | write | Propose a regular booking (confirmation card) |
| `create_ladder_match`   | write | Propose a ladder match (confirmation card)    |
| `delete_booking`        | write | Delete own booking (confirmation card)        |

Read tools execute server-side in Cloud Function. Write tools return tool call to client for user confirmation before execution.

## Security

- Firebase Auth token verification on every request
- User context derived from auth token, not client payload
- 500 character max message length
- Feature flag check server-side (reject if disabled)
- OpenRouter spending limit: $10/month
- LLM instructed to stay on topic (tennis/bookings/ladder), reject unrelated queries

## Rate Limiting

- Max 20 messages per session (in-memory, client-side)
- No per-day limit in v1
- Iterate based on observed usage and costs

## UI

### Phase 1

- Triggered via Cmd/Ctrl+K only — no visible UI element
- Chat rendered in modal/dialog
- Mobile: fullscreen bottom sheet
- Desktop: floating panel or centered modal

### Phase 2

- Add visible button in AvatarMenu ("AI-assistent")
- Same chat component

### Chat UX

- Messages as bubbles (user right, AI left)
- Read-tool results rendered as inline cards
- Write-tool results rendered as confirmation cards with:
  - **Bekräfta** button → executes action via BookingService
  - **Ändra** button → sends pre-filled message to LLM to revise proposal
- Session-based: closing dialog clears conversation
- No chat history persisted to Firestore

## Feature Flag

- `aiAssistantEnabled: boolean` in `settings/app` Firestore document
- Toggle in admin panel: "AI-assistent aktiverad"
- When disabled: keyboard shortcut does nothing, Cloud Function returns 403

## Cloud Function: `aiChat`

### Input

```typescript
{
  messages: ChatMessage[] // conversation history
}
```

### Processing

1. Verify Firebase Auth token → 401 if missing
2. Read `settings/app` → 403 if `aiAssistantEnabled === false`
3. Extract uid, email, displayName from auth token
4. Build system prompt (date/time, user info, tool definitions, Swedish language, topic constraints)
5. Send to OpenRouter (Gemini 2.0 Flash)
6. If LLM returns read-tool call → execute against Firestore with Admin SDK → feed result back to LLM → return final response
7. If LLM returns write-tool call → return tool call to client for confirmation

### Output

```typescript
{
  reply: string
  toolCall?: {
    name: string
    arguments: Record<string, unknown>
  }
}
```

## Error Handling

- **Conflict on confirm**: Re-fetch bookings + hasConflict() before write. Show "Tiden blev upptagen" in chat.
- **No active ladder**: Tool returns "no active ladder" → LLM formulates response
- **OpenRouter down/timeout**: Generic error message in chat, no retry loop
- **Booking disabled** (`bookingEnabled: false`): Chat stays open but create-tools return "booking is disabled"

## Model

- Gemini 2.0 Flash via OpenRouter
- Model ID configurable in Cloud Function (swap without redeploy)
- Priority: cost > quality

## Implementation Order

1. Cloud Function setup (Firebase Functions, OpenRouter integration)
2. Tool definitions and server-side execution for read-tools
3. Feature flag (`aiAssistantEnabled`) in AppSettings + admin toggle
4. Chat UI component (modal, message bubbles, keyboard shortcut)
5. Confirmation cards for write-tools + client-side execution
6. System prompt tuning and testing
