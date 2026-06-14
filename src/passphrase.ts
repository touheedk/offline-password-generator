import { randomIndex } from './secureRandom.js'

/**
 * Passphrase generation (shared with the web app). Pure: the caller supplies
 * the wordlist (loaded from the bundled EFF file by the CLI).
 */

export const EFF_WORDLIST_SIZE = 7776

export const WORD_COUNT_MIN = 3
export const WORD_COUNT_MAX = 10
export const WORD_COUNT_DEFAULT = 5

/** Friendly separator names → the literal characters they map to. */
export const SEPARATOR_ALIASES: Record<string, string> = {
  hyphen: '-',
  dash: '-',
  space: ' ',
  period: '.',
  dot: '.',
  underscore: '_',
  comma: ',',
  none: '',
}

export const SEPARATOR_DEFAULT = '-'

export interface PassphraseOptions {
  wordCount: number
  /** Literal separator string (already resolved from any alias). */
  separator: string
  capitalize: boolean
  injectDigit: boolean
}

function capitalizeWord(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

/** Resolve a user-supplied separator (alias name or literal) to its character. */
export function resolveSeparator(input: string): string {
  return input in SEPARATOR_ALIASES ? SEPARATOR_ALIASES[input] : input
}

/** Build a passphrase from an in-memory wordlist. Throws if options are invalid. */
export function buildPassphrase(words: string[], options: PassphraseOptions): string {
  const { wordCount, separator, capitalize, injectDigit } = options

  if (
    !Number.isInteger(wordCount) ||
    wordCount < WORD_COUNT_MIN ||
    wordCount > WORD_COUNT_MAX
  ) {
    throw new RangeError(
      `word count must be an integer in [${WORD_COUNT_MIN}, ${WORD_COUNT_MAX}], got ${wordCount}`,
    )
  }
  if (words.length === 0) {
    throw new Error('Wordlist is empty.')
  }

  const chosen: string[] = []
  for (let i = 0; i < wordCount; i++) {
    let word = words[randomIndex(words.length)]
    if (capitalize) word = capitalizeWord(word)
    chosen.push(word)
  }

  if (injectDigit) {
    const target = randomIndex(chosen.length)
    chosen[target] += String(randomIndex(10))
  }

  return chosen.join(separator)
}
