import { useEffect, useRef, useState } from 'react'

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

function getNearestSlotIndex(): number {
  const now = new Date()
  const totalMins = now.getHours() * 60 + now.getMinutes()
  return Math.round(totalMins / 15) % TIME_SLOTS.length
}

interface TimeSelectProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function TimeSelect({
  value,
  onChange,
  placeholder = 'Välj tid',
  className = '',
}: TimeSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

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
    'w-full min-h-[44px] rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#F1E334]/30'

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${baseInputClass} ${
          open
            ? 'border-[#F1E334] ring-2 ring-[#F1E334]/30'
            : 'text-gray-900 hover:border-gray-300'
        }`}
      >
        {value ? (
          <span className="text-gray-900">{value}</span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </button>

      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full overflow-y-auto rounded-xl border border-gray-100 bg-white shadow-lg"
          style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT }}
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
                {slot}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
