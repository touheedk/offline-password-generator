# @touheedk/pwgen

A trustworthy, **fully-offline** password & passphrase generator for your
terminal. Randomness comes only from the OS CSPRNG (`crypto.getRandomValues`,
rejection-sampled so there's **no modulo bias**) — nothing is ever sent
anywhere. Same audited core as the [web app](https://offline-password.coderboi.com).

## Install

```bash
npm install -g @touheedk/pwgen
# or run without installing:
npx @touheedk/pwgen --length 24
```

Requires Node 20+.

## Usage

```bash
pwgen                          # a strong 20-char password
pwgen -l 32                    # length 32
pwgen -c 5                     # five at once
pwgen -l 24 -x -u -b           # exclude ambiguous, no repeats, begin with a letter
pwgen --no-symbols             # letters + digits only
pwgen -l 30 -e                 # also print entropy (to stderr)
pwgen -l 24 --copy             # copy to clipboard
pwgen -l 24 --json             # machine-readable output

pwgen passphrase               # e.g. abacus-voyage-thunder-marble-orbit
pwgen pp -w 6 -s space -C -d   # 6 words, space-separated, Capitalized, +digit

pwgen check 'P@ssw0rd'         # estimate strength (entropy + label)
echo -n 'hunter2' | pwgen check   # read from stdin (keeps it out of shell history)
```

Tip: `pwgen | pbcopy` works because the secret is the only thing on stdout —
entropy and status messages go to stderr.

## Options

### `pwgen [password]` (default)

| Flag | Default | Description |
|---|---|---|
| `-l, --length <n>` | 20 | length, 8–128 |
| `-c, --count <n>` | 1 | how many to generate |
| `--no-lowercase` | on | exclude a–z |
| `--no-uppercase` | on | exclude A–Z |
| `--no-digits` | on | exclude 0–9 |
| `--no-symbols` | on | exclude symbols |
| `-x, --exclude-ambiguous` | off | drop `0 O 1 l I \|` |
| `-u, --unique` | off | no repeated characters |
| `-b, --begin-with-letter` | off | first char is a letter |
| `-e, --entropy` | off | print entropy to stderr |
| `--copy` | off | copy to the clipboard |
| `-j, --json` | off | JSON output |

At least one of each enabled character type is guaranteed (by regenerating the
whole candidate, never by post-hoc substitution).

### `pwgen passphrase` (alias `pp`)

| Flag | Default | Description |
|---|---|---|
| `-w, --words <n>` | 5 | number of words, 3–10 |
| `-s, --separator <sep>` | hyphen | a name (`hyphen`, `space`, `period`, `underscore`, `comma`, `none`) or any literal string |
| `-C, --capitalize` | off | capitalize each word |
| `-d, --digit` | off | append a random digit |
| `-c, --count <n>` | 1 | how many to generate |
| `-e` / `--copy` / `-j` | | as above |

Words come from the bundled EFF large wordlist (7,776 words).

### `pwgen check [password]`

Estimates strength (entropy bits + a 0–4 label) from the character classes and
length. Reads from **stdin** if no argument is given. `--json` supported.

## Why you can trust it

- Randomness only from `crypto.getRandomValues` — never `Math.random()`.
- Unbiased index selection via rejection sampling (no modulo bias).
- A CLI sends nothing anywhere; it works with no network. `--copy` shells out to
  your OS clipboard tool (`pbcopy`/`clip`/`wl-copy`/`xclip`) — no dependency.

## Author

**Touheed Khan** — [touheedkhan.com](https://touheedkhan.com)

- 🌐 Online tool: [offline-password.coderboi.com](https://offline-password.coderboi.com)
- 🧑‍💻 Author: [touheedkhan.com](https://touheedkhan.com)

## License

[MIT](./LICENSE) © Touheed Khan
