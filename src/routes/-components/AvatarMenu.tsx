import { useState, useRef, useEffect } from 'react'
import { IconUserFilled, IconLogout } from '@tabler/icons-react'
import type { AuthUser } from '../../lib/useAuth'

interface AvatarMenuProps {
  user: AuthUser
  onOpenProfile: () => void
  onSignOut: () => void
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function AvatarMenu({
  user,
  onOpenProfile,
  onSignOut,
}: AvatarMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
    }
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const initials = getInitials(user.displayName ?? user.email ?? '?')

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Kontomeny"
        aria-expanded={open}
        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-sm font-bold transition-opacity hover:opacity-80"
        style={
          open
            ? { backgroundColor: '#F1E334', color: '#111827' }
            : { backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }
        }
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-3 text-center">
            <p className="text-sm font-semibold text-gray-900">
              {user.displayName}
            </p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onOpenProfile()
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <IconUserFilled size={16} className="shrink-0 text-gray-400" />
            Min profil
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onSignOut()
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <IconLogout size={16} stroke={2} className="shrink-0" />
            Logga ut
          </button>
        </div>
      )}
    </div>
  )
}
