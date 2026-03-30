import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { Timestamp } from 'firebase/firestore'
import { routeTree } from './routeTree.gen'
import { queryClient, SEVEN_DAYS_MS } from './queryClient'
import './index.css'

function reviveTimestamps(_key: string, value: unknown): unknown {
  if (
    value !== null &&
    typeof value === 'object' &&
    'seconds' in value &&
    'nanoseconds' in value &&
    typeof (value as Record<string, unknown>).seconds === 'number' &&
    typeof (value as Record<string, unknown>).nanoseconds === 'number'
  ) {
    return new Timestamp(
      (value as { seconds: number }).seconds,
      (value as { nanoseconds: number }).nanoseconds
    )
  }
  return value
}

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: localStoragePersister,
        maxAge: SEVEN_DAYS_MS,
      }}
    >
      <RouterProvider router={router} />
      <ReactQueryDevtools buttonPosition="bottom-right" />
    </PersistQueryClientProvider>
  </StrictMode>
)
