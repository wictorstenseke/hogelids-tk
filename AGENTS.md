# AGENTS.md

## Non-negotiable rules

- **Swedish UI** — all user-facing strings in Swedish (`sv-SE`). Code/comments stay English.
- **No login walls** — auth state drives visibility, never blocks routes or actions.
- **Single page** — everything on `/` as conditional renders. Exception: `/admin` sub-routes are real routes.
- **Native `datetime-local` only** — no custom date/time pickers. Touch targets ≥44×44px.
- **Guest state = localStorage only** — never hit Firebase for guest session. Always go through `GuestSession`, never touch localStorage directly in components.
- **`hasConflict()` is the single source of truth** for overlap — use for both inline validation AND pre-write guard. Never allow overlapping bookings.
- **Cancellation**: anyone can delete guest bookings; members can delete only their own member bookings. Must match between Firestore rules and UI.
- **History archive** — past-year bookings live in `public/history-archive.json`, regenerated annually via `npm run archive:build` (after Jan 1, before deploy). UI uses archive for `year <= lastArchivedYear`, Firestore otherwise. See `scripts/README.md`.
- **Booking board freshness** — public booking views use persisted React Query cache. Never set booking-board queries to `staleTime: Infinity`; they must refetch on mount/focus enough to catch bookings made in other browsers/devices.
- **Firebase tests** — tests importing Firebase-backed services/components must mock `src/lib/firebase`; CI test jobs do not provide `.env.local` Firebase keys.
- **Sentry builds** — Sentry runtime DSN may be present locally, but source-map upload must stay CI-only so local/sandbox builds do not require network access to Sentry.
- **Deploy model** — GitHub workflows deploy Hosting only. Functions and Firestore rules/indexes are deployed manually during development/release.
- **Release ordering** — when UI depends on new Functions/rules, deploy backend/rules manually before or close to Hosting release. Avoid long windows where new UI and deployed rules/functions disagree.

## Learning

When you notice something that should be in AGENTS.md but isn't — propose the edit.
