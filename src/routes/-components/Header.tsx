import { Link } from '@tanstack/react-router'
import type { AuthUser } from '../../lib/useAuth'
import { useRole } from '../../lib/useRole'
import { isAdminRole } from '../../services/AuthService'
import { useAuthModal } from '../../lib/AuthModalContext'
import { AvatarMenu } from './AvatarMenu'
import { AdminNavButton, DesktopNav } from './DesktopNav'

interface HeaderProps {
  user: AuthUser | null
  authLoading: boolean
  onOpenProfile: () => void
  onSignOut: () => void
}

export function Header({
  user,
  authLoading,
  onOpenProfile,
  onSignOut,
}: HeaderProps) {
  const role = useRole()
  const isAdmin = user ? isAdminRole(role) : false
  const ladderEnabled = !!user
  const { openAuthModal } = useAuthModal()

  return (
    <header className="border-b border-white/10 bg-transparent">
      <div className="mx-auto max-w-lg px-4 py-2 sm:py-2.5 md:max-w-3xl">
        <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
          <Link
            to="/"
            className="block shrink-0 rounded-lg transition-[filter,transform] duration-200 filter-[drop-shadow(0px_4px_4px_rgba(0,0,0,0.15))] hover:filter-[drop-shadow(0px_5px_8px_rgba(0,0,0,0.25))] hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          >
            <img
              src="/htk-logo.svg"
              alt="HTK Logo"
              className="h-auto w-[44px] sm:w-[50px] md:w-[54px]"
            />
          </Link>

          <div className="flex min-w-0 flex-1 items-center justify-start">
            {user && (
              <div className="flex w-full min-w-0 justify-start pl-1 sm:pl-1.5">
                <DesktopNav ladderEnabled={ladderEnabled} />
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            {!authLoading && (
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                {user ? (
                  <>
                    {isAdmin && <AdminNavButton />}
                    <AvatarMenu
                      user={user}
                      onOpenProfile={onOpenProfile}
                      onSignOut={onSignOut}
                    />
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => openAuthModal('sign-in')}
                      className="flex min-h-[44px] cursor-pointer items-center rounded-lg px-3 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
                    >
                      Logga in
                    </button>
                    <button
                      type="button"
                      onClick={() => openAuthModal('sign-up')}
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
        </div>
      </div>
    </header>
  )
}
