/// <reference types="vitest" />
import { execSync } from 'node:child_process'
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

function resolveBuildId(mode: string): string {
  if (mode === 'development') return 'dev'
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return `build-${Date.now()}`
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load all env vars (including non-VITE_ prefixed) for build-time plugins
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: '/',
    define: {
      __BUILD_ID__: JSON.stringify(resolveBuildId(mode)),
    },
    build: {
      sourcemap: 'hidden',
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
    plugins: [
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      sentryVitePlugin({
        org: env.SENTRY_ORG,
        project: env.SENTRY_PROJECT,
        authToken: env.SENTRY_AUTH_TOKEN,
      }),
    ],
  }
})
