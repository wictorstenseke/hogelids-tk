import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { IconX } from '@tabler/icons-react'
import { overlayCloseDelayMs } from '../../lib/overlayCloseDelay'

const DRAG_CLOSE_THRESHOLD_PX = 80

/** Mobile `max-h-*` + desktop `sm:max-h-*` — keep in sync per variant */
const MAX_HEIGHT_BY_VARIANT = {
  default: 'max-h-[85vh] sm:max-h-[min(85vh,32rem)]',
  tall: 'max-h-[85vh] sm:max-h-[min(85vh,40rem)]',
  short: 'max-h-[85vh] sm:max-h-[min(85vh,28rem)]',
  /** QR + copy — extra room on small screens and desktop */
  swish: 'max-h-[92vh] sm:max-h-[min(92vh,44rem)]',
} as const

export type SheetDialogMaxHeightVariant = keyof typeof MAX_HEIGHT_BY_VARIANT

const DIALOG_MAX_WIDTH: Record<'md' | 'lg', string> = {
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
}

export interface SheetDialogShellProps {
  titleId: string
  title: ReactNode
  onClose: () => void
  children: ReactNode
  /** Scrollable body; use for long content */
  scrollBody?: boolean
  maxHeightVariant?: SheetDialogMaxHeightVariant
  /** Desktop modal width (mobile sheet is always full width) */
  dialogMaxWidth?: keyof typeof DIALOG_MAX_WIDTH
}

export function SheetDialogShell({
  titleId,
  title,
  onClose,
  children,
  scrollBody = true,
  maxHeightVariant = 'default',
  dialogMaxWidth = 'md',
}: SheetDialogShellProps) {
  const [visible, setVisible] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startPointerY = useRef(0)
  const dragStartOffset = useRef(0)
  const dragging = useRef(false)
  const dragYRef = useRef(0)

  useEffect(() => {
    dragYRef.current = dragY
  }, [dragY])

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(id)
      document.body.style.overflow = ''
    }
  }, [])

  const dismissTo = useCallback((action: () => void) => {
    setVisible(false)
    setDragY(0)
    setIsDragging(false)
    dragging.current = false
    setTimeout(action, overlayCloseDelayMs(640))
  }, [])

  const handleClose = useCallback(() => {
    dismissTo(onClose)
  }, [dismissTo, onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismissTo(onClose)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismissTo, onClose])

  function endDrag() {
    dragging.current = false
    setIsDragging(false)
    if (dragYRef.current > DRAG_CLOSE_THRESHOLD_PX) {
      handleClose()
    } else {
      setDragY(0)
    }
  }

  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragging.current = true
    setIsDragging(true)
    startPointerY.current = e.clientY
    dragStartOffset.current = dragYRef.current
  }

  function onHandlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    const delta = e.clientY - startPointerY.current
    const next = Math.max(0, dragStartOffset.current + delta)
    setDragY(next)
  }

  function onHandlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    endDrag()
  }

  function onHandlePointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    endDrag()
  }

  const maxH = MAX_HEIGHT_BY_VARIANT[maxHeightVariant]
  const maxWidthClass = DIALOG_MAX_WIDTH[dialogMaxWidth]

  const sheetTransformStyle =
    dragY > 0 ? ({ transform: `translateY(${dragY}px)` } as const) : undefined

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 motion-reduce:backdrop-blur-none sm:duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={[
          'fixed z-50 flex min-h-0 flex-col bg-white shadow-2xl',
          maxH,
          'bottom-0 left-0 right-0 rounded-t-3xl',
          isDragging
            ? 'transition-none'
            : 'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          visible
            ? 'translate-y-0 sm:opacity-100'
            : 'translate-y-full sm:opacity-0',
          'sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2',
          'sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl',
          maxWidthClass,
          'sm:transition-opacity sm:duration-150 sm:ease-out',
        ].join(' ')}
        style={sheetTransformStyle}
      >
        {/* Mobile: drag handle — hidden on sm+ where dialog is centered */}
        <div className="shrink-0 sm:hidden">
          <div
            role="button"
            tabIndex={0}
            aria-label="Dra nedåt för att stänga"
            className="flex w-full cursor-grab touch-none flex-col items-center pt-3 pb-2 active:cursor-grabbing"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerCancel}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleClose()
              }
            }}
          >
            <span className="h-1 w-10 shrink-0 rounded-full bg-gray-300" />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 pb-6 pt-2 sm:px-6 sm:pb-6 sm:pt-5">
          <div className="mb-4 flex shrink-0 items-center justify-between gap-3 sm:mb-4">
            <h2
              id={titleId}
              className="font-display text-[18px] font-bold uppercase tracking-wide text-gray-900"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Stäng"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
            >
              <IconX size={18} stroke={2} />
            </button>
          </div>

          {scrollBody ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-0.5 [-webkit-overflow-scrolling:touch]">
              {children}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </>
  )
}
