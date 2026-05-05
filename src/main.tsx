import './instrument'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { reactErrorHandler } from '@sentry/react'
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
import './index.css'

installStaleChunkHandlers()

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

const sentryReactErrorHandler = reactErrorHandler()
function handleReactError(...args: Parameters<typeof sentryReactErrorHandler>) {
  maybeReloadOnStaleChunk(args[0])
  sentryReactErrorHandler(...args)
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
        buster: __BUILD_ID__,
      }}
    >
      <RouterProvider router={router} />
      <ReactQueryDevtools buttonPosition="bottom-right" />
    </PersistQueryClientProvider>
  </StrictMode>
)
