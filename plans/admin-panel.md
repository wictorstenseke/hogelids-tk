# Plan: Admin Panel

> Source PRD: Admin panel feature — grill-me session 2026-03-18

## Architectural decisions

- **Route**: `/admin` — real TanStack Router file-based route (`src/routes/admin.tsx`), not a conditional section on the homepage
- **Route guard**: Non-admins navigating to `/admin` are redirected to `/`; the "Admin" link is never rendered for regular users
- **Role schema**: `role: 'user' | 'admin' | 'superuser'` field added to `users/{uid}` Firestore document
- **Role storage**: Firestore only (not Firebase Custom Claims)
- **Bootstrap**: First superuser set manually in Firestore console — no in-app bootstrap mechanism
- **Settings schema**: Single Firestore document at `settings/app` with fields: `bookingEnabled: boolean`, `bannerVisible: boolean`, `bannerText: string`, `bannerLinkText?: string`, `bannerLinkUrl?: string`
- **Self-role-change**: Blocked at service level and in UI — a superuser cannot change their own role
- **Admin page layout**: Stacked sections, macOS/iOS settings feel — label + description on the left, control on the right

---

## Phase 1: Role system + admin route access

**User stories**:

- As a superuser/admin, I want an "Admin" link in my avatar menu, so that I can navigate to the admin panel
- As a regular user, I never see the "Admin" link, so that admin tools are hidden from me
- As a non-admin navigating directly to `/admin`, I am redirected to `/`, so that the page is protected
- As a superuser (bootstrapped manually), I can access the admin panel

### What to build

Add `role: 'user' | 'admin' | 'superuser'` to the Firestore user schema. Create a `UserRole` type and a `useRole` hook that reads the current user's role from Firestore in real time. Create a guarded `/admin` route that redirects anyone without admin/superuser role to `/`. The admin page can be a stub at this stage. Conditionally render an "Admin" link in `AvatarMenu` for admin and superuser roles only.

### Acceptance criteria

- [ ] `role` field exists on `users/{uid}` documents (default `'user'` for new signups)
- [ ] `useRole` hook returns the current user's role from Firestore, updates in real time
- [ ] Navigating to `/admin` as a regular user or guest redirects to `/`
- [ ] Navigating to `/admin` as admin/superuser renders the page (stub content is fine)
- [ ] "Admin" link appears in AvatarMenu for admin and superuser
- [ ] "Admin" link does not appear for regular users or guests
- [ ] Existing signup flow sets `role: 'user'` on new user documents

---

## Phase 2: App settings — booking toggle + banner

**User stories**:

- As an admin/superuser, I want to toggle the booking form on/off, so that I can close bookings during maintenance or off-season
- As a user, when booking is disabled I see a clear empty state ("Bokning är stängd") instead of the form
- As an admin/superuser, I want to write a banner message with an optional inline link, so that I can communicate club news to all users
- As an admin/superuser, I want to toggle banner visibility on/off independently of its content
- As a user, I see the banner above the booking form when it is active
- As a user, I see no banner element when it is hidden

### What to build

Create `AppSettingsService` that reads and writes the `settings/app` Firestore document. Create `useAppSettings` hook with a real-time listener. On the main page: render a `Banner` component above the booking form when `bannerVisible: true`; replace the booking form with a fixed empty state when `bookingEnabled: false`. On the admin page: add a booking toggle section (label/description left, toggle right) and a banner editor section (text field, optional link text + URL fields, visibility toggle). Changes save immediately on toggle/submit.

### Acceptance criteria

- [ ] `settings/app` document is created if it doesn't exist (defaults: `bookingEnabled: true`, `bannerVisible: false`)
- [ ] Toggling booking off in admin panel replaces the booking form with an empty state for all users in real time
- [ ] Toggling booking on restores the booking form
- [ ] Banner text and optional link can be set in the admin panel
- [ ] Banner visibility can be toggled on/off independently of content
- [ ] Banner renders above the booking form on the main page when visible
- [ ] Banner does not render when hidden, leaving no empty space
- [ ] Inline link in banner opens in a new tab when `bannerLinkUrl` is set
- [ ] Admin page shows current state of all settings on load

---

## Phase 3: User management

**User stories**:

- As a superuser, I want to see a list of all registered members, so that I can manage their roles
- As a superuser, I want to change a user's role (user/admin/superuser), so that I can grant or revoke admin access
- As a superuser, I cannot change my own role, so that I cannot accidentally demote myself
- As an admin (non-superuser), I can see the user list but cannot change any roles

### What to build

Add `listAllUsers()` and `updateUserRole(uid, role)` to `UserService`. The admin page gains a user list section: a table/list of all member accounts showing display name, email, and current role. For superusers, each row has a role selector and a save button. The current user's own row is non-editable. Admins see the list read-only. Write unit tests for `updateUserRole` covering: successful update, blocked self-update, and non-superuser attempting update.

### Acceptance criteria

- [ ] User list displays all `users/{uid}` documents (display name, email, role)
- [ ] Superusers see a role selector (user/admin/superuser) and save button per row
- [ ] Saving a role change updates the Firestore document and reflects immediately in the list
- [ ] The current user's own row has no editable controls (read-only)
- [ ] Admins see the user list without any editable controls
- [ ] `updateUserRole` is tested: successful update, self-update blocked, unauthorised role blocked
- [ ] User list is empty-state handled (no other members registered)
