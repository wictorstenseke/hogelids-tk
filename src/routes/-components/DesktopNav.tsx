import { IconTrophyFilled, IconShieldCheckFilled } from '@tabler/icons-react'
import { useNavigate } from '@tanstack/react-router'

interface DesktopNavProps {
  isAdmin: boolean
  ladderEnabled: boolean
}

export function DesktopNav({ isAdmin, ladderEnabled }: DesktopNavProps) {
  const navigate = useNavigate()

  if (!isAdmin && !ladderEnabled) return null

  return (
    <div className="hidden sm:flex items-center gap-1">
      {ladderEnabled && (
        <button
          type="button"
          onClick={() => void navigate({ to: '/stegen' })}
          className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white/80 hover:bg-white/15 hover:text-white transition-colors duration-150"
        >
          <IconTrophyFilled size={14} className="shrink-0" />
          Stegen
        </button>
      )}
      {isAdmin && (
        <button
          type="button"
          onClick={() => void navigate({ to: '/admin' })}
          className="flex cursor-pointer items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white/80 hover:bg-white/15 hover:text-white transition-colors duration-150"
        >
          <IconShieldCheckFilled size={14} className="shrink-0" />
          Admin
        </button>
      )}
    </div>
  )
}
