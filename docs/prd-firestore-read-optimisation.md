# PRD: Firestore Read Optimisation & Caching Strategy

## Problem Statement

Browsing the HTK app — even without logging in — triggers over 2,000 Firestore reads in a single session. At scale, this creates unnecessary cost and risks hitting Firestore's free-tier limits. The root causes are: upcoming bookings refetching too frequently, history data loading all years at once on every session, and background polling for settings and role data that rarely changes.

## Solution

Introduce a two-tier caching strategy that distinguishes between signed-in members and unauthenticated visitors, aggressively caches data that doesn't change, and persists history data across browser sessions using localStorage. The booking conflict check remains unaffected — it always force-fetches fresh data before writing.

## User Stories

1. As an unauthenticated visitor, I want to see the upcoming bookings list immediately without the page making repeated network calls, so that the app feels fast and doesn't waste Firestore quota on read-only browsing.
2. As an unauthenticated visitor, I want the upcoming bookings list to stay cached for my entire session, so that navigating around the page doesn't trigger new reads.
3. As a signed-in member, I want the upcoming bookings list to stay fresh enough that I see recent bookings within ~15 minutes, so that the schedule feels up to date without constant re-fetching.
4. As a signed-in member, I want to book a court and be confident there are no conflicts, so that I don't accidentally double-book a slot — even if the displayed list is cached.
5. As a signed-in member, I want the history section to load quickly on repeat visits, so that I'm not waiting for 485 records to download every time I open the app.
6. As a signed-in member, I want history for past years (2025 and earlier) to be cached permanently on my device, so that I never re-download data that doesn't change.
7. As a signed-in member, I want history for the current year to refresh automatically at midnight, so that bookings completed today appear in the history list the next day without needing a manual refresh.
8. As a signed-in member, I want the history section to default to showing only the current year, so that the initial page load is fast and doesn't fetch all historical data at once.
9. As an admin, I want app settings and banners to reflect my changes immediately after I update them (via the existing toast confirmation), without relying on background polling.
10. As a signed-in member, I want my role (member/admin) to be fetched once per session and not polled continuously, so that unnecessary reads don't accumulate during a long session.
11. As a signed-in member, I want the earliest booking year to only be fetched after I sign in, since the history section is not visible to guests.
12. As a returning member on the same device, I want the history for all previous years to load instantly from my local cache, so that I never re-download data I've already seen.

## Implementation Decisions

### Upcoming Bookings Cache (`BOOKINGS_QUERY_KEY`)

- `staleTime` is set dynamically based on auth state: `Infinity` for unauthenticated users, 15 minutes for signed-in members.
- This single query key is shared between both user states — the cache is reused if the user signs in mid-session.
- The booking conflict check (`findConflictingBooking`) is not affected: it always calls `refetchQueries` immediately before writing, bypassing the staleTime entirely.

### Earliest Booking Year Query

- Add `enabled: !!user` so this query only fires for signed-in users.
- It is only consumed by the history section, which is already UI-gated behind auth.

### AppSettings Polling

- Remove `refetchInterval` from the AppSettings context.
- Settings are only mutated by admins, who receive a toast confirmation on change. The toast is the feedback mechanism — polling is redundant.
- Settings will still be fetched on mount and can be manually invalidated after a mutation (already the case).

### Role Polling

- Remove `refetchInterval` from the RoleContext.
- Role is set at account creation and rarely changes. One fetch per session is sufficient.

### History Section — Default Year Selection

- Change the default `selectedYears` state from all years to `[currentYear]` only.
- The user can still expand to other years using the existing year chip controls.
- This reduces the initial history fetch from all 485 records to approximately the current year's records only.

### History Cache — Current vs Past Years

- Past years (any year before the current calendar year): `staleTime: Infinity`, `gcTime: Infinity` — never re-fetched once loaded.
- Current year: `staleTime` set to milliseconds remaining until midnight (device local time), `gcTime: Infinity` — cache becomes stale at midnight each day, triggering a single background refresh on the next active session.
- A `msUntilMidnight()` utility function computes the dynamic staleTime at query creation time.
- Swedish timezone is not explicitly enforced — device local time is acceptable given all members are expected to be in Sweden.

### Cross-Session Cache Persistence

- Use TanStack Query's `persistQueryClient` plugin with a `localStorage` persister to persist the query cache across browser sessions.
- The persisted cache key is scoped to the HTK app (e.g. `htk_query_cache`).
- `maxAge` on the persister is set to a long value (e.g. 7 days) to ensure past-year history is not evicted between visits.
- Past-year history queries with `staleTime: Infinity` will be served directly from the persisted cache on subsequent sessions — zero Firestore reads.
- The current year query will be stale on the first load of each new day (as designed), prompting a single background refresh.
- Upcoming bookings and other short-lived queries will be stale on load (their staleTime is shorter than the cache maxAge), causing a background refresh as normal — no change in behaviour, just a faster initial render.

### Ladder Queries

- No changes — keep current 5-minute default staleTime. Ladder data changes infrequently and the Stegen page is a low-traffic feature.

### Modules to Modify

- **QueryClient configuration** — add localStorage persister, configure persistQueryClient
- **AppSettingsContext** — remove `refetchInterval`
- **RoleContext** — remove `refetchInterval`
- **HomePage** — make `BOOKINGS_QUERY_KEY` staleTime dynamic based on auth state; add `enabled: !!user` to earliest year query
- **HistorySection** — change default `selectedYears` to `[currentYear]`; add `msUntilMidnight()` utility; apply dynamic staleTime per year in `YearBookings`

## Testing Decisions

Good tests verify observable behaviour, not implementation details. They should not assert on `staleTime` values directly, but on what the user sees and how many times a service function is called.

### What to test

- **`msUntilMidnight()`** — pure function, test that it returns a positive number less than 86,400,000ms at any time of day, and returns a very small number just before midnight.
- **`HistorySection` default state** — render the component and assert that only `getBookingsByYear` for the current year is called on mount, not for prior years.
- **Conflict check independence** — existing tests for `hasConflict` and `findConflictingBooking` in BookingService cover this; no new tests needed.

### Prior art

- `BookingService.test.ts` — unit tests for pure service functions; follow this pattern for `msUntilMidnight()`.
- Component tests co-located with the component file (e.g. `HistorySection.test.tsx`).

### Not tested

- `staleTime` and `gcTime` values — these are configuration, not behaviour.
- `persistQueryClient` integration — this is a third-party plugin; trust its own tests.
- Polling removal — not observable in a unit test context.

## Out of Scope

- Server-side conflict detection (Firestore transactions/rules for double-booking prevention) — the client-side fresh-fetch before write is sufficient for a small club.
- Pagination of history records — the per-year caching strategy makes this unnecessary for the current dataset size.
- Real-time listeners (`onSnapshot`) — not needed; the app's booking frequency doesn't require live updates.
- Firestore index optimisation — out of scope for this change.
- Explicit Swedish timezone handling for midnight calculation.

## Further Notes

- The localStorage cache for past years is effectively permanent per device. If historical data ever needs to be corrected (e.g. a migration fix), affected users would need to clear their browser storage or a cache-busting key would need to be introduced.
- The `htk_query_cache` localStorage key joins the existing `htk_guest_email`, `htk_guest_name`, and `htk_booking_count` keys. Consider documenting this in CLAUDE.md.
- Estimated read reduction after implementation: from ~2,000+ reads per multi-user session to ~50–100 reads per new session, near-zero for returning users on the same device.
