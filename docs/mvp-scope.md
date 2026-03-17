# 🎾 Högelids Tennisklubb — Booking App MVP Scope

## Overview

A single-page court booking app for Högelids Tennisklubb. The experience is intentionally frictionless — anyone can book a court with just their name and email, while signed-in members enjoy richer social visibility and profile features.

**Brand reference:** [hogelidstennis.se](https://www.hogelidstennis.se) — white/neutral base, yellow (`#F1E334`) accent, clean sans-serif, utilitarian community feel.

---

## Core Concept: Guest vs. Member

### Guest User _(not signed in)_

A guest books using name and email without creating an account. Zero friction — never punished for not having an account, but gently nudged toward creating one.

**Booking**

- Books by providing name, email, date and start time
- Uses **native datetime controls** — one combined field where possible for seamless iOS/Android
- Default duration is **2 hours** — end time is pre-filled as start + 2h, but the user **can change it**
- Inline conflict validation **as the user types** — highlights overlap before submission
- No advance booking limit, no limit on bookings per person per day
- Court is available **24/7** — no opening hours restriction
- Email and name **pre-filled on return visits** via localStorage
- **Confirmation email not sent** to guests

**Cancellations**

- Any guest (not signed in) can delete **any guest booking** — no device restriction, no ownership check
- Cannot delete member bookings

**Visibility in Main List**

- Guests see all upcoming bookings in the main list
- Their own bookings are labelled **"Your booking"**; others show as **"Court booked"** (anonymous)
- No history section — not relevant for guests

**Nudge to Register — The "One Password Away" Prompt**

- Appears in the **booking success dialog** on every **2nd booking**
- Copy: _"You've booked again — you're clearly a regular! You're one password away from a full member account."_
- Lists key advantages:
  1. Cancel bookings from any device
  2. See who booked each slot (display names on the calendar)
  3. Your name shown on bookings
  4. Join and follow club tournaments _(coming right after MVP)_
- Dismissible; shown again on every 2nd subsequent booking

---

### Member User _(signed in)_

An account requires email, password, and display name. Email must be verified before the account is considered fully trusted, but access is **not blocked** — an unverified member sees a **discrete persistent banner** with a resend verification link.

**Booking**

- Same flow as guest; name and email pre-filled from account
- Bookings tied to their account

**Cancellations**

- Can delete any of **their own member bookings** from any device
- Can also delete **any guest booking** (same permissions as a guest)
- Cannot delete other members' bookings

**Visibility in Main List**

- Upcoming bookings show the **booker's display name** on each slot
- Their own bookings are visually distinguished

**History Section** _(members only)_

- Browsable by year via a year picker
- Shows **all bookings** — members and guests — with full details (name, date, time)
- Guests do not have access to this section

**Guest Booking Migration**

- On sign-up, if guest bookings exist with the same email, they are **silently claimed** and tied to the new member account
- These bookings then follow member cancellation rules (deletable from any device)

**Profile**

- Display name _(shown on bookings)_
- Email _(read-only for MVP)_
- Phone number _(optional)_

---

## The Single Page

### 1. Upcoming Bookings List

- Flat chronological list of **all upcoming bookings**
- No day-based filtering on main view — all days visible, scroll through
- Guest view: own bookings labelled "Your booking", others labelled "Court booked"
- Member view: each booking shows the booker's display name
- Delete button shown only on bookings the user is permitted to cancel

### 2. Booking Form

- Native datetime input for start time (one combined field where the platform supports it)
- End time pre-filled as start + 2h, editable
- Inline conflict detection as start/end time is entered
- For guests: name + email (pre-filled) + datetime
- For members: just the datetime — name and email already known
- Simple confirmation step before submitting
- On success: **confirmation dialog** showing the booked date and time
- On every 2nd booking for guests: nudge prompt shown in this dialog

### 3. History _(members only)_

- Separate section below upcoming bookings
- Year picker for browsing past bookings
- Shows all bookings (all players) with full details

---

## Authentication Flow

**Sign Up** — email, password, display name. **Confirmation email sent with verification link.**

**Unverified accounts** — full access, but a discrete banner persists until the email is verified. Banner includes a resend link.

**Sign In** — email + password. Persistent session, remember me on by default. Includes a **"Forgot password"** link (Firebase default reset flow).

**Sign Out** — accessible from the header.

**UI** — sign-up and sign-in open as a **modal on desktop / drawer on mobile**.

**UI State** — header shows _Sign in / Create account_ for guests, or the member's display name when signed in. No login walls.

---

## Out of Scope for MVP

- Ladder / tournament features _(post-MVP, coming soon)_
- Payment or court fees
- Admin dashboard _(including booking on/off toggle — post-MVP)_
- Multiple courts
- Notifications
- Booking confirmation emails for guests/members

---

## Resolved Design Decisions

| Decision                 | Resolution                                                       |
| ------------------------ | ---------------------------------------------------------------- |
| Court hours              | 24/7, no restrictions                                            |
| Booking duration         | Default 2h (pre-filled), user can adjust end time                |
| Start time input         | Free input via native datetime field; no fixed slot grid         |
| Conflict detection       | Inline, as user types — hard block on submission                 |
| Advance booking limit    | None                                                             |
| Per-person booking limit | None                                                             |
| Guest cancellation       | Any guest can delete any guest booking                           |
| Member cancellation      | Own member bookings + any guest booking                          |
| History access           | Members only                                                     |
| Guest → member migration | Silent, on sign-up by email match                                |
| Email verification       | Required but non-blocking; banner shown until verified           |
| Nudge trigger            | Every 2nd guest booking, in success dialog                       |
| Nudge advantages         | Device-free cancellation, see bookers, display name, tournaments |
| Club name                | Högelids Tennisklubb                                             |
| Brand reference          | hogelidstennis.se — white, yellow `#F1E334`, minimalist          |
