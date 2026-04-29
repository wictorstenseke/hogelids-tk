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
