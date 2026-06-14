import { defineConfig } from 'vitest/config'

// The core uses the global `crypto.getRandomValues` (a Node 20+/browser global).
// Vitest's VM context doesn't always expose that global, so we provide it from
// node:crypto for tests only — the shipped code is untouched.
export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
  },
})
