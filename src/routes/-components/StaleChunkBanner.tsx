import { useEffect, useState } from 'react'
import { IconRefresh } from '@tabler/icons-react'
import {
  STALE_CHUNK_EVENT,
  reloadForStaleChunk,
} from '../../lib/staleChunkReload'

export function StaleChunkBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    function handler(event: Event) {
      event.preventDefault()
      setShow(true)
    }
    window.addEventListener(STALE_CHUNK_EVENT, handler)
    return () => window.removeEventListener(STALE_CHUNK_EVENT, handler)
  }, [])

  if (!show) return null

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[60] flex flex-col items-stretch gap-2 bg-amber-500 px-4 py-3 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between"
    >
      <span className="text-sm font-medium">
        En ny version av sidan finns. Ladda om för att fortsätta.
      </span>
      <button
        type="button"
        onClick={reloadForStaleChunk}
        className="inline-flex min-h-[44px] items-center justify-center gap-2 self-end rounded-md bg-white px-4 py-2 text-sm font-semibold text-amber-700 transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:self-auto"
      >
        <IconRefresh size={16} stroke={2} />
        Ladda om
      </button>
    </div>
  )
}
