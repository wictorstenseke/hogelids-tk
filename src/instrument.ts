import * as Sentry from '@sentry/react'

// Derive environment from Firebase project ID
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined
const environment = import.meta.env.DEV
  ? 'development'
  : projectId === 'hogelids-tk-prod'
    ? 'production'
    : 'staging'

// Firebase auth error codes that are handled and shown to the user as Swedish
// messages — these are expected user mistakes, not bugs, so we drop them.
const HANDLED_FIREBASE_AUTH_CODES = new Set([
  'auth/email-already-in-use',
  'auth/invalid-credential',
  'auth/weak-password',
  'auth/too-many-requests',
  'auth/operation-not-allowed',
])

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment,
  sendDefaultPii: true,
  beforeSend(event, hint) {
    const err = hint?.originalException
    if (
      err !== null &&
      typeof err === 'object' &&
      'code' in err &&
      typeof (err as { code: unknown }).code === 'string' &&
      HANDLED_FIREBASE_AUTH_CODES.has((err as { code: string }).code)
    ) {
      return null
    }
    return event
  },
})
