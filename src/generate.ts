import { randomFromCharset, randomIndex } from './secureRandom.js'

/**
 * Random-password generation (shared with the web app). Pure: no UI, no I/O.
 * Class coverage is enforced by rejecting and regenerating the whole candidate
 * (never post-hoc substitution); "no repeat" samples without replacement.
 */

export const CHARSETS = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}|;:,.<>?',
} as const

/** Visually confusable characters removed by "exclude ambiguous". */
export const AMBIGUOUS = '0O1lI|'

export const LENGTH_MIN = 8
export const LENGTH_MAX = 128
export const LENGTH_DEFAULT = 20

export interface GeneratorOptions {
  length: number
  lowercase: boolean
  uppercase: boolean
  digits: boolean
  symbols: boolean
  excludeAmbiguous: boolean
  noRepeat: boolean
  beginWithLetter: boolean
}

export const DEFAULT_OPTIONS: GeneratorOptions = {
  length: LENGTH_DEFAULT,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
  excludeAmbiguous: false,
  noRepeat: false,
  beginWithLetter: false,
}

interface CharClass {
  chars: string
}

interface Pools {
  full: string
  letters: string
  classes: CharClass[]
}

function stripAmbiguous(chars: string): string {
  return [...chars].filter((c) => !AMBIGUOUS.includes(c)).join('')
}

function buildPools(o: GeneratorOptions): Pools {
  const classes: CharClass[] = []
  let letters = ''

  const add = (chars: string, isLetter: boolean) => {
    const filtered = o.excludeAmbiguous ? stripAmbiguous(chars) : chars
    if (filtered.length === 0) return
    classes.push({ chars: filtered })
    if (isLetter) letters += filtered
  }

  if (o.lowercase) add(CHARSETS.lowercase, true)
  if (o.uppercase) add(CHARSETS.uppercase, true)
  if (o.digits) add(CHARSETS.digits, false)
  if (o.symbols) add(CHARSETS.symbols, false)

  const full = classes.map((c) => c.chars).join('')
  return { full, letters, classes }
}

/** Sizes of the active pools after ambiguous removal (shared with entropy). */
export function charsetSizes(o: GeneratorOptions): { pool: number; letters: number } {
  const pools = buildPools(o)
  return { pool: pools.full.length, letters: pools.letters.length }
}

function validate(o: GeneratorOptions, pools: Pools): void {
  if (!Number.isInteger(o.length) || o.length < LENGTH_MIN || o.length > LENGTH_MAX) {
    throw new RangeError(
      `length must be an integer in [${LENGTH_MIN}, ${LENGTH_MAX}], got ${o.length}`,
    )
  }
  if (pools.classes.length === 0) {
    throw new Error('Select at least one character type.')
  }
  if (o.length < pools.classes.length) {
    throw new Error(
      `length ${o.length} is too short to include one of each of the ${pools.classes.length} selected types.`,
    )
  }
  if (o.beginWithLetter && pools.letters.length === 0) {
    throw new Error('"begin with a letter" requires letters to be enabled.')
  }
  if (o.noRepeat && o.length > pools.full.length) {
    throw new Error(
      `"no repeat" needs at least ${o.length} distinct characters, but only ${pools.full.length} are available.`,
    )
  }
}

function hasFullClassCoverage(candidate: string, classes: CharClass[]): boolean {
  return classes.every((cls) => [...candidate].some((ch) => cls.chars.includes(ch)))
}

function buildCandidate(o: GeneratorOptions, pools: Pools): string {
  const out: string[] = []

  if (o.noRepeat) {
    const available = [...pools.full]
    for (let i = 0; i < o.length; i++) {
      const pickFromLetters = i === 0 && o.beginWithLetter
      const pool = pickFromLetters
        ? available.filter((c) => pools.letters.includes(c))
        : available
      const ch = pool[randomIndex(pool.length)]
      out.push(ch)
      available.splice(available.indexOf(ch), 1)
    }
  } else {
    for (let i = 0; i < o.length; i++) {
      const pool = i === 0 && o.beginWithLetter ? pools.letters : pools.full
      out.push(randomFromCharset(pool))
    }
  }

  return out.join('')
}

const MAX_ATTEMPTS = 1000

/** Generate a password satisfying every active constraint. Throws if impossible. */
export function generatePassword(options: GeneratorOptions): string {
  const pools = buildPools(options)
  validate(options, pools)

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = buildCandidate(options, pools)
    if (hasFullClassCoverage(candidate, pools.classes)) return candidate
  }
  throw new Error('Could not satisfy class-coverage constraints; try a longer length.')
}
