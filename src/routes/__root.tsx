/* eslint-disable react-refresh/only-export-components -- TanStack Router root route exports Route */
import { createRootRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { ToastProvider } from '../lib/ToastContext'
import { AppSettingsProvider } from '../lib/AppSettingsContext'
import { RoleProvider } from '../lib/RoleContext'
import { AuthProvider } from '../lib/AuthContext'
import { AuthModalProvider, useAuthModal } from '../lib/AuthModalContext'
import {
  ProfileModalProvider,
  useProfileModal,
} from '../lib/ProfileModalContext'
import { useAuth } from '../lib/useAuth'
import { signOut } from '../services/AuthService'
import { Footer } from './-components/Footer'
import { Header } from './-components/Header'
import { AuthModal } from './-components/AuthModal'
import { ProfileModal } from './-components/ProfileModal'
import { AiChat } from './-components/AiChat'

function AppShellInner() {
  const { user, loading: authLoading } = useAuth()
  const { authModalState, closeAuthModal } = useAuthModal()
  const {
    isOpen: showProfile,
    openProfileModal,
    closeProfileModal,
  } = useProfileModal()
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen flex-col">
      <Header
        user={user}
        authLoading={authLoading}
        onOpenProfile={openProfileModal}
        onSignOut={async () => {
          await signOut()
          navigate({ to: '/' })
        }}
      />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
      {authModalState && (
        <AuthModal
          initialView={authModalState.view}
          initialEmail={authModalState.initialEmail}
          onClose={closeAuthModal}
        />
      )}
      {user && showProfile && (
        <ProfileModal user={user} onClose={closeProfileModal} />
      )}
      <AiChat />
    </div>
  )
}

function AppShell() {
  return (
    <ProfileModalProvider>
      <AuthModalProvider>
        <AppShellInner />
      </AuthModalProvider>
    </ProfileModalProvider>
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
