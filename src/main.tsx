import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { queryClient, SEVEN_DAYS_MS } from './queryClient'
import { reviveTimestamps } from './lib/timestampRevive'
import {
  installStaleChunkHandlers,
  maybeReloadOnStaleChunk,
} from './lib/staleChunkReload'
import { captureReactError } from './lib/sentryClient'
import './index.css'

installStaleChunkHandlers()

const QUERY_CACHE_SCHEMA_VERSION = 'query-cache-v2'

window.setTimeout(() => {
  void import('./instrument')
}, 0)

const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'htk_query_cache',
  deserialize: (str) => JSON.parse(str, reviveTimestamps),
})

const BROWSER_TAB_TITLE_BASE = 'Högelids Tennisklubb – Boka bana'
const tabPrefix = import.meta.env.VITE_BROWSER_TAB_PREFIX?.trim()
document.title = tabPrefix
  ? `${tabPrefix} | ${BROWSER_TAB_TITLE_BASE}`
  : BROWSER_TAB_TITLE_BASE

if (import.meta.env.DEV) {
  import('./lib/seed').then(({ seedBookings, seedHistoricalBookings }) => {
    const w = window as Window & {
      seedBookings?: typeof seedBookings
      seedHistoricalBookings?: typeof seedHistoricalBookings
    }
    w.seedBookings = seedBookings
    w.seedHistoricalBookings = seedHistoricalBookings
  })
}

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function handleReactError(error: unknown, errorInfo: unknown) {
  maybeReloadOnStaleChunk(error)
  captureReactError(error, errorInfo)
}

createRoot(document.getElementById('root')!, {
  onUncaughtError: handleReactError,
  onCaughtError: handleReactError,
  onRecoverableError: handleReactError,
}).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: localStoragePersister,
        maxAge: SEVEN_DAYS_MS,
        buster: QUERY_CACHE_SCHEMA_VERSION,
      }}
    >
      <RouterProvider router={router} />
      {import.meta.env.DEV && (
        <ReactQueryDevtools buttonPosition="bottom-right" />
      )}
    </PersistQueryClientProvider>
  </StrictMode>
)
