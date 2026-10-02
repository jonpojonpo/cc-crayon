// Palettes and color resolution. Every color crayon hands the surface is a
// `#rrggbb` string, so nothing depends on which names a surface's theme keys.

export type Palette = {
  /** Stops an H1 is graded across. */
  title: readonly string[]
  h2: string
  h3: string
  h4: string
  bold: string
  italic: string
  code: string
  /** An exact gray: 256-color terminals round tinted darks to loud hues. */
  codeBg: string
  link: string
  /** Bullet colors by nesting depth. */
  bullets: readonly string[]
  number: string
  quote: string
  rule: readonly string[]
  muted: string
  ok: string
  warn: string
  err: string
  info: string
  accent: string
  highlight: string
  /** The opening ⏺ of a reply. */
  dot: string
}

export const THEMES: Record<string, Palette> = {
  crayon: {
    title: ['#ff5f87', '#ffaf5f', '#ffd75f'],
    h2: '#ff6fae',
    h3: '#ffb454',
    h4: '#5fd7af',
    bold: '#ff8fc8',
    italic: '#87d7ff',
    code: '#ffb86c',
    codeBg: '#303030',
    link: '#6cb6ff',
    bullets: ['#ff5f87', '#ffaf00', '#5fd7ff', '#afd75f'],
    number: '#ffaf00',
    quote: '#b48eff',
    rule: ['#ff5f87', '#b48eff', '#5fd7ff'],
    muted: '#8a8aa3',
    ok: '#5fd787',
    warn: '#ffd75f',
    err: '#ff5f5f',
    info: '#5fafff',
    accent: '#d787ff',
    highlight: '#ffd75f',
    dot: '#ff6fae',
  },
  synthwave: {
    title: ['#f706cf', '#fd1d53', '#fdb428'],
    h2: '#ff2ec4',
    h3: '#2de2e6',
    h4: '#fdb428',
    bold: '#ff6ad5',
    italic: '#2de2e6',
    code: '#f9c80e',
    codeBg: '#303030',
    link: '#36f9f6',
    bullets: ['#ff2ec4', '#2de2e6', '#f9c80e', '#b967ff'],
    number: '#f9c80e',
    quote: '#b967ff',
    rule: ['#f706cf', '#b967ff', '#2de2e6'],
    muted: '#9d8ec4',
    ok: '#72f1b8',
    warn: '#fede5d',
    err: '#fe4450',
    info: '#36f9f6',
    accent: '#b967ff',
    highlight: '#f9c80e',
    dot: '#ff2ec4',
  },
  pastel: {
    title: ['#f5a9b8', '#c3b1e1', '#a7d8f0'],
    h2: '#f5a9b8',
    h3: '#c3b1e1',
    h4: '#9ee0c3',
    bold: '#f7b2c4',
    italic: '#a7d8f0',
    code: '#f6c89f',
    codeBg: '#303030',
    link: '#9cc9f5',
    bullets: ['#f5a9b8', '#c3b1e1', '#a7d8f0', '#b8e0a8'],
    number: '#c3b1e1',
    quote: '#c3b1e1',
    rule: ['#f5a9b8', '#c3b1e1', '#a7d8f0'],
    muted: '#9a96a8',
    ok: '#9ee0a8',
    warn: '#f6e3a1',
    err: '#f4a6a6',
    info: '#a7c7f0',
    accent: '#d6b4f5',
    highlight: '#f6e3a1',
    dot: '#f5a9b8',
  },
  ocean: {
    title: ['#00d2ff', '#3a7bd5', '#8e7dff'],
    h2: '#4fc3f7',
    h3: '#4dd0e1',
    h4: '#80cbc4',
    bold: '#64ffda',
    italic: '#82b1ff',
    code: '#ffcc80',
    codeBg: '#303030',
    link: '#40c4ff',
    bullets: ['#00d2ff', '#64ffda', '#82b1ff', '#b388ff'],
    number: '#64ffda',
    quote: '#4dd0e1',
    rule: ['#00d2ff', '#3a7bd5', '#64ffda'],
    muted: '#78909c',
    ok: '#69f0ae',
    warn: '#ffd740',
    err: '#ff6e6e',
    info: '#40c4ff',
    accent: '#b388ff',
    highlight: '#ffd740',
    dot: '#00d2ff',
  },
  forest: {
    title: ['#a8e063', '#56ab2f', '#f4d35e'],
    h2: '#a8e063',
    h3: '#f4d35e',
    h4: '#e8a87c',
    bold: '#c5e1a5',
    italic: '#f4d35e',
    code: '#e8a87c',
    codeBg: '#303030',
    link: '#81c784',
    bullets: ['#a8e063', '#f4d35e', '#e8a87c', '#80cbc4'],
    number: '#f4d35e',
    quote: '#8d6e63',
    rule: ['#56ab2f', '#a8e063', '#f4d35e'],
    muted: '#8a9a7b',
    ok: '#81c784',
    warn: '#ffd54f',
    err: '#e57373',
    info: '#4fc3f7',
    accent: '#ce93d8',
    highlight: '#ffd54f',
    dot: '#a8e063',
  },
  mono: {
    title: ['#e0e0e0'],
    h2: '#e0e0e0',
    h3: '#c8c8c8',
    h4: '#b0b0b0',
    bold: '#ffffff',
    italic: '#d0d0d0',
    code: '#d0d0d0',
    codeBg: '#303030',
    link: '#d0d0d0',
    bullets: ['#a0a0a0'],
    number: '#a0a0a0',
    quote: '#808080',
    rule: ['#606060'],
    muted: '#808080',
    ok: '#d0d0d0',
    warn: '#d0d0d0',
    err: '#d0d0d0',
    info: '#d0d0d0',
    accent: '#ffffff',
    highlight: '#d0d0d0',
    dot: '#d0d0d0',
  },
}

export const THEME_NAMES = Object.keys(THEMES)

/** Ink's sixteen names, as the dark palette draws them. */
const ANSI: Record<string, string> = {
  black: '#1c1c1c',
  red: '#ff5f5f',
  green: '#5fd787',
  yellow: '#ffd75f',
  blue: '#5f87ff',
  magenta: '#d75fd7',
  cyan: '#5fd7d7',
  white: '#e4e4e4',
  gray: '#8a8a8a',
  grey: '#8a8a8a',
  blackbright: '#4e4e4e',
  redbright: '#ff8787',
  greenbright: '#87ffaf',
  yellowbright: '#ffff87',
  bluebright: '#87afff',
  magentabright: '#ff87ff',
  cyanbright: '#87ffff',
  whitebright: '#ffffff',
}

/** Friendlier names the model reaches for. */
const EXTRA: Record<string, string> = {
  orange: '#ffaf5f',
  pink: '#ff87af',
  hotpink: '#ff5faf',
  purple: '#af87ff',
  violet: '#d787ff',
  lavender: '#d7afff',
  indigo: '#8787ff',
  teal: '#5fd7af',
  mint: '#87ffd7',
  lime: '#afff5f',
  emerald: '#50d890',
  gold: '#ffd700',
  amber: '#ffbf00',
  coral: '#ff7f6f',
  salmon: '#ff9f8f',
  peach: '#ffc59f',
  rose: '#ff6f91',
  crimson: '#e6304f',
  ruby: '#e0115f',
  sky: '#87d7ff',
  azure: '#4fa8ff',
  navy: '#5f6fd7',
  brown: '#c08060',
  silver: '#c0c0c0',
}

export const NAMED_COLORS: Record<string, string> = { ...ANSI, ...EXTRA }

/** Gradient presets for `<grad name>`. */
export const GRADIENTS: Record<string, readonly string[]> = {
  sunset: ['#ff5f6d', '#ffc371'],
  fire: ['#f12711', '#f5af19'],
  ocean: ['#00d2ff', '#3a7bd5'],
  aurora: ['#00f260', '#0575e6', '#a855f7'],
  candy: ['#ff6ec4', '#7873f5'],
  neon: ['#f706cf', '#2de2e6'],
  mint: ['#43e97b', '#38f9d7'],
  peach: ['#ffecd2', '#fcb69f'],
  lava: ['#ff0844', '#ffb199'],
  ice: ['#e0f7ff', '#5fb8ff'],
  gold: ['#f7971e', '#ffd200'],
  forest: ['#5a3f37', '#2c7744', '#a8e063'],
}

export const RAINBOW: readonly string[] = [
  '#ff5f5f',
  '#ffaf5f',
  '#ffd75f',
  '#87d75f',
  '#5fd7d7',
  '#5f87ff',
  '#af5fff',
]

/** `#rrggbb` for a name, a palette role, `#rgb`, `#rrggbb` or `rgb(r,g,b)`; undefined when it names none. */
export function resolveColor(raw: string | undefined, palette: Palette): string | undefined {
  if (raw === undefined) {
    return undefined
  }
  const value = raw.trim().toLowerCase()
  const role = ROLE_COLORS[value]
  if (role !== undefined) {
    return role(palette)
  }
  const named = NAMED_COLORS[value.replace(/[\s_-]/g, '')]
  if (named !== undefined) {
    return named
  }
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(value)
  if (short) {
    return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`
  }
  if (/^#[0-9a-f]{6}$/.test(value)) {
    return value
  }
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/.exec(value)
  if (rgb) {
    return toHex([Number(rgb[1]), Number(rgb[2]), Number(rgb[3])])
  }
  return undefined
}

/** Colors named by what they mean, so a reply reads the same under every palette. */
export const ROLE_COLORS: Record<string, (p: Palette) => string> = {
  ok: p => p.ok,
  success: p => p.ok,
  warn: p => p.warn,
  warning: p => p.warn,
  err: p => p.err,
  error: p => p.err,
  info: p => p.info,
  note: p => p.info,
  accent: p => p.accent,
  muted: p => p.muted,
}

type Rgb = [number, number, number]

function toRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('')}`
}

/** `count` colors spread evenly along the stops. */
export function spread(stops: readonly string[], count: number): string[] {
  const first = stops[0] ?? '#ffffff'
  if (stops.length < 2 || count < 2) {
    return Array.from({ length: Math.max(count, 0) }, () => first)
  }
  const rgbs = stops.map(toRgb)
  return Array.from({ length: count }, (_, i) => {
    const at = (i / (count - 1)) * (rgbs.length - 1)
    const lo = Math.min(Math.floor(at), rgbs.length - 2)
    const t = at - lo
    const a = rgbs[lo]!
    const b = rgbs[lo + 1]!
    return toHex([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t])
  })
}

function toHsl([r, g, b]: Rgb): [number, number, number] {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) {
    return [0, 0, l]
  }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4
  return [h / 6, s, l]
}

function fromHsl([h, s, l]: [number, number, number]): Rgb {
  if (s === 0) {
    return [l * 255, l * 255, l * 255]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const channel = (t: number) => {
    const u = t < 0 ? t + 1 : t > 1 ? t - 1 : t
    if (u < 1 / 6) return p + (q - p) * 6 * u
    if (u < 1 / 2) return q
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6
    return p
  }
  return [channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255]
}

/** The color darkened until it reads on a light background. */
export function forLight(hex: string): string {
  const [h, s, l] = toHsl(toRgb(hex))
  return toHex(fromHsl([h, s, Math.min(l, 0.4)]))
}

/** The palette as drawn on the background in force. */
export function paletteFor(name: string, isLight: boolean): Palette {
  const base = THEMES[name] ?? THEMES.crayon!
  if (!isLight) {
    return base
  }
  const shade = (c: string) => forLight(c)
  return {
    ...base,
    title: base.title.map(shade),
    h2: shade(base.h2),
    h3: shade(base.h3),
    h4: shade(base.h4),
    bold: shade(base.bold),
    italic: shade(base.italic),
    code: shade(base.code),
    codeBg: '#e8e8e8',
    link: shade(base.link),
    bullets: base.bullets.map(shade),
    number: shade(base.number),
    quote: shade(base.quote),
    rule: base.rule.map(shade),
    muted: shade(base.muted),
    ok: shade(base.ok),
    warn: shade(base.warn),
    err: shade(base.err),
    info: shade(base.info),
    accent: shade(base.accent),
    highlight: base.highlight,
    dot: shade(base.dot),
  }
}

/** A user-picked color shaded for the background, as the palette's are. */
export function shadeFor(hex: string, isLight: boolean): string {
  return isLight ? forLight(hex) : hex
}
