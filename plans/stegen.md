# Plan: Tennis Ladder (Stegen)

> Source PRD: `docs/prd-stegen.md`

## Architectural decisions

- **Route**: `/stegen` — real TanStack Router file-based route, same pattern as `/admin`. Not a conditional render on the homepage.
- **Auth gate**: Members only. Use existing `useAuth()` hook; redirect or show prompt if not authenticated.
- **Ladder schema**: Single `ladders/{ladderId}` Firestore document. Participants stored as an embedded array of objects (uid, position, wins, losses, paused). One active ladder at a time by convention.
- **Match storage**: Ladder matches live in the existing `bookings` collection, extended with optional fields: `ladderId`, `playerAId`, `playerBId`, `ladderStatus` (`'planned' | 'completed'`), `winnerId`, `ladderComment`. Non-ladder bookings are unaffected.
- **Pure logic module**: `ladder.ts` in `src/lib/` — no Firestore or React dependencies. All ranking and eligibility logic lives here and is unit tested in isolation.
- **Admin control**: `ladderEnabled` added to the `settings/app` singleton document (same pattern as `bookingEnabled`).
- **Atomic writes**: Any operation that touches both the `ladders` document and a `bookings` document (result reporting) must use a Firestore batch write.
- **Composite index**: Querying bookings by `ladderId` + `playerAId`/`playerBId` requires a composite index — add to `firestore.indexes.json`.

---

## Phase 1: Read-only ladder view

**User stories**: 1, 2

### What to build

Create the `/stegen` route and a `LadderService` with read-only Firestore access. Seed a ladder document manually in Firestore console. Members who visit `/stegen` see the full rankings table: position, player name, W–L stats. Their own row is highlighted. Non-members see a prompt to log in. Firestore security rules for `ladders` are established (read: authenticated users only; write: admin/superuser only for now).

### Acceptance criteria

- [ ] `/stegen` is a navigable route (no 404)
- [ ] Unauthenticated users see a login prompt, not the ladder
- [ ] Authenticated members see the rankings table with position, display name, and W–L stats
- [ ] The logged-in member's own row is visually distinguished
- [ ] Firestore rules allow authenticated reads; block unauthenticated reads
- [ ] A manually seeded ladder document renders correctly

---

## Phase 2: Join, pause & rejoin

**User stories**: 3, 4, 5, 6, 21, 22, 23, 24

### What to build

Members can join the active ladder (placed at the bottom of the rankings), pause their participation (removed from the active table, stats preserved), and rejoin after pausing (placed at the bottom again, stats restored). Paused players do not appear in the active rankings table. Existing planned matches for a paused player remain reportable. Firestore rules are extended to allow authenticated users to modify only their own participant entry (join/pause/rejoin) without affecting other participants.

### Acceptance criteria

- [ ] A member not yet in the ladder sees a "Gå med i stegen" action
- [ ] Joining places the member at the bottom of the active rankings
- [ ] A member already in the ladder sees a "Pausa" action
- [ ] Pausing removes the member from the visible rankings table
- [ ] A paused member sees a "Återgå till stegen" action
- [ ] Rejoining places the member at the bottom; their W–L stats are intact
- [ ] Paused players do not appear in the active rankings table
- [ ] Firestore rules prevent modifying another member's participant entry
- [ ] A planned match involving a now-paused player remains visible and reportable

---

## Phase 3: Challenge flow

**User stories**: 7, 8, 9, 10, 11

### What to build

Implement `getChallengeEligibility` in `ladder.ts` (pure, unit tested). In the UI, active opponents ranked within 4 positions above the current member are clickable. Clicking an eligible opponent opens the existing `BookingForm` pre-filled with ladder metadata. On submit, a court booking is created in the challenger's name and linked to the ladder as a planned match (visible to both players). Clicking an ineligible opponent shows a reason (too far, lower-ranked, paused, self). Unit tests for all eligibility cases are written alongside the logic.

### Acceptance criteria

- [ ] `getChallengeEligibility` is unit tested: valid challenge, self-challenge, lower-ranked, too far, paused opponent, missing players
- [ ] Active opponents within 4 positions above are visually indicated as challengeable
- [ ] Clicking a challengeable opponent opens `BookingForm` with ladder metadata pre-filled
- [ ] Clicking an ineligible opponent shows a reason, not the form
- [ ] Submitting the form creates a booking in the challenger's name with `ladderId`, `playerAId`, `playerBId`, `ladderStatus: 'planned'`
- [ ] The planned match appears in both players' match lists on `/stegen`
- [ ] Composite index for querying ladder matches is added to `firestore.indexes.json`

---

## Phase 4: Result reporting

**User stories**: 12, 13, 14, 15, 16, 17, 18, 19, 20

### What to build

Implement `applyMatchResult` in `ladder.ts` (pure, unit tested). Either `playerAId` or `playerBId` can report the result of a planned match. They select the winner via radio buttons and optionally add a comment. On submit, the function re-validates current positions: if the winner is still ranked below the loser and within 4 positions, positions are swapped; otherwise only stats are updated. The ladder document and booking document are updated atomically via a Firestore batch write. Reported matches move to a completed state and display the outcome. Firestore rules are extended to allow only the two involved players to update `ladderStatus`, `winnerId`, and `ladderComment` on a booking.

### Acceptance criteria

- [ ] `applyMatchResult` is unit tested: valid position swap, no swap (out of range at report time), no swap (positions flipped), stats always incremented
- [ ] Only `playerAId` or `playerBId` can report a result (enforced in Firestore rules)
- [ ] Result form shows radio buttons for winner selection and an optional comment field
- [ ] Submitting updates both the ladder document and the booking document atomically
- [ ] If position swap is valid at report time, rankings table updates immediately
- [ ] If position swap is invalid, W–L stats still update and no positions change
- [ ] Completed matches display winner name and comment (if any)
- [ ] Planned and completed matches are shown in separate sections on `/stegen`
- [ ] A result cannot be modified or deleted after submission

---

## Phase 5: Admin toggle

**User stories**: 25, 26

### What to build

Add `ladderEnabled: boolean` to `AppSettings` and its Firestore defaults. Add a ladder on/off toggle to the admin panel, consistent with the existing booking toggle pattern. When `ladderEnabled` is false, the `/stegen` route shows a message that the ladder is currently inactive. The setting persists in the `settings/app` document and is live-updated via the existing `useAppSettings()` hook.

### Acceptance criteria

- [ ] `ladderEnabled` is present in `AppSettings` with a default of `true`
- [ ] Admin panel shows a ladder toggle alongside the booking toggle
- [ ] Toggling off persists to Firestore and takes effect immediately (no page reload)
- [ ] When `ladderEnabled` is false, `/stegen` shows an inactive state message instead of the ladder
- [ ] Non-admin members cannot change the ladder toggle
