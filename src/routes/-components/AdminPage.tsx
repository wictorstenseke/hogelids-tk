import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from '@tanstack/react-router'
import { deleteField, Timestamp } from 'firebase/firestore'
import DatePicker, { registerLocale } from 'react-datepicker'
import { format } from 'date-fns'
import { sv } from 'date-fns/locale'
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconSelector,
} from '@tabler/icons-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import 'react-datepicker/dist/react-datepicker.css'
import { useAuth } from '../../lib/useAuth'
import { useRole } from '../../lib/useRole'
import { isAdminRole } from '../../services/AuthService'
import type { UserProfile, UserRole } from '../../services/AuthService'
import { useAppSettings } from '../../lib/useAppSettings'
import { updateAppSettings } from '../../services/AppSettingsService'
import { useToast } from '../../lib/ToastContext'
import {
  listAllUsers,
  updateUserRole,
  USERS_QUERY_KEY,
} from '../../services/UserService'
import {
  createLadder,
  getActiveLadder,
  LADDER_QUERY_KEY,
} from '../../services/LadderService'
import { DateDisplayInput } from './BookingForm'

registerLocale('sv', sv)

function ladderJoinOpensAtToInputValue(
  ts: Timestamp | null | undefined
): string {
  if (!ts) return ''
  const d = ts.toDate()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function localInputDateToStartOfDay(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

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

// Custom role dropdown — styled to match admin card, touch-friendly.
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
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        !document.getElementById('role-select-dropdown')?.contains(target)
      ) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 6,
        left: rect.right - 140,
      })
    }
  }, [open])

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value

  const dropdown = open && (
    <ul
      id="role-select-dropdown"
      role="listbox"
      className="fixed z-9999 min-w-[140px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      {options.map((opt) => (
        <li key={opt.value} role="option" aria-selected={opt.value === value}>
          <button
            type="button"
            onClick={() => {
              onChange(opt.value)
              setOpen(false)
            }}
            className={[
              'flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-medium transition-colors',
              opt.value === value
                ? 'bg-[#F1E334] text-gray-900'
                : 'text-gray-700 hover:bg-gray-50',
            ].join(' ')}
          >
            <span>{opt.label}</span>
            {opt.value === value && (
              <IconCheck size={18} stroke={2} className="shrink-0" />
            )}
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          'flex min-h-[44px] min-w-[120px] items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors',
          open
            ? 'border-[#F1E334] bg-white ring-2 ring-[#F1E334]/25'
            : 'border-gray-300 bg-gray-50 text-gray-900 hover:border-gray-400 hover:bg-gray-100',
        ].join(' ')}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Roll: ${selectedLabel}`}
      >
        <span>{selectedLabel}</span>
        <IconSelector
          size={18}
          stroke={1.5}
          className={[
            'shrink-0 text-gray-500 transition-transform',
            open && 'rotate-180',
          ].join(' ')}
        />
      </button>
      {dropdown && createPortal(dropdown, document.body)}
    </div>
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

  const { data: activeLadder } = useQuery({
    queryKey: LADDER_QUERY_KEY,
    queryFn: getActiveLadder,
    enabled: isAdminRole(role),
  })

  const [isCreatingLadder, setIsCreatingLadder] = useState(false)

  async function handleCreateLadder() {
    setIsCreatingLadder(true)
    try {
      await createLadder(new Date().getFullYear())
      await queryClient.invalidateQueries({ queryKey: LADDER_QUERY_KEY })
      addToast('Stege skapad!')
    } catch (err) {
      console.error('Failed to create ladder:', err)
      addToast('Kunde inte skapa stege. Försök igen.', 'error')
    } finally {
      setIsCreatingLadder(false)
    }
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
                  void updateAppSettings({ bookingEnabled: value })
                    .then(() =>
                      addToast(
                        value
                          ? 'Bokningar aktiverade'
                          : 'Bokningar inaktiverade'
                      )
                    )
                    .catch((err) => {
                      console.error('Failed to update bookingEnabled:', err)
                      addToast('Kunde inte spara ändringen.', 'error')
                    })
                }}
              />
            </SettingsRow>
          </SettingsSection>

          <SettingsSection title="Stegen">
            <SettingsRow
              label="Visa stegen"
              description="Utmaningsstegen där medlemmar utmanar varandra och byter plats efter matcher"
            >
              <Toggle
                id="ladder-enabled-toggle"
                checked={settings?.ladderEnabled ?? true}
                onChange={(value) => {
                  void updateAppSettings({ ladderEnabled: value })
                    .then(() =>
                      addToast(
                        value ? 'Stegen aktiverad' : 'Stegen inaktiverad'
                      )
                    )
                    .catch((err) => {
                      console.error('Failed to update ladderEnabled:', err)
                      addToast('Kunde inte spara ändringen.', 'error')
                    })
                }}
              />
            </SettingsRow>
            <SettingsRow
              label="Anmälan öppnar"
              description="Stegen kan visas tidigare, men nya medlemmar kan anmäla sig först från detta datum."
            >
              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                <div className="w-full min-w-48 max-w-[min(100%,12rem)]">
                  <DatePicker
                    id="ladder-join-opens-date"
                    selected={
                      settings?.ladderJoinOpensAt
                        ? new Date(
                            `${ladderJoinOpensAtToInputValue(settings.ladderJoinOpensAt)}T12:00:00`
                          )
                        : null
                    }
                    onChange={(date: Date | null) => {
                      if (!date) return
                      void updateAppSettings({
                        ladderJoinOpensAt: Timestamp.fromDate(
                          localInputDateToStartOfDay(format(date, 'yyyy-MM-dd'))
                        ),
                      })
                        .then(() => addToast('Datum för anmälan sparat'))
                        .catch((err) => {
                          console.error(
                            'Failed to update ladderJoinOpensAt:',
                            err
                          )
                          addToast('Kunde inte spara ändringen.', 'error')
                        })
                    }}
                    locale="sv"
                    dateFormat="EEEE d MMMM"
                    placeholderText="Välj datum"
                    autoComplete="off"
                    customInput={
                      <DateDisplayInput
                        appearance="light"
                        aria-label="Anmälan öppnar"
                      />
                    }
                    renderCustomHeader={({
                      date,
                      decreaseMonth,
                      increaseMonth,
                    }) => (
                      <div className="flex items-center justify-between px-3 pb-2">
                        <button
                          type="button"
                          onClick={decreaseMonth}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                        >
                          <IconChevronLeft size={18} stroke={2} />
                        </button>
                        <span className="font-display text-base font-bold uppercase tracking-wide text-gray-900">
                          {date.toLocaleDateString('sv-SE', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={increaseMonth}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                        >
                          <IconChevronRight size={18} stroke={2} />
                        </button>
                      </div>
                    )}
                  />
                </div>
                {settings?.ladderJoinOpensAt != null && (
                  <button
                    type="button"
                    onClick={() => {
                      void updateAppSettings({
                        ladderJoinOpensAt: deleteField(),
                      })
                        .then(() => addToast('Datum för anmälan borttaget'))
                        .catch((err) => {
                          console.error(
                            'Failed to clear ladderJoinOpensAt:',
                            err
                          )
                          addToast('Kunde inte spara ändringen.', 'error')
                        })
                    }}
                    className="min-h-[44px] shrink-0 text-sm font-semibold text-gray-600 underline underline-offset-2 transition-colors hover:text-gray-900"
                  >
                    Ta bort datum
                  </button>
                )}
              </div>
            </SettingsRow>
            {!activeLadder && (
              <SettingsRow
                label="Ingen aktiv stege"
                description="Skapa en stege för att aktivera rankinglistan"
              >
                <button
                  type="button"
                  onClick={() => void handleCreateLadder()}
                  disabled={isCreatingLadder}
                  className="min-h-[44px] cursor-pointer rounded-lg px-4 text-sm font-semibold text-gray-900 transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: '#F1E334' }}
                >
                  {isCreatingLadder ? 'Skapar…' : 'Skapa stege'}
                </button>
              </SettingsRow>
            )}
          </SettingsSection>

          <SettingsSection title="Banner">
            <SettingsRow label="Visa banner">
              <Toggle
                id="banner-visible-toggle"
                checked={settings?.bannerVisible ?? false}
                onChange={(value) => {
                  void updateAppSettings({ bannerVisible: value })
                    .then(() =>
                      addToast(value ? 'Banner visas nu' : 'Banner dold')
                    )
                    .catch((err) => {
                      console.error('Failed to update bannerVisible:', err)
                      addToast('Kunde inte spara ändringen.', 'error')
                    })
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none"
              />
            </div>

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
