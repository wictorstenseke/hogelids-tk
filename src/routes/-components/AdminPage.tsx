import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { deleteField } from 'firebase/firestore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../lib/useAuth'
import { useRole } from '../../lib/useRole'
import { isAdminRole } from '../../services/AuthService'
import type { UserProfile, UserRole } from '../../services/AuthService'
import { useAppSettings } from '../../lib/useAppSettings'
import { updateAppSettings } from '../../services/AppSettingsService'
import {
  listAllUsers,
  updateUserRole,
  USERS_QUERY_KEY,
} from '../../services/UserService'

// A simple toggle switch component.
interface ToggleProps {
  checked: boolean
  onChange: (value: boolean) => void
  id: string
}

function Toggle({ checked, onChange, id }: ToggleProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        checked ? 'bg-gray-900' : 'bg-gray-200',
      ].join(' ')}
    >
      <span
        className={[
          'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  )
}

// A settings section container with an optional title.
interface SettingsSectionProps {
  title: string
  children: React.ReactNode
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section>
      <h2 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </h2>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        {children}
      </div>
    </section>
  )
}

// A single settings row with label + description on the left and control on the right.
interface SettingsRowProps {
  label: string
  description?: string
  children: React.ReactNode
}

function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex min-h-[56px] items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Användare',
  admin: 'Admin',
  superuser: 'Superadmin',
}

// A single user row in the user management list.
interface UserRowProps {
  profile: UserProfile
  isSelf: boolean
  isSuperuser: boolean
}

function UserRow({ profile, isSelf, isSuperuser }: UserRowProps) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [selectedRole, setSelectedRole] = useState<UserRole>(profile.role)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Sync selectedRole when profile.role changes externally (e.g. after query invalidation),
  // but not while a save is in progress to avoid resetting the select mid-save.
  useEffect(() => {
    if (!isSaving) {
      setSelectedRole(profile.role)
    }
  }, [profile.role, isSaving])

  async function handleSave() {
    if (!user) return
    setIsSaving(true)
    setSaveError(null)
    try {
      await updateUserRole(user.uid, profile.uid, selectedRole)
      await queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
    } catch (err) {
      console.error('Failed to update user role:', err)
      setSaveError('Kunde inte spara. Försök igen.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="px-4 py-3 space-y-1">
      <div className="flex min-h-[44px] items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {profile.displayName}
          </p>
          <p className="text-xs text-gray-500 truncate">{profile.email}</p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {isSuperuser && !isSelf ? (
            <>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="rounded-lg border border-gray-300 px-2 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none min-h-[44px]"
              >
                <option value="user">Användare</option>
                <option value="admin">Admin</option>
                <option value="superuser">Superadmin</option>
              </select>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving || selectedRole === profile.role}
                className="min-h-[44px] cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#F1E334' }}
              >
                {isSaving ? 'Sparar…' : 'Spara'}
              </button>
            </>
          ) : (
            <span className="text-sm text-gray-600">
              {ROLE_LABELS[profile.role]}
            </span>
          )}
        </div>
      </div>
      {saveError && <p className="text-xs text-red-600">{saveError}</p>}
    </div>
  )
}

export function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const role = useRole()
  const navigate = useNavigate()
  const { settings } = useAppSettings()

  const {
    data: users,
    isLoading: usersLoading,
    isError: usersError,
  } = useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: listAllUsers,
    enabled: isAdminRole(role),
  })

  const isAdmin = isAdminRole(role)
  // Still loading auth or waiting for role to resolve
  const isLoading = authLoading || (!!user && role === null)

  // Local overrides for banner text fields — null means "not yet edited by user"
  // so the displayed value falls back to the live settings from Firestore.
  const [bannerTextOverride, setBannerTextOverride] = useState<string | null>(
    null
  )
  const [bannerLinkTextOverride, setBannerLinkTextOverride] = useState<
    string | null
  >(null)
  const [bannerLinkUrlOverride, setBannerLinkUrlOverride] = useState<
    string | null
  >(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const bannerText = bannerTextOverride ?? settings?.bannerText ?? ''
  const bannerLinkText =
    bannerLinkTextOverride ?? settings?.bannerLinkText ?? ''
  const bannerLinkUrl = bannerLinkUrlOverride ?? settings?.bannerLinkUrl ?? ''

  useEffect(() => {
    if (isLoading) return
    if (!user || !isAdmin) {
      void navigate({ to: '/', replace: true })
    }
  }, [user, isAdmin, isLoading, navigate])

  if (isLoading) return null

  if (!user || !isAdmin) return null

  async function handleSaveBannerText() {
    setIsSaving(true)
    setSaveError(null)
    try {
      await updateAppSettings({
        bannerText,
        bannerLinkText: bannerLinkText || deleteField(),
        bannerLinkUrl: bannerLinkUrl || deleteField(),
      })
      // Clear local overrides so inputs show the saved Firestore values
      setBannerTextOverride(null)
      setBannerLinkTextOverride(null)
      setBannerLinkUrlOverride(null)
    } catch (err) {
      console.error('Failed to save banner text:', err)
      setSaveError('Kunde inte spara. Försök igen.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-lg space-y-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin</h1>

        <SettingsSection title="Bokning">
          <SettingsRow
            label="Bokningsformulär"
            description="Tillåt användare att göra bokningar"
          >
            <Toggle
              id="booking-enabled-toggle"
              checked={settings?.bookingEnabled ?? true}
              onChange={(value) =>
                void updateAppSettings({ bookingEnabled: value }).catch((err) =>
                  console.error('Failed to update bookingEnabled:', err)
                )
              }
            />
          </SettingsRow>
        </SettingsSection>

        <SettingsSection title="Banner">
          <SettingsRow label="Visa banner">
            <Toggle
              id="banner-visible-toggle"
              checked={settings?.bannerVisible ?? false}
              onChange={(value) =>
                void updateAppSettings({ bannerVisible: value }).catch((err) =>
                  console.error('Failed to update bannerVisible:', err)
                )
              }
            />
          </SettingsRow>

          <SettingsRow label="Bannertext">
            <input
              type="text"
              value={bannerText}
              onChange={(e) => setBannerTextOverride(e.target.value)}
              placeholder="Skriv ett meddelande…"
              className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none sm:w-64"
            />
          </SettingsRow>

          <SettingsRow label="Länktext" description="Valfri">
            <input
              type="text"
              value={bannerLinkText}
              onChange={(e) => setBannerLinkTextOverride(e.target.value)}
              placeholder="Läs mer"
              className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none sm:w-64"
            />
          </SettingsRow>

          <SettingsRow label="Länk-URL" description="Valfri">
            <input
              type="url"
              value={bannerLinkUrl}
              onChange={(e) => setBannerLinkUrlOverride(e.target.value)}
              placeholder="https://…"
              className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none sm:w-64"
            />
          </SettingsRow>

          <div className="px-4 py-3 space-y-2">
            <button
              type="button"
              onClick={() => void handleSaveBannerText()}
              disabled={isSaving}
              className="min-h-[44px] cursor-pointer rounded-lg px-5 py-2 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#F1E334' }}
            >
              {isSaving ? 'Sparar…' : 'Spara'}
            </button>
            {saveError && <p className="text-xs text-red-600">{saveError}</p>}
          </div>
        </SettingsSection>

        <SettingsSection title="Användare">
          {usersLoading ? (
            <div className="px-4 py-4 text-sm text-gray-500">
              Laddar användare…
            </div>
          ) : usersError ? (
            <div className="px-4 py-4 text-sm text-red-600">
              Kunde inte hämta användare. Försök igen.
            </div>
          ) : !users || users.length === 0 ? (
            <div className="px-4 py-4 text-sm text-gray-500">
              Inga användare registrerade.
            </div>
          ) : (
            users.map((profile) => (
              <UserRow
                key={profile.uid}
                profile={profile}
                isSelf={user?.uid === profile.uid}
                isSuperuser={role === 'superuser'}
              />
            ))
          )}
        </SettingsSection>
      </div>
    </main>
  )
}
