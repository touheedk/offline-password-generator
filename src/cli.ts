import { createRequire } from 'node:module'
import { Command } from 'commander'
import { copyToClipboard } from './clipboard.js'
import {
  DEFAULT_OPTIONS,
  generatePassword,
  LENGTH_DEFAULT,
  LENGTH_MAX,
  LENGTH_MIN,
  type GeneratorOptions,
} from './generate.js'
import {
  buildPassphrase,
  resolveSeparator,
  SEPARATOR_DEFAULT,
  WORD_COUNT_DEFAULT,
  WORD_COUNT_MAX,
  WORD_COUNT_MIN,
} from './passphrase.js'
import {
  estimateBitsFromString,
  formatBits,
  passphraseEntropyBits,
  passwordEntropyBits,
  rateEntropy,
} from './entropy.js'
import { loadWordlist } from './wordlist.js'
import { blue, bold, cyan, dim, green } from './colors.js'

const require = createRequire(import.meta.url)
const { version } = require('../package.json') as { version: string }

interface SharedOutput {
  entropy?: boolean
  copy?: boolean
  json?: boolean
}

function parseIntStrict(value: string, what: string): number {
  const n = Number(value)
  if (!Number.isInteger(n)) throw new Error(`${what} must be a whole number, got "${value}"`)
  return n
}

/** Print generated secrets, honouring --json / --entropy / --copy. */
async function emitSecrets(items: string[], bits: number, out: SharedOutput): Promise<void> {
  const { label } = rateEntropy(bits)
  if (out.json) {
    process.stdout.write(
      JSON.stringify(
        { items, entropyBits: Number(bits.toFixed(1)), strength: label },
        null,
        2,
      ) + '\n',
    )
  } else {
    process.stdout.write(items.join('\n') + '\n')
    // Entropy goes to stderr so `pwgen | pbcopy` stays clean.
    if (out.entropy) process.stderr.write(`entropy: ${formatBits(bits)} (${label})\n`)
  }
  if (out.copy) {
    const ok = await copyToClipboard(items.join('\n'))
    process.stderr.write(
      ok ? 'Copied to clipboard.\n' : 'Could not access clipboard (output printed above).\n',
    )
  }
}

function clampCount(raw: string): number {
  const n = parseIntStrict(raw, 'count')
  if (n < 1) throw new Error('count must be at least 1')
  if (n > 1000) throw new Error('count must be 1000 or fewer')
  return n
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return ''
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '')
}

/** One aligned, coloured example line: dim "$", blue command, dim "# note". */
function ex(command: string, note = ''): string {
  const pad = ' '.repeat(Math.max(2, 38 - command.length))
  return `  ${dim('$')} ${blue(command)}${note ? pad + dim('# ' + note) : ''}`
}

const title = (s: string) => bold(cyan(s))

const BANNER = `
  ${bold(blue('pwgen'))} ${dim('— trustworthy, offline password & passphrase generator')}
`

const ROOT_HELP = `
${title('Examples:')}
${ex('pwgen', 'a strong 20-char password')}
${ex('pwgen -l 32 -c 5', 'five 32-char passwords')}
${ex('pwgen -l 24 -x -u -b', 'exclude ambiguous, no repeats, begin with a letter')}
${ex('pwgen --no-symbols', 'letters + digits only')}
${ex('pwgen -e', 'also print entropy (to stderr)')}
${ex('pwgen --copy', 'copy to the clipboard')}
${ex('pwgen --json', 'machine-readable output')}
${ex('pwgen passphrase -w 6 -s space -C -d')}
${ex("pwgen check 'P@ssw0rd'", "estimate a password's strength")}
${ex('echo -n hunter2 | pwgen check', 'read from stdin (stays out of shell history)')}

${title('Notes:')}
  ${dim('• Secrets print to stdout; entropy/status go to stderr — so "pwgen | pbcopy" stays clean.')}
  ${dim('• Run "pwgen <command> --help" for every option of a command.')}

${title('Links:')}
  ${'Online tool'.padEnd(14)}${green('https://offline-password.coderboi.com')}
  ${'Author'.padEnd(14)}Touheed Khan ${dim('·')} ${green('https://touheedkhan.com')}
`

const PASSWORD_HELP = `
${title('Examples:')}
${ex('pwgen', 'a strong 20-char password')}
${ex('pwgen -l 32', 'length 32')}
${ex('pwgen -c 5', 'five at once')}
${ex('pwgen -l 24 -x -u -b', 'exclude ambiguous, no repeats, begin with a letter')}
${ex('pwgen --no-symbols', 'letters + digits only')}
${ex('pwgen -e', 'also print entropy (to stderr)')}
${ex('pwgen --copy', 'copy to the clipboard')}
${ex('pwgen --json', 'machine-readable output')}
`

const PASSPHRASE_HELP = `
${title('Examples:')}
${ex('pwgen passphrase', 'e.g. abacus-voyage-thunder-marble-orbit')}
${ex('pwgen pp -w 6', 'six words')}
${ex('pwgen pp -s space -C -d', 'spaced, Capitalized, with a random digit')}
${ex('pwgen pp -s . -w 4', 'period-separated, four words')}
${ex('pwgen pp --copy', 'copy to the clipboard')}

  ${dim('Separator accepts a name (hyphen, space, period, underscore, comma, none) or any literal.')}
`

const CHECK_HELP = `
${title('Examples:')}
${ex("pwgen check 'P@ssw0rd'", 'estimate strength (entropy bits + label)')}
${ex('echo -n hunter2 | pwgen check', 'read from stdin (stays out of shell history)')}
${ex("pwgen check 'x' --json", 'machine-readable output')}
`

export function buildProgram(): Command {
  const program = new Command()

  program
    .name('pwgen')
    .description('Trustworthy, offline password & passphrase generator (unbiased CSPRNG).')
    .version(version, '-V, --version', 'output the version')
    .addHelpText('beforeAll', BANNER)
    .addHelpText('after', ROOT_HELP)

  // ── password (default command) ─────────────────────────────────────────
  // Defined as its own subcommand (default) so each command parses its own
  // options cleanly — a root-level default action would swallow subcommand flags.
  program
    .command('password', { isDefault: true })
    .alias('pw')
    .description('generate a random password (default)')
    .option('-l, --length <n>', `length ${LENGTH_MIN}-${LENGTH_MAX}`, String(LENGTH_DEFAULT))
    .option('-c, --count <n>', 'how many to generate', '1')
    .option('--no-lowercase', 'exclude lowercase a-z')
    .option('--no-uppercase', 'exclude uppercase A-Z')
    .option('--no-digits', 'exclude digits 0-9')
    .option('--no-symbols', 'exclude symbols')
    .option('-x, --exclude-ambiguous', 'exclude ambiguous chars (0 O 1 l I |)')
    .option('-u, --unique', 'no repeated characters')
    .option('-b, --begin-with-letter', 'first character must be a letter')
    .option('-e, --entropy', 'also print entropy (to stderr)')
    .option('--copy', 'copy result to the clipboard')
    .option('-j, --json', 'output as JSON')
    .action(async (opts) => {
      const options: GeneratorOptions = {
        ...DEFAULT_OPTIONS,
        length: parseIntStrict(opts.length, 'length'),
        lowercase: opts.lowercase,
        uppercase: opts.uppercase,
        digits: opts.digits,
        symbols: opts.symbols,
        excludeAmbiguous: Boolean(opts.excludeAmbiguous),
        noRepeat: Boolean(opts.unique),
        beginWithLetter: Boolean(opts.beginWithLetter),
      }
      const count = clampCount(opts.count)
      const items = Array.from({ length: count }, () => generatePassword(options))
      await emitSecrets(items, passwordEntropyBits(options), opts)
    })
    .addHelpText('after', PASSWORD_HELP)

  // ── passphrase ─────────────────────────────────────────────────────────
  program
    .command('passphrase')
    .alias('pp')
    .description('generate a memorable passphrase from the EFF wordlist')
    .option('-w, --words <n>', `number of words ${WORD_COUNT_MIN}-${WORD_COUNT_MAX}`, String(WORD_COUNT_DEFAULT))
    .option('-s, --separator <sep>', 'separator: a name (hyphen, space, period, underscore, comma, none) or any literal', SEPARATOR_DEFAULT)
    .option('-C, --capitalize', 'capitalize each word')
    .option('-d, --digit', 'append a random digit')
    .option('-c, --count <n>', 'how many to generate', '1')
    .option('-e, --entropy', 'also print entropy (to stderr)')
    .option('--copy', 'copy result to the clipboard')
    .option('-j, --json', 'output as JSON')
    .action(async (opts) => {
      const phraseOptions = {
        wordCount: parseIntStrict(opts.words, 'words'),
        separator: resolveSeparator(opts.separator),
        capitalize: Boolean(opts.capitalize),
        injectDigit: Boolean(opts.digit),
      }
      const words = loadWordlist()
      const count = clampCount(opts.count)
      const items = Array.from({ length: count }, () => buildPassphrase(words, phraseOptions))
      await emitSecrets(items, passphraseEntropyBits(phraseOptions), opts)
    })
    .addHelpText('after', PASSPHRASE_HELP)

  // ── check ──────────────────────────────────────────────────────────────
  program
    .command('check')
    .argument('[password]', 'password to check (omit to read from stdin)')
    .description('estimate a password’s strength (entropy bits + label)')
    .option('-j, --json', 'output as JSON')
    .action(async (password: string | undefined, opts) => {
      const value = password ?? (await readStdin())
      if (!value) {
        throw new Error('provide a password as an argument or pipe it via stdin')
      }
      const bits = estimateBitsFromString(value)
      const { label } = rateEntropy(bits)
      if (opts.json) {
        process.stdout.write(
          JSON.stringify({ entropyBits: Number(bits.toFixed(1)), strength: label }, null, 2) + '\n',
        )
      } else {
        process.stdout.write(`${formatBits(bits)} — ${label}\n`)
      }
    })
    .addHelpText('after', CHECK_HELP)

  return program
}

/** Parse argv and run. Returns a process exit code (testable, never exits). */
export async function run(argv: string[]): Promise<number> {
  const program = buildProgram()
  program.exitOverride()
  try {
    await program.parseAsync(argv, { from: 'user' })
    return typeof process.exitCode === 'number' ? process.exitCode : 0
  } catch (err) {
    const e = err as { code?: string; exitCode?: number; message?: string }
    // Help/version are not errors.
    if (e.code === 'commander.helpDisplayed' || e.code === 'commander.version') return 0
    // Commander already printed parse errors (unknown option, etc.).
    if (e.code?.startsWith('commander.')) return e.exitCode ?? 1
    // Our own validation/generation errors.
    process.stderr.write(`error: ${e.message ?? String(err)}\n`)
    return 1
  }
}
