/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env vars (including non-VITE_ prefixed) for build-time plugins
  const env = loadEnv(mode, process.cwd(), '')
  const enableSentryUpload =
    process.env.CI === 'true' &&
    Boolean(env.SENTRY_ORG && env.SENTRY_PROJECT && env.SENTRY_AUTH_TOKEN)

  return {
    base: '/',
    build: {
      sourcemap: 'hidden',
      rolldownOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (id.includes('recharts')) return 'vendor-recharts'
            if (id.includes('react-datepicker')) return 'vendor-datepicker'
            if (id.includes('@sentry')) return 'vendor-sentry'
            if (id.includes('firebase')) return 'vendor-firebase'
            if (id.includes('@tanstack')) return 'vendor-tanstack'
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            return 'vendor'
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'functions/src/**/*.{test,spec}.ts',
      ],
    },
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      enableSentryUpload &&
        sentryVitePlugin({
          org: env.SENTRY_ORG,
          project: env.SENTRY_PROJECT,
          authToken: env.SENTRY_AUTH_TOKEN,
        }),
    ],
  }
})
