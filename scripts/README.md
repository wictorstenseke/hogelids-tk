# Scripts

## archive:build

Regenerates `public/history-archive.json` from prod Firestore.

**When to run:**

- Once after Jan 1 each year to roll the previous year into the archive
- Anytime you want to refresh archived data (e.g. after a backfill correction)

**Auth:**

- Either set `GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json`
- Or run `gcloud auth application-default login` against the prod project

**Run:**

```bash
npm run archive:build
```

Then commit `public/history-archive.json`.

**Override project (default `hogelids-tk-prod`):**

```bash
FIREBASE_PROJECT_ID=hogelids-tk-dev npm run archive:build
```

## backfill:names

One-off repair for member bookings that were migrated from guest bookings
before `migrateGuestBookings()` started copying the display name. Those rows
have `ownerDisplayName === ownerEmail`, so the booking list shows the email
instead of the member's name. This script finds them (linked `ownerUid` +
`ownerDisplayName === ownerEmail`) and sets `ownerDisplayName` to the live
`users/{ownerUid}.displayName`.

**When to run:** once per project after deploying the migration fix. New
sign-ups/sign-ins are handled by the code fix; this only repairs existing rows.

**Auth:** same as `archive:build` (`GOOGLE_APPLICATION_CREDENTIALS` or
`gcloud auth application-default login`).

**Dry run first (default — no writes):**

```bash
npm run backfill:names                          # prod
FIREBASE_PROJECT_ID=hogelids-tk-dev npm run backfill:names   # dev
```

**Apply:**

```bash
npm run backfill:names -- --apply               # prod
FIREBASE_PROJECT_ID=hogelids-tk-dev npm run backfill:names -- --apply   # dev
```

Run for **both** `hogelids-tk-dev` and `hogelids-tk-prod`.
