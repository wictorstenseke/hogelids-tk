import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Timestamp } from 'firebase/firestore'
import { useAuth } from '../../lib/useAuth'
import { useRole } from '../../lib/useRole'
import { isAdminRole } from '../../services/AuthService'
import type { UserProfile, UserRole } from '../../services/AuthService'
import { useAppSettings } from '../../lib/useAppSettings'
import {
  updateAppSettings,
  APP_SETTINGS_QUERY_KEY,
  type AppSettings,
} from '../../services/AppSettingsService'
import { useToast } from '../../lib/ToastContext'
import {
  listAllUsers,
  updateUserRole,
  USERS_QUERY_KEY,
} from '../../services/UserService'
import {
  createLadder,
  completeLadder,
  getActiveLadder,
  getAllLadders,
  getLadderMatches,
  setLadderJoinDate,
  LADDER_QUERY_KEY,
  LADDERS_QUERY_KEY,
  LADDER_MATCHES_QUERY_KEY,
} from '../../services/LadderService'
import { AdminJoinDateField } from './AdminJoinDateField'
import { MenuSelect } from './MenuSelect'

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
      <h2 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wider text-white/70">
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
  superuser: 'Superuser',
}

// Custom role dropdown — uses shared MenuSelect (same as Stegen ladder picker).
interface RoleSelectOption {
  value: UserRole
  label: string
}

interface RoleSelectProps {
  value: UserRole
  onChange: (value: UserRole) => void
  options: RoleSelectOption[]
}

function RoleSelect({ value, onChange, options }: RoleSelectProps) {
  const selectedLabel = options.find((o) => o.value === value)?.label ?? value
  return (
    <MenuSelect
      value={value}
      onChange={(v) => onChange(v as UserRole)}
      options={options}
      ariaLabel={`Roll: ${selectedLabel}`}
    />
  )
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
  const { addToast } = useToast()
  const [selectedRole, setSelectedRole] = useState<UserRole>(profile.role)
  const [isSaving, setIsSaving] = useState(false)

  const hasPendingChange = selectedRole !== profile.role

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
    try {
      await updateUserRole(user.uid, profile.uid, selectedRole)
      await queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
      addToast(`Roll ändrad till ${ROLE_LABELS[selectedRole]}`)
    } catch (err) {
      console.error('Failed to update user role:', err)
      addToast('Kunde inte spara. Försök igen.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex min-h-[44px] items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {profile.displayName}
          </p>
          <p className="text-xs text-gray-500 truncate">{profile.email}</p>
        </div>
        <div className="shrink-0">
          {isSuperuser && !isSelf ? (
            <RoleSelect
              value={selectedRole}
              onChange={setSelectedRole}
              options={[
                { value: 'user', label: ROLE_LABELS.user },
                { value: 'admin', label: ROLE_LABELS.admin },
                { value: 'superuser', label: ROLE_LABELS.superuser },
              ]}
            />
          ) : (
            <span className="inline-flex min-h-[44px] items-center rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-gray-600">
              {ROLE_LABELS[profile.role]}
            </span>
          )}
        </div>
      </div>

      {/* Confirm strip — shown only when role selection differs from saved */}
      {isSuperuser && !isSelf && hasPendingChange && (
        <div className="-mx-4 flex items-center gap-2 border-t border-gray-100 bg-gray-50 px-4 py-2.5">
          <span className="mr-auto text-xs text-gray-700">Ändra roll?</span>
          <button
            type="button"
            onClick={() => setSelectedRole(profile.role)}
            disabled={isSaving}
            className="flex min-h-[32px] cursor-pointer items-center rounded-lg bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Avbryt
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={isSaving}
            className="flex min-h-[32px] cursor-pointer items-center rounded-lg bg-gray-900 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
          >
            {isSaving ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              'Spara'
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const role = useRole()
  const navigate = useNavigate()
  const { settings } = useAppSettings()
  const { addToast } = useToast()

  const {
    data: users,
    isLoading: usersLoading,
    isError: usersError,
  } = useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: listAllUsers,
    enabled: isAdminRole(role),
  })

  const queryClient = useQueryClient()

  const updateSettingsMutation = useMutation({
    mutationFn: updateAppSettings,
    onMutate: async (update) => {
      await queryClient.cancelQueries({ queryKey: APP_SETTINGS_QUERY_KEY })
      const previous = queryClient.getQueryData<AppSettings>(
        APP_SETTINGS_QUERY_KEY
      )
      queryClient.setQueryData<AppSettings>(APP_SETTINGS_QUERY_KEY, (old) =>
        old ? { ...old, ...(update as Partial<AppSettings>) } : old
      )
      return { previous }
    },
    onError: (_err, _update, context) => {
      if (context?.previous) {
        queryClient.setQueryData(APP_SETTINGS_QUERY_KEY, context.previous)
      }
      addToast('Något gick fel. Försök igen.', 'error')
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: APP_SETTINGS_QUERY_KEY })
    },
  })

  const { data: activeLadder } = useQuery({
    queryKey: LADDER_QUERY_KEY,
    queryFn: getActiveLadder,
    enabled: isAdminRole(role),
  })

  const { data: allLadders } = useQuery({
    queryKey: LADDERS_QUERY_KEY,
    queryFn: getAllLadders,
    enabled: isAdminRole(role),
  })

  // Create ladder dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newLadderName, setNewLadderName] = useState('')
  const [isCreatingLadder, setIsCreatingLadder] = useState(false)

  // Complete ladder confirmation state
  const [completingLadderId, setCompletingLadderId] = useState<string | null>(
    null
  )
  const [unplayedMatchCount, setUnplayedMatchCount] = useState<number>(0)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [loadingCompleteForId, setLoadingCompleteForId] = useState<
    string | null
  >(null)
  const [isCompletingLadder, setIsCompletingLadder] = useState(false)

  // Join date state
  const [isSavingJoinDate, setIsSavingJoinDate] = useState(false)

  function openCreateDialog() {
    setNewLadderName(`Stegen ${new Date().getFullYear()}`)
    setShowCreateDialog(true)
  }

  async function handleCreateLadder() {
    const trimmedName = newLadderName.trim()
    if (!trimmedName) return
    setIsCreatingLadder(true)
    try {
      const year = new Date().getFullYear()
      await createLadder(trimmedName, year)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: LADDER_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: LADDERS_QUERY_KEY }),
      ])
      setShowCreateDialog(false)
      addToast('Stege skapad!')
    } catch (err) {
      console.error('Failed to create ladder:', err)
      addToast('Kunde inte skapa stege. Försök igen.', 'error')
    } finally {
      setIsCreatingLadder(false)
    }
  }

  async function handleCompleteLadderClick(ladderId: string) {
    setLoadingCompleteForId(ladderId)
    try {
      const matches = await getLadderMatches(ladderId)
      const unplayed = matches.filter(
        (m) => m.ladderStatus === 'planned'
      ).length
      setUnplayedMatchCount(unplayed)
      setCompletingLadderId(ladderId)
      setShowCompleteConfirm(true)
    } catch (err) {
      console.error('Failed to fetch ladder matches:', err)
      addToast('Kunde inte hämta matcher. Försök igen.', 'error')
    } finally {
      setLoadingCompleteForId(null)
    }
  }

  async function handleConfirmComplete() {
    if (!completingLadderId) return
    setIsCompletingLadder(true)
    try {
      await completeLadder(completingLadderId)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: LADDER_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: LADDERS_QUERY_KEY }),
        queryClient.invalidateQueries({
          queryKey: LADDER_MATCHES_QUERY_KEY(completingLadderId),
        }),
      ])
      setShowCompleteConfirm(false)
      setCompletingLadderId(null)
      addToast('Stegen avslutad')
    } catch (err) {
      console.error('Failed to complete ladder:', err)
      addToast('Kunde inte avsluta stegen. Försök igen.', 'error')
    } finally {
      setIsCompletingLadder(false)
    }
  }

  async function handleSaveJoinDate(dateString: string) {
    if (!activeLadder) return
    setIsSavingJoinDate(true)
    try {
      const date = dateString ? new Date(dateString) : null
      await setLadderJoinDate(activeLadder.id, date)
      await queryClient.invalidateQueries({ queryKey: LADDER_QUERY_KEY })
      addToast('Anmälningsdatum sparat')
    } catch (err) {
      console.error('Failed to save joinOpensAt:', err)
      addToast('Kunde inte spara. Försök igen.', 'error')
    } finally {
      setIsSavingJoinDate(false)
    }
  }

  // Format a Timestamp to a date string for <input type="date">
  function timestampToDateInput(ts: Timestamp | null): string {
    if (!ts) return ''
    const d = ts.toDate()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const isAdmin = isAdminRole(role)
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

  const bannerText = bannerTextOverride ?? settings?.bannerText ?? ''
  const bannerLinkText =
    bannerLinkTextOverride ?? settings?.bannerLinkText ?? ''
  const bannerLinkUrl = bannerLinkUrlOverride ?? settings?.bannerLinkUrl ?? ''

  const completedLadders =
    allLadders?.filter((l) => l.status === 'completed') ?? []

  const hasBannerChanges =
    bannerText !== (settings?.bannerText ?? '') ||
    bannerLinkText !== (settings?.bannerLinkText ?? '') ||
    bannerLinkUrl !== (settings?.bannerLinkUrl ?? '')

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
    try {
      await updateAppSettings({
        bannerText,
        bannerLinkText: bannerLinkText,
        bannerLinkUrl: bannerLinkUrl,
      })
      addToast('Bannertext sparad')
    } catch (err) {
      console.error('Failed to save banner text:', err)
      addToast('Kunde inte spara. Försök igen.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      {/* Create ladder dialog */}
      {showCreateDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreateDialog(false)
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-base font-semibold text-gray-900">
              Skapa ny stege
            </h3>
            <div className="mb-4 space-y-1">
              <label
                htmlFor="new-ladder-name"
                className="block text-sm font-medium text-gray-700"
              >
                Namn
              </label>
              <input
                id="new-ladder-name"
                type="text"
                value={newLadderName}
                onChange={(e) => setNewLadderName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 focus:border-gray-500 focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleCreateLadder()
                  if (e.key === 'Escape') setShowCreateDialog(false)
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateDialog(false)}
                className="min-h-[44px] rounded-lg px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => void handleCreateLadder()}
                disabled={isCreatingLadder || !newLadderName.trim()}
                className="min-h-[44px] cursor-pointer rounded-lg px-4 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ backgroundColor: '#F1E334' }}
              >
                {isCreatingLadder ? 'Skapar…' : 'Skapa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete ladder confirmation dialog */}
      {showCompleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCompleteConfirm(false)
              setCompletingLadderId(null)
            }
          }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-semibold text-gray-900">
              Avsluta stegen?
            </h3>
            {unplayedMatchCount > 0 ? (
              <p className="mb-4 text-sm text-gray-700">
                Det finns{' '}
                <span className="font-semibold text-orange-600">
                  {unplayedMatchCount} ej rapporterade matcher
                </span>
                . Vill du ändå avsluta stegen?
              </p>
            ) : (
              <p className="mb-4 text-sm text-gray-700">
                Är du säker på att du vill avsluta stegen? Åtgärden kan inte
                ångras.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCompleteConfirm(false)
                  setCompletingLadderId(null)
                }}
                disabled={isCompletingLadder}
                className="min-h-[44px] rounded-lg px-4 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmComplete()}
                disabled={isCompletingLadder}
                className="min-h-[44px] cursor-pointer rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              >
                {isCompletingLadder ? 'Avslutar…' : 'Avsluta'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="px-4 py-6">
        <div className="mx-auto max-w-lg space-y-8">
          <SettingsSection title="Bokning">
            <SettingsRow
              label="Bokningsformulär"
              description="Tillåt användare att göra bokningar"
            >
              <Toggle
                id="booking-enabled-toggle"
                checked={settings?.bookingEnabled ?? true}
                onChange={(value) => {
                  updateSettingsMutation.mutate(
                    { bookingEnabled: value },
                    {
                      onSuccess: () =>
                        addToast(
                          value
                            ? 'Bokningar aktiverade'
                            : 'Bokningar inaktiverade'
                        ),
                    }
                  )
                }}
              />
            </SettingsRow>
          </SettingsSection>

          <section className="space-y-3">
            <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-white/70">
              Stegen
            </h2>

            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
              {/* Aktiv stege */}
              <div className="divide-y divide-gray-100">
                <div className="space-y-2 px-4 pt-3 pb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Aktiv stege
                  </h3>
                  <p className="text-xs leading-snug text-gray-600">
                    En aktiv stege i taget. Avsluta den innan du skapar ny.
                  </p>
                </div>
                {activeLadder ? (
                  <div className="mx-4 my-3 overflow-hidden rounded-lg border border-gray-200/80 bg-gray-50 divide-y divide-gray-200/70">
                    <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-gray-900">
                          {activeLadder.name}
                        </p>
                        <span className="inline-flex shrink-0 items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          Aktiv
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void handleCompleteLadderClick(activeLadder.id)
                        }
                        disabled={loadingCompleteForId === activeLadder.id}
                        className="min-h-[36px] w-full shrink-0 cursor-pointer rounded-lg border border-gray-300/90 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50 sm:w-auto"
                      >
                        {loadingCompleteForId === activeLadder.id
                          ? 'Laddar…'
                          : 'Avsluta stegen'}
                      </button>
                    </div>
                    <div className="space-y-2 px-3 py-3 sm:px-4">
                      <p className="text-sm font-medium text-gray-900">
                        Anmälningsstart för {activeLadder.name}
                      </p>
                      <div className="flex items-center gap-2 pt-0.5">
                        <AdminJoinDateField
                          key={activeLadder.id}
                          value={timestampToDateInput(activeLadder.joinOpensAt)}
                          onSelect={(v) => void handleSaveJoinDate(v)}
                          disabled={isSavingJoinDate}
                          saving={isSavingJoinDate}
                        />
                      </div>
                    </div>
                    <div className="flex min-h-[56px] items-center justify-between gap-4 px-3 py-3 sm:px-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          Visa välkomstbanner
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Toggle
                          id="stegen-welcome-banner-toggle"
                          checked={
                            settings?.stegenJoinWelcomeBannerVisible ?? true
                          }
                          onChange={(value) => {
                            updateSettingsMutation.mutate(
                              { stegenJoinWelcomeBannerVisible: value },
                              {
                                onSuccess: () =>
                                  addToast(
                                    value
                                      ? 'Välkomstbanner på steg-sidan visas'
                                      : 'Välkomstbanner på steg-sidan dold'
                                  ),
                              }
                            )
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-gray-600">
                      {allLadders && allLadders.length === 0
                        ? 'Inga stegar skapade ännu.'
                        : 'Ingen aktiv stege just nu.'}
                    </p>
                    <button
                      type="button"
                      onClick={openCreateDialog}
                      className="min-h-[44px] w-full shrink-0 cursor-pointer rounded-lg px-4 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-80 sm:w-auto"
                      style={{ backgroundColor: '#F1E334' }}
                    >
                      Skapa stege
                    </button>
                  </div>
                )}
              </div>

              {/* Avslutade stegar */}
              {completedLadders.length > 0 && (
                <div>
                  <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Avslutade stegar
                    </h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-white">
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">
                          Namn
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">
                          Skapad
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {completedLadders.map((ladder) => (
                        <tr key={ladder.id}>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {ladder.name}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {ladder.createdAt
                              .toDate()
                              .toLocaleDateString('sv-SE')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <SettingsSection title="Banner">
            <SettingsRow label="Visa banner">
              <Toggle
                id="banner-visible-toggle"
                checked={settings?.bannerVisible ?? false}
                onChange={(value) => {
                  updateSettingsMutation.mutate(
                    { bannerVisible: value },
                    {
                      onSuccess: () =>
                        addToast(value ? 'Banner visas nu' : 'Banner dold'),
                    }
                  )
                }}
              />
            </SettingsRow>

            <div className="space-y-2 px-4 py-3">
              <p className="text-sm font-medium text-gray-900">Bannertext</p>
              <textarea
                rows={3}
                value={bannerText}
                onChange={(e) => setBannerTextOverride(e.target.value)}
                placeholder="Skriv ett meddelande…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2 px-4 py-3">
              <p className="text-sm font-medium text-gray-900">
                Länktext{' '}
                <span className="font-normal text-gray-400">Valfri</span>
              </p>
              <input
                type="text"
                value={bannerLinkText}
                onChange={(e) => setBannerLinkTextOverride(e.target.value)}
                placeholder="Läs mer"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2 px-4 py-3">
              <p className="text-sm font-medium text-gray-900">
                Länk-URL{' '}
                <span className="font-normal text-gray-400">Valfri</span>
              </p>
              <input
                type="url"
                value={bannerLinkUrl}
                onChange={(e) => setBannerLinkUrlOverride(e.target.value)}
                placeholder="https://…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-base text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end px-4 py-3">
              <button
                type="button"
                onClick={() => void handleSaveBannerText()}
                disabled={isSaving || !hasBannerChanges}
                className="min-h-[44px] cursor-pointer rounded-lg px-5 py-2 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#F1E334' }}
              >
                {isSaving ? 'Sparar innehåll…' : 'Spara innehåll'}
              </button>
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
    </div>
  )
}
