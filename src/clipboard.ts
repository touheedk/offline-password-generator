import { spawn } from 'node:child_process'

/**
 * Copy text to the OS clipboard using a native command — no npm dependency.
 * Returns false (never throws) if no clipboard tool is available, so the CLI
 * can fall back to just printing the secret.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const candidates: string[][] =
    process.platform === 'darwin'
      ? [['pbcopy']]
      : process.platform === 'win32'
        ? [['clip']]
        : [
            ['wl-copy'],
            ['xclip', '-selection', 'clipboard'],
            ['xsel', '--clipboard', '--input'],
          ]

  for (const [cmd, ...args] of candidates) {
    if (await tryCopy(cmd, args, text)) return true
  }
  return false
}

function tryCopy(cmd: string, args: string[], text: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const child = spawn(cmd, args)
      child.on('error', () => resolve(false))
      child.on('close', (code) => resolve(code === 0))
      child.stdin.on('error', () => resolve(false))
      child.stdin.end(text)
    } catch {
      resolve(false)
    }
  })
}
