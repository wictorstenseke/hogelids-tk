import { createRootRoute, Outlet } from '@tanstack/react-router'
import { ToastProvider } from '../lib/ToastContext'
import { AppSettingsProvider } from '../lib/AppSettingsContext'
import { RoleProvider } from '../lib/RoleContext'
import { AuthProvider } from '../lib/AuthContext'
import { Footer } from './-components/Footer'

export const Route = createRootRoute({
  component: () => (
    // AuthProvider must be the outermost provider — RoleProvider calls useAuthContext
    // internally and will throw if AuthProvider is not an ancestor.
    <AuthProvider>
      <AppSettingsProvider>
        <RoleProvider>
          <ToastProvider>
            <Outlet />
            <Footer />
          </ToastProvider>
        </RoleProvider>
      </AppSettingsProvider>
    </AuthProvider>
  ),
})
