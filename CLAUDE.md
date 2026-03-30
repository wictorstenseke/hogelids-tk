# CLAUDE.md

Guidelines for Claude Code when working in this repository.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Type-check + build
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier format
npm run format:check # Prettier check (used in CI)
npm run test         # Run Vitest in watch mode
npm run test:run     # Run Vitest once (used in CI)
npm run preview      # Preview production build locally
```

## Architecture

- **UI**: React 19 with functional components and hooks
- **Routing**: TanStack Router (file-based, single route `/`) — route tree is auto-generated, do not edit `routeTree.gen.ts`
- **Data fetching**: TanStack Query v5 — all Firestore reads go through `useQuery`; use `BOOKINGS_QUERY_KEY` from `BookingService` for cache consistency
- **Styling**: Tailwind CSS v4 — use utility classes, no custom CSS unless necessary. Brand: white/neutral background, yellow `#F1E334` accent, clean sans-serif, Swedish locale
- **Firebase**: Auth + Firestore only. No Firebase Hosting, Storage, or Functions in MVP.
- **Guest state**: localStorage only — never call Firebase for guest session data. Use `htk_guest_email` and `htk_guest_name` keys.

## Key Constraints

- **Mobile-first**: Native `datetime-local` inputs for date/time — do not use custom pickers. Touch targets min 44×44px.
- **No login walls**: Auth state drives what's visible and what actions are permitted — never block a route or page behind auth.
- **Single page**: Everything lives on `/`. No sub-routes. Sections (upcoming, history, profile) are conditional renders, not routes. **Exception**: admin routes (`/admin` and future admin sub-routes) are real TanStack Router routes — this is intentional.
- **Swedish UI**: All user-facing strings are in Swedish (`sv-SE` locale for date/time formatting). Code, comments, and variable names stay in English.
- **Conflict detection**: `hasConflict(bookings, start, end)` is a pure function in `BookingService` — use it for both inline validation and pre-write guard. Never allow overlapping bookings to be written.

## Firebase

- **Config**: Read from `VITE_FIREBASE_*` env vars — stored in `.env.local` locally, GitHub Actions secrets for CI/build
- **Auth**: Email/password. Persistent sessions by default. Email verification required but non-blocking — show discrete banner.
- **Firestore collections**:
  - `bookings` — all bookings (guests + members). Key fields: `type: 'guest'|'member'`, `ownerEmail`, `ownerUid` (null for guests), `ownerDisplayName`, `startTime`, `endTime`, `createdAt`
  - `users/{uid}` — member profiles: `email`, `displayName`, `phone`, `createdAt`
- **Document IDs**: Always Firestore auto-IDs. The `id` field on a `BookingWithId` object comes from `doc.id` on the snapshot — it is NOT stored in the document body.
- **Security rules**: Guest bookings (`type: 'guest'`) can be deleted by anyone. Member bookings can only be deleted by the matching `ownerUid`.

## localStorage Keys

| Key                 | Purpose                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `htk_guest_email`   | Guest's email — used to identify own bookings ("Din bokning") and prefill the booking form |
| `htk_guest_name`    | Guest's display name — used to prefill the booking form                                    |
| `htk_booking_count` | Guest booking count — used to determine when to show the nudge prompt                      |
| `htk_query_cache`   | TanStack Query persisted cache — survives page refreshes; maxAge 7 days                    |

Never access localStorage directly in components. Read/write through the `GuestSession` module (Phase 2+).

## Cancellation Rules

- Any user (guest or member) can delete any **guest** booking
- Members can delete their own **member** bookings from any device
- Members cannot delete other members' bookings
- These rules must be reflected in both Firestore security rules and UI delete button visibility

## File Conventions

- Routes live in `src/routes/` — TanStack Router file-based convention
- Components co-located with routes in `src/routes/-components/`
- Services (data layer, no React) in `src/services/`
- Firebase init in `src/lib/firebase.ts`
- Dev-only utilities in `src/lib/` (e.g. `seed.ts`)
- Tests co-located with the file they test (`*.test.tsx`)

## Project Docs

- `docs/mvp-scope.md` — resolved product decisions and feature scope
- `docs/prd.md` — full PRD with user stories, data model, and testing decisions
- `plans/court-booking-mvp.md` — 7-phase implementation plan with acceptance criteria

## Deployment

- **Staging**: Firebase Hosting (hogelids-tk-dev project)
- **Production**: FTP transfer of `dist/` (credentials TBD)
- **Repo**: Private. Do not make public.
- **Base path**: `/hogelids-tk/` configured in `vite.config.ts` — relevant for all asset paths and routing

## App Branding

- App name: **Högelids Tennisklubb** (or **HTK** in short contexts)
- Brand reference: hogelidstennis.se — white/neutral, yellow `#F1E334`, utilitarian community feel
- All UI copy in Swedish

## Learning

Track two types of knowledge:

- Domain: what things are (product decisions, user preferences, APIs, naming conventions)
- Procedural: how to do things (deploy steps, test commands, review flows)

When you notice something that should be in CLAUDE.md but isn't — propose the edit. Don't wait to be asked.
