import { useNavigate, useRouterState } from '@tanstack/react-router'

interface DesktopNavProps {
  ladderEnabled: boolean
}

const adminBtnClass = `flex cursor-pointer items-center rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors duration-150 sm:px-3 sm:py-1.5`

const adminActiveClass =
  'bg-[#E5D82C] text-gray-900 shadow-sm ring-2 ring-white/35'
const adminInactiveClass =
  'bg-[#F1E334] text-gray-900 shadow-sm hover:bg-[#E5D82C] hover:text-gray-900'

/** Yellow pill for admin; keep next to profile/avatar in the header. */
export function AdminNavButton() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <button
      type="button"
      onClick={() => void navigate({ to: '/admin' })}
      className={`${adminBtnClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
        pathname === '/admin' ? adminActiveClass : adminInactiveClass
      }`}
    >
      Admin
    </button>
  )
}

export function DesktopNav({ ladderEnabled }: DesktopNavProps) {
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
    </div>
  )
}
