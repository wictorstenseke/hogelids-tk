import {
  IconTrophyFilled,
  IconShieldCheckFilled,
  IconHomeFilled,
} from '@tabler/icons-react'
import { useNavigate, useRouterState } from '@tanstack/react-router'

interface DesktopNavProps {
  isAdmin: boolean
  ladderEnabled: boolean
  showHome?: boolean
}

export function DesktopNav({
  isAdmin,
  ladderEnabled,
  showHome = false,
}: DesktopNavProps) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  if (!isAdmin && !ladderEnabled && !showHome) return null

  const activeClass = 'text-white bg-white/20'
  const inactiveClass = 'text-white/80 hover:bg-white/15 hover:text-white'

  return (
    <div className="hidden sm:flex items-center gap-1">
      {showHome && (
        <button
          type="button"
          onClick={() => void navigate({ to: '/' })}
          className={`flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${pathname === '/' ? activeClass : inactiveClass}`}
        >
          <IconHomeFilled size={14} className="shrink-0" />
          Hem
        </button>
      )}
      {ladderEnabled && (
        <button
          type="button"
          onClick={() => void navigate({ to: '/stegen' })}
          className={`flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${pathname === '/stegen' ? activeClass : inactiveClass}`}
        >
          <IconTrophyFilled size={14} className="shrink-0" />
          Stegen
        </button>
      )}
      {isAdmin && (
        <button
          type="button"
          onClick={() => void navigate({ to: '/admin' })}
          className={`flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 ${pathname === '/admin' ? activeClass : inactiveClass}`}
        >
          <IconShieldCheckFilled size={14} className="shrink-0" />
          Admin
        </button>
      )}
    </div>
  )
}
