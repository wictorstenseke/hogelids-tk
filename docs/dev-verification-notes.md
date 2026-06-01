# Dev Verification Notes

Date: 2026-06-01
Branch: `codex-analyze`
Firebase project: `hogelids-tk-dev`

## Deployed To Dev

- Callable functions deployed:
  - `joinLadder`
  - `pauseLadder`
  - `createLadderMatch`
  - `reportLadderResult`
  - `syncProfileSnapshots`
- Hosting not deployed.
- Firestore rules deployed to dev after booking permission failure.

## Reported Test Results

- Ladder challenge from already-active account succeeded.
- Ladder match booking appeared in booking list.
- Match result reporting updated ranking.
- Guest booking works after dev rules deploy.
- Guest booking migration works remotely: after account creation, migrated
  bookings appear as `Medlem` for logged-out browsers.
- Guest booking migration now also appears correctly as own booking while
  logged in after local cache fix.
- Profile name/phone carry over correctly after account creation.
- Overlap controls on bookings appear to work.
- Member booking create/delete works.
- Guest booking delete works both as owning guest and as unrelated visitor,
  intentionally allowing cross-device guest deletion.
- New account can join ladder.
- New account can challenge opponent.
- Match result reporting works for new account.
- Ranking updates after reported result.

## Blocked Tests

- Initial guest/member booking create was blocked before rules deploy with
  `missing or insufficient permissions`.

## Likely Root Cause

Booking create now reads/writes `bookingSlotDays/{date}` inside the booking
transaction. Current deployed dev Firestore rules do not yet allow that path, so
Firestore denies `BatchGetDocuments` for `bookingSlotDays/2026-06-09`.

Status: dev rules deployed. Retest required.

## Issues Found And Fixed Locally

- After account creation with existing guest bookings, logged-in view did not
  immediately mark migrated bookings as own bookings. Root cause: local
  React Query booking cache still held pre-migration guest docs.
- After account creation from the header, profile modal fields could show empty.
  Root cause: profile query could cache `null` before `users/{uid}` write
  finished; sign-up/sign-in did not invalidate profile cache.
- Fix added locally: sign-in/sign-up return `uid`; auth modal invalidates
  upcoming bookings and profile query after auth completes.

Status: retested by user; guest booking ownership and profile info now look
correct.

- Profile phone update initially failed with callable `syncProfileSnapshots`
  returning 400. Likely root cause: function queried bookings with
  `where(userField == uid)` plus `where(endTime >= now)`, requiring missing
  composite indexes. Fix deployed to dev: query by user field only, filter
  upcoming bookings inside function.
- Admin read confirmed dev active ladder snapshot contains updated phone
  `666444` for test user. Remaining stale ladder view was local query cache:
  profile save invalidated profile only, while ladder query is persisted and
  stale for 15 minutes. Fix added locally: profile save now invalidates profile,
  ladder, and upcoming bookings.

Status: retested by user; profile phone update now reflects in ladder UI.

- Multiple browsers showed stale booking boards after one browser created a
  booking. Root cause: public upcoming bookings used persisted React Query cache
  with guest `staleTime: Infinity`, so each browser restored its own old
  `htk_query_cache` and did not refetch on normal refresh. Fix added locally:
  booking board stale time is 30 seconds, refetches on mount/window focus, and
  persisted query cache buster moved to `query-cache-v2`.

Status: local tests pass; user retest pending.

- Booking form could briefly show an overlap warning while a valid booking was
  still being created. Root cause: the optimistic booking was inserted into the
  same booking cache that inline conflict validation reads from, so the form
  briefly saw its own pending booking as a conflict. Fix added locally: conflict
  warnings remain active before submit, but are hidden while the booking submit
  is in progress.

Status: local regression test added; retested by user.

## Not Tested Yet

- Login guest-booking migration only same email.
- Direct client ladder participant write fails after rules deploy.
- Ladder pause/rejoin UI flow. Pause UI currently missing; handle later.

## Next Step

Retest multi-browser booking freshness locally. Deploy hosting only after local
verification; no additional functions/rules deploy is needed for these UI cache
fixes.
