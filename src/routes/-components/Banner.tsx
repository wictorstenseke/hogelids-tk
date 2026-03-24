import { IconExternalLink } from '@tabler/icons-react'
import type { AppSettings } from '../../services/AppSettingsService'
import { GlassNoticeCard } from './GlassNoticeCard'

interface BannerProps {
  settings: AppSettings
}

// Renders an info banner when bannerVisible is true.
// Renders nothing when bannerVisible is false.
export function Banner({ settings }: BannerProps) {
  if (!settings.bannerVisible) return null

  const hasLink = settings.bannerLinkUrl && settings.bannerLinkUrl.trim() !== ''
  const linkLabel =
    settings.bannerLinkText?.trim() || settings.bannerLinkUrl || ''

  return (
    <GlassNoticeCard
      action={
        hasLink ? (
          <a
            href={settings.bannerLinkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[44px] w-full items-center justify-start gap-2 px-6 py-2.5 font-semibold text-white underline underline-offset-2 transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
          >
            {linkLabel}
            <IconExternalLink size={16} stroke={2} className="shrink-0" />
          </a>
        ) : undefined
      }
    >
      <p className="px-6 py-4 text-white/90">{settings.bannerText}</p>
    </GlassNoticeCard>
  )
}
