import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Served from the custom domain root on GitHub Pages, so base stays '/'.
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
