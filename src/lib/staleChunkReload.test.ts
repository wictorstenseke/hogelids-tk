import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isStaleChunkError, maybeReloadOnStaleChunk } from './staleChunkReload'

describe('isStaleChunkError', () => {
  it('detects Safari MIME type message', () => {
    expect(
      isStaleChunkError(
        new TypeError("'text/html' is not a valid JavaScript MIME type.")
      )
    ).toBe(true)
  })

  it('detects Chrome dynamic import failure', () => {
    expect(
      isStaleChunkError(
        new TypeError(
          'Failed to fetch dynamically imported module: https://example.com/assets/Match-abc.js'
        )
      )
    ).toBe(true)
  })

  it('detects Firefox dynamic import failure', () => {
    expect(
      isStaleChunkError(new Error('error loading dynamically imported module'))
    ).toBe(true)
    expect(
      isStaleChunkError(new Error('Importing a module script failed.'))
    ).toBe(true)
  })

  it('accepts plain string messages', () => {
    expect(
      isStaleChunkError("'text/html' is not a valid JavaScript MIME type.")
    ).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(isStaleChunkError(new Error('Something else went wrong'))).toBe(
      false
    )
    expect(isStaleChunkError(null)).toBe(false)
    expect(isStaleChunkError(undefined)).toBe(false)
    expect(isStaleChunkError({})).toBe(false)
  })
})

describe('maybeReloadOnStaleChunk', () => {
  let reloadSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sessionStorage.clear()
    reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    })
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('reloads on a stale-chunk error', () => {
    const handled = maybeReloadOnStaleChunk(
      new TypeError("'text/html' is not a valid JavaScript MIME type.")
    )
    expect(handled).toBe(true)
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })

  it('does not reload twice within the guard window', () => {
    maybeReloadOnStaleChunk(
      new TypeError("'text/html' is not a valid JavaScript MIME type.")
    )
    const second = maybeReloadOnStaleChunk(
      new TypeError("'text/html' is not a valid JavaScript MIME type.")
    )
    expect(second).toBe(false)
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })

  it('ignores unrelated errors', () => {
    const handled = maybeReloadOnStaleChunk(new Error('something else'))
    expect(handled).toBe(false)
    expect(reloadSpy).not.toHaveBeenCalled()
  })
})
