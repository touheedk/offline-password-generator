/**
 * secureRandom.ts — the open-sourced cryptographic core (shared with the web app).
 *
 * Dependency-free. Every random value flows through here, and the one rule is:
 * only the CSPRNG `crypto.getRandomValues` (a Node 20+ / browser global), never
 * `Math.random()`.
 *
 * Why rejection sampling (`randomIndex`): mapping a 32-bit integer onto
 * [0, maxExclusive) with `value % maxExclusive` is biased unless maxExclusive
 * divides 2^32 evenly — the low residues become slightly more likely ("modulo
 * bias"). We reject any draw in the incomplete final block so the remainder is
 * perfectly uniform.
 */

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
    crypto.getRandomValues(buf)
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
