# Högelids Tennisklubb — Booking App

Court booking app for Högelids Tennisklubb. Frictionless booking for guests (name + email only) and richer features for registered members — booking history, display names on slots, and device-independent cancellation.

---

## Stack

- **React 19** + TypeScript + Vite
- **TanStack Router** (file-based, single route `/`)
- **TanStack Query v5** for all Firestore reads
- **Tailwind CSS v4** — white/neutral base, yellow `#F1E334` accent
- **Firebase** — Auth (email/password) + Firestore
- **Vitest** + Testing Library for unit/integration tests

---

## Install

**Prerequisites:** Node.js 20+, npm

```bash
git clone https://github.com/wictorstenseke/hogelids-tk.git
cd hogelids-tk
npm install
```

### Environment variables

Create `.env.local` in the project root:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Get these values from the Firebase console (project: `hogelids-tk-dev` for staging, `hogelids-tk-prod` for production).

---

## Development

```bash
npm run dev        # Start dev server (http://localhost:5173)
npm run test       # Run tests in watch mode
npm run lint       # ESLint
npm run format     # Prettier
```

## Build & preview

```bash
npm run build      # Type-check + build to /dist
npm run preview    # Preview production build locally
```

---

## Deployment

| Environment | Target                               | How                                                 |
| ----------- | ------------------------------------ | --------------------------------------------------- |
| Staging     | Firebase Hosting (`hogelids-tk-dev`) | Push to `main` — CI deploys automatically           |
| Production  | FTP transfer of `/dist`              | Manual trigger via GitHub Actions `deploy-prod.yml` |

---

## Project structure

```
src/
  routes/           # TanStack Router pages (index, admin, stegen)
  routes/-components/  # Co-located UI components
  services/         # Data layer (BookingService, AuthService, etc.)
  lib/              # Firebase init, dev utilities
docs/               # PRD, MVP scope, resolved design decisions
plans/              # Implementation plan
firestore.rules     # Security rules
```

---

## Key rules

- **No login walls** — auth state controls visibility, never route access
- **Conflict detection** — `hasConflict()` in `BookingService` must be used for all booking validation
- **Swedish UI** — all user-facing strings in `sv-SE`; code and comments stay in English
- **Mobile-first** — native `datetime-local` inputs, 44×44px min touch targets
