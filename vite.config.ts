import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/ContainerLookup/',
  build: {
    chunkSizeWarningLimit: 800,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: ['src/lib/**', 'src/store/**', 'src/components/FilterBar.tsx'],
      exclude: ['src/test/**', 'src/**/*.d.ts', 'src/lib/supabase.ts'],
      thresholds: {
        lines: 40,
        functions: 45,
        branches: 60,
        statements: 40,
      },
    },
  },
})
