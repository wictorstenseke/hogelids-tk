import type { ReactNode } from 'react'

interface GlassNoticeCardProps {
  children: ReactNode
  /** Optional footer row (link, button) with a distinct background shade */
  action?: ReactNode
}

export function GlassNoticeCard({ children, action }: GlassNoticeCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/20 bg-white/10 text-left text-sm text-white">
      {children}
      {action != null ? (
        <div className="border-t border-white/10 bg-white/15">{action}</div>
      ) : null}
    </div>
  )
}
