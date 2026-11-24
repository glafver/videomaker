# Videomaker

Videomaker is an application in which the user can create a video slideshow from
uploaded photos. The user can configure the order of slides, the duration of each
slide, transitions between slides, and add a soundtrack. After the video is ready
the user can download it, share a link, or create a new video.

> This monorepo was assembled from two separate repositories while **preserving
> their full commit history**:
> - [`glafver/videomaker_FE`](https://github.com/glafver/videomaker_FE) → `apps/frontend`
> - [`glafver/videomaker_BE`](https://github.com/glafver/videomaker_BE) → `apps/backend`

## Structure

```
videomaker/
├── apps/
│   ├── frontend/   # React + Vite + Bootstrap + Sass (Sass) client
│   └── backend/    # Node.js + Express + ffmpeg + ImageMagick server
└── package.json    # npm workspaces root
```

## Tech stack

- React, React Router, Bootstrap, Sass (Sass), Vite
- Node.js, Express.js
- Firebase (Storage)
- ffmpeg, ImageMagick
- Single Docker image (client + API), Google Cloud Run; Netlify optional

## Getting started

```bash
# 1. Install all workspace dependencies
npm install

# 2. Configure environment
cp apps/frontend/.env.example apps/frontend/.env
cp apps/backend/.env.example  apps/backend/.env
#   -> fill in your Firebase config, server URL and deploy URL

# 3. Run the backend (requires ffmpeg + ImageMagick installed)
npm run dev:backend

# 4. Run the frontend (in another terminal)
npm run dev:frontend
```

Useful scripts (from the repo root):

| Command | Description |
| --- | --- |
| `npm run dev:frontend` | Start the Vite dev server |
| `npm run dev:backend`  | Start the Express server |
| `npm run build:frontend` | Production build of the client |
| `npm run start:backend`  | Start the server (production) |
| `npm test` | Run the frontend and backend test suites |
| `npm run test:frontend` | Frontend unit/component tests (Vitest + Testing Library) |
| `npm run test:backend` | Backend unit and API tests (Vitest + Supertest) |

## Run everything in one container

The root `Dockerfile` builds the React client and the Express API into a single
image: Express serves `/video`, `/status`, `/health`, `/transition-preview` and
the built SPA from `./public`.

```bash
docker build \
  --build-arg VITE_FIREBASE_API_KEY=... \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=... \
  --build-arg VITE_FIREBASE_PROJECT_ID=... \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET=... \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=... \
  --build-arg VITE_FIREBASE_APP_ID=... \
  --build-arg VITE_DEPLOY_URL=https://your-domain.example \
  -t videomaker .

docker run --rm -p 8080:8080 \
  -e FIREBASE_API_KEY=... \
  -e FIREBASE_AUTH_DOMAIN=... \
  -e FIREBASE_PROJECT_ID=... \
  -e FIREBASE_STORAGE_BUCKET=... \
  -e FIREBASE_MESSAGING_SENDER_ID=... \
  -e FIREBASE_APP_ID=... \
  -e CORS_ORIGIN=http://localhost:8080 \
  videomaker
```

Then open http://localhost:8080. Notes:

- `VITE_*` values are baked in at build time; the `FIREBASE_*`/`CORS_ORIGIN`
  values are runtime environment variables (no `.env` is copied into the image).
- `VITE_SERVER_BASE_URL` defaults to empty, so the client calls the API on the
  same origin. `VITE_DEPLOY_URL` builds share links; if empty the browser origin
  is used.
- Do **not** set `IMAGEMAGICK_BIN` in the container — it is auto-detected
  (`magick`/`convert`) after `apk add imagemagick`.
- On Cloud Run: set the runtime env vars above, give it ~1–2 GiB of memory and a
  longer request timeout (video rendering), and add the Cloud Run domain to
  Firebase Auth → Authorized domains.

## Testing

```bash
npm test              # both workspaces
npm run test:frontend # Vitest + jsdom + Testing Library
npm run test:backend  # Vitest + Supertest (no ffmpeg required)
```

Backend tests cover the pure request/render helpers (`apps/backend/lib/video.js`)
and the HTTP validation paths; they never start ffmpeg or touch Firebase.
Frontend tests cover helpers, the shared video card, upload ordering in
`SlidesContext` and the "create a new video" cleanup behaviour.

## Design

The visual identity uses a sage / coral palette with the Gilroy typeface.
See `apps/frontend/src/assets/scss/_colors.scss` and `_fontStyles.scss`.

## Cloud sync (Firestore)

Projects are auto-saved to Firestore (debounced) under the device id, so the
editor survives reloads; signed-in users' projects and videos live under
`users/{uid}/projects` and `users/{uid}/videos`.

> **Important:** enable Firestore and Storage, and allow the app to read/write
> these collections. Permissive rules for development only:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId} {
      allow read, write: if true;
    }
    match /users/{userId}/{document=**} {
      allow read, write: if true;
    }
  }
}
```

> Tighten these rules before production use (scope `users/*` to
> `request.auth.uid`). Cloud sync fails gracefully and the app still works with
> local storage alone if Firestore is unavailable.
