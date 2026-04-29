/* eslint-disable react-refresh/only-export-components -- context + hook are intentionally co-located */
import { createContext, useContext, useState } from 'react'

interface ProfileModalContextValue {
  isOpen: boolean
  openProfileModal: () => void
  closeProfileModal: () => void
}

const ProfileModalContext = createContext<ProfileModalContextValue | null>(null)

export function ProfileModalProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <ProfileModalContext.Provider
      value={{
        isOpen,
        openProfileModal: () => setIsOpen(true),
        closeProfileModal: () => setIsOpen(false),
      }}
    >
      {children}
    </ProfileModalContext.Provider>
  )
}

export function useProfileModal(): ProfileModalContextValue {
  const ctx = useContext(ProfileModalContext)
  if (!ctx)
    throw new Error('useProfileModal must be used within ProfileModalProvider')
  return ctx
}
