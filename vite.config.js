import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// BASE_PATH is set by the deploy workflow: '/' on the custom domain,
// '/christmas-light-creations/' on the temporary github.io address.
// Pages: the public site, the staff-only /leads/ app, and customers'
// /proposal/?t=… pages (reachable only by their link), and customers' own
// accounts at /account/ (email-link sign-in).
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  build: {
    // Firestore is ~575 kB but only loads on form submit and on /leads/.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        leads: resolve(import.meta.dirname, 'leads/index.html'),
        proposal: resolve(import.meta.dirname, 'proposal/index.html'),
        account: resolve(import.meta.dirname, 'account/index.html'),
      },
    },
  },
})
