import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  // Single-bundle prototype (~490 kB gzip); fine for a demo on Vercel's CDN
  build: { chunkSizeWarningLimit: 2500 },
})
