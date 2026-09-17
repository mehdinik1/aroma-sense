import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const API_PORT = process.env.API_PORT || 8787

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: Number(process.env.PORT) || 5177,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
})
