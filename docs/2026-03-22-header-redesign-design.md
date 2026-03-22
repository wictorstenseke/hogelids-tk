# Header Redesign — Design Spec

**Date:** 2026-03-22
**Status:** Approved

## Overview

Restructure the app header into a two-row layout with responsive navigation. Remove the app title text, center and enlarge the logo, and replace the nav items in AvatarMenu with dedicated mobile (MenyButton) and desktop (DesktopNav) navigation components.

## Goals

- Logo on its own centered row, slightly larger, no title text
- Mobile: "Meny" text button (left) with context menu for nav items + Profile button (right)
- Desktop: text nav buttons with pill hover (right-aligned) + Profile button
- AvatarMenu scoped to account-level actions only (Min profil, Logga ut)

## Component Structure

### New components

**`src/routes/-components/Header.tsx`**
Top-level header shell. Replaces the `<header>` block in `HomePage.tsx`. Receives `user`, `authLoading`, `onOpenProfile`, and `onSignOut` as props. Computes `isAdmin` via `useRole()` / `isAdminRole()` and `ladderEnabled` via `useAppSettings()` internally, then passes them as props to `MenyButton` and `DesktopNav`. Renders two rows: Row 1 (nav controls) and Row 2 (centered logo).

**`src/routes/-components/MenyButton.tsx`**
Mobile-only (`flex sm:hidden`). Receives `isAdmin: boolean` and `ladderEnabled: boolean` as props. Renders a plain "Meny" text button that opens a left-anchored context menu dropdown with conditional nav items. Has `aria-expanded` and `aria-haspopup="menu"` attributes. Renders `null` when both props are false or when the user is not authenticated (nav items require login).

**`src/routes/-components/DesktopNav.tsx`**
Desktop-only (`hidden sm:flex`). Receives `isAdmin: boolean` and `ladderEnabled: boolean` as props. Renders Stegen and Admin as pill-hover text buttons. Renders `null` when no items are visible.

### Modified components

**`src/routes/-components/AvatarMenu.tsx`**
Remove Stegen and Admin items. Keep only Min profil and Logga ut. Also remove the now-unused `useRole`, `isAdminRole`, and `useAppSettings` hook calls and their imports.

**`src/routes/-components/HomePage.tsx`**
Replace the inline `<header>` block with `<Header user={user} authLoading={authLoading} onOpenProfile={...} onSignOut={...} />`.

## Layout

```
Row 1 (flex items-center):
  Left:  MenyButton (mobile) | DesktopNav (desktop) | nothing when no items
  Right: auth controls (ml-auto)

Row 2 (flex justify-center):
  [Logo — 72px mobile / 80px sm+, TanStack Router <Link to="/">]
```

Auth controls use `ml-auto` to stay right-aligned regardless of what the left side renders.

**Auth loading state:** While `authLoading` is true, Row 1 right side renders `null` — matching the existing pattern in `HomePage.tsx`.

**Unauthenticated users:** MenyButton and DesktopNav both render `null`. Row 1 right side shows "Logga in" + "Skapa konto" buttons once `authLoading` resolves.

Container stays within existing `max-w-lg px-4 py-4`.

## Styling Details

**Logo:**

- Size: `w-[72px] sm:w-[80px] h-auto` — up from 48px/56px
- Retain existing `drop-shadow` filter and `hover:scale` transition
- Wrapped in TanStack Router `<Link to="/">` (not a plain `<a>` tag)
- Title `<h1>` removed entirely

**MenyButton:**

- Button: plain text, no border/background, `min-h-[44px]` for touch target
- Dropdown: `bg-white shadow-lg rounded-xl border border-gray-100`, left-anchored
- Items: `flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50`
- Click-outside detection via `useEffect` + `useRef` (matches AvatarMenu pattern)

**DesktopNav buttons:**

```
px-3 py-1.5 rounded-full text-sm font-medium text-gray-700
hover:bg-gray-100 transition-colors duration-150
```

## Conditional Logic

| Item       | Condition                                          | Visibility                    |
| ---------- | -------------------------------------------------- | ----------------------------- |
| Stegen     | `ladderEnabled === true` AND user is authenticated | MenyButton, DesktopNav        |
| Admin      | User has admin role (authenticated)                | MenyButton, DesktopNav        |
| MenyButton | At least one item visible AND user authenticated   | Mobile only (flex sm:hidden)  |
| DesktopNav | At least one item visible AND user authenticated   | Desktop only (hidden sm:flex) |

## Out of Scope

- No changes to route structure or Firestore
- No changes to AvatarMenu trigger button appearance
- No changes to sign-in/create account button styling
