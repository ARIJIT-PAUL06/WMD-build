import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Only Three.js is pinned (the hero needs it on load). Mapbox, jsPDF and app code are left to
        // Rollup's dynamic-import splitting; pinning them drags Vite's preload helper into their chunk
        // and makes the entry statically import (and modulepreload) the 1.8 MB Mapbox bundle.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules[\/](three|@react-three)[\/]/.test(id)) return 'three-vendor';
          return undefined;
        },
      },
    },
  },
})
