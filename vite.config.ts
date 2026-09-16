import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'stream', 'util', 'events', 'process'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  optimizeDeps: {
    include: [
      'fabric',
      'pdf-lib',
      'node-forge',
      'qrcode',
      'exceljs',
      'jszip',
      'zustand',
      'lucide-react',
    ],
  },
  server: {
    port: 5173,
    strictPort: false,
  },
})
