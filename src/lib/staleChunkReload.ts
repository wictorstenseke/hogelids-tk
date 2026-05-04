// Detects errors caused by a stale tab requesting a JS chunk that no longer
// exists after a deploy. The SPA fallback serves index.html (text/html), which
// the browser refuses to execute as a module. Reloads the page once when this
// happens; sessionStorage guards against reload loops if the server is actually
// broken.

const RELOAD_GUARD_KEY = 'htk_stale_chunk_reload_at'
const RELOAD_GUARD_WINDOW_MS = 10_000

const STALE_CHUNK_PATTERNS = [
  /is not a valid JavaScript MIME type/i,
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
]

function getMessage(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'message' in value) {
    const m = (value as { message: unknown }).message
    if (typeof m === 'string') return m
  }
  return ''
}

export function isStaleChunkError(error: unknown): boolean {
  const message = getMessage(error)
  if (!message) return false
  return STALE_CHUNK_PATTERNS.some((p) => p.test(message))
}

export function maybeReloadOnStaleChunk(error: unknown): boolean {
  if (!isStaleChunkError(error)) return false
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0)
    if (Date.now() - last < RELOAD_GUARD_WINDOW_MS) return false
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
  } catch {
    // sessionStorage unavailable (private mode quotas) — skip the guard
  }
  window.location.reload()
  return true
}

export function installStaleChunkHandlers(): void {
  window.addEventListener('error', (event) => {
    maybeReloadOnStaleChunk(event.error ?? event.message)
  })
  window.addEventListener('unhandledrejection', (event) => {
    maybeReloadOnStaleChunk(event.reason)
  })
}
