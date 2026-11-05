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

## Design

The visual identity uses a sage / coral palette with the Gilroy typeface.
See `apps/frontend/src/assets/scss/_colors.scss` and `_fontStyles.scss`.
