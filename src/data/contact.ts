export const CONTACT_INTRO =
  'Har du frågor om medlemskap eller andra frågor går det bra att kontakta nedanstående.'

export interface ContactEntry {
  role: string
  name: string
  /** Display format with spaces */
  phoneDisplay: string
  /** E.164-style for tel: href */
  telHref: string
}

export const CONTACT_ENTRIES: ContactEntry[] = [
  {
    role: 'Ordförande',
    name: 'Albin Andreasson',
    phoneDisplay: '073 - 646 37 15',
    telHref: 'tel:+46736463715',
  },
  {
    role: 'Banansvarig',
    name: 'Carl Quint',
    phoneDisplay: '073 - 096 28 10',
    telHref: 'tel:+46730962810',
  },
  {
    role: 'Hemsidan',
    name: 'Wictor Stenseke',
    phoneDisplay: '076 - 899 54 35',
    telHref: 'tel:+46768995435',
  },
]
