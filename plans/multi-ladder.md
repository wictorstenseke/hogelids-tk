# Plan: Multi-Ladder Support (HTK Stegen)

> Source: grill-me session 2026-03-24

## Architectural decisions

- **One active ladder at a time** — enforced in UI (create button hidden when active exists)
- **Status vocabulary** — `'active' | 'completed'` (rename from `'archived'`)
- **`joinOpensAt` ownership** — moves from `AppSettings` onto the `Ladder` document; `null` = always open
- **`ladderEnabled` removed** — StegenPage always accessible; ladder list being empty is the natural gate
- **Ladder selector** — local UI state on StegenPage (no URL param); defaults to active ladder, fallback to most recent completed
- **Completed = fully frozen** — no join, no challenge, no result reporting; UI hides all action buttons
- **No delete in UI** — completed ladders are permanent records; Firestore console for exceptional cleanup
- **Schema** — `/ladders/{ladderId}`: `{ name: string, year: number, status: 'active'|'completed', joinOpensAt: Timestamp|null, participants: LadderParticipant[], createdAt: Timestamp }`

---

## Phase 1: Service & type foundation

**Stories**: All features depend on this layer being correct.

### What to build

Update the TypeScript types and service layer so the rest of the app can build on a consistent foundation:

- Rename `Ladder.status` from `'active'|'archived'` to `'active'|'completed'`
- Add `joinOpensAt: Timestamp | null` field to the `Ladder` type (was `AppSettings.ladderJoinOpensAt`)
- Remove `ladderEnabled` and `ladderJoinOpensAt` from `AppSettings` interface and `AppSettingsService`
- Update `isLadderJoinOpenNow()` in `ladderJoinWindow.ts` to accept `Pick<Ladder, 'joinOpensAt'>` instead of `Pick<AppSettings, 'ladderJoinOpensAt'>`
- Add `getAllLadders(): Promise<Ladder[]>` to `LadderService` — returns all ladders sorted by `createdAt` descending
- Add `LADDERS_QUERY_KEY = ['ladders', 'all']` cache key
- Add `completeLadder(ladderId: string): Promise<void>` to `LadderService` — sets `status: 'completed'`
- Update `createLadder(name: string, year: number)` to accept a custom name and write `joinOpensAt: null`
- Update `joinLadder()` to read `joinOpensAt` from the ladder document instead of app settings
- No UI changes in this phase

### Acceptance criteria

- [ ] `Ladder` type has `status: 'active' | 'completed'` and `joinOpensAt: Timestamp | null`
- [ ] `AppSettings` no longer has `ladderEnabled` or `ladderJoinOpensAt`
- [ ] `isLadderJoinOpenNow` accepts a `Ladder` (or `Pick<Ladder, 'joinOpensAt'>`) instead of `AppSettings`
- [ ] `getAllLadders()` returns all ladders ordered by `createdAt` desc
- [ ] `completeLadder()` sets status to `'completed'` in Firestore
- [ ] `createLadder(name, year)` writes `joinOpensAt: null` and accepts arbitrary name
- [ ] `joinLadder()` uses `ladder.joinOpensAt` for the open-window check
- [ ] TypeScript compiles with no errors

---

## Phase 2: Admin — ladder list, create, and complete

**Stories**: Admin can see all ladders, create a new one (when none active), and complete the active one.

### What to build

Replace the current admin ladder section with a full ladder management UI:

- A table listing all ladders with columns: name, status badge (Aktiv / Avslutad), created date
- "Skapa stege" button — only shown when no active ladder exists. Opens a small form/dialog with a text input for name (pre-filled with current year) and a submit button
- Per-ladder "Avsluta stegen" action — only on the active ladder row. On click: fetch ladder matches, count `ladderStatus: 'planned'` matches, show a warning if any exist ("X matcher ej rapporterade"), require confirmation before calling `completeLadder()`
- Join-date picker (same as today) now reads/writes `ladder.joinOpensAt` on the active ladder document instead of `AppSettings`. Only shown for the active ladder.
- Remove the `ladderEnabled` toggle from AdminPage entirely
- Invalidate `LADDERS_QUERY_KEY` and `LADDER_QUERY_KEY` after create/complete

### Acceptance criteria

- [ ] Admin sees a table of all ladders (name, status badge, created date)
- [ ] "Skapa stege" button is hidden when an active ladder exists
- [ ] Creating a ladder with a custom name (year pre-filled) writes to Firestore and appears in the table
- [ ] "Avsluta stegen" on the active ladder warns if unplayed matches exist, shows count, requires confirmation
- [ ] Confirming completion sets the ladder status to `'completed'` and the button disappears
- [ ] Join-date picker reads/writes `ladder.joinOpensAt` (not app settings)
- [ ] `ladderEnabled` toggle is gone from the admin UI
- [ ] TypeScript compiles with no errors

---

## Phase 3: StegenPage — ladder selector + completed read-only view

**Stories**: Members can browse all ladders including historical ones; completed ladders are read-only.

### What to build

Update StegenPage to support multiple ladders and a read-only completed state:

- Replace the single `getActiveLadder()` query with `getAllLadders()` using `LADDERS_QUERY_KEY`
- Add a dropdown/select at the top of StegenPage to choose which ladder to view. Default: the active ladder (if one exists), fallback to the most recently created completed ladder. Completed ladders show "(avslutad)" suffix in the option label.
- Pass the selected ladder through all existing queries and UI (rankings table, match tabs, join/challenge logic)
- If selected ladder `status === 'completed'`: show an "Avslutad" badge near the ladder name/selector, hide join button, hide challenge buttons, hide result-reporting form on planned matches, hide match delete button
- `isLadderJoinOpenNow` now reads from `ladder.joinOpensAt` — update any StegenPage call sites
- If no ladders exist at all, show a neutral empty state ("Ingen stege är skapad ännu")
- Remove any `ladderEnabled` guard that hides the page

### Acceptance criteria

- [ ] StegenPage shows a dropdown listing all ladders; active ladder selected by default
- [ ] Switching ladder in the dropdown updates rankings and match history
- [ ] Completed ladders show an "Avslutad" badge
- [ ] On a completed ladder: join button, challenge buttons, result form, and delete match button are all hidden
- [ ] On a completed ladder: rankings table and match history (winner + comment) are still visible
- [ ] Paused participants are visible in the paused section on completed ladders
- [ ] If no ladders exist, an empty state is shown instead of crashing
- [ ] `ladderEnabled` guard removed — page always renders
- [ ] TypeScript compiles with no errors
