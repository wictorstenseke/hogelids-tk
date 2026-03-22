import { Link } from '@tanstack/react-router'
import type { AuthUser } from '../../lib/useAuth'
import { useRole } from '../../lib/useRole'
import { isAdminRole } from '../../services/AuthService'
import { useAppSettings } from '../../lib/useAppSettings'
import { AvatarMenu } from './AvatarMenu'
import { MenyButton } from './MenyButton'
import { DesktopNav } from './DesktopNav'

interface HeaderProps {
  user: AuthUser | null
  authLoading: boolean
  onOpenProfile: () => void
  onSignOut: () => void
  onSignIn?: () => void
  onSignUp?: () => void
  showLogo?: boolean
  showHome?: boolean
}

export function Header({
  user,
  authLoading,
  onOpenProfile,
  onSignOut,
  onSignIn,
  onSignUp,
  showLogo = true,
  showHome = false,
}: HeaderProps) {
  const role = useRole()
  const isAdmin = user ? isAdminRole(role) : false
  const { settings } = useAppSettings()
  const ladderEnabled = user ? (settings?.ladderEnabled ?? true) : false

  return (
    <header className="bg-transparent">
      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Row 1: nav controls */}
        <div className="flex items-center">
          <MenyButton
            isAdmin={isAdmin}
            ladderEnabled={ladderEnabled}
            showHome={showHome}
          />
          <DesktopNav
            isAdmin={isAdmin}
            ladderEnabled={ladderEnabled}
            showHome={showHome}
          />

          {/* Auth controls — ml-auto keeps them right-aligned regardless of left side */}
          {!authLoading && (
            <div className="ml-auto flex shrink-0 items-center gap-1">
              {user ? (
                <AvatarMenu
                  user={user}
                  onOpenProfile={onOpenProfile}
                  onSignOut={onSignOut}
                />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="flex min-h-[44px] cursor-pointer items-center rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
                  >
                    Logga in
                  </button>
                  <button
                    type="button"
                    onClick={onSignUp}
                    className="flex min-h-[44px] cursor-pointer items-center rounded-lg px-4 py-2 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-80"
                    style={{ backgroundColor: '#F1E334' }}
                  >
                    Skapa konto
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Row 2: centered logo */}
        {showLogo && (
          <div className="flex justify-center pt-2">
            <Link
              to="/"
              className="block shrink-0 rounded-lg transition-[filter,transform] duration-200 filter-[drop-shadow(0px_4px_4px_rgba(0,0,0,0.15))] hover:filter-[drop-shadow(0px_5px_8px_rgba(0,0,0,0.25))] hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            >
              <img
                src="/htk-logo.svg"
                alt="HTK Logo"
                className="h-auto w-[72px] sm:w-[80px]"
              />
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
