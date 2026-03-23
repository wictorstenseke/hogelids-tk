import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

const ITEM_HEIGHT = 40
const VISIBLE_ITEMS = 8

function generateTimeSlots(): string[] {
  const slots: string[] = []
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return slots
}

const TIME_SLOTS = generateTimeSlots()

/** Show HH.mm while values stay HH:mm for Date parsing. */
function slotDisplayLabel(slot: string): string {
  return slot.replace(':', '.')
}

function getNearestSlotIndex(): number {
  const now = new Date()
  const totalMins = now.getHours() * 60 + now.getMinutes()
  return Math.round(totalMins / 15) % TIME_SLOTS.length
}

export type TimeSelectAppearance = 'green' | 'light'

interface TimeSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  /** `light` = dark text on white (e.g. dialog). Dropdown uses a portal so it is not clipped by scroll parents. */
  appearance?: TimeSelectAppearance
}

export function TimeSelect({
  value,
  onChange,
  placeholder = 'Välj tid',
  className = '',
  appearance = 'green',
}: TimeSelectProps) {
  const [open, setOpen] = useState(false)
  const [listPosition, setListPosition] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const updateListPosition = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setListPosition({
      top: r.bottom + 4,
      left: r.left,
      width: r.width,
    })
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (containerRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useLayoutEffect(() => {
    if (!open) {
      return
    }
    updateListPosition()
    window.addEventListener('scroll', updateListPosition, true)
    window.addEventListener('resize', updateListPosition)
    return () => {
      window.removeEventListener('scroll', updateListPosition, true)
      window.removeEventListener('resize', updateListPosition)
    }
  }, [open, updateListPosition])

  useEffect(() => {
    if (!open || !listRef.current) return
    const targetIndex = value
      ? TIME_SLOTS.indexOf(value)
      : getNearestSlotIndex()
    if (targetIndex >= 0) {
      listRef.current.scrollTop =
        targetIndex * ITEM_HEIGHT - Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT
    }
  }, [open, value])

  function handleSelect(slot: string) {
    onChange(slot)
    setOpen(false)
  }

  const baseInputClass =
    appearance === 'light'
      ? 'w-full min-h-[44px] rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left text-sm text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-[#F1E334]/40'
      : 'w-full min-h-[44px] rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30'

  const openRing =
    appearance === 'light'
      ? 'border-[#F1E334] ring-2 ring-[#F1E334]/40'
      : 'border-[#F1E334] ring-2 ring-[#F1E334]/30'

  const idleHover =
    appearance === 'light' ? 'hover:border-gray-300' : 'hover:border-white/40'

  const valueClass = appearance === 'light' ? 'text-gray-900' : 'text-white'
  const placeholderClass =
    appearance === 'light' ? 'text-gray-400' : 'text-white/40'

  const listEl =
    open && listPosition ? (
      <ul
        ref={listRef}
        className="fixed z-100 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg"
        style={{
          top: listPosition.top,
          left: listPosition.left,
          width: listPosition.width,
          height: VISIBLE_ITEMS * ITEM_HEIGHT,
        }}
      >
        {TIME_SLOTS.map((slot) => (
          <li key={slot}>
            <button
              type="button"
              onClick={() => handleSelect(slot)}
              className={`w-full px-4 text-left text-sm transition-colors ${
                slot === value
                  ? 'bg-[#F1E334] font-semibold text-gray-900'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              style={{ height: ITEM_HEIGHT }}
            >
              {slotDisplayLabel(slot)}
            </button>
          </li>
        ))}
      </ul>
    ) : null

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${baseInputClass} ${open ? openRing : idleHover}`}
      >
        {value ? (
          <span className={valueClass}>{slotDisplayLabel(value)}</span>
        ) : (
          <span className={placeholderClass}>{placeholder}</span>
        )}
      </button>

      {typeof document !== 'undefined' && listEl
        ? createPortal(listEl, document.body)
        : null}
    </div>
  )
}
