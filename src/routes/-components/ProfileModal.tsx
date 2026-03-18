import { useEffect, useRef, useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { ProfileSection } from './ProfileSection'
import type { AuthUser } from '../../lib/useAuth'

interface ProfileModalProps {
  user: AuthUser
  onClose: () => void
}

export function ProfileModal({ user, onClose }: ProfileModalProps) {
  // Animate in: start hidden, set visible on next tick
  const [visible, setVisible] = useState(false)
  // Drag state
  const dragStartY = useRef<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

  useEffect(() => {
    // Trigger slide-up on mount
    const id = requestAnimationFrame(() => setVisible(true))
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      document.body.style.overflow = ''
    }
  }, [])

  function handleClose() {
    setVisible(false)
    // Wait for transition before unmounting
    setTimeout(onClose, 280)
  }

  function onTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0]?.clientY ?? null
  }

  function onTouchMove(e: React.TouchEvent) {
    if (dragStartY.current === null) return
    const delta = (e.touches[0]?.clientY ?? 0) - dragStartY.current
    setDragOffset(Math.max(0, delta))
  }

  function onTouchEnd() {
    if (dragOffset > 100) {
      handleClose()
    } else {
      setDragOffset(0)
    }
    dragStartY.current = null
  }

  const panelStyle =
    dragOffset > 0
      ? { transform: `translateY(${dragOffset}px)`, transition: 'none' }
      : undefined

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Min profil"
        style={panelStyle}
        className={[
          'fixed z-50 bg-white shadow-2xl',
          // Mobile: slide up from bottom
          'bottom-0 left-0 right-0 rounded-t-3xl',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          visible ? 'translate-y-0' : 'translate-y-full',
          // Desktop: centered modal, no translate animation
          'sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2',
          'sm:-translate-x-1/2 sm:-translate-y-1/2',
          'sm:w-full sm:max-w-sm sm:rounded-2xl',
          'sm:transition-none',
        ].join(' ')}
      >
        {/* Drag handle area — touchable, mobile only */}
        <div
          className="sm:hidden pt-3 pb-1 flex flex-col items-center cursor-grab active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <div className="px-5 pb-8 pt-3 sm:px-6 sm:py-6">
          {/* Header */}
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-[18px] font-bold uppercase tracking-wide text-gray-900">
              Min profil
            </h2>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Stäng"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
            >
              <IconX size={18} stroke={2} />
            </button>
          </div>

          <ProfileSection user={user} />
        </div>
      </div>
    </>
  )
}
