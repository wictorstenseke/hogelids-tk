/**
 * Milliseconds to wait after setVisible(false) before unmounting overlay UIs.
 * Desktop modals use a short opacity fade (150ms); mobile uses a 300ms slide.
 */
export function overlayCloseDelayMs(desktopBreakpoint: 640 | 768): number {
  if (typeof window === 'undefined') return 280
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 50
  const mq =
    desktopBreakpoint === 768 ? '(min-width: 768px)' : '(min-width: 640px)'
  return window.matchMedia(mq).matches ? 170 : 280
}
