import type { AppSettings } from '../../services/AppSettingsService'

interface BannerProps {
  settings: AppSettings
}

// Renders an info banner when bannerVisible is true.
// Renders nothing when bannerVisible is false.
export function Banner({ settings }: BannerProps) {
  if (!settings.bannerVisible) return null

  const hasLink =
    settings.bannerLinkText &&
    settings.bannerLinkUrl &&
    settings.bannerLinkText.trim() !== '' &&
    settings.bannerLinkUrl.trim() !== ''

  return (
    <div
      className="rounded-xl px-4 py-3 text-sm text-gray-800"
      style={{ backgroundColor: '#F1E334' }}
    >
      <p>
        {settings.bannerText}
        {hasLink && (
          <>
            {' '}
            <a
              href={settings.bannerLinkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              {settings.bannerLinkText}
            </a>
          </>
        )}
      </p>
    </div>
  )
}
