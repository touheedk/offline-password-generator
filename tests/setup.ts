import { webcrypto } from 'node:crypto'

// Expose Web Crypto as the `crypto` global for the test environment, matching
// the Node 20+/browser runtime the code actually runs in.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true })
}
