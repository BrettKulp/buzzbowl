/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/buzzbowl/',
  plugins: [react()],
  test: {
    environment: 'node',
    // tests/e2e belongs to Playwright, not Vitest
    include: ['tests/{unit,integration}/**/*.test.js'],
    setupFiles: ['tests/setup-headless.js'],
    // Phaser's package `main` is the raw CommonJS source tree, and its `module` build has
    // no default export. Resolve `phaser` to the same UMD bundle the browser gets, so
    // `import Phaser from 'phaser'` means the same thing in tests as in the app.
    alias: {
      phaser: 'phaser/dist/phaser.js',
    },
  },
})
