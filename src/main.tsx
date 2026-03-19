import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { queryClient } from './queryClient'
import './index.css'

if (import.meta.env.DEV) {
  import('./lib/seed').then(({ seedBookings, seedHistoricalBookings }) => {
    const w = window as Window & {
      seedBookings?: typeof seedBookings
      seedHistoricalBookings?: typeof seedHistoricalBookings
    }
    w.seedBookings = seedBookings
    w.seedHistoricalBookings = seedHistoricalBookings
  })

  import('./lib/migrate').then(({ migrateReservations }) => {
    const w = window as Window & {
      migrateReservations?: typeof migrateReservations
    }
    w.migrateReservations = migrateReservations
  })
}

const router = createRouter({ routeTree, basepath: '/hogelids-tk/' })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <ReactQueryDevtools buttonPosition="bottom-right" />
    </QueryClientProvider>
  </StrictMode>
)
