# Plan: Firestore Read Optimisation & Caching Strategy

> Source PRD: `docs/prd-firestore-read-optimisation.md`

## Architectural decisions

- **No schema changes** — Firestore collections and document shapes are unchanged
- **No new routes** — all changes are in data fetching and cache configuration
- **Auth boundary** — unauthenticated visitors and signed-in members receive different staleTime values for the same query key; they share cached data when the user signs in mid-session
- **Conflict check unchanged** — `findConflictingBooking` always calls `refetchQueries` before writing; staleTime changes do not affect booking safety
- **localStorage key** — `htk_query_cache` (joins existing `htk_guest_*` keys)
- **Midnight boundary** — computed from device local time; no explicit Swedish timezone enforcement

---

## Phase 1: Eliminate unnecessary reads — polling & query gating

**User stories**: 1, 2, 3, 9, 10, 11

### What to build

Three targeted changes that cut reads immediately with minimal risk:

1. **Remove `refetchInterval` from AppSettings** — settings are only mutated by admins who already receive a toast confirmation. The interval adds reads for every visitor with no real benefit.

2. **Remove `refetchInterval` from RoleContext** — role is fetched once on sign-in and does not change mid-session. Polling is wasteful.

3. **Dynamic staleTime for upcoming bookings** — unauthenticated visitors get `staleTime: Infinity` (the list never auto-refetches during their session). Signed-in members get `staleTime: 15 minutes`. Both share the same query key so the cache is reused if the visitor signs in.

4. **Gate earliest-year query behind auth** — `getEarliestBookingYear` only needs to run for signed-in users since the history section is already hidden from guests. Add `enabled: !!user`.

### Acceptance criteria

- [ ] Opening the app as an unauthenticated visitor and leaving the tab open for 10+ minutes produces no additional Firestore reads after the initial load
- [ ] Signing in does not trigger a re-fetch of upcoming bookings if the cached data is less than 15 minutes old
- [ ] Signing in after the cache is >15 minutes old does trigger a background refresh of upcoming bookings
- [ ] `getEarliestBookingYear` is not called for unauthenticated visitors (verifiable in browser network tab or Firestore usage dashboard)
- [ ] AppSettings are not re-fetched on a timer; they update only on mount or after an admin mutation
- [ ] Role is not re-fetched on a timer; it is fetched once when the user signs in

---

## Phase 2: History loads light by default + midnight expiry

**User stories**: 6, 7, 8

### What to build

Two changes to the history section that reduce the initial history fetch and keep current-year data appropriately fresh:

1. **Default to current year only** — when the history section first renders, `selectedYears` is initialised to `[currentYear]` instead of all years. The user can expand to other years using the existing year chip controls. This means the initial history fetch covers only one year's records rather than all 485.

2. **`msUntilMidnight()` utility + per-year staleTime** — a pure utility function computes how many milliseconds remain until midnight on the user's device. Past years use `staleTime: Infinity` (data never changes). The current year uses `staleTime: msUntilMidnight()` so the cache becomes stale at midnight each day, prompting a single background refresh on the next active session.

### Acceptance criteria

- [ ] Opening the history section for the first time only fetches the current year's bookings from Firestore; no requests are made for prior years
- [ ] Expanding a prior year chip (e.g. 2024) fetches that year's bookings exactly once per session
- [ ] Re-selecting a prior year chip that was already loaded does not trigger a new Firestore read
- [ ] The current year's cache is considered stale after midnight (verifiable by mocking `Date` in tests or observing behaviour across midnight)
- [ ] Past years are never re-fetched within the same session regardless of how many times the user toggles year chips
- [ ] `msUntilMidnight()` returns a positive number less than 86,400,000ms at any time of day

---

## Phase 3: Persist history cache across browser sessions

**User stories**: 5, 12

### What to build

Wire up TanStack Query's `persistQueryClient` with a localStorage persister so that query cache data survives page refreshes and new browser sessions.

- Install the required TanStack Query persistence packages
- Configure a localStorage persister scoped to the key `htk_query_cache`
- Set `maxAge` to 7 days — long enough that a member who visits weekly never re-downloads past-year history
- Past-year history queries (`staleTime: Infinity`) are served entirely from the persisted cache on return visits — zero Firestore reads
- Current-year history is persisted too, but its `staleTime: msUntilMidnight()` means it will be stale at the start of each new day, triggering a single background refresh
- Upcoming bookings and other short-lived queries are also persisted but their staleTime is shorter than the cache maxAge, so they refetch in the background on load as normal — no behaviour change, just a faster initial render (data shown immediately from cache while refresh runs)

### Acceptance criteria

- [ ] A signed-in member who loads the history section, then closes and reopens the tab, sees history data immediately without any Firestore reads for past years
- [ ] A member who returns the next day sees current-year history update in the background (one Firestore read) while past years load instantly from cache
- [ ] A member who returns after 8+ days (cache expired) fetches history fresh, as if visiting for the first time
- [ ] The `htk_query_cache` key is present in localStorage after visiting the history section
- [ ] Clearing localStorage and reloading causes a full re-fetch, confirming the cache is the source of the optimisation
- [ ] Upcoming bookings still refetch in the background on page load (cache is shown immediately, then updated) — no regression in booking freshness
