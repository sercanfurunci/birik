import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('recharts') || id.includes('d3-')) return 'recharts'
          if (id.includes('firebase') || id.includes('@firebase')) return 'firebase'
          if (id.includes('jspdf') || id.includes('jspdf-autotable')) return 'pdf'
          if (id.includes('react-dom') || id.includes('react/') || id.includes('/react/')) return 'react'
          return undefined
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
})
