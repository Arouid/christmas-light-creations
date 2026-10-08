import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Served from the custom domain root on GitHub Pages, so base stays '/'.
// Two pages: the public site and the staff-only /leads/ list.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Firestore is ~575 kB but only loads on form submit and on /leads/.
    chunkSizeWarningLimit: 700,
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        leads: resolve(import.meta.dirname, 'leads/index.html'),
      },
    },
  },
})
