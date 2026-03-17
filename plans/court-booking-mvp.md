# Plan: Court Booking MVP

> Source PRD: docs/prd.md

## Architectural decisions

- **Routes**: Single route `/` — full SPA, no sub-routes. Auth state drives UI conditionally, not routing.
- **Schema**: Two Firestore collections — `bookings` (guests + members) and `users` (members only). Bookings use a `type: "guest" | "member"` field to distinguish ownership and deletion rules.
- **Key models**: `Booking { id, type, ownerEmail, ownerUid, ownerDisplayName, startTime, endTime, createdAt }` · `User { uid, email, displayName, phone, createdAt }`
- **Auth**: Firebase Authentication (email/password). Persistent sessions by default. No login walls — all pages accessible, auth state adjusts what is visible and what actions are permitted.
- **Data fetching**: TanStack Query for all Firestore reads. Optimistic updates where appropriate.
- **Guest state**: localStorage only — no Firebase dependency. Stores email, name, and booking count for nudge logic.
- **Conflict detection**: Pure function `hasConflict(bookings, start, end)` — no side effects, used for both inline UI validation and pre-write guard.
- **Deployment**: GitHub Pages at `/hogelids-tk/`. Firebase credentials via `.env.local` locally and GitHub Actions secrets in CI.

---

## Phase 1: Firebase foundation + read-only booking list

**User stories**: 10, 11, 12, 32, 33

### What to build

Wire up Firebase and Firestore. Define the `bookings` collection schema and seed a handful of realistic bookings (mix of guest and member types). Render the upcoming bookings list on the page using TanStack Query.

Guest users see their own bookings labelled "Your booking" (email-matched via localStorage) and all others as "Court booked". Member users (hardcoded for now) see the booker's display name on each slot. No writes, no auth — just proves the full data → UI path is working end-to-end.

### Acceptance criteria

- [ ] Firebase and Firestore are initialised and connected
- [ ] `bookings` collection schema is in place with seed data
- [ ] Upcoming bookings render in a flat chronological list
- [ ] Guest view shows "Your booking" for email-matched entries, "Court booked" for all others
- [ ] Member view shows booker display name on each entry
- [ ] TanStack Query handles loading and error states

---

## Phase 2: Guest booking creation

**User stories**: 1, 2, 3, 4, 5, 6, 7, 8, 9

### What to build

Booking form for guests. Native datetime input for start time; end time pre-filled as start + 2h, editable. Inline conflict detection runs as the user types — flags overlapping bookings before submission. On submit, write to Firestore and show a success dialog displaying the booked date and time. GuestSession module handles localStorage persistence of email and name for prefill on return visits.

### Acceptance criteria

- [ ] Booking form renders with native datetime input
- [ ] End time pre-fills as start + 2h and is editable
- [ ] Inline conflict detection highlights overlap as the user types
- [ ] Conflicting times are hard-blocked on submission
- [ ] Successful submission writes to Firestore and updates the list
- [ ] Success dialog shows booked date and time
- [ ] Email and name are saved to localStorage and pre-filled on return
- [ ] `GuestSession` tracks booking count
- [ ] `hasConflict` pure function has unit tests covering: no bookings, exact overlap, partial overlap (start), partial overlap (end), adjacent (no overlap), multiple bookings
- [ ] `GuestSession` has unit tests for localStorage read/write and booking count behaviour

---

## Phase 3: Guest cancellation + nudge

**User stories**: 13, 14, 15, 16, 17, 18, 19

### What to build

Delete button on guest bookings in the upcoming list — visible to all users (guests and members alike can delete any guest booking). On delete, remove from Firestore and update the list.

Add the NudgePrompt to the success dialog. It renders on every 2nd booking, determined by `GuestSession.shouldShowNudge()`. Lists the 4 member advantages and is dismissible without blocking the confirmation.

### Acceptance criteria

- [ ] Delete button is visible on all guest bookings
- [ ] Deleting a guest booking removes it from Firestore and the list
- [ ] NudgePrompt appears in the success dialog on the 2nd, 4th, 6th... guest booking
- [ ] NudgePrompt lists all 4 member advantages
- [ ] NudgePrompt is dismissible and does not block the confirmation
- [ ] `GuestSession.shouldShowNudge()` unit tests: false on 1st, true on 2nd, false on 3rd, true on 4th booking

---

## Phase 4: Auth — sign up / sign in / sign out

**User stories**: 20, 21, 22, 23, 24, 25, 26, 27, 28

### What to build

Sign-up and sign-in forms inside a modal (desktop) or drawer (mobile). Sign-up collects email, password, and display name; creates Firebase Auth user and a matching `users` Firestore document; sends a verification email. Sign-in uses email + password with a persistent session. Forgot password triggers Firebase's default reset email.

Unverified members get full access but see a discrete persistent banner with a resend link. Header updates to show display name + sign-out for authenticated users, and sign-in / create account links for guests.

### Acceptance criteria

- [ ] Sign-up form creates a Firebase Auth user and a `users` Firestore document
- [ ] Verification email is sent on sign-up
- [ ] Unverified members see a persistent banner with a resend link
- [ ] Banner disappears after email is verified
- [ ] Sign-in establishes a persistent session
- [ ] "Forgot password" triggers Firebase reset email
- [ ] Sign-out clears the session and returns to guest state
- [ ] Auth forms open as modal on desktop and drawer on mobile
- [ ] Header reflects auth state correctly

---

## Phase 5: Member experience + migration

**User stories**: 29, 30, 31, 34, 35, 36, 43, 44

### What to build

Member booking flow: name and email pre-filled from account, same datetime form and conflict detection as guests. Member bookings are tied to `ownerUid`.

Cancellation rules: members can delete their own member bookings from any device; they retain the ability to delete any guest booking; they cannot delete other members' bookings. Delete controls in the list are rendered conditionally based on these rules.

On sign-up, run `MigrationService`: query Firestore for guest bookings matching the new member's email and silently reassign them to the member account.

### Acceptance criteria

- [ ] Member booking form pre-fills name and email from account
- [ ] Member bookings are stored with `ownerUid` set
- [ ] Delete button shown on own member bookings (visible from any device when signed in)
- [ ] Delete button shown on guest bookings for members
- [ ] Delete button not shown on other members' bookings
- [ ] On sign-up, guest bookings with matching email are reassigned to the new uid
- [ ] Migrated bookings follow member cancellation rules
- [ ] `MigrationService` unit tests: matching bookings are reassigned, non-matching bookings are untouched

---

## Phase 6: History view

**User stories**: 37, 38, 39

### What to build

A history section rendered below the upcoming bookings list, visible to members only. A year picker lets the user navigate past years. Selecting a year queries Firestore for all bookings (members and guests) in that year and renders them with full details — name, date, and time.

### Acceptance criteria

- [ ] History section is not rendered for guest users
- [ ] Year picker is populated from the earliest booking year to the current year
- [ ] Selecting a year loads and displays all bookings for that year
- [ ] All booking details are shown: booker name, date, time
- [ ] Loading and empty states are handled

---

## Phase 7: Profile

**User stories**: 40, 41, 42

### What to build

A profile section for signed-in members. Allows editing display name (updates both the `users` Firestore document and future bookings display). Email is shown read-only. Phone number is an optional field the member can add or update.

### Acceptance criteria

- [ ] Signed-in members can view their display name, email, and phone number
- [ ] Display name is editable and saves to Firestore
- [ ] Email is read-only
- [ ] Phone number is optional and editable
- [ ] Profile is not accessible to guests
