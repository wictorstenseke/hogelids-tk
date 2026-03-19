import { IconExternalLink } from '@tabler/icons-react'
import type { AppSettings } from '../../services/AppSettingsService'

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
    <div
      className="overflow-hidden rounded-xl text-sm text-gray-800"
      style={{ backgroundColor: '#F1E334' }}
    >
      <p className="px-4 py-3">{settings.bannerText}</p>
      {hasLink && (
        <a
          href={settings.bannerLinkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 font-semibold underline underline-offset-2 transition-opacity hover:opacity-70"
          style={{ backgroundColor: '#E5D82C' }}
        >
          {linkLabel}
          <IconExternalLink size={16} stroke={2} className="shrink-0" />
        </a>
      )}
    </div>
  )
}
