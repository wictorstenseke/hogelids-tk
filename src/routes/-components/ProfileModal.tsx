import { useEffect } from 'react'
import { ProfileSection } from './ProfileSection'
import type { AuthUser } from '../../lib/useAuth'

interface ProfileModalProps {
  user: AuthUser
  onClose: () => void
}

export function ProfileModal({ user, onClose }: ProfileModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — drawer on mobile, centered modal on sm+ */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Min profil"
        className="fixed z-50 bg-white shadow-xl bottom-0 left-0 right-0 rounded-t-2xl px-4 pb-8 pt-4 sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-sm sm:rounded-2xl sm:px-6 sm:py-6"
      >
        {/* Drag handle — mobile only */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[18px] font-bold uppercase tracking-wide text-gray-900">
            Min profil
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng"
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        <ProfileSection user={user} />
      </div>
    </>
  )
}
