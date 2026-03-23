import { createRootRoute, Outlet } from '@tanstack/react-router'
import { ToastProvider } from '../lib/ToastContext'
import { AppSettingsProvider } from '../lib/AppSettingsContext'
import { RoleProvider } from '../lib/RoleContext'
import { Footer } from './-components/Footer'

export const Route = createRootRoute({
  component: () => (
    <AppSettingsProvider>
      <RoleProvider>
        <ToastProvider>
          <Outlet />
          <Footer />
        </ToastProvider>
      </RoleProvider>
    </AppSettingsProvider>
  ),
})
