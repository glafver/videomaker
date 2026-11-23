# Videomaker

Videomaker is an application in which the user can create a video slideshow from
uploaded photos. The user can configure the order of slides, the duration of each
slide, transitions between slides, and add a soundtrack. After the video is ready
the user can save it to their device, share a link, return to the settings, or
create a new video.

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
- Docker, Google Cloud Run (backend) / Netlify (frontend)

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

Projects are auto-saved to Firestore so they can be continued on another device.
Use the **"Copy project link"** button on the home page, then open the link on
another device to load the slides and settings.

> **Important:** enable Firestore in your Firebase project and allow the app to
> read/write the `projects` collection. A permissive rule for development:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId} {
      allow read, write: if true;
    }
  }
}
```

> Tighten these rules before production use. Cloud sync fails gracefully and
> the app still works with local storage alone if Firestore is unavailable.
