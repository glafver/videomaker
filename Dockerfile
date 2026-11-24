# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1: build the React client (Vite). Firebase config is baked in at build
# time because Vite inlines VITE_* variables into the bundle.
# ---------------------------------------------------------------------------
FROM node:24-alpine AS frontend
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/backend/package.json ./apps/backend/package.json
RUN npm ci

COPY apps/frontend ./apps/frontend

ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID
# Same-origin API by default (empty base -> "/video", "/status/...").
ARG VITE_SERVER_BASE_URL=""
# Public URL used to build share links; empty -> window.location.origin.
ARG VITE_DEPLOY_URL=""

ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
    VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
    VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
    VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
    VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
    VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
    VITE_SERVER_BASE_URL=$VITE_SERVER_BASE_URL \
    VITE_DEPLOY_URL=$VITE_DEPLOY_URL

RUN npm run build --workspace @videomaker/frontend

# ---------------------------------------------------------------------------
# Stage 2: Express API + static client in one image (ffmpeg/ImageMagick added).
# ---------------------------------------------------------------------------
FROM node:24-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache ffmpeg imagemagick

ENV NODE_ENV=production \
    PORT=8080

COPY apps/backend/package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY apps/backend ./
COPY --from=frontend /app/apps/frontend/dist ./public

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
    CMD wget -qO- "http://127.0.0.1:${PORT}/health" || exit 1

CMD ["node", "app.js"]
