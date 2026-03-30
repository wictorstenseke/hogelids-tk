import { QueryClient } from '@tanstack/react-query'

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: SEVEN_DAYS_MS,
    },
  },
})
