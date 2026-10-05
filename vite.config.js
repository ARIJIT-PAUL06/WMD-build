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
        manualChunks(id) {
          if (id.includes('pollutantDocumentaries') || id.includes('PollutantDocumentary')) {
            return 'pollutant-documentary';
          }
          if (id.includes('three') || id.includes('@react-three')) {
            return 'three-vendor';
          }
          if (id.includes('jspdf') || id.includes('html2canvas')) {
            return 'pdf-vendor';
          }
        },
      },
    },
  },
})
