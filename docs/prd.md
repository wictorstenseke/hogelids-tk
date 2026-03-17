# PRD — Högelids Tennisklubb Court Booking App

## Problem Statement

Members and guests of Högelids Tennisklubb have no digital way to book the club's tennis court. Scheduling is handled informally, leading to double bookings, lack of visibility into court availability, and no historical record of usage. The club needs a frictionless booking experience that works for occasional guests and regular members alike, without requiring an account to get started.

---

## Solution

A single-page web app where anyone can book the court by providing their name, email, and desired time. Signed-in members get richer features: they can see who booked each slot, manage bookings from any device, and access full club history. The experience is intentionally lightweight — no payment, no admin complexity, no friction at the door.

The app is built with React, TypeScript, TanStack Router, TanStack Query, and Firebase (Auth + Firestore), deployed to GitHub Pages.

---

## User Stories

### Guest — Booking

1. As a guest, I want to book the court by entering my name, email, and a start time, so that I can secure court time without creating an account.
2. As a guest, I want the end time to be pre-filled as 2 hours after my chosen start time, so that I don't have to calculate it manually.
3. As a guest, I want to be able to adjust the end time, so that I can book shorter or longer sessions when needed.
4. As a guest, I want to use my phone's native date and time picker, so that the booking experience feels natural on iOS and Android.
5. As a guest, I want to see inline feedback if my chosen time overlaps with an existing booking, so that I know immediately and can adjust before submitting.
6. As a returning guest, I want my name and email to be pre-filled, so that I don't have to type them again.
7. As a guest, I want a confirmation dialog showing my booked date and time after submitting, so that I know the booking went through.
8. As a guest, I want to be able to book multiple slots on the same day, so that I'm not artificially limited.
9. As a guest, I want to book at any time of day with no advance limit, so that I can plan spontaneously or well ahead.

### Guest — Visibility

10. As a guest, I want to see all upcoming bookings in a flat chronological list, so that I can get a quick overview of court availability.
11. As a guest, I want my own upcoming bookings to be labelled "Your booking", so that I can identify them at a glance.
12. As a guest, I want other bookings to show as "Court booked" (anonymous), so that I can see availability without seeing personal details.
13. As a guest, I do not want to see a history section, as past bookings are not relevant to me.

### Guest — Cancellation

14. As a guest, I want to delete any guest booking, so that I can free up court time if plans change.
15. As a guest, I want a delete option visible on guest bookings in the list, so that cancellation is self-service.

### Guest — Nudge to Register

16. As a guest on my 2nd booking, I want to see a prompt in the success dialog explaining the benefits of a member account, so that I can make an informed decision about signing up.
17. As a guest, I want the nudge to appear every 2nd booking, so that I'm reminded periodically without being spammed.
18. As a guest, I want to dismiss the nudge easily, so that it doesn't block my confirmation.
19. As a guest, I want the nudge to clearly state the 4 member advantages: cancel from any device, see who booked each slot, my name shown on bookings, and access to club tournaments.

### Member — Account

20. As a new user, I want to sign up with email, password, and a display name, so that I can create a member account quickly.
21. As a new member, I want to receive a confirmation email with a verification link, so that my account email is validated.
22. As an unverified member, I want full access to the app while a discreet banner reminds me to verify, so that I'm not blocked from using the service.
23. As an unverified member, I want a resend verification link in the banner, so that I can re-trigger the email if needed.
24. As a member, I want to sign in with email and password, so that I can access my account.
25. As a member, I want my session to persist by default, so that I don't have to sign in every visit.
26. As a member, I want a "Forgot password" link on the sign-in form, so that I can recover my account via email.
27. As a member, I want to sign out from the header, so that I can log off on shared devices.
28. As a member, I want the sign-in and sign-up forms to open as a modal on desktop and a drawer on mobile, so that the experience feels native to my device.

### Member — Booking

29. As a member, I want my name and email pre-filled from my account when booking, so that the form is minimal effort.
30. As a member, I want the same datetime input and conflict detection as guests, so that I know immediately if a slot is taken.
31. As a member, I want a booking confirmation dialog showing date and time after submitting.

### Member — Visibility

32. As a member, I want to see each booker's display name on upcoming bookings in the list, so that I know who is playing.
33. As a member, I want my own upcoming bookings to be visually distinguished in the list.

### Member — Cancellation

34. As a member, I want to delete any of my own member bookings from any device, so that I can cancel regardless of which device I used to book.
35. As a member, I want to delete any guest booking, so that I can help manage the court schedule.
36. As a member, I cannot delete another member's booking, so that other members' plans are respected.

### Member — History

37. As a member, I want a dedicated history section below the upcoming list, so that I can browse past bookings.
38. As a member, I want to filter history by year using a year picker, so that I can navigate large amounts of data easily.
39. As a member, I want to see all bookings in history — members and guests — with full details (name, date, time), so that I have a complete club record.

### Member — Profile

40. As a member, I want to view and edit my display name, so that I can update how I appear on bookings.
41. As a member, I want to see my email address (read-only), so that I know which email is tied to my account.
42. As a member, I want to optionally add a phone number to my profile.

### Migration

43. As a new member signing up with an email that has existing guest bookings, I want those bookings to be silently claimed to my account, so that my history is complete from day one.
44. As a member with claimed guest bookings, I want those bookings to follow member cancellation rules (deletable from any device).

---

## Implementation Decisions

### Modules

**`AuthService`**

- Wraps Firebase Authentication
- Exposes: `signUp(email, password, displayName)`, `signIn(email, password)`, `signOut()`, `sendPasswordReset(email)`, `resendVerification()`, `currentUser` observable
- Handles persistent sessions (Firebase default)
- Interface is narrow and stable — auth logic does not leak into UI components

**`BookingService`**

- Wraps Firestore for all booking CRUD
- Exposes: `getUpcomingBookings()`, `getHistoryByYear(year)`, `createBooking(data)`, `deleteBooking(id)`
- Contains a pure `hasConflict(bookings, proposedStart, proposedEnd): boolean` function — no Firebase dependency, fully testable
- Distinguishes guest bookings (email identifier) from member bookings (uid identifier)

**`GuestSession`**

- Manages localStorage only — no Firebase
- Persists: email, name, guest booking count
- Exposes: `getStoredEmail()`, `getStoredName()`, `incrementBookingCount()`, `getBookingCount()`, `shouldShowNudge(): boolean` (true on every 2nd booking)

**`MigrationService`**

- Runs once at sign-up completion
- Queries Firestore for guest bookings matching the new member's email
- Silently reassigns `ownerUid` and changes booking type to `member`
- No user-facing interaction

**`BookingForm`** (UI)

- Native `datetime-local` input for start time; derived end time field (+2h, editable)
- Subscribes to upcoming bookings and runs `hasConflict` inline on input change
- On submit: writes via `BookingService`, shows success dialog
- Success dialog conditionally renders `NudgePrompt` based on `GuestSession.shouldShowNudge()`

**`BookingList`** (UI)

- Reads upcoming bookings from `BookingService` via TanStack Query
- Renders permission-aware labels and delete controls based on auth state
- Guest view: "Your booking" (email match) or "Court booked"
- Member view: booker display name, own bookings visually distinguished

**`HistoryView`** (UI, members only)

- Year picker derived from earliest booking year to current year
- Queries `BookingService.getHistoryByYear(year)` on year change
- Not rendered for guest users

**`NudgePrompt`** (UI)

- Rendered inside `BookingForm` success dialog
- Dismissible inline; does not block confirmation
- Increments `GuestSession` count on each guest booking regardless of nudge visibility

### Data Model (Firestore)

**`bookings` collection**

```
{
  id: string,
  type: "guest" | "member",
  ownerEmail: string,         // always set; used for guest matching and migration
  ownerUid: string | null,    // null for guest bookings
  ownerDisplayName: string,   // name at time of booking
  startTime: Timestamp,
  endTime: Timestamp,
  createdAt: Timestamp
}
```

**`users` collection** (members only, mirrors Firebase Auth)

```
{
  uid: string,
  email: string,
  displayName: string,
  phone: string | null,
  createdAt: Timestamp
}
```

### Auth State in UI

- React context provides `currentUser` (null for guests)
- Header renders sign-in/create account links for guests; display name + sign-out for members
- No route-level auth guards — no login walls

### Conflict Detection Logic

A proposed booking conflicts if any existing booking overlaps: `proposedStart < existingEnd && proposedEnd > existingStart`. This is a pure function with no side effects, suitable for inline UI validation and server-side write validation.

### Firestore Security Rules

- Anyone can read all bookings
- Anyone can create a booking (guest or member)
- Guest bookings (`type: "guest"`) can be deleted by anyone
- Member bookings (`type: "member"`) can only be deleted by the matching `ownerUid`

---

## Testing Decisions

**What makes a good test:** Tests should verify external behavior — inputs and outputs — not implementation details. Don't test that a function calls a specific Firebase method; test that given a set of bookings, the right conflict is detected, or that localStorage returns the right nudge state.

### Modules to test

**`BookingService` — `hasConflict`**

- Pure function with no dependencies — ideal unit test target
- Cases: no bookings, exact same time, partial overlap start, partial overlap end, fully contained, adjacent (no overlap), multiple bookings
- This logic is critical: a bug here means double bookings

**`GuestSession`**

- Test localStorage read/write for email, name, count
- Test `shouldShowNudge()` returns false on 1st, true on 2nd, false on 3rd, true on 4th booking
- Use `localStorage` mock (jsdom provides this in the test environment)

**`MigrationService`**

- Test that bookings matching email are reassigned to uid
- Test that bookings not matching email are untouched
- Mock Firestore — this is the one place a mock is appropriate since we're testing reassignment logic, not Firebase itself

---

## Out of Scope

- Ladder and tournament features _(post-MVP)_
- Payment or court fees
- Admin dashboard and booking on/off toggle _(post-MVP)_
- Multiple courts
- Push notifications or email reminders
- Guest booking confirmation emails
- Password reset beyond Firebase default flow
- Social login (Google, Apple, etc.)

---

## Further Notes

- The app is deployed to GitHub Pages at `/hogelids-tk/` — all routing and Firebase config must account for this base path.
- Firebase credentials are stored in `.env.local` (gitignored). The CI pipeline will need these as GitHub Actions secrets for the build step.
- The "tournament" advantage in the nudge prompt should be written as forward-looking but credible — the feature is planned immediately post-MVP.
- Branding is anchored to [hogelidstennis.se](https://www.hogelidstennis.se): white/neutral base, yellow `#F1E334` accent, clean sans-serif, utilitarian community feel. Exact brand tweaks are deferred — the app should be functional and on-brand enough for launch.
