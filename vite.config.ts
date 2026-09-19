import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base: './' makes every asset URL relative, so the same build works at
// https://<user>.github.io/<repo>/ and at https://<user>.github.io/ with no
// changes. Routing uses HashRouter, so GitHub Pages never needs a 404 fallback.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    // Recharts is most of the bundle; one ~220 kB gzipped file is fine for a personal app.
    chunkSizeWarningLimit: 1000,
  },
})
