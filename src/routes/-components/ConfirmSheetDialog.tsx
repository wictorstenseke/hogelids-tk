import { useCallback, useEffect, useRef, useState } from 'react'
import { IconX } from '@tabler/icons-react'
import { overlayCloseDelayMs } from '../../lib/overlayCloseDelay'

interface ConfirmSheetDialogProps {
  title: string
  description: string
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
  confirmDanger?: boolean
  /** For aria-labelledby */
  titleId: string
}

export function ConfirmSheetDialog({
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  confirmDanger = false,
  titleId,
}: ConfirmSheetDialogProps) {
  const [visible, setVisible] = useState(false)
  const dragStartY = useRef<number | null>(null)
  const [dragOffset, setDragOffset] = useState(0)

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
    setTimeout(action, overlayCloseDelayMs(640))
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismissTo(onCancel)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismissTo, onCancel])

  function handleCancel() {
    dismissTo(onCancel)
  }

  function handleConfirm() {
    dismissTo(onConfirm)
  }

  function onTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0]?.clientY ?? null
  }

  function onTouchMove(e: React.TouchEvent) {
    if (dragStartY.current === null) return
    const delta = (e.touches[0]?.clientY ?? 0) - dragStartY.current
    setDragOffset(Math.max(0, delta))
  }

  function onTouchEnd() {
    if (dragOffset > 100) {
      handleCancel()
    } else {
      setDragOffset(0)
    }
    dragStartY.current = null
  }

  const panelStyle =
    dragOffset > 0
      ? { transform: `translateY(${dragOffset}px)`, transition: 'none' }
      : undefined

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 motion-reduce:backdrop-blur-none sm:duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleCancel}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={panelStyle}
        className={[
          'fixed z-50 bg-white shadow-2xl',
          'bottom-0 left-0 right-0 rounded-t-3xl',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          visible
            ? 'translate-y-0 sm:opacity-100'
            : 'translate-y-full sm:opacity-0',
          'sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2',
          'sm:-translate-x-1/2 sm:-translate-y-1/2',
          'sm:w-full sm:max-w-sm sm:rounded-2xl',
          'sm:transition-opacity sm:duration-150 sm:ease-out',
        ].join(' ')}
      >
        <div
          className="sm:hidden pt-3 pb-1 flex flex-col items-center cursor-grab active:cursor-grabbing"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <div className="px-5 pb-8 pt-3 sm:px-6 sm:py-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2
              id={titleId}
              className="font-display text-[18px] font-bold uppercase tracking-wide text-gray-900"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={handleCancel}
              aria-label="Stäng"
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800"
            >
              <IconX size={18} stroke={2} />
            </button>
          </div>

          <p className="text-sm text-gray-600">{description}</p>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="min-h-[44px] w-full cursor-pointer rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 sm:w-auto"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`min-h-[44px] w-full cursor-pointer rounded-lg px-4 text-sm font-semibold text-white transition-colors sm:w-auto ${
                confirmDanger
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gray-900 hover:bg-gray-700'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
