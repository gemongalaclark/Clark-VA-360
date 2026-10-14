import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/scheduler': {
        target: 'http://localhost:5001',
        changeOrigin: true
      }
    }
  }
})
