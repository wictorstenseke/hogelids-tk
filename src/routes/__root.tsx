/* eslint-disable react-refresh/only-export-components -- TanStack Router root route exports Route */
import { useState } from 'react'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { ToastProvider } from '../lib/ToastContext'
import { AppSettingsProvider } from '../lib/AppSettingsContext'
import { RoleProvider } from '../lib/RoleContext'
import { AuthProvider } from '../lib/AuthContext'
import { useAuth } from '../lib/useAuth'
import { signOut } from '../services/AuthService'
import { Footer } from './-components/Footer'
import { Header } from './-components/Header'
import { AuthModal } from './-components/AuthModal'
import { ProfileModal } from './-components/ProfileModal'

function AppShell() {
  const { user, loading: authLoading } = useAuth()
  const [authModal, setAuthModal] = useState<'sign-in' | 'sign-up' | null>(null)
  const [showProfile, setShowProfile] = useState(false)
  return (
    <div className="flex min-h-screen flex-col">
      <Header
        user={user}
        authLoading={authLoading}
        onOpenProfile={() => setShowProfile(true)}
        onSignOut={() => void signOut()}
        onSignIn={() => setAuthModal('sign-in')}
        onSignUp={() => setAuthModal('sign-up')}
      />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
      {authModal && (
        <AuthModal initialView={authModal} onClose={() => setAuthModal(null)} />
      )}
      {user && showProfile && (
        <ProfileModal user={user} onClose={() => setShowProfile(false)} />
      )}
    </div>
  )
}

export const Route = createRootRoute({
  component: () => (
    // AuthProvider must be the outermost provider — RoleProvider calls useAuthContext
    // internally and will throw if AuthProvider is not an ancestor.
    <AuthProvider>
      <AppSettingsProvider>
        <RoleProvider>
          <ToastProvider>
            <AppShell />
          </ToastProvider>
        </RoleProvider>
      </AppSettingsProvider>
    </AuthProvider>
  ),
})
