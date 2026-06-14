import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Load the bundled EFF large wordlist (7,776 words). Resolved relative to this
 * module so it works from dist/, npm link, or npx. Cached.
 */
let cache: string[] | null = null

function moduleDir(): string {
  // Node 20.11+ exposes a filesystem path directly (also set under Vitest).
  const metaDir = (import.meta as { dirname?: string }).dirname
  if (metaDir) return metaDir
  const url = import.meta.url
  return url.startsWith('file:') ? dirname(fileURLToPath(url)) : dirname(url)
}

export function loadWordlist(): string[] {
  if (cache) return cache
  const path = join(moduleDir(), '..', 'wordlists', 'eff-large.txt')
  cache = readFileSync(path, 'utf8')
    .split('\n')
    .map((w) => w.trim())
    .filter(Boolean)
  return cache
}
