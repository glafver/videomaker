# Scheduled cleanup (Cloud Functions)

`cleanupExpiredProjects` runs once a day and removes projects whose `expiresAt`
is in the past. For each project it deletes:

- rendered videos: `{uid}/{videoId}.mp4` in Storage;
- video documents in `users/{uid}/videos`;
- project photos in Storage;
- the project document in `users/{uid}/projects`.

If a Storage/ Firestore delete fails, the project document is kept so the next
run retries. The client-side purge on the account page stays as an immediate
cleanup, but this function is the source of truth.

## One-time setup

The project must be on the **Blaze** plan and Cloud Scheduler must be enabled
(deploying the function usually prompts to enable the required APIs).

```powershell
npx firebase-tools login
npx firebase-tools use videomaker-926e8
```

## Deploy

```powershell
npm run deploy:functions
# or
npx firebase-tools deploy --only functions
```

The `predeploy` hook installs `functions/` dependencies.

## Run it now (without waiting for 03:00)

1. Open Google Cloud Console -> Cloud Scheduler for `videomaker-926e8`.
2. Find the job named like `firebase-schedule-cleanupExpiredProjects-europe-west1`.
3. Click **Run now**.

## Logs

```powershell
npm run logs:functions
# or filter
npx firebase-tools functions:log --only cleanupExpiredProjects
```

## Configuration

In `functions/index.js`:

- `schedule: 'every day 03:00'` - change the run time;
- `timeZone: 'Europe/Stockholm'` - scheduler time zone;
- `region: 'europe-west1'` - deployment region;
- `timeoutSeconds: 540` - max runtime.

Set `STORAGE_BUCKET` as a function env var only if the default bucket cannot be
resolved. In this project it is `videomaker-926e8.appspot.com`.

## Do not enable Firestore TTL on `expiresAt`

A Firestore TTL policy would delete the project document but leave the photos
and videos in Storage orphaned. This function deletes both together.
