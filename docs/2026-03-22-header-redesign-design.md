# Header Redesign — Design Spec

**Date:** 2026-03-22
**Status:** Approved

## Overview

Restructure the app header into a two-row layout with responsive navigation. Remove the app title text, center and enlarge the logo, and replace the nav items in AvatarMenu with dedicated mobile (Meny) and desktop (DesktopNav) navigation components.

## Goals

- Logo on its own centered row, slightly larger, no title text
- Mobile: "Meny" text button (left) with context menu for nav items + Profile button (right)
- Desktop: text nav buttons with pill hover (right-aligned) + Profile button
- AvatarMenu scoped to account-level actions only (Min profil, Logga ut)

## Component Structure

### New components

**`src/routes/-components/Header.tsx`**
Top-level header shell. Replaces the `<header>` block in `HomePage.tsx`. Renders two rows:

- Row 1: nav controls (responsive)
- Row 2: centered logo

**`src/routes/-components/MenyButton.tsx`**
Mobile-only. Renders a plain "Meny" text button that opens a left-anchored context menu dropdown with conditional nav items (Stegen, Admin). Renders `null` when the user has no accessible nav items (unauthenticated or no rights).

**`src/routes/-components/DesktopNav.tsx`**
Desktop-only (`hidden sm:flex`). Renders Stegen and Admin as pill-hover text buttons, conditional on rights. Renders `null` when no items.

### Modified components

**`src/routes/-components/AvatarMenu.tsx`**
Remove Stegen and Admin items. Keep only Min profil and Logga ut.

**`src/routes/-components/HomePage.tsx`**
Replace inline `<header>` block with `<Header />`.

## Layout

```
Row 1 (flex justify-between items-center):
  Mobile:  [MenyButton]        [AvatarMenu | sign-in buttons]
  Desktop: [spacer div]        [DesktopNav + AvatarMenu | sign-in buttons]

Row 2 (flex justify-center):
  [Logo — 72px mobile / 80px sm+, Link to "/"]
```

Container stays within existing `max-w-lg px-4 py-4`.

For unauthenticated users: no MenyButton on mobile, no DesktopNav on desktop — only sign-in/create account buttons on the right.

## Styling Details

**Logo:** `w-[72px] sm:w-[80px] h-auto` — up from 48px/56px. Title `<h1>` removed.

**MenyButton context menu:**

- Dropdown: `bg-white shadow-lg rounded-xl border border-gray-100`, left-anchored
- Items: `flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50`
- Click-outside detection via `useEffect` + `useRef` (matches AvatarMenu pattern)

**DesktopNav buttons:**

```
px-3 py-1.5 rounded-full text-sm font-medium text-gray-700
hover:bg-gray-100 transition-colors duration-150
```

## Conditional Logic

| Item       | Condition                       | Where shown            |
| ---------- | ------------------------------- | ---------------------- |
| Stegen     | `ladderEnabled` setting is true | MenyButton, DesktopNav |
| Admin      | User has admin role             | MenyButton, DesktopNav |
| MenyButton | At least one item visible       | Mobile only            |
| DesktopNav | At least one item visible       | Desktop only           |

## Out of Scope

- No changes to route structure or Firestore
- No changes to AvatarMenu trigger button appearance
- No changes to sign-in/create account button styling
