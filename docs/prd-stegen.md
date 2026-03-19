# PRD: Tennis Ladder (Stegen)

## Problem Statement

Members of Högelids Tennisklubb have no structured way to compete against each other in a continuous, self-organizing format. There is no ranking system, no way to challenge fellow members, and no record of competitive match outcomes. Members who want to compete informally have no shared platform to track standings, issue challenges, or report results.

## Solution

Add a tennis ladder ("Stegen") to the app — a self-organizing ranking system where members challenge each other, play matches, and report results. Winners of valid challenges take the loser's position in the rankings. The ladder lives at `/stegen`, a dedicated route accessible to all authenticated members.

## User Stories

1. As a member, I want to see the current ladder rankings so that I know where everyone stands.
2. As a member, I want to see my own position highlighted in the ladder so that I can quickly find myself.
3. As a member, I want to join the ladder so that I can participate in competitive play.
4. As a member, I want to be placed at the bottom of the ladder when I join so that I start without displacing existing participants.
5. As a member, I want to pause my ladder participation so that I can take a break without being removed permanently.
6. As a member, I want to rejoin the ladder after pausing so that I can resume competitive play (placed at the bottom, stats preserved).
7. As a member, I want to see which opponents I am eligible to challenge so that I know who I can issue a challenge to.
8. As a member, I want to challenge a player up to 4 positions above me so that I have a fair chance to climb the ladder.
9. As a member, I want challenge eligibility validated when I click an opponent so that I cannot accidentally issue an invalid challenge.
10. As a member, I want clicking a valid opponent to open the court booking form so that I can schedule our match in one flow.
11. As a member, I want the court booking to be linked to the ladder match so that the result can be reported later.
12. As a member, I want to see all planned matches relevant to me so that I know what matches I have coming up.
13. As a member, I want to report the result of a match I was part of so that the ladder updates correctly.
14. As a member, I want to select the winner of a match when reporting so that positions and stats are updated accurately.
15. As a member, I want to add an optional comment when reporting a result so that context about the match is preserved.
16. As a member, I want result reporting validated against current ladder positions at time of reporting so that position swaps only happen when still meaningful.
17. As a member, I want position swaps to only occur if the winner is still ranked below the loser and within 4 positions at report time so that position updates are fair.
18. As a member, I want my wins and losses always recorded even if no position swap occurs so that my match history is accurate.
19. As a member, I want to see completed matches with winner info and optional comment so that there is a shared record of outcomes.
20. As a member, I want to see W–L statistics per player in the ladder table so that I can gauge competitive experience.
21. As a paused member, I want to not appear in the active ladder rankings so that the table reflects only active participants.
22. As a paused member, I want my statistics preserved while paused so that my history is not lost.
23. As a paused member, I want existing planned matches to still be reportable after I pause so that in-progress matches are not abandoned.
24. As a member, I want paused players to be unchallengeable so that new challenges are not issued against inactive participants.
25. As an admin, I want to toggle ladder visibility on or off so that I can control when the feature is accessible to members.
26. As an admin, I want the ladder on/off state to persist across sessions so that it is reliably controlled.

## Implementation Decisions

### New Modules

**`LadderService`** — Data layer (no React). Handles all Firestore reads/writes for ladders and ladder match updates on bookings. Exports interfaces (`Ladder`, `LadderParticipant`, `LadderMatch`) and a `LADDER_QUERY_KEY` for cache consistency. Functions: get active ladder, join, pause, rejoin, report match result.

**`ladder.ts` (lib)** — Pure business logic with no Firestore or React dependencies. Deep, testable module.

- `getChallengeEligibility(participants, challengerId, opponentId)` — returns `{ eligible: boolean, reason? }`. Validates: not self, opponent is active, challenger ranked lower, within 4 positions.
- `applyMatchResult(participants, winnerId, loserId)` — returns updated participants array. Swaps positions only if winner is currently below loser and within 4 positions. Always increments stats.
- Both functions receive current state at time of call; callers are responsible for passing current data.

**`/stegen` route** — New TanStack Router route (same pattern as `/admin`). Component: `StegenPage.tsx` in `src/routes/-components/`. Sections: ladder rankings table, challenge flow, matches list.

### Modified Modules

**`BookingService`** — Extend `Booking` type with optional ladder fields: `ladderId`, `playerAId`, `playerBId`, `ladderStatus` (`'planned' | 'completed'`), `winnerId`, `ladderComment`. Add `createLadderMatch(ladderId, playerAId, playerBId, startTime, endTime)` and `reportLadderResult(bookingId, winnerId, comment)` functions.

**`AppSettingsService`** — Add `ladderEnabled: boolean` to `AppSettings` interface and defaults.

**`AdminPage`** — Add ladder on/off toggle, consistent with existing booking toggle pattern.

**`firestore.rules`** — Add rules for `ladders` collection (see below).

### Firestore Schema

**`ladders/{ladderId}`**

```
name: string           // e.g. "Stegen 2026"
year: number
status: 'active' | 'archived'
createdAt: Timestamp
participants: [{
  uid: string
  position: number     // 1-indexed; lower = higher ranked
  wins: number
  losses: number
  paused: boolean
}]
```

**`bookings` (extended)** — Existing collection gains optional ladder fields on relevant documents. Non-ladder bookings are unaffected.

### Firestore Security Rules

- **`ladders` read**: authenticated users only
- **`ladders` create/delete/archive**: admin or superuser only
- **`ladders` update** (join/pause/rejoin): authenticated user modifying only their own participant entry; existing participants must be preserved
- **`ladders` update** (admin override): admin or superuser can update anything
- **`bookings` with ladder fields**: report result (`ladderStatus`, `winnerId`, `ladderComment`) allowed only by `playerAId` or `playerBId` on that booking

### Position & Stats Logic

- At challenge time: validate 4-position rule using current positions
- At report time: re-validate positions using current state before applying swap
- Position swap: winner takes loser's position; all players between shift down one
- Stats (`wins`/`losses`): always incremented regardless of position swap outcome
- Paused players: excluded from position calculations; their slot is removed while paused

### Challenge Flow

1. Member views `/stegen` ladder table
2. Clicks an active opponent ranked within 4 positions above them
3. Eligibility validated client-side (confirmed server-side via rules)
4. Existing `BookingForm` opens with pre-filled ladder metadata (`ladderId`, `playerAId`, `playerBId`)
5. Member selects date/time and submits → `createLadderMatch()` called
6. Booking appears as a planned match under both players

### Result Reporting Flow

1. Either `playerAId` or `playerBId` opens the match in the matches list
2. Selects winner via radio buttons; optionally adds a comment
3. Submits → `reportLadderResult()` called
4. `applyMatchResult()` runs with current ladder state
5. Ladder document updated atomically (positions + stats)
6. Booking document updated (`ladderStatus: 'completed'`, `winnerId`, `ladderComment`)

### Navigation

Menu item for `/stegen` — design and implementation deferred.

### Ladder Lifecycle

- One active ladder at a time (enforced by convention + admin UI)
- Season management (archiving, new seasons) deferred.

## Testing Decisions

**What makes a good test:** Tests verify observable behavior — function outputs given specific inputs — not implementation details. Pure functions require no mocking.

**`ladder.ts` — unit tested:**

- `getChallengeEligibility`: valid challenge, self-challenge, lower-ranked challenge, too far, paused opponent, missing players
- `applyMatchResult`: position swap (valid), no swap (out of range at report time), no swap (positions flipped since challenge), stats always incremented, paused player edge cases

**Prior art:** `htk-tennis-v2` repo — `src/lib/ladder.ts` and `src/lib/ladder.test.ts` — has 40+ tests covering identical logic. Use as direct reference for test structure and coverage.

**Not tested:** React components, Firestore integration, UI interactions.

## Out of Scope

- Ladder seasons and archiving
- Admin tools beyond on/off toggle
- In-app notifications (challenge coordination handled outside the app)
- Score recording (winner + comment only)
- Challenge deadlines or timeout enforcement
- Guest participation (members only)
- Navigation menu design and implementation
- Ladder visibility behavior when turned off (TBD)

## Further Notes

- Reference implementation: `wictorstenseke/htk-tennis-v2` — `src/lib/ladder.ts`, `src/lib/ladder.test.ts`, `src/pages/Stegen.tsx`, `src/hooks/useLadders.ts`. Business logic is directly portable; adapt UI to hogelids-tk conventions.
- The ladder is members-only; use existing `useAuth()` and `useRole()` hooks for the auth gate.
- Court booking coordination (agreeing on time) happens outside the app — the booking form is a scheduling tool only, not a communication channel.
- Ladder document stores participants as an embedded array — appropriate for expected scale (20–50 members max).
