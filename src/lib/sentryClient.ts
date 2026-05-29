type SentryUser = {
  id?: string
  email?: string
  username?: string
} | null

export function setSentryUser(user: SentryUser): void {
  void import('../instrument')
    .then(() => import('@sentry/react'))
    .then((Sentry) => {
      Sentry.setUser(user)
    })
}

export function captureReactError(error: unknown, errorInfo: unknown): void {
  void import('../instrument').then(() =>
    import('@sentry/react').then((Sentry) => {
      Sentry.captureException(error, {
        extra: { reactErrorInfo: errorInfo },
      })
    })
  )
}
