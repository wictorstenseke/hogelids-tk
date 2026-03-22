import { useState, useRef, useEffect } from 'react'
import {
  IconTrophyFilled,
  IconShieldCheckFilled,
  IconHomeFilled,
} from '@tabler/icons-react'
import { useNavigate, useRouterState } from '@tanstack/react-router'

interface MenyButtonProps {
  isAdmin: boolean
  ladderEnabled: boolean
  showHome?: boolean
}

export function MenyButton({
  isAdmin,
  ladderEnabled,
  showHome = false,
}: MenyButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

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

  if (!isAdmin && !ladderEnabled && !showHome) return null

  return (
    <div ref={ref} className="relative flex sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex min-h-[44px] cursor-pointer items-center px-1 text-sm font-medium text-white/80 hover:text-white transition-colors"
      >
        Meny
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[160px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">
          {showHome && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                void navigate({ to: '/' })
              }}
              className={`flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-sm font-medium hover:bg-gray-50 ${pathname === '/' ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}
            >
              <IconHomeFilled
                size={16}
                className={`shrink-0 ${pathname === '/' ? 'text-gray-600' : 'text-gray-400'}`}
              />
              Hem
            </button>
          )}
          {ladderEnabled && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                void navigate({ to: '/stegen' })
              }}
              className={`flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-sm font-medium hover:bg-gray-50 ${pathname === '/stegen' ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}
            >
              <IconTrophyFilled
                size={16}
                className={`shrink-0 ${pathname === '/stegen' ? 'text-gray-600' : 'text-gray-400'}`}
              />
              Stegen
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                void navigate({ to: '/admin' })
              }}
              className={`flex w-full cursor-pointer items-center gap-2.5 px-4 py-3 text-sm font-medium hover:bg-gray-50 ${pathname === '/admin' ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}
            >
              <IconShieldCheckFilled
                size={16}
                className={`shrink-0 ${pathname === '/admin' ? 'text-gray-600' : 'text-gray-400'}`}
              />
              Admin
            </button>
          )}
        </div>
      )}
    </div>
  )
}
