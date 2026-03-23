# Plan: Guest Booking Nudge Revamp

> Source: Grill session 2026-03-23 — replace inline signup form with value-prop card + AuthModal CTAs

## Architectural decisions

- **No new routes**: everything stays on `/`, no navigation changes
- **Auth modal**: `AuthModal` is the single source of truth for sign-in/sign-up UI — nudge does not duplicate form fields
- **Nudge variant logic**: driven by `GuestSession.getBookingCount()` — count 1 = full, count 2+ = compact
- **Context pattern**: `AuthModalContext` is the mechanism for deep components to open `AuthModal` without prop drilling
- **Migration**: `migrateGuestBookings` runs on both sign-up and sign-in — ensures guest bookings are claimed regardless of which flow the user takes

---

## Phase 1: Auth infrastructure + migration fix

**Covers**: AuthModalContext, initialEmail prop, sign-in migration

### What to build

Create an `AuthModalContext` that exposes `openAuthModal(view: 'sign-in' | 'sign-up', initialEmail?: string)`. Mount the provider and `AuthModal` rendering in `AppShell`, replacing the current local `authModal` state. Refactor `Header` to consume the context instead of receiving `onSignIn`/`onSignUp` props.

Add an `initialEmail` prop to `AuthModal` that pre-fills the email field on mount for all views.

In `AuthService.signIn`, call `migrateGuestBookings` after a successful sign-in — same silent fire-and-forget pattern already used in `signUp`.

### Acceptance criteria

- [ ] `openAuthModal('sign-up', 'test@example.com')` opens the modal with email pre-filled and the sign-up view active
- [ ] `openAuthModal('sign-in', 'test@example.com')` opens the modal with email pre-filled and the sign-in view active
- [ ] Header sign-in/sign-up buttons still work via context (no prop regression)
- [ ] Signing in as a member whose email has guest bookings causes those bookings to be migrated to `type: 'member'`
- [ ] `migrateGuestBookings` errors on sign-in are caught silently and do not block the sign-in flow

---

## Phase 2: Revamp nudge + SuccessDialog layout

**Covers**: GuestSignupNudge variants, SuccessDialog conditional layout

### What to build

Replace the current `GuestSignupNudge` inline signup form with a value-prop card. The component renders in two variants based on booking count:

**Full variant** (1st booking — `bookingCount === 1`):

- Heading + advantages list ("Som inloggad kan du bland annat:")
- Yellow "Skapa konto" button
- "Har du redan ett konto? Logga in" text link
- "Nej tack" dismiss link at the bottom

**Compact variant** (2nd+ bookings — `bookingCount > 1`):

- Yellow "Skapa konto" button
- Subtle "Nej tack" inline below it

Both CTAs call `openAuthModal` from `AuthModalContext` with the guest's email pre-filled, and call `onDismiss` to close the SuccessDialog first.

In `SuccessDialog`: when `isGuestBooking` is true, hide the date/time block — show only the checkmark icon and "Bokning bekräftad!" heading above the nudge. When `isGuestBooking` is false (member booking), the dialog is unchanged.

### Acceptance criteria

- [ ] After 1st guest booking: full nudge shown with advantages list, "Skapa konto", "Logga in" link, "Nej tack"
- [ ] After 2nd+ guest booking: compact nudge shown with only "Skapa konto" and "Nej tack"
- [ ] "Skapa konto" closes SuccessDialog and opens AuthModal on sign-up view with email pre-filled
- [ ] "Logga in" link closes SuccessDialog and opens AuthModal on sign-in view with email pre-filled
- [ ] "Nej tack" closes SuccessDialog in both variants
- [ ] When nudge is shown, date/time is hidden — checkmark + "Bokning bekräftad!" still visible
- [ ] When nudge is not shown (member booking), SuccessDialog is unchanged
- [ ] No inline form fields (name, password) remain in `GuestSignupNudge`
