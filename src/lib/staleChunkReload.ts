// Detects errors caused by a stale tab requesting a JS chunk that no longer
// exists after a deploy. The SPA fallback serves index.html (text/html), which
// the browser refuses to execute as a module.
//
// On detection, dispatches a cancelable `htk:stale-chunk` event so UI can
// show a "Ladda om" banner instead of nuking unsaved form state. If nothing
// cancels the event (e.g. React render error tore down the tree), falls back
// to an automatic reload. A per-session counter caps total reloads so a
// genuinely-broken server cannot trap the user in an infinite reload loop.

const RELOAD_COUNT_KEY = 'htk_stale_chunk_reload_count'
const MAX_RELOADS_PER_SESSION = 2

export const STALE_CHUNK_EVENT = 'htk:stale-chunk'

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

function readReloadCount(): number {
  try {
    return Number(sessionStorage.getItem(RELOAD_COUNT_KEY) ?? 0)
  } catch {
    return 0
  }
}

function bumpReloadCount(): void {
  try {
    sessionStorage.setItem(RELOAD_COUNT_KEY, String(readReloadCount() + 1))
  } catch {
    // sessionStorage unavailable (private mode quotas) — proceed without guard
  }
}

export function canReloadForStaleChunk(): boolean {
  return readReloadCount() < MAX_RELOADS_PER_SESSION
}

export function reloadForStaleChunk(): void {
  if (!canReloadForStaleChunk()) return
  bumpReloadCount()
  window.location.reload()
}

export function maybeReloadOnStaleChunk(error: unknown): boolean {
  if (!isStaleChunkError(error)) return false
  if (!canReloadForStaleChunk()) return false

  const event = new CustomEvent(STALE_CHUNK_EVENT, { cancelable: true })
  window.dispatchEvent(event)
  if (event.defaultPrevented) return true

  reloadForStaleChunk()
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
