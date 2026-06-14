/**
 * secureRandom.ts — the open-sourced cryptographic core (shared with the web app).
 *
 * Every random value flows through here, and the one rule is: only the CSPRNG
 * Web Crypto `getRandomValues`, never `Math.random()`. We use the browser's
 * global `crypto` when present and fall back to Node's built-in `node:crypto`
 * (Web Crypto), so it runs identically on Node 16/18/20+ and in the browser.
 *
 * Why rejection sampling (`randomIndex`): mapping a 32-bit integer onto
 * [0, maxExclusive) with `value % maxExclusive` is biased unless maxExclusive
 * divides 2^32 evenly — the low residues become slightly more likely ("modulo
 * bias"). We reject any draw in the incomplete final block so the remainder is
 * perfectly uniform.
 */
import { webcrypto } from 'node:crypto'

// Prefer a pre-existing global `crypto` (browser / Node 20+); otherwise use
// Node's Web Crypto. Resolved once at module load.
const csprng: Crypto = (globalThis.crypto ?? (webcrypto as unknown as Crypto))

const UINT32_RANGE = 0x1_0000_0000 // 2^32

/** Uniform integer in [0, maxExclusive) via rejection sampling. No modulo bias. */
export function randomIndex(maxExclusive: number): number {
  if (
    !Number.isInteger(maxExclusive) ||
    maxExclusive < 1 ||
    maxExclusive > UINT32_RANGE
  ) {
    throw new RangeError(
      `randomIndex: maxExclusive must be an integer in [1, 2^32], got ${maxExclusive}`,
    )
  }

  const limit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive
  const buf = new Uint32Array(1)
  do {
    csprng.getRandomValues(buf)
  } while (buf[0] >= limit)
  return buf[0] % maxExclusive
}

/** One character drawn uniformly at random from `charset`. */
export function randomFromCharset(charset: string): string {
  if (charset.length === 0) {
    throw new RangeError('randomFromCharset: charset must not be empty')
  }
  return charset[randomIndex(charset.length)]
}

/** In-place, unbiased Fisher–Yates shuffle. Returns the same array. */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1)
    const tmp = array[i]
    array[i] = array[j]
    array[j] = tmp
  }
  return array
}
