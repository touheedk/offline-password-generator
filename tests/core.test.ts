import { describe, expect, it } from 'vitest'
import { CHARSETS, DEFAULT_OPTIONS, generatePassword, type GeneratorOptions } from '../src/generate.js'
import { buildPassphrase, resolveSeparator } from '../src/passphrase.js'
import {
  estimateBitsFromString,
  passphraseEntropyBits,
  passwordEntropyBits,
  rateEntropy,
} from '../src/entropy.js'

const gen = (o: Partial<GeneratorOptions> = {}): GeneratorOptions => ({ ...DEFAULT_OPTIONS, ...o })
const WORDS = ['abacus', 'kingdom', 'voyage', 'thunder', 'lantern', 'marble', 'orbit', 'velvet']

describe('generatePassword', () => {
  it('respects length and uses every enabled class', () => {
    for (let i = 0; i < 100; i++) {
      const pw = generatePassword(gen({ length: 24 }))
      expect(pw).toHaveLength(24)
      expect([...pw].some((c) => CHARSETS.lowercase.includes(c))).toBe(true)
      expect([...pw].some((c) => CHARSETS.uppercase.includes(c))).toBe(true)
      expect([...pw].some((c) => CHARSETS.digits.includes(c))).toBe(true)
      expect([...pw].some((c) => CHARSETS.symbols.includes(c))).toBe(true)
    }
  })

  it('honours exclude-ambiguous, unique, begin-with-letter', () => {
    for (let i = 0; i < 100; i++) {
      const pw = generatePassword(
        gen({ length: 20, excludeAmbiguous: true, noRepeat: true, beginWithLetter: true }),
      )
      for (const ch of pw) expect('0O1lI|').not.toContain(ch)
      expect(new Set(pw).size).toBe(pw.length)
      expect(/^[a-zA-Z]/.test(pw)).toBe(true)
    }
  })

  it('throws on impossible configs', () => {
    expect(() =>
      generatePassword(gen({ lowercase: false, uppercase: false, digits: false, symbols: false })),
    ).toThrow()
    expect(() => generatePassword(gen({ length: 5 }))).toThrow()
  })
})

describe('buildPassphrase', () => {
  it('builds the requested number of words from the list', () => {
    const phrase = buildPassphrase(WORDS, {
      wordCount: 4,
      separator: '-',
      capitalize: false,
      injectDigit: false,
    })
    const parts = phrase.split('-')
    expect(parts).toHaveLength(4)
    for (const w of parts) expect(WORDS).toContain(w)
  })

  it('capitalizes and injects a single digit', () => {
    const phrase = buildPassphrase(WORDS, {
      wordCount: 5,
      separator: '',
      capitalize: true,
      injectDigit: true,
    })
    expect(phrase.replace(/[^0-9]/g, '')).toHaveLength(1)
    expect(/[A-Z]/.test(phrase)).toBe(true)
  })

  it('resolves separator aliases and literals', () => {
    expect(resolveSeparator('space')).toBe(' ')
    expect(resolveSeparator('none')).toBe('')
    expect(resolveSeparator('::')).toBe('::')
  })
})

describe('entropy', () => {
  it('password entropy is length * log2(pool)', () => {
    const bits = passwordEntropyBits(gen({ length: 10, uppercase: false, digits: false, symbols: false }))
    expect(bits).toBeCloseTo(10 * Math.log2(26), 6)
  })

  it('passphrase entropy is wordCount * log2(7776)', () => {
    expect(
      passphraseEntropyBits({ wordCount: 6, separator: '-', capitalize: false, injectDigit: false }),
    ).toBeCloseTo(6 * Math.log2(7776), 6)
  })

  it('estimates bits from a string and rates them', () => {
    expect(estimateBitsFromString('')).toBe(0)
    expect(rateEntropy(10).label).toBe('Very weak')
    expect(rateEntropy(130).label).toBe('Very strong')
  })
})
