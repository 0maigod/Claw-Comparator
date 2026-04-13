import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/openclaw-comparator/',
  plugins: [react()],
  server: {
    proxy: {
      '/openclaw-comparator/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/openclaw-comparator\/api/, '/api')
      }
    }
  }
})
