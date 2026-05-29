import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconCheck, IconChevronDown, IconSearch } from '@tabler/icons-react'

export interface MenuSelectOption {
  value: string
  label: string
}

interface MenuSelectProps {
  value: string
  onChange: (value: string) => void
  options: MenuSelectOption[]
  /** Shown on the trigger for assistive tech, e.g. `Roll: Admin` or `Välj stege` */
  ariaLabel: string
  /** Extra classes on the outer wrapper (e.g. `min-w-0 flex-1`) */
  className?: string
  /** Extra classes merged onto the trigger button */
  triggerClassName?: string
  /** Placeholder text shown on the trigger when value is `''` */
  placeholder?: string
  /** Render a filter input at the top of the listbox */
  searchable?: boolean
  /** Placeholder for the search input (default: "Sök") */
  searchPlaceholder?: string
  /** Shown when the filter matches no options (default: "Inga träffar") */
  emptyLabel?: string
  onOpenChange?: (open: boolean) => void
}

/**
 * Button + portal listbox — same pattern as admin user role picker; touch-friendly.
 */
export function MenuSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className = '',
  triggerClassName = '',
  placeholder,
  searchable = false,
  searchPlaceholder = 'Sök',
  emptyLabel = 'Inga träffar',
  onOpenChange,
}: MenuSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  /** Keep list mounted briefly after close so exit transition can run */
  const [panelRendered, setPanelRendered] = useState(false)
  const [panelVisible, setPanelVisible] = useState(false)
  /** top/left/width for list; tw = trigger width (min width for list + rows) */
  const [menuLayout, setMenuLayout] = useState({
    top: 0,
    left: 0,
    width: 0,
    tw: 0,
  })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()

  const PANEL_MS = 200

  useEffect(() => {
    onOpenChange?.(open)
    if (open) {
      // Two-phase mount: render list, then enable clip-path animation (see rAF below).
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional animation mount sequence
      setPanelRendered(true)
      let innerRaf: number | undefined
      const outerRaf = requestAnimationFrame(() => {
        innerRaf = requestAnimationFrame(() => setPanelVisible(true))
      })
      return () => {
        cancelAnimationFrame(outerRaf)
        if (innerRaf !== undefined) cancelAnimationFrame(innerRaf)
      }
    }
    setPanelVisible(false)
    setQuery('')
    const t = window.setTimeout(() => setPanelRendered(false), PANEL_MS)
    return () => clearTimeout(t)
  }, [open, onOpenChange])

  useEffect(() => {
    if (open && searchable && panelVisible) {
      searchInputRef.current?.focus()
    }
  }, [open, searchable, panelVisible])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        listRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClick)
      document.addEventListener('keydown', handleKey)
    }
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const tr = triggerRef.current.getBoundingClientRect()
    const tw = Math.max(tr.width, 140)
    const top = tr.bottom + 6
    const vw = window.innerWidth
    const margin = 8
    const maxW = vw - margin * 2

    if (!panelVisible || !listRef.current) {
      setMenuLayout((prev) => ({
        top,
        left: tr.left,
        width: prev.width >= tw ? prev.width : tw,
        tw,
      }))
      return
    }

    const list = listRef.current
    list.style.minWidth = `${tw}px`
    list.style.width = 'auto'
    list.style.maxWidth = `${maxW}px`

    const buttons = list.querySelectorAll('button')
    let maxInner = tw
    buttons.forEach((btn) => {
      const el = btn as HTMLElement
      el.style.width = 'max-content'
      maxInner = Math.max(maxInner, el.offsetWidth, el.scrollWidth)
    })
    const width = Math.min(Math.max(maxInner, tw), maxW)

    list.style.width = ''
    list.style.minWidth = ''
    list.style.maxWidth = ''
    buttons.forEach((btn) => {
      ;(btn as HTMLElement).style.width = ''
    })

    let left = tr.left
    if (left + width > vw - margin) {
      left = Math.max(margin, vw - margin - width)
    }

    setMenuLayout({ top, left, width, tw })
  }, [open, panelVisible, options, query])

  const selectedLabel = options.find((o) => o.value === value)?.label
  const triggerLabel = selectedLabel ?? placeholder ?? value
  const showPlaceholder = !selectedLabel && !!placeholder

  const filteredOptions = searchable
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.trim().toLowerCase())
      )
    : options

  const dropdown = panelRendered && (
    <ul
      ref={listRef}
      id={listboxId}
      role="listbox"
      className={[
        'fixed z-9999 max-h-[min(22rem,calc(100vh-6rem))] overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200 bg-white shadow-lg',
        'will-change-[clip-path]',
        panelVisible ? 'pointer-events-auto' : 'pointer-events-none',
      ].join(' ')}
      style={{
        top: menuLayout.top,
        left: menuLayout.left,
        width:
          menuLayout.width > 0
            ? menuLayout.width
            : menuLayout.tw > 0
              ? menuLayout.tw
              : undefined,
        minWidth: menuLayout.tw > 0 ? menuLayout.tw : undefined,
        clipPath: panelVisible ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)',
        transition: 'clip-path 200ms ease-out',
      }}
    >
      {searchable && (
        <li
          role="presentation"
          className="sticky top-0 z-10 border-b border-gray-100 bg-white px-2 py-2"
        >
          <div className="relative">
            <IconSearch
              size={16}
              stroke={1.75}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full min-h-[36px] rounded-lg border border-gray-200 bg-gray-50 pl-8 pr-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#F1E334] focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30"
              aria-label={searchPlaceholder}
            />
          </div>
        </li>
      )}
      {filteredOptions.length === 0 && searchable && (
        <li
          role="presentation"
          className="px-4 py-3 text-sm text-gray-500"
          aria-live="polite"
        >
          {emptyLabel}
        </li>
      )}
      {filteredOptions.map((opt) => (
        <li key={opt.value} role="option" aria-selected={opt.value === value}>
          <button
            type="button"
            onClick={() => {
              onChange(opt.value)
              setOpen(false)
            }}
            className={[
              'flex w-full min-w-0 items-center justify-between gap-2 px-4 py-2.5 text-left text-sm font-medium transition-colors',
              opt.value === value
                ? 'bg-[#F1E334] text-gray-900'
                : 'text-gray-700 hover:bg-gray-50',
            ].join(' ')}
          >
            <span className="min-w-0 wrap-break-word">{opt.label}</span>
            {/* Same width for every row so width measurement includes the check column */}
            <span
              className="flex h-[18px] w-[18px] shrink-0 items-center justify-center"
              aria-hidden
            >
              {opt.value === value ? (
                <IconCheck size={18} stroke={2} className="shrink-0" />
              ) : (
                <span className="block h-[18px] w-[18px]" />
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )

  return (
    <div className={['relative', className].filter(Boolean).join(' ')}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          'flex min-h-[44px] min-w-[120px] w-auto max-w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors',
          open
            ? 'border-[#F1E334] bg-white ring-2 ring-[#F1E334]/25'
            : 'border-gray-300 bg-gray-50 text-gray-900 hover:border-gray-400 hover:bg-gray-100',
          triggerClassName,
        ].join(' ')}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
      >
        <span
          className={[
            'min-w-0 truncate',
            showPlaceholder ? 'text-gray-400 font-normal' : '',
          ].join(' ')}
        >
          {triggerLabel}
        </span>
        <IconChevronDown
          size={18}
          stroke={1.5}
          className={[
            'shrink-0 text-current transition-transform duration-200',
            open && 'rotate-180',
          ].join(' ')}
          aria-hidden
        />
      </button>
      {dropdown && createPortal(dropdown, document.body)}
    </div>
  )
}
