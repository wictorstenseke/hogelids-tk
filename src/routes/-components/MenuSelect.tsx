import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconCheck, IconChevronDown } from '@tabler/icons-react'

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
}: MenuSelectProps) {
  const [open, setOpen] = useState(false)
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
  const listboxId = useId()

  const PANEL_MS = 200

  useEffect(() => {
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
    const t = window.setTimeout(() => setPanelRendered(false), PANEL_MS)
    return () => clearTimeout(t)
  }, [open])

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
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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
  }, [open, panelVisible, options])

  const selectedLabel = options.find((o) => o.value === value)?.label ?? value

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
      {options.map((opt) => (
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
        <span className="min-w-0 truncate">{selectedLabel}</span>
        <IconChevronDown
          size={18}
          stroke={1.5}
          className={[
            'shrink-0 text-gray-500 transition-transform duration-200',
            open && 'rotate-180',
          ].join(' ')}
          aria-hidden
        />
      </button>
      {dropdown && createPortal(dropdown, document.body)}
    </div>
  )
}
