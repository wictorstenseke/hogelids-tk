import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getProfile,
  updateProfile,
  PROFILE_QUERY_KEY,
} from '../../services/ProfileService'
import type { AuthUser } from '../../lib/useAuth'

interface ProfileSectionProps {
  user: AuthUser
}

export function ProfileSection({ user }: ProfileSectionProps) {
  const queryClient = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: [PROFILE_QUERY_KEY, user.uid],
    queryFn: () => getProfile(user.uid),
  })

  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Pre-fill form when profile loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? '')
      setPhone(profile.phone ?? '')
    }
  }, [profile])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) {
      setNameError('Namn krävs')
      return
    }
    setNameError(null)
    setIsSaving(true)
    setSaveError(null)
    setSavedSuccess(false)
    try {
      await updateProfile(user.uid, {
        displayName: displayName.trim(),
        phone: phone.trim() || null,
      })
      await queryClient.invalidateQueries({
        queryKey: [PROFILE_QUERY_KEY, user.uid],
      })
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 2000)
    } catch {
      setSaveError('Kunde inte spara profilen.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700" />
          <span className="ml-3 text-sm text-gray-500">Laddar profil…</span>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Display name */}
          <div className="space-y-1">
            <label
              htmlFor="profile-displayName"
              className="block text-sm font-medium text-gray-700"
            >
              Namn
            </label>
            <input
              id="profile-displayName"
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value)
                if (nameError) setNameError(null)
              }}
              className={`w-full min-h-[44px] rounded-xl border px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F1E334] ${nameError ? 'border-red-400' : 'border-gray-200'}`}
            />
            {nameError && <p className="text-xs text-red-600">{nameError}</p>}
          </div>

          {/* Email — read-only */}
          <div className="space-y-1">
            <label
              htmlFor="profile-email"
              className="block text-sm font-medium text-gray-700"
            >
              E-post
            </label>
            <input
              id="profile-email"
              type="email"
              value={user.email ?? ''}
              readOnly
              disabled
              className="w-full min-h-[44px] rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Phone — optional */}
          <div className="space-y-1">
            <label
              htmlFor="profile-phone"
              className="block text-sm font-medium text-gray-700"
            >
              Telefon
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Valfritt"
              className="w-full min-h-[44px] rounded-xl border border-gray-200 px-3 py-2 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F1E334]"
            />
          </div>

          {saveError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {saveError}
            </div>
          )}

          {savedSuccess && (
            <div className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
              Sparat!
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="flex min-h-[44px] w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: '#F1E334' }}
          >
            {isSaving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-gray-700" />
            ) : (
              'Spara'
            )}
          </button>
        </form>
      )}
    </div>
  )
}
