import { useNavigate, useRouterState } from '@tanstack/react-router'

interface DesktopNavProps {
  isAdmin: boolean
  ladderEnabled: boolean
}

export function DesktopNav({ isAdmin, ladderEnabled }: DesktopNavProps) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  const activeClass = 'text-white bg-white/20'
  const inactiveClass = 'text-white/80 hover:bg-white/15 hover:text-white'

  const btnClass = `flex cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors duration-150 sm:px-3 sm:py-1.5`

  return (
    <div className="flex max-w-full flex-wrap items-center justify-start gap-1.5 sm:gap-1">
      <button
        type="button"
        onClick={() => void navigate({ to: '/' })}
        className={`${btnClass} ${pathname === '/' ? activeClass : inactiveClass}`}
      >
        Hem
      </button>
      {ladderEnabled && (
        <button
          type="button"
          onClick={() => void navigate({ to: '/stegen' })}
          className={`${btnClass} ${pathname === '/stegen' ? activeClass : inactiveClass}`}
        >
          Stegen
        </button>
      )}
      {isAdmin && (
        <button
          type="button"
          onClick={() => void navigate({ to: '/admin' })}
          className={`${btnClass} ${pathname === '/admin' ? activeClass : inactiveClass}`}
        >
          Admin
        </button>
      )}
    </div>
  )
}
