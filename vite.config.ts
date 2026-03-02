/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path must match your GitHub repo name.
// If your repo is at https://github.com/USER/calc-o-matic, keep '/calc-o-matic/'.
// For a custom domain or root deploy, set base to '/'.
export default defineConfig({
  plugins: [react()],
  base: '/calc-o-matic/',
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/engine/**', 'src/store/**'],
    },
  },
})
