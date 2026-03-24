import { useState } from 'react'
import { IconExternalLink } from '@tabler/icons-react'
import { MEMBERSHIP_FEE_SEK } from '../../data/club'
import { AboutClubSheetDialog } from './AboutClubSheetDialog'
import { ChangelogSheetDialog } from './ChangelogSheetDialog'
import { ContactSheetDialog } from './ContactSheetDialog'
import { MembershipSwishDialog } from './MembershipSwishDialog'

export function Footer() {
  const year = new Date().getFullYear()
  const [aboutClubOpen, setAboutClubOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [changelogOpen, setChangelogOpen] = useState(false)
  const [swishDialogOpen, setSwishDialogOpen] = useState(false)

  return (
    <footer className="bg-[#164a2a]">
      <div className="mx-auto max-w-lg px-4 py-10 md:max-w-3xl">
        {/* Brand: full width above columns so layout stays balanced */}
        <div className="mb-8 flex flex-row flex-wrap items-center justify-start gap-3">
          <img
            src="/htk-logo.svg"
            alt=""
            className="h-11 w-auto shrink-0 opacity-90 sm:h-12"
          />
          <span className="font-display text-[20px] font-bold uppercase tracking-wide text-white">
            Högelids Tennisklubb
          </span>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 sm:gap-12">
          {/* Left: Club info */}
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-0.5">
                Adress
              </p>
              <a
                href="https://maps.app.goo.gl/GDM1qGZeM9viZgrj8"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-white/70 transition-colors hover:text-white hover:underline underline-offset-2"
                aria-label="Öppna adress i Google Maps"
              >
                <span className="block">Siene, Högelid 1</span>
                <span className="block">447 95 Vårgårda</span>
              </a>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-0.5">
                Medlemskap
              </p>
              <p className="text-sm text-white/70">
                {MEMBERSHIP_FEE_SEK} kr per år — öppen för alla
              </p>
              <button
                type="button"
                onClick={() => setSwishDialogOpen(true)}
                className="mt-2 text-left text-sm font-medium text-white/55 underline-offset-2 transition-colors hover:text-white hover:underline"
              >
                Visa Swish-nummer
              </button>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-0.5">
              Övrigt
            </p>
            <ul className="flex flex-col gap-0 sm:gap-2">
              <li>
                <button
                  type="button"
                  onClick={() => setAboutClubOpen(true)}
                  className="flex w-full cursor-pointer items-center py-2 text-left text-sm leading-snug text-white/70 transition-colors hover:text-white hover:underline underline-offset-2 sm:py-0.5"
                >
                  Om klubben
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="flex w-full cursor-pointer items-center py-2 text-left text-sm leading-snug text-white/70 transition-colors hover:text-white hover:underline underline-offset-2 sm:py-0.5"
                >
                  Kontakt
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setChangelogOpen(true)}
                  className="flex w-full cursor-pointer items-center py-2 text-left text-sm leading-snug text-white/70 transition-colors hover:text-white hover:underline underline-offset-2 sm:py-0.5"
                >
                  Senaste uppdateringar
                </button>
              </li>
              <li>
                <a
                  href="https://github.com/wictorstenseke/hogelids-tk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center gap-1.5 py-2 text-sm leading-snug text-white/70 transition-colors hover:text-white hover:underline underline-offset-2 sm:py-0.5"
                >
                  <span>GitHub</span>
                  <IconExternalLink
                    size={15}
                    className="shrink-0 text-white/45"
                    aria-hidden
                  />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-white/10 pt-6">
          <p className="text-center text-xs text-white/35">
            © {year} Högelids Tennisklubb
          </p>
        </div>
      </div>

      {aboutClubOpen ? (
        <AboutClubSheetDialog onClose={() => setAboutClubOpen(false)} />
      ) : null}
      {contactOpen ? (
        <ContactSheetDialog onClose={() => setContactOpen(false)} />
      ) : null}
      {changelogOpen ? (
        <ChangelogSheetDialog onClose={() => setChangelogOpen(false)} />
      ) : null}
      {swishDialogOpen ? (
        <MembershipSwishDialog onClose={() => setSwishDialogOpen(false)} />
      ) : null}
    </footer>
  )
}
