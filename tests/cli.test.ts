import { afterEach, describe, expect, it, vi } from 'vitest'
import { run } from '../src/cli.js'

async function capture(argv: string[]) {
  const out: string[] = []
  const err: string[] = []
  const o = vi.spyOn(process.stdout, 'write').mockImplementation((s: string | Uint8Array) => {
    out.push(String(s))
    return true
  })
  const e = vi.spyOn(process.stderr, 'write').mockImplementation((s: string | Uint8Array) => {
    err.push(String(s))
    return true
  })
  process.exitCode = undefined
  const code = await run(argv)
  o.mockRestore()
  e.mockRestore()
  return { code, out: out.join(''), err: err.join('') }
}

afterEach(() => {
  vi.restoreAllMocks()
  process.exitCode = undefined
})

describe('pwgen password (default)', () => {
  it('prints one password of the requested length', async () => {
    const { code, out } = await capture(['-l', '24'])
    expect(code).toBe(0)
    expect(out.trim()).toHaveLength(24)
  })

  it('prints --count lines', async () => {
    const { code, out } = await capture(['-l', '16', '-c', '3'])
    expect(code).toBe(0)
    expect(out.trim().split('\n')).toHaveLength(3)
  })

  it('sends entropy to stderr, keeping stdout clean', async () => {
    const { out, err } = await capture(['-l', '20', '-e'])
    expect(out.trim().split('\n')).toHaveLength(1)
    expect(err).toMatch(/entropy:/)
  })

  it('emits JSON with items + entropy + strength', async () => {
    const { code, out } = await capture(['-l', '20', '-c', '2', '--json'])
    expect(code).toBe(0)
    const parsed = JSON.parse(out)
    expect(parsed.items).toHaveLength(2)
    expect(typeof parsed.entropyBits).toBe('number')
    expect(typeof parsed.strength).toBe('string')
  })

  it('respects --no-* class flags', async () => {
    const { out } = await capture(['-l', '20', '--no-uppercase', '--no-symbols'])
    expect(/^[a-z0-9]+$/.test(out.trim())).toBe(true)
  })
})

describe('pwgen errors', () => {
  it('exits 1 when no character type is selected', async () => {
    const { code, err } = await capture([
      '--no-lowercase',
      '--no-uppercase',
      '--no-digits',
      '--no-symbols',
    ])
    expect(code).toBe(1)
    expect(err).toMatch(/at least one/i)
  })

  it('exits 1 on out-of-range length', async () => {
    const { code } = await capture(['-l', '5'])
    expect(code).toBe(1)
  })

  it('exits 1 on a non-numeric length', async () => {
    const { code } = await capture(['-l', 'abc'])
    expect(code).toBe(1)
  })
})

describe('pwgen passphrase', () => {
  it('builds the requested number of words with a named separator', async () => {
    const { code, out } = await capture(['passphrase', '-w', '4', '-s', 'space'])
    expect(code).toBe(0)
    expect(out.trim().split(' ')).toHaveLength(4)
  })

  it('works via the pp alias', async () => {
    const { code, out } = await capture(['pp', '-w', '3'])
    expect(code).toBe(0)
    expect(out.trim().split('-')).toHaveLength(3)
  })
})

describe('pwgen check', () => {
  it('reports bits and a label for a given password', async () => {
    const { code, out } = await capture(['check', 'P@ssw0rd'])
    expect(code).toBe(0)
    expect(out).toMatch(/bits/)
  })

  it('supports JSON output', async () => {
    const { code, out } = await capture(['check', 'aB3$xY9!kLmN', '--json'])
    expect(code).toBe(0)
    const parsed = JSON.parse(out)
    expect(typeof parsed.entropyBits).toBe('number')
    expect(typeof parsed.strength).toBe('string')
  })
})
