# CLAUDE.md

## Non-negotiable rules

- **Swedish UI** — all user-facing strings in Swedish (`sv-SE`). Code/comments stay English.
- **No login walls** — auth state drives visibility, never blocks routes or actions.
- **Single page** — everything on `/` as conditional renders. Exception: `/admin` sub-routes are real routes.
- **Native `datetime-local` only** — no custom date/time pickers. Touch targets ≥44×44px.
- **Guest state = localStorage only** — never hit Firebase for guest session. Always go through `GuestSession`, never touch localStorage directly in components.
- `**hasConflict()` is the single source of truth\*\* for overlap — use for both inline validation AND pre-write guard. Never allow overlapping bookings.
- **Cancellation**: anyone can delete guest bookings; members can delete only their own member bookings. Must match between Firestore rules and UI.
- **History archive** — past-year bookings live in `public/history-archive.json`, regenerated annually via `npm run archive:build` (after Jan 1, before deploy). UI uses archive for `year <= lastArchivedYear`, Firestore otherwise. See `scripts/README.md`.

## Learning

When you notice something that should be in CLAUDE.md but isn't — propose the edit.
