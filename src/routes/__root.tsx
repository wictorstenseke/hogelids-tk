import { createRootRoute, Outlet } from '@tanstack/react-router'
import { ToastProvider } from '../lib/ToastContext'
import { AppSettingsProvider } from '../lib/AppSettingsContext'

export const Route = createRootRoute({
  component: () => (
    <AppSettingsProvider>
      <ToastProvider>
        <Outlet />
      </ToastProvider>
    </AppSettingsProvider>
  ),
})
