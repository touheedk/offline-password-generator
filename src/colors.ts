/**
 * Minimal ANSI styling — no dependency. Colour is disabled automatically when
 * output isn't a TTY (e.g. piped) or when NO_COLOR / TERM=dumb is set, so help
 * text stays clean in scripts and logs.
 */
const useColor =
  Boolean(process.stdout.isTTY) &&
  !process.env.NO_COLOR &&
  process.env.TERM !== 'dumb'

const wrap = (open: string) => (s: string) =>
  useColor ? `[${open}m${s}[0m` : s

export const bold = wrap('1')
export const dim = wrap('2')
export const cyan = wrap('36')
export const blue = wrap('38;5;75')
export const green = wrap('32')
