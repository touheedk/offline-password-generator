import { charsetSizes, type GeneratorOptions } from './generate.js'
import { EFF_WORDLIST_SIZE, type PassphraseOptions } from './passphrase.js'

/**
 * Honest entropy estimates in bits — the log2 of how many equally-likely
 * outcomes the generator could have produced under the active settings.
 */

export type StrengthScore = 0 | 1 | 2 | 3 | 4

export interface EntropyRating {
  bits: number
  score: StrengthScore
  label: 'Very weak' | 'Weak' | 'Fair' | 'Strong' | 'Very strong'
}

export function passwordEntropyBits(o: GeneratorOptions): number {
  const { pool, letters } = charsetSizes(o)
  if (pool === 0 || o.length <= 0) return 0

  let bits = 0
  for (let i = 0; i < o.length; i++) {
    let choices = i === 0 && o.beginWithLetter && letters > 0 ? letters : pool
    if (o.noRepeat) choices -= i
    if (choices < 1) choices = 1
    bits += Math.log2(choices)
  }
  return bits
}

export function passphraseEntropyBits(o: PassphraseOptions): number {
  if (o.wordCount <= 0) return 0
  let bits = o.wordCount * Math.log2(EFF_WORDLIST_SIZE)
  if (o.injectDigit) bits += Math.log2(o.wordCount * 10)
  return bits
}

const POOL = { lower: 26, upper: 26, digit: 10, symbol: 33 }

/** Estimate entropy of an arbitrary string from the character classes present. */
export function estimateBitsFromString(password: string): number {
  let pool = 0
  if (/[a-z]/.test(password)) pool += POOL.lower
  if (/[A-Z]/.test(password)) pool += POOL.upper
  if (/[0-9]/.test(password)) pool += POOL.digit
  if (/[^a-zA-Z0-9]/.test(password)) pool += POOL.symbol
  return pool > 0 ? password.length * Math.log2(pool) : 0
}

/** Map raw bits to a 0-4 score + text label. */
export function rateEntropy(bits: number): EntropyRating {
  let score: StrengthScore
  let label: EntropyRating['label']
  if (bits < 28) {
    score = 0
    label = 'Very weak'
  } else if (bits < 36) {
    score = 1
    label = 'Weak'
  } else if (bits < 60) {
    score = 2
    label = 'Fair'
  } else if (bits < 128) {
    score = 3
    label = 'Strong'
  } else {
    score = 4
    label = 'Very strong'
  }
  return { bits, score, label }
}

export function formatBits(bits: number): string {
  return `${bits.toFixed(1)} bits`
}
