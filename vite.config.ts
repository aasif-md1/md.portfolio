import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@react-three')) {
              return 'react-three-vendor'
            }
            if (id.includes('three')) {
              return 'three-vendor'
            }
            if (id.includes('gsap') || id.includes('lenis')) {
              return 'motion-vendor'
            }
            if (id.includes('lucide-react') || id.includes('react-icons')) {
              return 'icons-vendor'
            }
            return 'vendor'
          }
        },
      },
    },
  },
})
