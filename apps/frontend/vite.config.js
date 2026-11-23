import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Firebase popup sign-in needs the opener to be able to read `window.closed`
// on the cross-origin popup. `same-origin-allow-popups` keeps the popup's
// opener relationship while isolating the app from other origins.
const coopHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: coopHeaders,
  },
  preview: {
    headers: coopHeaders,
  },
})
