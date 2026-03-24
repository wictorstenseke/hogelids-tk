export interface ChangelogEntry {
  date: string
  description: string
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: 'v2.0 · Mar 2026',
    description:
      'Steg och bokning i samma app — enklare att boka bana och följa stegen på ett ställe. Teknik: React, TypeScript, Vite, TanStack Router & Query, Tailwind, Firebase (Auth + Firestore).',
  },
  {
    date: 'v1.5 · Apr 2025',
    description: `Inför säsongen 2025 lanserade vi stege.hogelidstennis.se där Tennis Stege kördes — en mobilanpassad webbapp för tennisklubbar och grupper: skapa stegar, gå med med kod, lägg till spelare, skapa utmaningar, rapportera resultat och följa tabell och statistik – utan vanliga användarkonton. Gränssnittet är på svenska. Ingen koppling fanns mellan bokningssidan (v1.0) och stegen — båda fick skötas separat.

Tech stack: React 18 · TypeScript · Vite · Tailwind CSS · React Router · Firebase (Firestore) · react-hook-form · i18next · date-fns / react-datepicker · react-icons · Jest & Testing Library · ESLint.`,
  },
  {
    date: 'v1.0 · 2017',
    description:
      'Högelids Tennisklubbs första bokningssystem, utan inloggning och användarkonton. Stack: Laravel, Blade, Bootstrap (Sass), Gulp.',
  },
]
